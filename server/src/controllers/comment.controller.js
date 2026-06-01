import mongoose from "mongoose";
import Comment from "../models/comment.model.js";
import Post from "../models/post.model.js";
import User from "../models/user.model.js";
import Follow from "../models/follow.model.js";
import Notification from "../models/notification.model.js";
import { getIO } from "../socket/socket.js";

// Hard upper bound on comments returned per request.
const MAX_LIMIT = 50;

export const addComment = async (req, res) => {
    try {
        const { postId } = req.params;
        const { content } = req.body;
        if (!content?.trim()) {
            return res.status(400).json({
                message: "Comment cannot be empty"
            });
        }
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
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
            content
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
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const getPostComments = async (req, res) => {
    try {
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

        const hasMore = comments.length === limit;
        const nextCursor = hasMore ? comments[comments.length - 1]._id : null;

        res.json({ comments, nextCursor, hasMore });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteComment = async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.commentId);
        if (!comment) {
            return res.status(404).json({
                message: "Comment not found"
            });
        }
        if (comment.author.toString() !== req.user.id) {
            return res.status(403).json({
                message: "Not allowed"
            });
        }
        await comment.deleteOne();
        await Notification.deleteOne({ comment: comment._id, type: "comment" });
        await Post.findByIdAndUpdate(comment.post, { $inc: { commentsCount: -1 }, });
        res.json({
            success: true
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
