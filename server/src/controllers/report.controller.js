import Post from "../models/post.model.js";
import Comment from "../models/comment.model.js";
import Report from "../models/report.model.js";

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

    const report = await Report.create({
      targetType: "post",
      targetModel: "Post",
      targetId: postId,
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
