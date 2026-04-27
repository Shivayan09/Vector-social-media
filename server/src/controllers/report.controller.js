import Post from "../models/post.model.js";
import Report from "../models/report.model.js";
import { removePostById } from "./post.controller.js";

const VALID_REASONS = ["spam", "harassment", "hate_speech", "violence", "nudity", "misinformation", "other"];
const VALID_STATUS = ["open", "in_review", "resolved", "rejected", "actioned"];

const ALLOWED_TRANSITIONS = {
  open: ["in_review", "resolved", "rejected"],
  in_review: ["resolved", "rejected"],
  resolved: [],
  rejected: [],
  actioned: [],
};

const buildReportPopulate = (query) =>
  query
    .populate("reportedBy", "name username avatar email")
    .populate("postAuthor", "name username avatar")
    .populate({
      path: "targetId",
      select: "content image author createdAt",
      populate: {
        path: "author",
        select: "name username avatar",
      },
    })
    .populate("reviewedBy", "name username avatar");

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

    const post = await Post.findById(postId).select("author");
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    const existingReport = await Report.findOne({
      targetType: "post",
      targetId: postId,
      reportedBy: reporterId,
      status: { $in: ["open", "in_review"] },
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
      postAuthor: post.author,
      reason,
      details: details.trim(),
      status: "open",
      actionTaken: "none",
    });

    const populated = await buildReportPopulate(Report.findById(report._id));

    return res.status(201).json({
      success: true,
      message: "Report submitted",
      report: populated,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyReports = async (req, res) => {
  try {
    const reports = await buildReportPopulate(
      Report.find({ reportedBy: req.user.id }).sort({ createdAt: -1 })
    );

    return res.status(200).json({ success: true, reports });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllReports = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const parsedPage = Math.max(Number(page) || 1, 1);
    const parsedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const skip = (parsedPage - 1) * parsedLimit;

    const filter = {};
    if (status) {
      if (!VALID_STATUS.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status value",
        });
      }
      filter.status = status;
    }

    const [reports, total] = await Promise.all([
      buildReportPopulate(
        Report.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parsedLimit)
      ),
      Report.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      reports,
      total,
      page: parsedPage,
      limit: parsedLimit,
      hasMore: skip + reports.length < total,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getReportById = async (req, res) => {
  try {
    const report = await buildReportPopulate(Report.findById(req.params.id));

    if (!report) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }

    return res.status(200).json({ success: true, report });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateReportStatus = async (req, res) => {
  try {
    const { status, moderatorNotes = "" } = req.body;

    if (!status || !VALID_STATUS.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status value" });
    }

    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }

    const allowedStatuses = ALLOWED_TRANSITIONS[report.status] || [];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid transition from ${report.status} to ${status}`,
      });
    }

    report.status = status;
    report.moderatorNotes = moderatorNotes.trim();
    report.reviewedBy = req.user._id;
    report.reviewedAt = new Date();

    await report.save();

    const populated = await buildReportPopulate(Report.findById(report._id));

    return res.status(200).json({
      success: true,
      message: "Report status updated",
      report: populated,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const takeReportAction = async (req, res) => {
  try {
    const { action, moderatorNotes = "" } = req.body;

    if (action !== "post_deleted") {
      return res.status(400).json({ success: false, message: "Invalid action" });
    }

    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }

    const post = await Post.findById(report.targetId);
    if (!post) {
      return res.status(404).json({ success: false, message: "Target post not found" });
    }

    await removePostById(report.targetId);

    report.status = "actioned";
    report.actionTaken = "post_deleted";
    report.moderatorNotes = moderatorNotes.trim();
    report.reviewedBy = req.user._id;
    report.reviewedAt = new Date();

    await report.save();

    const populated = await buildReportPopulate(Report.findById(report._id));

    return res.status(200).json({
      success: true,
      message: "Action completed",
      report: populated,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
