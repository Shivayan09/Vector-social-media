import Comment from "../models/comment.model.js";
import Post from "../models/post.model.js";
import User from "../models/user.model.js";
import Notification from "../models/notification.model.js";
import { getIO } from "../socket/socket.js";

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

        const postAuthor = await User.findById(post.author).select("blockedUsers followers isPrivate");

        if (req.user) {
            const currentUserId = req.user.id;
            const isBlocked = req.user.blockedUsers?.some(id => id.toString() === post.author.toString()) ||
                              postAuthor?.blockedUsers?.some(id => id.toString() === currentUserId);
            if (isBlocked) {
                return res.status(403).json({ message: "Action forbidden due to block status" });
            }

            if (postAuthor?.isPrivate && currentUserId !== post.author.toString()) {
                const isFollower = postAuthor.followers?.some(id => id.toString() === currentUserId);
                if (!isFollower) {
                    return res.status(403).json({ message: "This post is from a private account. Follow them to see it." });
                }
            }
        } else if (postAuthor?.isPrivate) {
            return res.status(403).json({ message: "This post is from a private account. Follow them to see it." });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        const comments = await Comment.find({ post: postId })
            .sort({ createdAt: 1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate("author", "username name avatar");
        res.json(comments);
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
        await Notification.deleteOne({ post: comment.post, sender: comment.author, type: "comment" });
        await Post.findByIdAndUpdate(comment.post, { $inc: { commentsCount: -1 }, });
        res.json({
            success: true
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
