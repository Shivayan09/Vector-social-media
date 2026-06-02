import mongoose from "mongoose";

export const NOTIFICATION_RETENTION_DAYS = Number.parseInt(
  process.env.NOTIFICATION_RETENTION_DAYS || "",
  10,
) || 90;

export const NOTIFICATION_RETENTION_SECONDS = NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60;

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
      enum: ["follow", "like", "comment", "message", "follow_request", "follow_request_accepted", "post_removed_reported", "comment_removed_reported"],
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
    comment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
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

// Prevent duplicate follow-request-accepted notifications under concurrent acceptance.
notificationSchema.index(
  { recipient: 1, sender: 1, type: 1 },
  { unique: true, partialFilterExpression: { type: "follow_request_accepted" } }
);

// Index for efficient notification inbox queries (filtering by recipient and sorting by newest)
notificationSchema.index({ recipient: 1, createdAt: -1 });

// TTL index for deleting notifications regardless of read state.
// The retention window is driven by NOTIFICATION_RETENTION_DAYS so unread
// notifications do not accumulate forever.
notificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: NOTIFICATION_RETENTION_SECONDS },
);

export default mongoose.model("Notification", notificationSchema);
