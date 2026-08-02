import mongoose from "mongoose";
import Post from "../models/post.model.js";
import User from "../models/user.model.js";
import Follow from "../models/follow.model.js";
import Comment from "../models/comment.model.js";
import Notification from "../models/notification.model.js";
import Report from "../models/report.model.js";
import cloudinary from "../config/cloudinary.js";
import { getIO } from "../socket/socket.js";
import { uploadToCloudinary } from "../utils/uploadCleanup.js";
import { cleanupTempUpload, IMAGE_UPLOAD_LIMITS, validateImageUpload } from "../utils/imageUploadValidation.js";
import asyncHandler from "../utils/asyncHandler.js";
import extractMentions from "../utils/extractMentions.js";
// Hard upper bound on result-set size for any list endpoint in this controller.
// Prevents callers from triggering full-collection scans with deep .populate() chains.
const MAX_LIMIT = 50;

// Maximum number of likes to show in preview (rest shown as count)
// Prevents massive response payloads from posts with thousands of likes
const MAX_LIKES_PREVIEW = 10;

// --------------- Shared helpers for post listing ---------------

const buildBlockExclusion = async (reqUser) => {
    if (!reqUser) return { excludeUserIds: [], currentUserId: null };
    const currentUserId = reqUser._id || reqUser.id;
    const blockers = await User.find({ blockedUsers: currentUserId }).select("_id");
    const blockerIds = blockers.map(u => u._id);
    const blockedIds = reqUser.blockedUsers || [];
    const excludeUserIds = [...blockedIds, ...blockerIds];
    return { currentUserId, excludeUserIds };
};

const buildVisibilityFilter = (currentUserId, excludeUserIds, filter) => {
    filter.isFlaggedForReview = { $ne: true };
    if (excludeUserIds.length > 0) {
        filter.author = { $nin: excludeUserIds };
    }
    return filter;
};

const addPrivacyOrClause = async (currentUserId, filter) => {
    const followingDocs = await Follow.find({ follower: currentUserId, status: "accepted" }).select("following").lean();
    const followingIds = followingDocs.map(f => f.following);
    filter.$or = [
        { authorIsPrivate: { $ne: true } },
        { author: { $in: [...followingIds, currentUserId] } }
    ];
};

const applyCursorPagination = (filter, cursor) => {
    if (cursor) {
        if (mongoose.Types.ObjectId.isValid(cursor)) {
            filter._id = { $lt: cursor };
        } else {
            return { error: "Invalid cursor format" };
        }
    }
    return {};
};

const getLikesPopulate = (excludeUserIds) =>
    excludeUserIds.length
        ? { path: "likes", select: "username name avatar _id", match: { _id: { $nin: excludeUserIds } } }
        : { path: "likes", select: "username name avatar _id" };

const addBookmarkMeta = (posts, reqUser) => {
    const userBookmarkSet = reqUser?.bookmarks
        ? new Set(reqUser.bookmarks.map(String))
        : new Set();
    return posts.map(p => ({
        ...(p.toObject ? p.toObject() : p),
        isBookmarked: userBookmarkSet.has(p._id.toString()),
    }));
};

const sendPaginatedResponse = (res, posts, limit) => {
    const hasMore = posts.length === limit;
    const nextCursor = hasMore ? posts[posts.length - 1]._id : null;
    res.status(200).json({ posts, limit, hasMore, nextCursor });
};

// --------------- Shared top-posts aggregation ---------------

const getTopPosts = (daysAgo, maxResults) => async (req, res) => {
  try {
    const since = new Date();
    since.setDate(since.getDate() - daysAgo);
    const requestedLimit = Number.parseInt(req.query.limit, 10);
    const limit = Math.min(
      Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : maxResults,
      maxResults
    );
    let filter = { createdAt: { $gte: since }, isDeleted: { $ne: true } };
    let excludeUserIds = [];

        if (req.user) {
            const { currentUserId, excludeUserIds: exIds } = await buildBlockExclusion(req.user);
            excludeUserIds = exIds;
            filter = buildVisibilityFilter(currentUserId, excludeUserIds, filter);
            await addPrivacyOrClause(currentUserId, filter);
        } else {
            filter.authorIsPrivate = { $ne: true };
            filter.isFlaggedForReview = { $ne: true };
        }

    const posts = await Post.aggregate([
      { $match: filter },
      {
        $addFields: {
          likes: { $setDifference: ["$likes", excludeUserIds] },
          likesCount: { $size: { $setDifference: ["$likes", excludeUserIds] } },
          commentsCount: { $ifNull: ["$commentsCount", 0] },
          sharesCount: { $ifNull: ["$sharesCount", 0] },
        },
      },
      {
        $addFields: {
          engagementScore: {
            $add: [
              { $multiply: ["$likesCount", 4] },
              { $multiply: ["$commentsCount", 3] },
              { $multiply: ["$sharesCount", 2] },
            ],
          },
        },
      },
      { $sort: { engagementScore: -1, createdAt: -1 } },
      { $limit: limit },
      { $lookup: { from: "users", localField: "author", foreignField: "_id", as: "author" } },
      { $unwind: "$author" },
      {
        $project: {
          _id: 1, content: 1, image: 1, intent: 1, likes: 1,
          commentsCount: 1, sharesCount: 1, likesCount: 1,
          createdAt: 1, updatedAt: 1, poll: 1, isEdited: 1, editedAt: 1,
          "author._id": 1, "author.username": 1, "author.name": 1,
          "author.surname": 1, "author.avatar": 1,
        },
      }
    ]);

    const postsWithMeta = addBookmarkMeta(posts, req.user);
    res.status(200).json({ success: true, posts: postsWithMeta });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const removePostById = async (postId) => {
    const post = await Post.findById(postId);
    if (!post) {
        return null;
    }

    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            const comments = await Comment.find({ post: postId }, "_id", { session });
            const commentIds = comments.map(c => c._id);

            if (commentIds.length > 0) {
                await Report.deleteMany(
                    { targetType: "comment", targetId: { $in: commentIds } },
                    { session }
                );
            }

            await Comment.deleteMany({ post: postId }, { session });
            await Notification.deleteMany({ post: postId }, { session });
            await Report.deleteMany({ targetType: "post", targetId: postId }, { session });
            await User.updateMany({ bookmarks: postId }, { $pull: { bookmarks: postId } }, { session });
            post.isDeleted = true;
            post.deletedAt = new Date();
            await post.save({ session });
        });
    } finally {
        await session.endSession();
    }

    if (post.imagePublicId) {
        try {
            await cloudinary.uploader.destroy(post.imagePublicId);
        } catch (error) {
            console.error("Failed to delete post image from Cloudinary:", error);
        }
    }

    return post;
};

export const createPost = async (req, res) => {
    let imagePublicId = null;
    try {
        const {
  content: rawContent,
  intent,
  pollQuestion,
  pollOptions,
  pollExpiresAt
} = req.body;
        const content = (rawContent || "").trim();
        const hasPoll = pollQuestion && pollOptions;

if (!intent || (!content && !req.file && !hasPoll)) {
    return res.status(400).json({
        success: false,
        message: "Post must contain content, image, or poll"
    });
}

        const validIntents = ["ask", "build", "share", "discuss", "reflect"];
        if (!validIntents.includes(intent)) {
            return res.status(400).json({
                success: false,
                message: "Invalid intent. Must be one of: ask, build, share, discuss, reflect"
            });
        }

        let image = null;

        if (req.file) {
            await validateImageUpload(req.file, {
                allowedFormats: ["jpeg", "png", "gif", "webp", "avif"],
                maxSize: IMAGE_UPLOAD_LIMITS.post,
                label: "Post image",
            });
            const uploadResult = await uploadToCloudinary(req.file, {
                folder: "posts"
            });
            image = uploadResult.secure_url;
            imagePublicId = uploadResult.public_id;
        }

        let poll = undefined;

if (pollQuestion && pollOptions) {
    const parsedOptions =
  typeof pollOptions === "string"
    ? JSON.parse(pollOptions)
    : pollOptions;

if (!Array.isArray(parsedOptions)) {
  return res.status(400).json({
    success: false,
    message: "Poll options must be an array"
  });
}

const cleanedOptions = parsedOptions
  .map(option => option?.trim())
  .filter(Boolean);

if (cleanedOptions.length < 2) {
  return res.status(400).json({
    success: false,
    message: "Poll requires at least 2 options"
  });
}

if (
  pollExpiresAt &&
  new Date(pollExpiresAt) <= new Date()
) {
  return res.status(400).json({
    success: false,
    message: "Poll expiry must be in the future"
  });
}

poll = {
  question: pollQuestion.trim(),
  options: cleanedOptions.map(option => ({
    text: option,
    voters: []
  })),
  expiresAt: pollExpiresAt || null
};
}

        const post = await Post.create({
  author: req.user.id,
  authorIsPrivate: req.user.isPrivate || false,
  content,
  intent,
  image,
  imagePublicId,
  poll
});
        const populatedPost = await post.populate("author", "username name surname avatar");

        const usernames = extractMentions(content);

        if (usernames.length > 0) {
            const mentionedUsers = await User.find({
                username: { $in: usernames.map(u => u.toLowerCase()) }
            }).select("_id username");

            for (const mentionedUser of mentionedUsers) {
                const mentionedUserId = mentionedUser._id.toString();

                // Don't notify yourself
                if (mentionedUserId === req.user.id) continue;

                const mentionNotification = await Notification.create({
                    recipient: mentionedUser._id,
                    sender: req.user.id,
                    type: "mention",
                    post: post._id,
                });

                getIO().to(mentionedUserId).emit("notification:new", {
                    notificationId: mentionNotification._id,
                    type: "mention",
                });
            }
        }
        res.status(201).json({
            success: true,
            post: populatedPost
        });
    } catch (error) {
        await cleanupTempUpload(req.file);
        if (imagePublicId) {
            await cloudinary.uploader.destroy(imagePublicId).catch((error) => {
                console.error("Cloudinary cleanup failed:", error);
            });
        }
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message
        })
    }
}

export const getPosts = asyncHandler(async (req, res) => {
    const cursor = req.query.cursor;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), MAX_LIMIT);

        let filter = { isDeleted: { $ne: true } };
        if (req.user) {
            const { currentUserId, excludeUserIds } = await buildBlockExclusion(req.user);
            filter = buildVisibilityFilter(currentUserId, excludeUserIds, filter);
            await addPrivacyOrClause(currentUserId, filter);
            const cursorErr = applyCursorPagination(filter, cursor);
            if (cursorErr.error) return res.status(400).json({ success: false, message: cursorErr.error });

        const posts = await Post.find(filter)
            .sort({ _id: -1 })
            .limit(limit)
            .populate("author", "username name surname avatar")
            .populate(getLikesPopulate(excludeUserIds));

        sendPaginatedResponse(res, addBookmarkMeta(posts, req.user), limit);
    } else {
        filter.authorIsPrivate = { $ne: true };
        filter.isFlaggedForReview = { $ne: true };
        const cursorErr = applyCursorPagination(filter, cursor);
        if (cursorErr.error) return res.status(400).json({ success: false, message: cursorErr.error });

        const posts = await Post.find(filter)
            .sort({ _id: -1 })
            .limit(limit)
            .populate("author", "username name surname avatar")
            .populate(getLikesPopulate([]));

        sendPaginatedResponse(res, addBookmarkMeta(posts, req.user), limit);
    }
});

export const searchPosts = asyncHandler(async (req, res) => {

    const q = req.query.q?.trim();
    const cursor = req.query.cursor;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), MAX_LIMIT);

    if (!q) {
        return res.status(200).json({ posts: [], limit, hasMore: false, nextCursor: null });
    }

        let filter = { $text: { $search: q }, isDeleted: { $ne: true } };
        if (req.user) {
            const { currentUserId, excludeUserIds } = await buildBlockExclusion(req.user);
            filter = buildVisibilityFilter(currentUserId, excludeUserIds, filter);
            await addPrivacyOrClause(currentUserId, filter);
            const cursorErr = applyCursorPagination(filter, cursor);
            if (cursorErr.error) return res.status(400).json({ success: false, message: cursorErr.error });

   
        const posts = await Post.find(filter)
            .sort({ _id: -1 })
            .limit(limit)
            .populate("author", "username name surname avatar")
            .populate(getLikesPopulate(excludeUserIds));

        sendPaginatedResponse(res, addBookmarkMeta(posts, req.user), limit);
    } else {
        filter.authorIsPrivate = { $ne: true };
        filter.isFlaggedForReview = { $ne: true };
        const cursorErr = applyCursorPagination(filter, cursor);
        if (cursorErr.error) return res.status(400).json({ success: false, message: cursorErr.error });

        const posts = await Post.find(filter)
            .sort({ _id: -1 })
            .limit(limit)
            .populate("author", "username name surname avatar")
            .populate(getLikesPopulate([]));

        sendPaginatedResponse(res, addBookmarkMeta(posts, req.user), limit);
    }
});

export const deletePost = asyncHandler(async (req, res) => {
    const postId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
        return res.status(400).json({ success: false, message: "Invalid post ID format" });
    }

    const userId = req.user.id;
    const post = await Post.findById(postId);
    if (!post) {
        return res.status(404).json({
            success: false,
            message: "Post not found",
        });
    }
    if (post.author.toString() !== userId) {
        return res.status(403).json({
            success: false,
            message: "You are not allowed to delete this post",
        });
    }

    await removePostById(postId);
    res.status(200).json({
        success: true,
        message: "Post deleted successfully",
    });

});

export const updatePost = async (req, res) => {
    let newImagePublicId = null;
    try {
        const postId = req.params.id;
        const userId = req.user.id;
        const { content = "", intent, removeImage } = req.body;

        if (!mongoose.Types.ObjectId.isValid(postId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid post ID format",
            });
        }

        const validIntents = ["ask", "build", "share", "discuss", "reflect"];
        if (!intent || !validIntents.includes(intent)) {
            return res.status(400).json({
                success: false,
                message: "Invalid intent. Must be one of: ask, build, share, discuss, reflect",
            });
        }

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Post not found",
            });
        }

        if (post.author.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: "You are not allowed to edit this post",
            });
        }

        const normalizedContent = content.trim();
        const shouldRemoveImage = removeImage === "true" || removeImage === true;

        if (normalizedContent.length > 1000) {
            return res.status(400).json({
                success: false,
                message: "Content must be 1000 characters or less",
            });
        }

        if (!normalizedContent && !req.file && (shouldRemoveImage || !post.image)) {
            return res.status(400).json({
                success: false,
                message: "Either content or image is required",
            });
        }

        if (req.file) {
            await validateImageUpload(req.file, {
                allowedFormats: ["jpeg", "png", "gif", "webp", "avif"],
                maxSize: IMAGE_UPLOAD_LIMITS.post,
                label: "Post image",
            });
            const uploadResult = await uploadToCloudinary(req.file, {
                folder: "posts",
            });
            newImagePublicId = uploadResult.public_id;
            if (post.imagePublicId) {
                await cloudinary.uploader.destroy(post.imagePublicId).catch((error) => {
                    console.error("Cloudinary cleanup failed:", error);
                });
            }
            post.image = uploadResult.secure_url;
            post.imagePublicId = newImagePublicId;
        } else if (shouldRemoveImage && post.imagePublicId) {
            await cloudinary.uploader.destroy(post.imagePublicId);
            post.image = null;
            post.imagePublicId = null;
        }

        post.content = normalizedContent;
        post.intent = intent;
        post.isEdited = true;
        post.editedAt = new Date();

        await post.save();
        const populatedPost = await post.populate([
            { path: "author", select: "username name surname avatar" },
            { path: "likes", select: "username name avatar _id" },
        ]);

        res.status(200).json({
            success: true,
            post: populatedPost,
        });
    } catch (error) {
        await cleanupTempUpload(req.file);
        if (newImagePublicId) {
            await cloudinary.uploader.destroy(newImagePublicId).catch((error) => {
                console.error("Cloudinary cleanup failed:", error);
            });
        }
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message,
        });
    }
};

const likeBlockCheck = async (postId, userId, postAuthorId) => {
    if (postAuthorId.toString() === userId) return null;
    const [authorUser, currentUser] = await Promise.all([
        User.findById(postAuthorId).select("blockedUsers"),
        User.findById(userId).select("blockedUsers"),
    ]);
    const isBlocked = currentUser?.blockedUsers?.some(
        id => id.toString() === postAuthorId.toString()
    ) || authorUser?.blockedUsers?.some(
        id => id.toString() === userId
    );
    if (isBlocked) {
        return { success: false, message: "Action forbidden due to block status" };
    }
    return null;
};

export const likePost = asyncHandler(async (req, res) => {
    const postId = req.params.id;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
        return res.status(400).json({ success: false, message: "Invalid post ID format" });
    }

    const post = await Post.findById(postId).select("author");
    if (!post) {
        return res.status(404).json({ success: false });
    }

    const blockError = await likeBlockCheck(postId, userId, post.author);
    if (blockError) {
        return res.status(403).json(blockError);
    }

    const result = await Post.updateOne(
        { _id: postId, likes: { $ne: userId } },
        { $addToSet: { likes: userId } }
    );

    const liked = result.modifiedCount > 0;

    if (liked && post.author.toString() !== userId) {
        // Final block re-verification before socket emission: a concurrent
        // blockUser may have blocked since the mid-flight re-check above.
        const [finalAuthor, finalCurrent] = await Promise.all([
            User.findById(post.author).select("blockedUsers"),
            User.findById(userId).select("blockedUsers"),
        ]);
        const finalBlocked = finalCurrent?.blockedUsers?.some(
            id => id.toString() === post.author.toString()
        ) || finalAuthor?.blockedUsers?.some(
            id => id.toString() === userId
        );
        if (finalBlocked) {
            await Notification.findOneAndDelete(
                { recipient: post.author, sender: userId, type: "like", post: postId }
            );
            return res.status(403).json({ success: false, message: "Action forbidden due to block status" });
        }

        const notification = await Notification.findOneAndUpdate(
            {
                recipient: post.author,
                sender: userId,
                type: "like",
                post: postId,
            },
            {
                $setOnInsert: {
                    recipient: post.author,
                    sender: userId,
                    type: "like",
                    post: postId,
                },
            },
            { upsert: true, new: true }
        );

        getIO().to(post.author.toString()).emit("notification:new", {
            notificationId: notification._id,
            type: notification.type,
        });
    }

    const updatedPost = await Post.findById(postId).select("likes");

    res.json({
        success: true,
        likesCount: updatedPost.likes.length,
        liked,
    });
});

export const unlikePost = asyncHandler(async (req, res) => {
    const postId = req.params.id;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
        return res.status(400).json({ success: false, message: "Invalid post ID format" });
    }

    const post = await Post.findById(postId).select("author");
    if (!post) {
        return res.status(404).json({ success: false });
    }

    const blockError = await likeBlockCheck(postId, userId, post.author);
    if (blockError) {
        return res.status(403).json(blockError);
    }

    const result = await Post.updateOne(
        { _id: postId, likes: userId },
        { $pull: { likes: userId } }
    );

    const unliked = result.modifiedCount > 0;

    if (unliked) {
        const deletedNotification = await Notification.findOneAndDelete({
            recipient: post.author,
            sender: userId,
            type: "like",
            post: postId,
        });

        if (deletedNotification) {
            getIO().to(post.author.toString()).emit("notification:removed", {
                notificationId: deletedNotification._id,
            });
        }
    }

    const updatedPost = await Post.findById(postId).select("likes");

    res.json({
        success: true,
        likesCount: updatedPost.likes.length,
        liked: false,
    });
});

export const getPostsByUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
            success: false,
            message: "Invalid user ID format",
        });
    }

    // Fetch target user to check privacy status
    const targetUser = await User.findById(userId);
    if (!targetUser) {
        return res.status(404).json({
            success: false,
            message: "User not found",
        });
    }

    // Check if current user is allowed to see posts
    const isSelf = req.user?.id === userId;
    const isFollower = req.user ? await Follow.exists({ follower: req.user.id, following: userId, status: "accepted" }) : false;

    if (req.user) {
        const currentUserId = req.user.id;
        const isBlocked = req.user.blockedUsers?.some(id => id.toString() === userId) ||
            targetUser.blockedUsers?.some(id => id.toString() === currentUserId);
        if (isBlocked) {
            return res.status(403).json({
                success: false,
                message: "Action forbidden due to block status"
            });
        }
    }

    if (targetUser.isPrivate && !isSelf && !isFollower) {
        return res.status(200).json({
            success: true,
            posts: [],
            message: "This account is private. Follow to see posts."
        });
    }

    let excludeUserIds = [];
    if (req.user) {
        const currentUserId = req.user._id || req.user.id;
        const blockers = await User.find({ blockedUsers: currentUserId }).select("_id");
        const blockerIds = blockers.map(u => u._id);
        const blockedIds = req.user.blockedUsers || [];
        excludeUserIds = [...blockedIds, ...blockerIds];
    }


        const cursor = req.query.cursor;
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), MAX_LIMIT);

        const likesPopulate = getLikesPopulate(excludeUserIds);

        let pinnedPosts = [];
        if (!cursor) {
            pinnedPosts = await Post.find({ author: userId, isPinned: true, isFlaggedForReview: { $ne: true },isDeleted: { $ne: true } })
                .populate("author", "username name avatar")
                .populate(likesPopulate)
                .sort({ _id: -1 });
        }

        let postFilter = { author: userId, isPinned: { $ne: true }, isFlaggedForReview: { $ne: true },isDeleted: { $ne: true } };
        if (cursor) {
            if (mongoose.Types.ObjectId.isValid(cursor)) {
                postFilter._id = { $lt: cursor };
            } else {
                return res.status(400).json({ success: false, message: "Invalid cursor format" });
            }
        }

        const normalPosts = await Post.find(postFilter)
            .populate("author", "username name avatar")
            .sort({ _id: -1 })
            .limit(limit)
            .lean();

        const posts = [...pinnedPosts, ...normalPosts];

        // Fetch likes separately with optimization:
        // - Limit to MAX_LIKES_PREVIEW full documents
        // - Include total count for all likes
        const postsWithLikes = await Promise.all(
            posts.map(async (post) => {
                // Filter out blocked users from likes array
                let likesAfterBlocking = post.likes;
                if (excludeUserIds.length) {
                    likesAfterBlocking = post.likes.filter(
                        (likeId) => !excludeUserIds.some((excludedId) => excludedId.toString() === likeId.toString())
                    );
                }

                // Fetch only the preview set of likes (limited documents)
                const likesPreview = await User.find(
                    { _id: { $in: likesAfterBlocking.slice(0, MAX_LIKES_PREVIEW) } },
                    "username name avatar _id"
                ).lean();

                return {
                    ...post,
                    likes: likesPreview,
                    likesCount: likesAfterBlocking.length,
                    likesPreviewCount: Math.min(likesAfterBlocking.length, MAX_LIKES_PREVIEW),
                };
            })
        );

        // Populate author field
        const postsWithAuthor = await Promise.all(
            postsWithLikes.map(async (post) => {
                const author = await User.findById(post.author, "username name avatar").lean();
                return { ...post, author };
            })
        );

        const hasMore = posts.length === limit;
        const nextCursor = hasMore ? posts[posts.length - 1]._id : null;
        const userBookmarkSet = req.user?.bookmarks
            ? new Set(req.user.bookmarks.map(String))
            : new Set();
        const postsWithMeta = postsWithAuthor.map((p) => ({
            ...p,
            isBookmarked: userBookmarkSet.has(p._id.toString()),
        }));

        return res.status(200).json({
            success: true,
            posts: postsWithMeta,
            hasMore,
            nextCursor,
            limit,
        });
   
});

export const getSinglePost = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(postId)) {
        return res.status(400).json({ message: "Invalid post ID format" });
    }

    let excludeUserIds = [];
    if (req.user) {
        const currentUserId = req.user._id || req.user.id;
        const blockers = await User.find({ blockedUsers: currentUserId }).select("_id");
        const blockerIds = blockers.map(u => u._id);
        const blockedIds = req.user.blockedUsers || [];
        excludeUserIds = [...blockedIds, ...blockerIds];
    }

    const post = await Post.findById(postId)
        .populate("author", "username name avatar isPrivate")
        .populate(
            excludeUserIds.length
                ? { path: "likes", select: "username name avatar _id", match: { _id: { $nin: excludeUserIds } } }
                : { path: "likes", select: "username name avatar _id" }
        );
    if (!post) {
        return res.status(404).json({ message: "Post not found" });
    }

    if (post.isFlaggedForReview) {
        return res.status(404).json({ message: "Post not found" });
    }

    const author = post.author;
    const authorId = author._id;

    // Fetch full author data for block checks
    const authorFull = await User.findById(authorId).select("blockedUsers");

    if (req.user) {
        const currentUserId = req.user.id;
        const isBlocked = req.user.blockedUsers?.some(id => id.toString() === authorId.toString()) ||
            authorFull?.blockedUsers?.some(id => id.toString() === currentUserId);
        if (isBlocked) {
            return res.status(403).json({ message: "Action forbidden due to block status" });
        }

        let excludeUserIds = [];
        if (req.user) {
            const currentUserId = req.user._id || req.user.id;
            const blockers = await User.find({ blockedUsers: currentUserId }).select("_id");
            const blockerIds = blockers.map(u => u._id);
            const blockedIds = req.user.blockedUsers || [];
            excludeUserIds = [...blockedIds, ...blockerIds];
        }

        const post = await Post.findOne({ _id: postId, isDeleted: { $ne: true } })
            .populate("author", "username name avatar isPrivate")
            .populate(
                excludeUserIds.length
                    ? { path: "likes", select: "username name avatar _id", match: { _id: { $nin: excludeUserIds } } }
                    : { path: "likes", select: "username name avatar _id" }
            );
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        if (post.isFlaggedForReview) {
            return res.status(404).json({ message: "Post not found" });
        }

        if (req.user) {
            const currentUserId = req.user.id;
            const isBlocked = req.user.blockedUsers?.some(id => id.toString() === authorId.toString()) ||
                              authorFull?.blockedUsers?.some(id => id.toString() === currentUserId);
            if (isBlocked) {
                return res.status(403).json({ message: "Action forbidden due to block status" });
            }
              } else if (author.isPrivate) {
        return res.status(403).json({ message: "This post is from a private account. Follow them to see it." });
    }
        }

        if (req.user) {
    const userId = req.user.id;

    if (
        !post.viewedBy?.some(
            id => id.toString() === userId
        )
    ) {
        await Post.findByIdAndUpdate(
            postId,
            {
                $addToSet: { viewedBy: userId },
                $inc: { viewCount: 1 }
            }
        );

        post.viewCount = (post.viewCount || 0) + 1;
    }
}
        const postObj = post.toObject();
        postObj.isBookmarked = req.user?.bookmarks
            ? req.user.bookmarks.map(String).includes(post._id.toString())
            : false;
        res.json(postObj);
   
});

export const getTopPostsOfWeek = getTopPosts(7, MAX_LIMIT);

export const getTopPostsOfMonth = getTopPosts(30, 3);



export const incrementShare = asyncHandler(async (req, res) => {
    const postId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(postId)) {
        return res.status(400).json({ success: false, message: "Invalid post ID format" });
    }
    const userId = req.user.id || req.user._id;

        const post = await Post.findById(postId)
.select("viewCount viewedBy author content image likes commentsCount sharesCount poll createdAt authorIsPrivate")
        if (!post) {
            return res.status(404).json({ success: false, message: "Post not found" });
        }

    if (post.author.toString() !== userId.toString()) {
        const [authorUser, currentUser] = await Promise.all([
            User.findById(post.author).select("blockedUsers"),
            User.findById(userId).select("blockedUsers"),
        ]);
        const isBlocked = currentUser?.blockedUsers?.some(
            id => id.toString() === post.author.toString()
        ) || authorUser?.blockedUsers?.some(
            id => id.toString() === userId.toString()
        );
        if (isBlocked) {
            return res.status(403).json({ success: false, message: "Action forbidden due to block status" });
        }

        if (post.authorIsPrivate) {
            const isFollower = await Follow.exists({ follower: userId, following: post.author, status: "accepted" });
            if (!isFollower) {
                return res.status(403).json({ success: false, message: "This account is private. Follow to interact with their posts." });
            }
        }
    }

    const updatedPost = await Post.findOneAndUpdate(
        { _id: postId, sharedBy: { $ne: userId } },
        { $addToSet: { sharedBy: userId }, $inc: { sharesCount: 1 } },
        { new: true }
    );

    if (!updatedPost) {
        return res.status(409).json({ success: false, message: "Already shared" });
    }

    res.json({
        success: true,
        sharesCount: updatedPost.sharesCount,
    });

});
export const toggleBookmark = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id || req.user._id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res
            .status(400)
            .json({ success: false, message: "Invalid post ID format" });
    }
    const post = await Post.findById(id);
    if (!post) {
        return res
            .status(404)
            .json({ success: false, message: "Post not found" });
    }
    const user = await User.findById(userId);
    if (!user)
        return res
            .status(404)
            .json({ success: false, message: "User not found" });
    const isBookmarked = user.bookmarks.includes(id);

    // Only enforce block/privacy checks when adding a new bookmark (removal is always allowed)
    if (!isBookmarked && post.author.toString() !== userId) {
        const [postAuthor, currentUser] = await Promise.all([
            User.findById(post.author).select("blockedUsers isPrivate"),
            User.findById(userId).select("blockedUsers"),
        ]);
        const isBlocked = currentUser?.blockedUsers?.some(
            id => id.toString() === post.author.toString()
        ) || postAuthor?.blockedUsers?.some(
            id => id.toString() === userId
        );
        if (isBlocked) {
            return res.status(403).json({ success: false, message: "Action forbidden due to block status" });
        }
        if (postAuthor?.isPrivate) {
            const isFollower = await Follow.exists({ follower: userId, following: post.author, status: "accepted" });
            if (!isFollower) {
                return res.status(403).json({ success: false, message: "This account is private. Follow to bookmark posts." });
            }
        }
    }

    if (isBookmarked) {
        await User.updateOne({ _id: userId }, { $pull: { bookmarks: id } });
    } else {
        await User.updateOne({ _id: userId }, { $addToSet: { bookmarks: id } });
    }
    res.status(200).json({
        success: true,
        bookmarked: !isBookmarked,
        message: isBookmarked ? "Removed from bookmarks" : "Added to bookmarks",
    });

});

export const getBookmarks = asyncHandler(async (req, res) => {
    const { cursor } = req.query;
    const limit = 10;
    const user = await User.findById(req.user.id).select("bookmarks").lean();
    if (!user)
        return res
            .status(404)
            .json({ success: false, message: "User not found" });
    if (!user.bookmarks.length) {
        return res.json({ posts: [], nextCursor: null });
    }
    const bookmarkIds = user.bookmarks;
    if (cursor) {
        if (!mongoose.Types.ObjectId.isValid(cursor)) {
            return res
                .status(400)
                .json({ success: false, message: "Invalid cursor" });
        }
    }

    const filter = { _id: { $in: bookmarkIds }, isFlaggedForReview: { $ne: true }, isDeleted: { $ne: true } };
    if (cursor) {
        filter._id = { $in: bookmarkIds, $lt: new mongoose.Types.ObjectId(cursor) };
    }

    const currentUserId = req.user._id?.toString() || req.user.id?.toString();
    const blockedIds = req.user.blockedUsers || [];
    const blockerDocs = await User.find({ blockedUsers: currentUserId }).select("_id").lean();
    const blockerIds = blockerDocs.map(u => u._id);
    const excludeUserIds = [...blockedIds, ...blockerIds];

    if (excludeUserIds.length > 0) {
        filter.author = { $nin: excludeUserIds };
    }

    const followingDocs = await Follow.find({ follower: currentUserId, status: "accepted" }).select("following").lean();
    const followingIds = followingDocs.map(f => f.following);

    filter.$or = [
        { authorIsPrivate: { $ne: true } },
        { author: { $in: [...followingIds, currentUserId] } }
    ];

    const posts = await Post.find(filter)
      .sort({ _id: -1 })
      .limit(limit + 1)

      .populate("author", "username name surname avatar")
      .populate("likes", "username name avatar _id")
      .lean();

    const hasNextPage = posts.length > limit;
    const pagePosts = hasNextPage ? posts.slice(0, limit) : posts;

    const postsWithMeta = pagePosts.map((p) => ({
        ...p,
        isBookmarked: true,
    }));
    const nextCursor = hasNextPage
        ? pagePosts[pagePosts.length - 1]._id.toString()
        : null;
    res.json({ posts: postsWithMeta, nextCursor });

});

export const togglePinPost = asyncHandler(async (req, res) => {
    const postId = req.params.id;
    const userId = req.user.id || req.user._id;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
        return res.status(400).json({ success: false, message: "Invalid post ID format" });
    }

    const post = await Post.findById(postId);
    if (!post) {
        return res.status(404).json({ success: false, message: "Post not found" });
    }

    // Only allow author of post to pin/unpin it
    if (post.author.toString() !== userId.toString()) {
        return res.status(403).json({ success: false, message: "You are not allowed to pin this post" });
    }

    if (post.isPinned) {
        post.isPinned = false;
        await post.save();
        return res.status(200).json({ success: true, isPinned: false, message: "Post unpinned successfully" });
    } else {
        // Limit to 3 pinned posts
        const pinnedCount = await Post.countDocuments({ author: userId, isPinned: true });
        if (pinnedCount >= 3) {
            return res.status(400).json({ success: false, message: "You can only pin up to 3 posts" });
        }
        post.isPinned = true;
        await post.save();
        return res.status(200).json({ success: true, isPinned: true, message: "Post pinned successfully" });
    }
});

export const votePoll = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { optionIndex } = req.body;
  const userId = req.user.id;

  const post = await Post.findById(id);

  if (!post || !post.poll) {
    return res.status(404).json({
      success: false,
      message: "Poll not found"
    });
  }

  if (
    post.poll.expiresAt &&
    new Date() > new Date(post.poll.expiresAt)
  ) {
    return res.status(400).json({
      success: false,
      message: "Poll has expired"
    });
  }

  const alreadyVoted =
    post.poll.options.some(option =>
      option.voters.some(
        voter => voter.toString() === userId
      )
    );

  if (alreadyVoted) {
    return res.status(400).json({
      success: false,
      message: "You already voted"
    });
  }

  if (
    optionIndex < 0 ||
    optionIndex >= post.poll.options.length
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid option"
    });
  }

  post.poll.options[optionIndex]
      .voters.push(userId);

  await post.save();

  res.status(200).json({
    success: true,
    message: "Vote recorded"
  });
});

export const getPollResults = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);

  if (!post || !post.poll) {
    return res.status(404).json({
      success: false,
      message: "Poll not found"
    });
  }

  const totalVotes =
    post.poll.options.reduce(
      (sum, option) =>
        sum + option.voters.length,
      0
    );

  const results =
    post.poll.options.map(option => ({
      text: option.text,
      votes: option.voters.length,
      percentage:
        totalVotes > 0
          ? Math.round(
              option.voters.length *
              100 /
              totalVotes
            )
          : 0
    }));

  res.status(200).json({
    success: true,
    totalVotes,
    results
  });
});
