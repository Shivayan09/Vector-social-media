import Post from "../models/Post.js";

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
        const posts = await Post.find().sort({ createdAt: -1 }).populate("author", "username name surname avatar");
        res.status(200).json(posts);
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
    if (index === -1) {
        post.likes.push(userId);
    } else {
        post.likes.splice(index, 1);
    }
    await post.save();
    res.json({
        success: true,
        likesCount: post.likes.length,
        liked: index === -1,
    });
};
