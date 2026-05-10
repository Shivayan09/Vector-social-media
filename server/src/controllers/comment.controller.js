import Comment from "../models/comment.model.js";
import Post from "../models/post.model.js";
import Notification from '../models/notification.model.js'
import { getIO, onlineUsers } from "../socket/socket.js";

export const addComment = async (req, res) => {
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

        const recipientSocket = onlineUsers.get(post.author.toString());
        if (recipientSocket) {
            getIO().to(recipientSocket).emit("notification:new", {
                notificationId: notification._id,
                type: notification.type,
            });
        }
    }
    return res.status(201).json(populated);
};

export const getPostComments = async (req, res) => {
    const { postId } = req.params;
    const comments = await Comment.find({ post: postId }).populate("author", "username name avatar");
    res.json(comments);
};

export const deleteComment = async (req, res) => {
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
    await Post.findByIdAndUpdate(comment.post, { $inc: { commentsCount: -1 }, });
    res.json({
        success: true
    });
};
