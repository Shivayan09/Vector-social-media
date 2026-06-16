import mongoose from "mongoose";
import Comment from "../models/comment.model.js";
import Post from "../models/post.model.js";
import User from "../models/user.model.js";
import Follow from "../models/follow.model.js";
import Notification from "../models/notification.model.js";
import Report from "../models/report.model.js";
import { getIO } from "../socket/socket.js";
import { commentSchema } from "../validators/comment.validator.js";
import asyncHandler from "../utils/asyncHandler.js";
// Hard upper bound on comments returned per request.
const MAX_LIMIT = 50;

export const addComment = asyncHandler(async (req, res) => {
        const { postId } = req.params;
        const parsed = commentSchema.safeParse({
            post: postId,
            content: req.body.content,
            parentCommentId: req.body.parentCommentId
        });
        if (!parsed.success) {
            return res.status(400).json({
                message: parsed.error.issues[0]?.message ?? "Invalid request",
            });
        }
        const { content, parentCommentId } = parsed.data;
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        let resolvedParentId = null;
        if (parentCommentId) {
            const parentComment = await Comment.findById(parentCommentId);
            if (!parentComment) {
                return res.status(404).json({ message: "Parent comment not found" });
            }
            if (parentComment.post.toString() !== postId) {
                return res.status(400).json({ message: "Parent comment does not belong to this post" });
            }
            // Enforce a 2-level comment hierarchy
            resolvedParentId = parentComment.parentCommentId || parentComment._id;
        }

        const authorUser = await User.findById(post.author);
        if (req.user) {
            const currentUserId = req.user.id;
            const isBlocked = req.user.blockedUsers?.some(id => id.toString() === post.author.toString()) ||
                              authorUser?.blockedUsers?.some(id => id.toString() === currentUserId);
            if (isBlocked) {
                return res.status(403).json({ message: "Action forbidden due to block status" });
            }

            if (authorUser?.isPrivate && currentUserId !== post.author.toString()) {
                const isFollower = await Follow.exists({ follower: currentUserId, following: post.author, status: "accepted" });
                if (!isFollower) {
                    return res.status(403).json({
                        message: "This post is from a private account. Follow them to comment.",
                    });
                }
            }
        }
        // Re-verify block status and follow right before create
        if (req.user) {
            const [freshAuthor, freshCurrent] = await Promise.all([
                User.findById(post.author).select("blockedUsers isPrivate"),
                User.findById(req.user.id).select("blockedUsers"),
            ]);
            const stillBlocked = freshCurrent?.blockedUsers?.some(id => id.toString() === post.author.toString()) ||
                                freshAuthor?.blockedUsers?.some(id => id.toString() === req.user.id);
            if (stillBlocked) {
                return res.status(403).json({ message: "Action forbidden due to block status" });
            }

            if (freshAuthor?.isPrivate && req.user.id !== post.author.toString()) {
                const isStillFollower = await Follow.exists({ follower: req.user.id, following: post.author, status: "accepted" });
                if (!isStillFollower) {
                    return res.status(403).json({
                        message: "This post is from a private account. Follow them to comment.",
                    });
                }
            }
        }
        const comment = await Comment.create({
            post: postId,
            author: req.user.id,
            content,
            parentCommentId: resolvedParentId
        });
        await Post.findByIdAndUpdate(postId, {
            $inc: { commentsCount: 1 },
        });
        const populated = await comment.populate("author", "username name avatar");
        if (post.author.toString() !== req.user.id) {
            const notification = await Notification.create({
                recipient: post.author,
                sender: req.user.id,
                type: "comment",
                post: post._id,
                comment: comment._id,
            });

            getIO().to(post.author.toString()).emit("notification:new", {
                notificationId: notification._id,
                type: notification.type,
            });
        }
        return res.status(201).json(populated);
   
});

export const getPostComments = asyncHandler(async (req, res) => {
        const { postId } = req.params;

        const post = await Post.findById(postId).select("author");
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        const postAuthor = await User.findById(post.author).select("blockedUsers isPrivate");

        if (req.user) {
            const currentUserId = req.user.id;
            const isBlocked = req.user.blockedUsers?.some(id => id.toString() === post.author.toString()) ||
                              postAuthor?.blockedUsers?.some(id => id.toString() === currentUserId);
            if (isBlocked) {
                return res.status(403).json({ message: "Action forbidden due to block status" });
            }

            if (postAuthor?.isPrivate && currentUserId !== post.author.toString()) {
                const isFollower = await Follow.exists({ follower: currentUserId, following: post.author, status: "accepted" });
                if (!isFollower) {
                    return res.status(403).json({ message: "This post is from a private account. Follow them to see it." });
                }
            }
        } else if (postAuthor?.isPrivate) {
            return res.status(403).json({ message: "This post is from a private account. Follow them to see it." });
        }

        const cursor = req.query.cursor || null;
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), MAX_LIMIT);

        let excludeUserIds = [];
        if (req.user) {
            const currentUserId = req.user._id || req.user.id;
            const blockers = await User.find({ blockedUsers: currentUserId }).select("_id");
            const blockerIds = blockers.map((u) => u._id);
            const blockedIds = req.user.blockedUsers || [];
            excludeUserIds = [...blockedIds, ...blockerIds];
        }

        let filter = {
            post: postId,
            parentCommentId: { $in: [null, undefined] },
            isFlaggedForReview: { $ne: true },
            ...(excludeUserIds.length ? { author: { $nin: excludeUserIds } } : {}),
        };

        if (cursor) {
            if (mongoose.Types.ObjectId.isValid(cursor)) {
                filter._id = { $lt: cursor };
            } else {
                return res.status(400).json({ success: false, message: "Invalid cursor format" });
            }
        }

        const comments = await Comment.find(filter)
            .sort({ _id: -1 })
            .limit(limit)
            .populate("author", "username name avatar");

        const topLevelIds = comments.map(c => c._id);
        let replies = [];
        if (topLevelIds.length > 0) {
            replies = await Comment.find({
                parentCommentId: { $in: topLevelIds },
                isFlaggedForReview: { $ne: true },
                ...(excludeUserIds.length ? { author: { $nin: excludeUserIds } } : {}),
            })
            .sort({ _id: 1 })
            .populate("author", "username name avatar");
        }

        const commentsWithReplies = comments.map(comment => {
            const commentObj = comment.toObject();
            commentObj.replies = replies.filter(
                reply => reply.parentCommentId && reply.parentCommentId.toString() === comment._id.toString()
            );
            return commentObj;
        });

        const hasMore = comments.length === limit;
        const nextCursor = hasMore ? comments[comments.length - 1]._id : null;

        res.json({ comments: commentsWithReplies, nextCursor, hasMore });
});

export const deleteComment = asyncHandler(async (req, res) => {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
    }

    const post = await Post.findById(comment.post).select("author");

    const isCommentAuthor = comment.author.toString() === req.user.id;
    const isPostAuthor = post?.author?.toString() === req.user.id;

    if (!isCommentAuthor && !isPostAuthor) {
        return res.status(403).json({ message: "Not allowed" });
    }

    const session = await mongoose.startSession();
    let deletedNotifications = [];
    try {
        await session.withTransaction(async () => {
            const replies = await Comment.find({ parentCommentId: comment._id }).select("_id isFlaggedForReview").session(session);
            const replyIds = replies.map(r => r._id);
            const allCommentIds = [comment._id, ...replyIds];

            let decrementCount = 0;
            if (!comment.isFlaggedForReview) decrementCount++;
            replies.forEach(r => {
                if (!r.isFlaggedForReview) decrementCount++;
            });

            await Comment.deleteMany({ _id: { $in: allCommentIds } }, { session });
            await Report.deleteMany({ targetType: "comment", targetId: { $in: allCommentIds } }, { session });
            await Notification.deleteMany({ comment: { $in: allCommentIds } }, { session });
            
            if (decrementCount > 0) {
                await Post.findByIdAndUpdate(comment.post, { $inc: { commentsCount: -decrementCount } }, { session });
            }
        });
    } finally {
        await session.endSession();
    }

    for (const notif of deletedNotifications) {
        getIO().to(notif.recipient.toString()).emit("notification:removed", {
            notificationId: notif._id,
        });
    }

    res.json({ success: true });
});
