import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    type: {
      type: String,
      enum: ["follow", "like", "comment", "message", "follow_request", "follow_request_accepted", "post_removed_reported"],
      required: true,
    },
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
    },
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

notificationSchema.index(
  { recipient: 1, sender: 1, type: 1, post: 1 },
  {
    unique: true,
    partialFilterExpression: { type: "like", post: { $exists: true } },
  }
);

export default mongoose.model("Notification", notificationSchema);