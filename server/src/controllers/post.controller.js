import Post from "../models/post.model.js";
import Notification from "../models/notification.model.js";
import cloudinary from "../config/cloudinary.js";

export const removePostById = async (postId) => {
    const post = await Post.findById(postId);
    if (!post) {
        return null;
    }

    if (post.imagePublicId) {
        await cloudinary.uploader.destroy(post.imagePublicId);
    }

    await post.deleteOne();
    return post;
};

export const createPost = async (req, res) => {
    try {
        const { content, intent } = req.body;
        if (!intent || (!content && !req.file)) {
            return res.json({
                success: false,
                message: "Intent and either content or image are required"
            });
        }
        
        let image = null;
        let imagePublicId = null;

        if (req.file) {
            const uploadResult = await cloudinary.uploader.upload(req.file.path, {
                folder: "posts"
            });
            image = uploadResult.secure_url;
            imagePublicId = uploadResult.public_id;
        }

        const post = await Post.create({ 
            author: req.user.id, 
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

export const toggleLike = async (req, res) => {
    const post = await Post.findById(req.params.id);
    if (!post) {
        return res.status(404).json({ success: false });
    }
    const userId = req.user.id;
    const index = post.likes.indexOf(userId);
    const liked = index === -1;
    if (index === -1) {
        post.likes.push(userId);
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
    } catch {
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
    } catch {
        res.status(500).json({ message: "Server error" });
    }
};

export const getTopPostsOfWeek = async (req, res) => {
    try {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const posts = await Post.aggregate([
            { $match: { createdAt: { $gte: oneWeekAgo } } },
            { $addFields: { likesCount: { $size: "$likes" } } },
            { $sort: { likesCount: -1, createdAt: -1 } },
            { $limit: 10 },
            { $lookup: { from: "users", localField: "author", foreignField: "_id", as: "author" } },
            { $unwind: "$author" },
            { $project: { "author.password": 0, "author.email": 0 } }
        ]);
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

export const getTopPostsOfMonth = async (req, res) => {
    try {
        const oneMonthAgo = new Date();
        oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
        
        const posts = await Post.aggregate([
            { $match: { createdAt: { $gte: oneMonthAgo } } },
            { $addFields: { likesCount: { $size: "$likes" } } },
            { $sort: { likesCount: -1, createdAt: -1 } },
            { $limit: 10 },
            { $lookup: { from: "users", localField: "author", foreignField: "_id", as: "author" } },
            { $unwind: "$author" },
            { $project: { "author.password": 0, "author.email": 0 } }
        ]);
        
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

export const incrementShare = async (req, res) => {
    try {
        const post = await Post.findByIdAndUpdate(
            req.params.id,
            { $inc: { sharesCount: 1 } },
            { new: true }
        );
        if (!post) {
            return res.status(404).json({ success: false, message: "Post not found" });
        }
        res.json({
            success: true,
            sharesCount: post.sharesCount,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
