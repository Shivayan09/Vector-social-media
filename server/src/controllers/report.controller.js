import Post from "../models/post.model.js";
import Comment from "../models/comment.model.js";
import Report from "../models/report.model.js";
import Notification from "../models/notification.model.js";
import { removePostById } from "./post.controller.js";
import { getIO, onlineUsers } from "../socket/socket.js";

const REPORT_THRESHOLD = 5;

const VALID_REASONS = ["spam", "harassment", "hate_speech", "violence", "nudity", "misinformation", "other"];

const validateReportInput = (targetId, reason, details) => {
  if (!targetId) {
    return "targetId is required";
  }

  if (!reason) {
    return "reason is required";
  }

  if (!VALID_REASONS.includes(reason)) {
    return "Invalid report reason";
  }

  if (reason === "other" && !details.trim()) {
    return "details are required when reason is other";
  }

  return null;
};

export const createPostReport = async (req, res) => {
  try {
    const { postId, reason, details = "" } = req.body;
    const reporterId = req.user.id;

    const validationError = validateReportInput(postId, reason, details);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    // Authors can't report their own post
    if (post.author.toString() === reporterId) {
      return res.status(400).json({ success: false, message: "You cannot report your own post" });
    }

    const existingReport = await Report.findOne({
      targetType: "post",
      targetId: postId,
      reportedBy: reporterId,
    });

    if (existingReport) {
      return res.status(409).json({
        success: false,
        message: "You already reported this post",
      });
    }

    await Report.create({
      targetType: "post",
      targetModel: "Post",
      targetId: postId,
      reportedBy: reporterId,
      reason,
      details: details.trim(),
    });

    // Count unique reporters for this post after saving
    const reportCount = await Report.countDocuments({ targetType: "post", targetId: postId });

    if (reportCount >= REPORT_THRESHOLD) {
      const authorId = post.author;

      // Delete post (handles cloudinary cleanup too)
      await removePostById(postId);

      // Clean up all reports for this post
      await Report.deleteMany({ targetType: "post", targetId: postId });

      // Notify the post author
      const notification = await Notification.create({
        recipient: authorId,
        type: "post_removed_reported",
        post: postId,
      });

      // Emit real-time notification if author is online
      const authorSockets = onlineUsers.get(authorId.toString());
      if (authorSockets) {
        for (const socketId of authorSockets) {
          getIO().to(socketId).emit("notification:new", {
            notificationId: notification._id,
            type: notification.type,
          });
        }
      }

      return res.status(200).json({
        success: true,
        message: "Report submitted. Post has been removed due to multiple reports.",
        removed: true,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Report submitted",
      removed: false,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createCommentReport = async (req, res) => {
  try {
    const { commentId, reason, details = "" } = req.body;
    const reporterId = req.user.id;

    const validationError = validateReportInput(commentId, reason, details);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: "Comment not found" });
    }

    const existingReport = await Report.findOne({
      targetType: "comment",
      targetId: commentId,
      reportedBy: reporterId,
    });

    if (existingReport) {
      return res.status(409).json({
        success: false,
        message: "You already reported this comment",
      });
    }

    const report = await Report.create({
      targetType: "comment",
      targetModel: "Comment",
      targetId: commentId,
      reportedBy: reporterId,
      reason,
      details: details.trim(),
    });

    return res.status(201).json({
      success: true,
      message: "Report submitted",
      report,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};