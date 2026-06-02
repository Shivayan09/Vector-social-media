import Message from "../models/message.model.js";
import Conversation from "../models/conversation.model.js";
import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";
import { getIO } from "../socket/socket.js";
import { sendMessageSchema } from "../validators/message.validator.js";

// Hard upper bound on messages returned per page.
const MAX_LIMIT = 100;

export const getMessages = async (req, res) => {
  try {
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

    // Validate the before cursor before passing it to new Date().
    // A truthy but non-date string such as "null", "undefined", or "1 OR 1=1"
    // produces Invalid Date, which turns the $lt filter into a NaN comparison
    // that silently returns zero results with HTTP 200.
    let beforeDate;
    if (before) {
      beforeDate = new Date(before);
      if (isNaN(beforeDate.getTime())) {
        return res.status(400).json({
          message: "Invalid 'before' cursor: must be a valid ISO 8601 date string.",
        });
      }
    }

    const filter = {
      conversation: conversationId,
      isDeleted: false,
      ...(beforeDate && { createdAt: { $lt: beforeDate } }),
    };

    const messages = await Message.find(filter)
      .populate("sender", "username name avatar")
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json({ messages: messages.reverse(), hasMore: messages.length === limit });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const sendMessage = async (req, res) => {
  try {

    const parsed = sendMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid request";
      return res.status(400).json({ message });
    }

    const { conversationId, content } = parsed.data;

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

    const message = await Message.create({
      conversation: conversationId,
      sender: req.user._id,
      content,
      isRead: false,
    });

    const populated = await message.populate(
      "sender",
      "username name avatar"
    );

    if (receiverId) {

      const filter = {
        recipient: receiverId,
        sender: req.user._id,
        type: "message",
        conversation: conversationId,
        isRead: false,
      };
      // findOneAndUpdate with new:false returns the pre-update doc,
      // or null when a new doc was upserted. Only emit on first insert.
      const existing = await Notification.findOneAndUpdate(
        filter,
        { $setOnInsert: filter },
        { upsert: true, returnDocument: "before" }
      );
      const io = getIO();
      if (!existing) {
        const notification = await Notification.findOne(filter);
        if (notification) {
          io.to(receiverId.toString()).emit("notification:new", {
            notificationId: notification._id,
            type: notification.type,
          });
        }
      }
      
      io.to(receiverId.toString()).emit("receive_message", populated);

    }

    await Conversation.findByIdAndUpdate(conversationId, {
      updatedAt: new Date(),
    });

    res.json(populated);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getUnreadCount = async (req, res) => {
  try {
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
    });

    res.json({ unreadCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const markConversationAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;

    // Verify user is a participant in this conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id,
    });

    if (!conversation) {
      return res.status(403).json({ message: "Not a participant in this conversation" });
    }

    await Message.updateMany(
      {
        conversation: conversationId,
        sender: { $ne: req.user._id },
        isRead: { $ne: true },
      },
      { $set: { isRead: true } }
    );

    const otherParticipant = conversation.participants.find(
      (p) => p.toString() !== req.user._id.toString()
    );

    if (otherParticipant) {
      getIO().to(otherParticipant.toString()).emit("conversation_read", {
        conversationId,
        readBy: req.user._id,
      });
    }

    res.json({ message: "Messages marked as read" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteMessage = async (req, res) => {
  try {

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

    if (message.isDeleted) {
      return res.status(400).json({
        message: "Message already deleted"
      });
    }

    message.isDeleted = true;
    message.deletedAt = new Date();

    await message.save();

    const io = getIO();

    // Emit only to participants of this conversation, not every connected client
    const conversation = await Conversation.findById(message.conversation);
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

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};
