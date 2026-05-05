import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    targetType: {
      type: String,
      enum: ["post", "comment"],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "targetModel",
      required: true,
    },
    targetModel: {
      type: String,
      enum: ["Post", "Comment"],
      required: true,
    },
    reportedBy: {
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
  },
  {
    timestamps: true,
  }
);

reportSchema.index({ targetType: 1, targetId: 1, reportedBy: 1 }, { unique: true });

const Report = mongoose.model("Report", reportSchema);

export default Report;
