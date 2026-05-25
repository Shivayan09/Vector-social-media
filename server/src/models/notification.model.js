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

// Index for efficient notification inbox queries (filtering by recipient and sorting by newest)
notificationSchema.index({ recipient: 1, createdAt: -1 });

// TTL index for deleting old read notifications
const retentionDays = parseInt(process.env.NOTIFICATION_RETENTION_DAYS) || 90;
notificationSchema.index({ readAt: 1 }, { expireAfterSeconds: retentionDays * 24 * 60 * 60 });

export default mongoose.model("Notification", notificationSchema);