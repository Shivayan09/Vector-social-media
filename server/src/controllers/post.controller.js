import Post from "../models/post.model.js";
import Notification from "../models/notification.model.js";

export const createPost = async (req, res, next) => {
    try {
        const { content, intent } = req.body;
        if (!content || !intent) {
            return res.json({
                success: false,
                message: "Content and intent are required"
            });
        }
        const post = await Post.create({ author: req.user.id, content, intent });
        const populatedPost = await post.populate("author", "username name surname avatar");
        res.status(201).json({
            success: true,
            post: populatedPost
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const getPosts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const posts = await Post.find().sort({ createdAt: -1 }).skip(skip).limit(limit).populate("author", "username name surname avatar");
        const total = await Post.countDocuments();
        res.status(200).json({
            posts,
            total,
            page,
            limit,
            hasMore: skip + limit < total
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
        await post.deleteOne();
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

export const toggleLike = async (req, res) => {
    const post = await Post.findById(req.params.id);
    if (!post) {
        return res.status(404).json({ success: false });
    }
    const userId = req.user.id;
    const index = post.likes.indexOf(userId);
    let liked = false;
    if (index === -1) {
        post.likes.push(userId);
        liked = true;
        if (post.author.toString() !== userId) {
            await Notification.create({
                recipient: post.author,
                sender: userId,
                type: "like",
                post: post._id,
            });
        }
    } else {
        post.likes.splice(index, 1);
        liked = false;
    }
    await post.save();
    res.json({
        success: true,
        likesCount: post.likes.length,
        liked,
    });
};

export const getPostsByUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const posts = await Post.find({ author: userId }).populate("author", "username name avatar").sort({ createdAt: -1 });
        return res.status(200).json({
            success: true,
            posts,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch user posts",
        });
    }
};

export const getSinglePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId).populate("author", "username name avatar");
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }
        res.json(post);
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
};

export const getTopPostsOfWeek = async (req, res) => {
    try {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const posts = await Post.find({ createdAt: { $gte: oneWeekAgo } }).populate("author", "username name surname avatar").sort({ likes: -1 }).limit(10);
        res.status(200).json({
            success: true,
            posts
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};