import Message from "../models/message.model.js";
import Conversation from "../models/conversation.model.js";
import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";
import { getIO, onlineUsers } from "../socket/socket.js";

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

    const messages = await Message.find({ conversation: conversationId })
      .populate("sender", "username name avatar")
      .sort({ createdAt: 1 });

    res.json(messages);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const sendMessage = async (req, res) => {
  try {

    const { conversationId, content } = req.body;

    if (!conversationId || !content) {
      return res.status(400).json({ message: "Missing fields" });
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

      const notification = await Notification.create({
        recipient: receiverId,
        sender: req.user._id,
        type: "message",
        conversation: conversationId,
      });
      const io = getIO();
      const notificationSocket = onlineUsers.get(receiverId.toString());
      if (notificationSocket) {
        io.to(notificationSocket).emit("notification:new", {
          notificationId: notification._id,
          type: notification.type,
        });
      }
      const receiverSocket = onlineUsers.get(receiverId.toString());

      if (receiverSocket) {
        io.to(receiverSocket).emit("receive_message", populated);
      }

    }

    await Conversation.findByIdAndUpdate(conversationId, {
      updatedAt: new Date(),
    });

    res.json(populated);

  } catch (error) {
    console.error("SEND MESSAGE ERROR:", error);
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
        const socketId = onlineUsers.get(participantId.toString());
        if (socketId) {
          io.to(socketId).emit("message_deleted", {
            messageId: message._id,
            conversationId: message.conversation,
          });
        }
      });
    }

    res.json({
      success: true,
      message: "Message deleted successfully"
    });

  } catch (error) {

    console.error("DELETE MESSAGE ERROR:", error);

    res.status(500).json({
      message: error.message
    });

  }
};
