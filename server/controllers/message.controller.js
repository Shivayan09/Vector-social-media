import mongoose from "mongoose";
import Message from "../models/message.model.js";
import Conversation from "../models/conversation.model.js";
import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";
import { getIO } from "../socket/socket.js";
import { sendMessageSchema } from "../validators/message.validator.js";
import asyncHandler from "../utils/asyncHandler.js";
import cloudinary from "../config/cloudinary.js";
import { uploadToCloudinary } from "../utils/uploadCleanup.js";
import { cleanupTempUpload, validateImageUpload } from "../utils/imageUploadValidation.js";

// Hard upper bound on messages returned per page.
const MAX_LIMIT = 100;

export const getMessages = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;

    // Verify the requesting user is a participant in this conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id,
    });

    if (!conversation) {
      return res.status(403).json({ message: "Not a participant in this conversation" });
    }

    // Re-verify block status
    const otherParticipant = conversation.participants.find(
      p => p.toString() !== req.user._id.toString()
    );
    if (otherParticipant) {
      const otherUser = await User.findById(otherParticipant).select("blockedUsers");
      const isBlocked = req.user.blockedUsers?.some(
        id => id.toString() === otherParticipant.toString()
      ) || otherUser?.blockedUsers?.some(
        id => id.toString() === req.user._id.toString()
      );
      if (isBlocked) {
        return res.status(403).json({ message: "Action forbidden due to block status" });
      }
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), MAX_LIMIT);
    const before = req.query.before;

    let beforeId;
    if (before) {
      if (!mongoose.Types.ObjectId.isValid(before)) {
        return res.status(400).json({
          message: "Invalid cursor.",
        });
      }
      beforeId = new mongoose.Types.ObjectId(before);
    }

    const filter = {
      conversation: conversationId,
      isDeleted: false,
      ...(beforeId && { _id: { $lt: beforeId } }),
    };

    const messages = await Message.find(filter)
      .populate("sender", "username name avatar")
      .sort({ _id: -1 })
      .limit(limit);

    res.json({ messages: messages.reverse(), hasMore: messages.length === limit });

});

export const sendMessage = asyncHandler(async (req, res) => {

    const parsed = sendMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid request";
      return res.status(400).json({ message });
    }

    const { conversationId, content } = parsed.data;

    // Check if either content or file is present
    if ((!content || content.trim().length === 0) && !req.file) {
      return res.status(400).json({ message: "Message content cannot be empty" });
    }

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const isSenderParticipant = conversation.participants.some(
      (id) => id.toString() === req.user._id.toString()
    );
    if (!isSenderParticipant) {
      return res.status(403).json({ message: "Not a participant in this conversation" });
    }

    const receiverId = conversation.participants.find(
      (id) => id.toString() !== req.user._id.toString()
    );

    if (receiverId) {
      const receiver = await User.findById(receiverId);
      if (!receiver) {
        return res.status(404).json({ message: "Recipient not found" });
      }
      const isBlocked = req.user.blockedUsers?.some(id => id.toString() === receiverId.toString()) ||
                        receiver.blockedUsers?.some(id => id.toString() === req.user._id.toString());
      if (isBlocked) {
        return res.status(403).json({ message: "Action forbidden due to block status" });
      }
    }

    // Re-verify block status right before create
    if (receiverId) {
      const [freshReceiver, freshSender] = await Promise.all([
        User.findById(receiverId).select("blockedUsers"),
        User.findById(req.user._id).select("blockedUsers"),
      ]);
      const stillBlocked = freshSender?.blockedUsers?.some(id => id.toString() === receiverId.toString()) ||
                          freshReceiver?.blockedUsers?.some(id => id.toString() === req.user._id.toString());
      if (stillBlocked) {
        return res.status(403).json({ message: "Action forbidden due to block status" });
      }
    }

    let image = null;
    let imagePublicId = null;

    try {
      if (req.file) {
        await validateImageUpload(req.file, {
          allowedFormats: ["jpeg", "png", "gif", "webp", "avif"],
          maxSize: 5 * 1024 * 1024,
          label: "Message image",
        });
        const uploadResult = await uploadToCloudinary(req.file, {
          folder: "messages",
        });
        image = uploadResult.secure_url;
        imagePublicId = uploadResult.public_id;
      }

      const message = await Message.create({
        conversation: conversationId,
        sender: req.user._id,
        content: content || "",
        image,
        imagePublicId,
        isRead: false,
      });

      // Post-creation block re-verification: a concurrent blockUser may have
      // deleted the conversation and notifications between the pre-check above
      // and message creation. Re-check before emitting any socket events.
      if (receiverId) {
        const [postCreateReceiver, postCreateSender] = await Promise.all([
          User.findById(receiverId).select("blockedUsers"),
          User.findById(req.user._id).select("blockedUsers"),
        ]);
        const nowBlocked = postCreateSender?.blockedUsers?.some(
          id => id.toString() === receiverId.toString()
        ) || postCreateReceiver?.blockedUsers?.some(
          id => id.toString() === req.user._id.toString()
        );
        if (nowBlocked) {
          await Message.findByIdAndDelete(message._id);
          if (imagePublicId) {
            await cloudinary.uploader.destroy(imagePublicId).catch((error) => {
              console.error("Cloudinary cleanup failed:", error);
            });
          }
          return res.status(403).json({ message: "Action forbidden due to block status" });
        }
      }

      const populated = await message.populate(
        "sender",
        "username name avatar"
      );

      // Update conversation timestamp BEFORE socket emission so all DB writes
      // are confirmed before the client receives the real-time event.
      const updatedConversation = await Conversation.findOneAndUpdate(
        { _id: conversationId, participants: req.user._id },
        { updatedAt: new Date() },
        { new: true }
      );
      if (!updatedConversation) {
        await Message.findByIdAndDelete(message._id);
        if (imagePublicId) {
          await cloudinary.uploader.destroy(imagePublicId).catch((error) => {
            console.error("Cloudinary cleanup failed:", error);
          });
        }
        return res.status(404).json({ message: "Conversation deleted during send" });
      }

      if (receiverId) {

        const filter = {
          recipient: receiverId,
          sender: req.user._id,
          type: "message",
          conversation: conversationId,
          isRead: false,
        };
        // Use updateOne to avoid a separate findOne query.
        // upsertedId will only be populated if a new document was actually inserted.
        const result = await Notification.updateOne(
          filter,
          { $setOnInsert: filter },
          { upsert: true }
        );
        const io = getIO();
        if (result.upsertedId) {
          io.to(receiverId.toString()).emit("notification:new", {
            notificationId: result.upsertedId,
            type: filter.type,
          });
        }
        
        io.to(receiverId.toString()).emit("receive_message", populated);

      }

      res.json(populated);

    } catch (error) {
      await cleanupTempUpload(req.file);
      if (imagePublicId) {
        await cloudinary.uploader.destroy(imagePublicId).catch((error) => {
          console.error("Cloudinary cleanup failed:", error);
        });
      }
      return res.status(error.statusCode || 500).json({
        message: error.message || "Something went wrong"
      });
    }

});

export const getUnreadCount = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;

    // Verify user is a participant in this conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id,
    });

    if (!conversation) {
      return res.status(403).json({ message: "Not a participant in this conversation" });
    }

    const unreadCount = await Message.countDocuments({
      conversation: conversationId,
      sender: { $ne: req.user._id },
      isRead: { $ne: true },
      isDeleted: { $ne: true },
    });

    res.json({ unreadCount });
});

export const markConversationAsRead = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;

    // Verify user is a participant in this conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id,
    });

    if (!conversation) {
      return res.status(403).json({ message: "Not a participant in this conversation" });
    }

    const otherParticipant = conversation.participants.find(
      (p) => p.toString() !== req.user._id.toString()
    );

    if (otherParticipant) {
      const [currentUser, otherUser] = await Promise.all([
        User.findById(req.user._id).select("blockedUsers"),
        User.findById(otherParticipant).select("blockedUsers"),
      ]);
      const isBlocked = currentUser?.blockedUsers?.some(
        id => id.toString() === otherParticipant.toString()
      ) || otherUser?.blockedUsers?.some(
        id => id.toString() === req.user._id.toString()
      );
      if (isBlocked) {
        return res.status(403).json({ message: "Action forbidden due to block status" });
      }
    }

    await Message.updateMany(
      {
        conversation: conversationId,
        sender: { $ne: req.user._id },
        isRead: { $ne: true },
        isDeleted: { $ne: true },
      },
      { $set: { isRead: true } }
    );

    if (otherParticipant) {
      getIO().to(otherParticipant.toString()).emit("conversation_read", {
        conversationId,
        readBy: req.user._id,
      });
    }

    res.json({ message: "Messages marked as read" });
  
});

export const deleteMessage = asyncHandler(async (req, res) => {
  const message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({
        message: "Message not found"
      });
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Not allowed"
      });
    }

    const conversation = await Conversation.findById(message.conversation);
    if (conversation) {
      const otherParticipant = conversation.participants.find(
        p => p.toString() !== req.user._id.toString()
      );
      if (otherParticipant) {
        const otherUser = await User.findById(otherParticipant).select("blockedUsers");
        const isBlocked = req.user.blockedUsers?.some(
          id => id.toString() === otherParticipant.toString()
        ) || otherUser?.blockedUsers?.some(
          id => id.toString() === req.user._id.toString()
        );
        if (isBlocked) {
          return res.status(403).json({ message: "Action forbidden due to block status" });
        }
      }
    }

    if (message.isDeleted) {
      return res.status(400).json({
        message: "Message already deleted"
      });
    }

    message.isDeleted = true;
    message.deletedAt = new Date();

    await message.save();

    const io = getIO();

    // Find and remove the associated notification for the other participant
    if (conversation) {
      const otherParticipant = conversation.participants.find(
        p => p.toString() !== req.user._id.toString()
      );
      if (otherParticipant) {
        const deletedNotification = await Notification.findOneAndDelete({
          type: "message",
          conversation: message.conversation,
          sender: req.user._id,
          recipient: otherParticipant,
        });

        if (deletedNotification) {
          io.to(otherParticipant.toString()).emit("notification:removed", {
            notificationId: deletedNotification._id,
          });
        }
      }
    }

    if (conversation) {
      conversation.participants.forEach((participantId) => {
        io.to(participantId.toString()).emit("message_deleted", {
          messageId: message._id,
          conversationId: message.conversation,
        });
      });
    }

    res.json({
      success: true,
      message: "Message deleted successfully"
    });

});
