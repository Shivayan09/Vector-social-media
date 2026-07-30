import Post from "../../../database/models/post.model.js";
import Comment from "../../../database/models/comment.model.js";
import User from "../../../database/models/user.model.js";
import Report from "../../../database/models/report.model.js";
import asyncHandler from "../../utils/asyncHandler.js";

// @desc    Get all flagged posts and comments
// @route   GET /api/admin/flagged
// @access  Private/Admin
export const getFlaggedContent = asyncHandler(async (req, res) => {
    const flaggedPosts = await Post.find({ isFlaggedForReview: true })
        .populate("author", "name username avatar email")
        .sort({ createdAt: -1 });

    const flaggedComments = await Comment.find({ isFlaggedForReview: true })
        .populate("author", "name username avatar email")
        .sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        data: {
            posts: flaggedPosts,
            comments: flaggedComments
        }
    });
});

// @desc    Dismiss a flag on a post or comment
// @route   PATCH /api/admin/dismiss/:type/:id
// @access  Private/Admin
export const dismissFlag = asyncHandler(async (req, res) => {
    const { type, id } = req.params;

    if (type === "post") {
        await Post.findByIdAndUpdate(id, { isFlaggedForReview: false });
        await Report.deleteMany({ targetType: "post", targetId: id });
    } else if (type === "comment") {
        await Comment.findByIdAndUpdate(id, { isFlaggedForReview: false });
        await Report.deleteMany({ targetType: "comment", targetId: id });
    } else {
        return res.status(400).json({ success: false, message: "Invalid type" });
    }

    res.status(200).json({
        success: true,
        message: "Flag dismissed successfully"
    });
});

// @desc    Delete a flagged post or comment
// @route   DELETE /api/admin/:type/:id
// @access  Private/Admin
export const deleteFlaggedContent = asyncHandler(async (req, res) => {
    const { type, id } = req.params;

    if (type === "post") {
        const post = await Post.findById(id);
        if (!post) return res.status(404).json({ success: false, message: "Post not found" });
        await post.deleteOne(); // Trigger pre('deleteOne') hooks if they exist
    } else if (type === "comment") {
        const comment = await Comment.findById(id);
        if (!comment) return res.status(404).json({ success: false, message: "Comment not found" });
        
        // Ensure commentsCount is decremented correctly in post
        await Post.findByIdAndUpdate(comment.post, { $inc: { commentsCount: -1 } });
        await comment.deleteOne();
    } else {
        return res.status(400).json({ success: false, message: "Invalid type" });
    }

    // Also delete associated reports
    await Report.deleteMany({ targetType: type, targetId: id });

    res.status(200).json({
        success: true,
        message: "Content deleted successfully"
    });
});

// @desc    Ban or unban a user
// @route   PATCH /api/admin/user/:id/ban
// @access  Private/Admin
export const toggleUserBan = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const userToBan = await User.findById(id);
    if (!userToBan) {
        return res.status(404).json({ success: false, message: "User not found" });
    }

    if (userToBan.role === "admin") {
        return res.status(403).json({ success: false, message: "Cannot ban an admin user" });
    }

    userToBan.isBanned = !userToBan.isBanned;
    // Invalidate sessions by incrementing tokenVersion
    if (userToBan.isBanned) {
        userToBan.tokenVersion = (userToBan.tokenVersion || 0) + 1;
    }
    
    await userToBan.save();

    res.status(200).json({
        success: true,
        message: userToBan.isBanned ? "User banned successfully" : "User unbanned successfully",
        data: {
            id: userToBan._id,
            isBanned: userToBan.isBanned
        }
    });
});
