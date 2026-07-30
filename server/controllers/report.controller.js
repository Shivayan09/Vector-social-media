import Post from "../models/post.model.js";
import Comment from "../models/comment.model.js";
import Report from "../models/report.model.js";
import Notification from "../models/notification.model.js";
import { getIO } from "../socket/socket.js";
import asyncHandler from "../utils/asyncHandler.js";
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

export const createPostReport = asyncHandler(async (req, res) => {
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

    // Use the unique index on (targetType, targetId, reportedBy) as the duplicate guard.
    // Catching E11000 here is more race-safe than a separate findOne + create.
    try {
      await Report.create({
        targetType: "post",
        targetModel: "Post",
        targetId: postId,
        reportedBy: reporterId,
        reason,
        details: details.trim(),
      });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "You already reported this post",
        });
      }
      throw err;
    }

    // Count unique reporters for this post after saving
    const reportCount = await Report.countDocuments({ targetType: "post", targetId: postId });

    if (reportCount >= REPORT_THRESHOLD) {
      const authorId = post.author;

      // Atomically flag the post for review. The filter ensures only the first
      // concurrent request that reaches this branch proceeds with notification.
      const flagged = await Post.findOneAndUpdate(
        { _id: postId, isFlaggedForReview: { $ne: true } },
        { $set: { isFlaggedForReview: true } },
      );
      if (!flagged) {
        return res.status(200).json({
          success: true,
          message: "Report submitted. Post has been flagged for review.",
          flagged: true,
        });
      }

      // Notify the post author only when we were the request that set the flag.
      const notification = await Notification.create({
        recipient: authorId,
        type: "post_removed_reported",
        post: postId,
      });

      getIO().to(authorId.toString()).emit("notification:new", {
        notificationId: notification._id,
        type: notification.type,
      });

      return res.status(200).json({
        success: true,
        message: "Report submitted. Post has been flagged for review.",
        flagged: true,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Report submitted",
      flagged: false,
    });
});

export const createCommentReport = asyncHandler(async (req, res) => {
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

    // Authors cannot report their own comment
    if (comment.author.toString() === reporterId) {
      return res.status(400).json({ success: false, message: "You cannot report your own comment" });
    }

    // Use the unique index on (targetType, targetId, reportedBy) as the duplicate guard.
    // Catching E11000 here is more race-safe than a separate findOne + create.
    try {
      await Report.create({
        targetType: "comment",
        targetModel: "Comment",
        targetId: commentId,
        reportedBy: reporterId,
        reason,
        details: details.trim(),
      });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "You already reported this comment",
        });
      }
      throw err;
    }

    // Count unique reporters for this comment after saving
    const reportCount = await Report.countDocuments({ targetType: "comment", targetId: commentId });

    if (reportCount >= REPORT_THRESHOLD) {
      const authorId = comment.author;
      const postId = comment.post;

      // Atomically flag the comment for review. The filter ensures only the first
      // concurrent request that reaches this branch proceeds with cleanup and notification.
      const flaggedComment = await Comment.findOneAndUpdate(
        { _id: commentId, isFlaggedForReview: { $ne: true } },
        { $set: { isFlaggedForReview: true } },
      );
      if (!flaggedComment) {
        return res.status(200).json({
          success: true,
          message: "Report submitted. Comment has been flagged for review.",
          flagged: true,
        });
      }

      // Decrement visible comment count (gated by atomic guard above).
      await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: -1 } });

      // Notify the comment author only when we were the request that set the flag.
      const notification = await Notification.create({
        recipient: authorId,
        type: "comment_removed_reported",
        comment: commentId,
      });

      getIO().to(authorId.toString()).emit("notification:new", {
        notificationId: notification._id,
        type: notification.type,
      });

      return res.status(200).json({
        success: true,
        message: "Report submitted. Comment has been flagged for review.",
        flagged: true,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Report submitted",
      flagged: false,
    });
});