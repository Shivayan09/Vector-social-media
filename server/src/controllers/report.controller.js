import Post from "../models/post.model.js";
import Report from "../models/report.model.js";

const VALID_REASONS = ["spam", "harassment", "hate_speech", "violence", "nudity", "misinformation", "other"];

export const createPostReport = async (req, res) => {
  try {
    const { postId, reason, details = "" } = req.body;
    const reporterId = req.user.id;

    if (!postId) {
      return res.status(400).json({ success: false, message: "postId is required" });
    }

    if (!reason) {
      return res.status(400).json({ success: false, message: "reason is required" });
    }

    if (!VALID_REASONS.includes(reason)) {
      return res.status(400).json({ success: false, message: "Invalid report reason" });
    }

    if (reason === "other" && !details.trim()) {
      return res.status(400).json({
        success: false,
        message: "details are required when reason is other",
      });
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
