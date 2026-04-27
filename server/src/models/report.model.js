import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    targetType: {
      type: String,
      enum: ["post"],
      default: "post",
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    postAuthor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reason: {
      type: String,
      enum: ["spam", "harassment", "hate_speech", "violence", "nudity", "misinformation", "other"],
      required: true,
    },
    details: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ["open", "in_review", "resolved", "rejected", "actioned"],
      default: "open",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    moderatorNotes: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000,
    },
    actionTaken: {
      type: String,
      enum: ["none", "post_deleted"],
      default: "none",
    },
  },
  {
    timestamps: true,
  }
);

reportSchema.index({ targetId: 1, reportedBy: 1, status: 1 });

const Report = mongoose.model("Report", reportSchema);

export default Report;
