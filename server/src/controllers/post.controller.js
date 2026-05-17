import mongoose from "mongoose";
import Post from "../models/post.model.js";
import User from "../models/user.model.js";
import Notification from "../models/notification.model.js";
import cloudinary from "../config/cloudinary.js";
import { getIO, onlineUsers } from "../socket/socket.js";

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

        const validIntents = ["ask", "build", "share", "discuss", "reflect"];
        if (!validIntents.includes(intent)) {
            return res.status(400).json({
                success: false,
                message: "Invalid intent. Must be one of: ask, build, share, discuss, reflect"
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

        let filter = {};
        if (req.user) {
            const currentUserId = req.user._id || req.user.id;
            const blockers = await User.find({ blockedUsers: currentUserId }).select("_id");
            const blockerIds = blockers.map(u => u._id);
            const blockedIds = req.user.blockedUsers || [];
            const excludeUserIds = [...blockedIds, ...blockerIds];
            if (excludeUserIds.length > 0) {
                filter = { author: { $nin: excludeUserIds } };
            }
        }

        const posts = await Post.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("author", "username name surname avatar").populate("likes", "username name avatar _id");
        const total = await Post.countDocuments(filter);
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

        if ((req.file || shouldRemoveImage) && post.imagePublicId) {
            await cloudinary.uploader.destroy(post.imagePublicId);
        }

        if (req.file || shouldRemoveImage) {
            post.image = null;
            post.imagePublicId = null;
        }

        if (req.file) {
            const uploadResult = await cloudinary.uploader.upload(req.file.path, {
                folder: "posts",
            });
            post.image = uploadResult.secure_url;
            post.imagePublicId = uploadResult.public_id;
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
    const post = await Post.findById(req.params.id);
    if (!post) {
        return res.status(404).json({ success: false });
    }
    const userId = req.user.id;
    const likesWithoutDuplicates = Array.from(
        new Map(post.likes.map((likeId) => [likeId.toString(), likeId])).values()
    );
    const existingIndex = likesWithoutDuplicates.findIndex(
        (likeId) => likeId.toString() === userId
    );
    const liked = existingIndex === -1;

    post.likes = likesWithoutDuplicates;

    if (liked) {
        post.likes.push(userId);
        if (post.author.toString() !== userId) {
            const notification = await Notification.create({
                recipient: post.author,
                sender: userId,
                type: "like",
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
    } else {
        post.likes = post.likes.filter((likeId) => likeId.toString() !== userId);
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
        const isFollower = targetUser.followers.some(id => id.toString() === req.user?.id);

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

        const posts = await Post.find({ author: userId }).populate("author", "username name avatar").populate("likes", "username name avatar _id").sort({ createdAt: -1 });
        return res.status(200).json({
            success: true,
            posts,
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

        const post = await Post.findById(postId).populate("author", "username name avatar isPrivate followers blockedUsers").populate("likes", "username name avatar _id");
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        // Privacy check for single post
        const author = post.author;

        if (req.user) {
            const currentUserId = req.user.id;
            const isBlocked = req.user.blockedUsers?.some(id => id.toString() === author._id.toString()) ||
                              author.blockedUsers?.some(id => id.toString() === currentUserId);
            if (isBlocked) {
                return res.status(403).json({ message: "Action forbidden due to block status" });
            }
        }

        const isSelf = req.user?.id === author._id.toString();
        const isFollower = author.followers?.some(id => id.toString() === req.user?.id);

        if (author.isPrivate && !isSelf && !isFollower) {
            return res.status(403).json({ message: "This post is from a private account. Follow them to see it." });
        }

        res.json(post);
    } catch (error) {
        res.status(500).json({ message: "Server error: " + error.message });
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
