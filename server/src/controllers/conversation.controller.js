import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import Notification from "../models/notification.model.js";

export const createConversation = async (req, res) => {
    try {
        const { receiverId } = req.body;
        const senderId = req.user._id;
        let convo = await Conversation.findOne({ participants: { $all: [senderId, receiverId] }, });
        if (!convo) {
            convo = await Conversation.create({ participants: [senderId, receiverId], });
        }
        res.json(convo);
    } catch (err) {
        res.status(500).json({
            message: err.message
        });
    }
};

export const getConversation = async (req, res) => {
    try {
        const convo = await Conversation.findById(req.params.conversationId).populate("participants", "username name avatar");
        res.json(convo);
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

export const getUserConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    const conversations = await Conversation.aggregate([
      // Match conversations for current user
      { $match: { participants: userId } },
      
      // Lookup latest message
      {
        $lookup: {
          from: "messages",
          let: { conversationId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$conversation", "$$conversationId"] } } },
            { $sort: { createdAt: -1 } },
            { $limit: 1 }
          ],
          as: "lastMessageArray"
        }
      },
      
      // Unwind last message or set to null
      {
        $addFields: {
          lastMessage: { $arrayElemAt: ["$lastMessageArray", 0] }
        }
      },
      
      // Count unread messages
      {
        $lookup: {
          from: "messages",
          let: { conversationId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$conversation", "$$conversationId"] },
                    { $eq: ["$isRead", false] },
                    { $ne: ["$sender", userId] }
                  ]
                }
              }
            },
            { $count: "total" }
          ],
          as: "unreadArray"
        }
      },
      
      {
        $addFields: {
          unreadCount: { $arrayElemAt: ["$unreadArray.total", 0] }
        }
      },
      
      // Lookup participant details
      {
        $lookup: {
          from: "users",
          localField: "participants",
          foreignField: "_id",
          as: "participants"
        }
      },
      
      // Project needed fields
      {
        $project: {
          _id: 1,
          participants: { _id: 1, username: 1, name: 1, avatar: 1 },
          lastMessage: 1,
          unreadCount: { $ifNull: ["$unreadCount", 0] },
          updatedAt: 1,
          createdAt: 1
        }
      },
      
      // Sort by latest
      { $sort: { updatedAt: -1 } }
    ]);

    // Populate sender details in lastMessage
    for (let convo of conversations) {
      if (convo.lastMessage && convo.lastMessage.sender) {
        const sender = await Message.findById(convo.lastMessage._id).populate(
          "sender",
          "username name avatar"
        );
        if (sender) convo.lastMessage.sender = sender.sender;
      }
    }

    res.json(conversations);

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

export const deleteConversation = async (req, res) => {
    try {
        const convo = await Conversation.findOne({
            _id: req.params.conversationId,
            participants: req.user._id
        });

        if (!convo) {
            return res.status(404).json({ message: "Conversation not found or unauthorized" });
        }

        await Message.deleteMany({ conversation: convo._id });
        await Notification.deleteMany({
            type: "message",
            conversation: convo._id
        });
        await convo.deleteOne();

        res.json({ message: "Conversation deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const clearUserConversations = async (req, res) => {
    try {
        const conversations = await Conversation.find({
            participants: req.user._id
        }).select("_id");

        const conversationIds = conversations.map((conversation) => conversation._id);

        if (conversationIds.length === 0) {
            return res.json({
                message: "No conversations to clear",
                deletedCount: 0
            });
        }

        await Message.deleteMany({
            conversation: { $in: conversationIds }
        });
        await Notification.deleteMany({
            type: "message",
            conversation: { $in: conversationIds }
        });

        const deletedConversations = await Conversation.deleteMany({
            _id: { $in: conversationIds },
            participants: req.user._id
        });

        res.json({
            message: "All chats cleared successfully",
            deletedCount: deletedConversations.deletedCount
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
