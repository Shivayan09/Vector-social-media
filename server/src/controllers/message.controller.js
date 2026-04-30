import Message from "../models/message.model.js";
import Conversation from "../models/conversation.model.js";
import Notification from "../models/notification.model.js";
import { getIO, onlineUsers } from "../socket/socket.js";

export const getMessages = async (req, res) => {
  try {

    const messages = await Message.find({
      conversation: req.params.conversationId,
    })
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

    const receiverId = conversation.participants.find(
      (id) => id.toString() !== req.user._id.toString()
    );

    if (receiverId) {

      await Notification.create({
        recipient: receiverId,
        sender: req.user._id,
        type: "message",
        conversation: conversationId,
      });

      const io = getIO();
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
      return res.status(404).json({ message: "Message not found" });
    }
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not allowed" });
    }
    await message.deleteOne();
    const io = getIO();
    io.emit("message_deleted", {
      messageId: message._id,
      conversationId: message.conversation,
    });
    res.json({ success: true });
  } catch (error) {
    console.error("DELETE MESSAGE ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};