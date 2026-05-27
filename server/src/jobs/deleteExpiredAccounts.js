import { schedule } from "node-cron";
import User from "../models/user.model.js";
import Post from "../models/post.model.js";
import Notification from "../models/notification.model.js";
import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../config/cloudinary.js";

const hardDeleteUser = async (user) => {
  const userId = user._id;

  if (user.avatarPublicId) {
    try {
      await cloudinary.uploader.destroy(user.avatarPublicId);
    } catch (err) {
      console.error(`Cloudinary delete failed for user ${userId}:`, err.message);
    }
  }

  await User.updateMany(
    { $or: [{ followers: userId }, { following: userId }] },
    { $pull: { followers: userId, following: userId } }
  );

  await Post.deleteMany({ author: userId });
  await Notification.deleteMany({
    $or: [{ recipient: userId }, { sender: userId }],
  });

  const conversations = await Conversation.find({ participants: userId });
  const conversationIds = conversations.map((c) => c._id);
  if (conversationIds.length > 0) {
    await Message.deleteMany({ conversation: { $in: conversationIds } });
    await Conversation.deleteMany({ _id: { $in: conversationIds } });
  }

  await User.findByIdAndDelete(userId);
  console.log(`[Cron] Permanently deleted user: ${userId}`);
};

export const startDeletionCronJob = () => {
  schedule("0 2 * * *", async () => {
    console.log("[Cron] Running scheduled account deletion job...");
    try {
      const now = new Date();
      const expiredUsers = await User.find({
        isDeactivated: true,
        deletionScheduledAt: { $lte: now },
      });
      console.log(`[Cron] Found ${expiredUsers.length} account(s) to permanently delete.`);
      for (const user of expiredUsers) {
        await hardDeleteUser(user);
      }
    } catch (err) {
      console.error("[Cron] Deletion job error:", err.message);
    }
  });
  console.log("[Cron] Account deletion job scheduled (runs daily at 2:00 AM).");
};