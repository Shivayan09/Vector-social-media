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

export const removePostById = async (postId) => {
    const post = await Post.findById(postId);
    if (!post) {
        return null;
    }

    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            await Comment.deleteMany({ post: postId }, { session });
            await Notification.deleteMany({ post: postId }, { session });
            await Report.deleteMany({ targetType: "post", targetId: postId }, { session });
            await User.updateMany({ bookmarks: postId }, { $pull: { bookmarks: postId } }, { session });
            await post.deleteOne({ session });
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
        const { content, intent } = req.body;
        if (!intent || (!content && !req.file)) {
            return res.status(400).json({
                success: false,
                message: "Intent and either content or image are required"
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
            const uploadResult = await uploadToCloudinary(req.file, {
                folder: "posts"
            });
            image = uploadResult.secure_url;
            imagePublicId = uploadResult.public_id;
        }

        const post = await Post.create({ 
            author: req.user.id, 
            authorIsPrivate: req.user.isPrivate || false,
            content: content || "", 
            intent, 
            image, 
            imagePublicId 
        });
        const populatedPost = await post.populate("author", "username name surname avatar");
        res.status(201).json({
            success: true,
            post: populatedPost
        });
    } catch (error) {
        if (imagePublicId) {
            await cloudinary.uploader.destroy(imagePublicId).catch(() => {});
        }
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const getPosts = async (req, res) => {
    try {
        const cursor = req.query.cursor;
        const limit = parseInt(req.query.limit) || 10;

        let filter = {};
        let excludeUserIds = [];
        if (req.user) {
            const currentUserId = req.user._id || req.user.id;
            const blockers = await User.find({ blockedUsers: currentUserId }).select("_id");
            const blockerIds = blockers.map(u => u._id);
            const blockedIds = req.user.blockedUsers || [];
            excludeUserIds = [...blockedIds, ...blockerIds];

            if (excludeUserIds.length > 0) {
                filter = { author: { $nin: excludeUserIds } };
            }

            const followingDocs = await Follow.find({ follower: currentUserId, status: "accepted" }).select("following").lean();
            const followingIds = followingDocs.map(f => f.following);
            filter.$or = [
                { authorIsPrivate: { $ne: true } },
                { author: { $in: [...followingIds, currentUserId] } }
            ];
        } else {
            filter.authorIsPrivate = { $ne: true };
        }

        if (cursor) {
            if (mongoose.Types.ObjectId.isValid(cursor)) {
                filter._id = { $lt: cursor };
            } else {
                return res.status(400).json({ success: false, message: "Invalid cursor format" });
            }
        }

        const posts = await Post.find(filter)
            .sort({ _id: -1 })
            .limit(limit)
            .populate("author", "username name surname avatar")
            .populate(
                excludeUserIds.length
                    ? { path: "likes", select: "username name avatar _id", match: { _id: { $nin: excludeUserIds } } }
                    : { path: "likes", select: "username name avatar _id" }
            );

        const hasMore = posts.length === limit;
        const nextCursor = hasMore ? posts[posts.length - 1]._id : null;

        const userBookmarkSet = req.user?.bookmarks
            ? new Set(req.user.bookmarks.map(String))
            : new Set();
        const postsWithMeta = posts.map((p) => ({
        ...p.toObject(),
        isBookmarked: userBookmarkSet.has(p._id.toString()),
        }));
        res.status(200).json({
            posts: postsWithMeta,
            limit,
            hasMore,
            nextCursor,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

export const searchPosts = async (req, res) => {
    try {
        const q = req.query.q?.trim();
        const cursor = req.query.cursor;
        const limit = parseInt(req.query.limit) || 10;

        if (!q) {
            return res.status(200).json({ posts: [], limit, hasMore: false, nextCursor: null });
        }

        let filter = { $text: { $search: q } };
        let excludeUserIds = [];
        
        if (req.user) {
            const currentUserId = req.user._id || req.user.id;
            const blockers = await User.find({ blockedUsers: currentUserId }).select("_id");
            const blockerIds = blockers.map(u => u._id);
            const blockedIds = req.user.blockedUsers || [];
            excludeUserIds = [...blockedIds, ...blockerIds];

            if (excludeUserIds.length > 0) {
                filter.author = { $nin: excludeUserIds };
            }

            const followingDocs = await Follow.find({ follower: currentUserId, status: "accepted" }).select("following").lean();
            const followingIds = followingDocs.map(f => f.following);
            filter.$or = [
                { authorIsPrivate: { $ne: true } },
                { author: { $in: [...followingIds, currentUserId] } }
            ];
        } else {
            filter.authorIsPrivate = { $ne: true };
        }

        if (cursor) {
            if (mongoose.Types.ObjectId.isValid(cursor)) {
                filter._id = { $lt: cursor };
            } else {
                return res.status(400).json({ success: false, message: "Invalid cursor format" });
            }
        }

        const posts = await Post.find(filter)
            .sort({ _id: -1 })
            .limit(limit)
            .populate("author", "username name surname avatar")
            .populate(
                excludeUserIds.length
                    ? { path: "likes", select: "username name avatar _id", match: { _id: { $nin: excludeUserIds } } }
                    : { path: "likes", select: "username name avatar _id" }
            );

        const hasMore = posts.length === limit;
        const nextCursor = hasMore ? posts[posts.length - 1]._id : null;

        const userBookmarkSet = req.user?.bookmarks
            ? new Set(req.user.bookmarks.map(String))
            : new Set();
        const postsWithMeta = posts.map((p) => ({
        ...p.toObject(),
        isBookmarked: userBookmarkSet.has(p._id.toString()),
        }));
        res.status(200).json({
            posts: postsWithMeta,
            limit,
            hasMore,
            nextCursor,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

export const deletePost = async (req, res) => {
    try {
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
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const updatePost = async (req, res) => {
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
            const uploadResult = await uploadToCloudinary(req.file, {
                folder: "posts",
            });
            if (post.imagePublicId) {
                await cloudinary.uploader.destroy(post.imagePublicId).catch(() => {});
            }
            post.image = uploadResult.secure_url;
            post.imagePublicId = uploadResult.public_id;
        } else if (shouldRemoveImage && post.imagePublicId) {
            await cloudinary.uploader.destroy(post.imagePublicId);
            post.image = null;
            post.imagePublicId = null;
        }

        post.content = normalizedContent;
        post.intent = intent;

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
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const toggleLike = async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.user.id;

        if (!mongoose.Types.ObjectId.isValid(postId)) {
            return res.status(400).json({ success: false, message: "Invalid post ID format" });
        }

        const post = await Post.findById(postId).select("author");
        if (!post) {
            return res.status(404).json({ success: false });
        }

        // Check block status between the requester and the post author
        if (post.author.toString() !== userId) {
            const [authorUser, currentUser] = await Promise.all([
                User.findById(post.author).select("blockedUsers"),
                User.findById(userId).select("blockedUsers"),
            ]);
            const isBlocked = currentUser?.blockedUsers?.some(
                id => id.toString() === post.author.toString()
            ) || authorUser?.blockedUsers?.some(
                id => id.toString() === userId
            );
            if (isBlocked) {
                return res.status(403).json({ success: false, message: "Action forbidden due to block status" });
            }
        }

        // Atomically determine whether the user was added or removed
        const addResult = await Post.updateOne(
            { _id: postId, likes: { $ne: userId } },
            { $addToSet: { likes: userId } }
        );

        let liked = addResult.modifiedCount > 0;

        if (!liked) {
            await Post.updateOne(
                { _id: postId, likes: userId },
                { $pull: { likes: userId } }
            );
            await Notification.deleteOne({ recipient: post.author, sender: userId, type: "like", post: postId });
        }

        // Re-verify block status — either side may have blocked since the pre-check
        if (liked && post.author.toString() !== userId) {
            const [currentAuthor, freshCurrent] = await Promise.all([
                User.findById(post.author).select("blockedUsers"),
                User.findById(userId).select("blockedUsers"),
            ]);
            const stillBlocked = freshCurrent?.blockedUsers?.some(id => id.toString() === post.author.toString()) ||
                                currentAuthor?.blockedUsers?.some(id => id.toString() === userId);
            if (stillBlocked) {
                await Post.updateOne({ _id: postId }, { $pull: { likes: userId } });
                liked = false;
            }
        }

        const updatedPost = await Post.findById(postId).select("likes");

        if (liked && post.author.toString() !== userId) {
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

        res.json({
            success: true,
            likesCount: updatedPost.likes.length,
            liked,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getPostsByUser = async (req, res) => {
    try {
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

        const posts = await Post.find({ author: userId })
            .populate("author", "username name avatar")
            .populate(
                excludeUserIds.length
                    ? { path: "likes", select: "username name avatar _id", match: { _id: { $nin: excludeUserIds } } }
                    : { path: "likes", select: "username name avatar _id" }
            )
            .sort({ createdAt: -1 });
        const userBookmarkSet = req.user?.bookmarks
        ? new Set(req.user.bookmarks.map(String))
        : new Set();
        const postsWithMeta = posts.map((p) => ({
        ...p.toObject(),
        isBookmarked: userBookmarkSet.has(p._id.toString()),
        }));
        return res.status(200).json({
        success: true,
        posts: postsWithMeta,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch user posts: " + error.message,
        });
    }
};

export const getSinglePost = async (req, res) => {
    try {
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

            const isSelf = currentUserId === authorId.toString();
            if (author.isPrivate && !isSelf) {
                const isFollower = await Follow.exists({ follower: currentUserId, following: authorId, status: "accepted" });
                if (!isFollower) {
                    return res.status(403).json({ message: "This post is from a private account. Follow them to see it." });
                }
            }
        } else if (author.isPrivate) {
            return res.status(403).json({ message: "This post is from a private account. Follow them to see it." });
        }
        const postObj = post.toObject();
        postObj.isBookmarked = req.user?.bookmarks
            ? req.user.bookmarks.map(String).includes(post._id.toString())
            : false;
        res.json(postObj);
    } catch (error) {
        res.status(500).json({ message: "Server error: " + error.message });
    }
};

export const getTopPostsOfWeek = async (req, res) => {
    try {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const requestedLimit = Number.parseInt(req.query.limit, 10);
        const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
            ? requestedLimit
            : 10;
        let filter = { createdAt: { $gte: oneWeekAgo } };
        let excludeUserIds = [];

        if (req.user) {
            const currentUserId = req.user._id || req.user.id;
            const blockers = await User.find({ blockedUsers: currentUserId }).select("_id");
            const blockerIds = blockers.map((user) => user._id);
            const blockedIds = req.user.blockedUsers || [];
            excludeUserIds = [...blockedIds, ...blockerIds];

            if (excludeUserIds.length > 0) {
                filter = {
                    ...filter,
                    author: { $nin: excludeUserIds },
                };
            }
            const followingDocsWeek = await Follow.find({ follower: currentUserId, status: "accepted" }).select("following").lean();
            const followingIdsWeek = followingDocsWeek.map(f => f.following);
            filter.$or = [
                { authorIsPrivate: { $ne: true } },
                { author: { $in: [...followingIdsWeek, currentUserId] } }
            ];
        } else {
            filter.authorIsPrivate = { $ne: true };
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
                    _id: 1,
                    content: 1,
                    image: 1,
                    intent: 1,
                    likes: 1,
                    commentsCount: 1,
                    sharesCount: 1,
                    likesCount: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    "author._id": 1,
                    "author.username": 1,
                    "author.name": 1,
                    "author.surname": 1,
                    "author.avatar": 1,
                },
            }
        ]);
        const userBookmarkSet = req.user?.bookmarks
            ? new Set(req.user.bookmarks.map(String))
            : new Set();
        const postsWithMeta = posts.map(p => ({
        ...p,
        isBookmarked: userBookmarkSet.has(p._id.toString()),
        }));
        res.status(200).json({
        success: true,
        posts: postsWithMeta,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const getTopPostsOfMonth = async (req, res) => {
    try {
        const oneMonthAgo = new Date();
        oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);

        let filter = { createdAt: { $gte: oneMonthAgo } };
        let excludeUserIds = [];

        if (req.user) {
            const currentUserId = req.user._id || req.user.id;
            const blockers = await User.find({ blockedUsers: currentUserId }).select("_id");
            const blockerIds = blockers.map((user) => user._id);
            const blockedIds = req.user.blockedUsers || [];
            excludeUserIds = [...blockedIds, ...blockerIds];

            if (excludeUserIds.length > 0) {
                filter = {
                    ...filter,
                    author: { $nin: excludeUserIds },
                };
            }
            const followingDocsMonth = await Follow.find({ follower: currentUserId, status: "accepted" }).select("following").lean();
            const followingIdsMonth = followingDocsMonth.map(f => f.following);
            filter.$or = [
                { authorIsPrivate: { $ne: true } },
                { author: { $in: [...followingIdsMonth, currentUserId] } }
            ];
        } else {
            filter.authorIsPrivate = { $ne: true };
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
            { $limit: 3 },
            { $lookup: { from: "users", localField: "author", foreignField: "_id", as: "author" } },
            { $unwind: "$author" },
            {
                $project: {
                    _id: 1,
                    content: 1,
                    image: 1,
                    intent: 1,
                    likes: 1,
                    commentsCount: 1,
                    sharesCount: 1,
                    likesCount: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    "author._id": 1,
                    "author.username": 1,
                    "author.name": 1,
                    "author.surname": 1,
                    "author.avatar": 1,
                },
            },
        ]);
        const userBookmarkSet = req.user?.bookmarks
            ? new Set(req.user.bookmarks.map(String))
            : new Set();
        const postsWithMeta = posts.map(p => ({
        ...p,
        isBookmarked: userBookmarkSet.has(p._id.toString()),
        }));
        res.status(200).json({
        success: true,
        posts: postsWithMeta,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const incrementShare = async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.user.id || req.user._id;

        if (!mongoose.Types.ObjectId.isValid(postId)) {
            return res.status(400).json({ success: false, message: "Invalid post ID format" });
        }

        const post = await Post.findOneAndUpdate(
            { _id: postId, sharedBy: { $ne: userId } },
            { $addToSet: { sharedBy: userId }, $inc: { sharesCount: 1 } },
            { new: true }
        );

        if (!post) {
            const exists = await Post.exists({ _id: postId });
            if (!exists) {
                return res.status(404).json({ success: false, message: "Post not found" });
            }
            return res.status(409).json({ success: false, message: "Already shared" });
        }

        res.json({
            success: true,
            sharesCount: post.sharesCount,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
export const toggleBookmark = async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getBookmarks = async (req, res) => {
  try {
    const { cursor } = req.query;
    const limit = 10;
    const user = await User.findById(req.user.id).select("bookmarks");
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    let bookmarkIds = [...user.bookmarks].reverse();
    if (cursor) {
      if (!mongoose.Types.ObjectId.isValid(cursor)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid cursor" });
      }
      const idx = bookmarkIds.findIndex((id) => id.toString() === cursor);
      if (idx === -1)
        return res
          .status(400)
          .json({ success: false, message: "Cursor not found" });
      bookmarkIds = bookmarkIds.slice(idx + 1);
    }
    bookmarkIds = bookmarkIds.slice(0, limit);
    const posts = await Post.find({ _id: { $in: bookmarkIds } })
      .populate("author", "username name surname avatar")
      .populate("likes", "username name avatar _id")
      .lean();
    const postMap = new Map(posts.map((p) => [p._id.toString(), p]));
    const orderedPosts = bookmarkIds
      .map((id) => postMap.get(id.toString()))
      .filter(Boolean);

    const currentUserId = req.user._id?.toString() || req.user.id?.toString();
    const blockedIds = new Set((req.user.blockedUsers || []).map(id => id.toString()));
    const blockerDocs = await User.find({ blockedUsers: currentUserId }).select("_id").lean();
    blockerDocs.forEach(u => blockedIds.add(u._id.toString()));

    const followingDocs = await Follow.find({ follower: currentUserId, status: "accepted" }).select("following").lean();
    const followingIds = new Set(followingDocs.map(f => f.following.toString()));

    const authorIds = [...new Set(orderedPosts.map(p => p.author?._id?.toString()).filter(Boolean))];
    const privateNotFollowed = await User.find({
      _id: { $in: authorIds, $nin: [...followingIds, currentUserId] },
      isPrivate: true,
    }).select("_id").lean();
    const privateNotFollowedIds = new Set(privateNotFollowed.map(u => u._id.toString()));

    const filteredPosts = orderedPosts.filter(p => {
      const authorId = p.author?._id?.toString();
      if (!authorId) return false;
      if (blockedIds.has(authorId)) return false;
      if (privateNotFollowedIds.has(authorId)) return false;
      return true;
    });

    const postsWithMeta = filteredPosts.map((p) => ({
      ...p,
      isBookmarked: true,
    }));
    const nextCursor =
      bookmarkIds.length === limit
        ? bookmarkIds[bookmarkIds.length - 1].toString()
        : null;
    res.json({ posts: postsWithMeta, nextCursor });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
