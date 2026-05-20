import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";

export const createConversation = async (req, res) => {
    try {
        const { receiverId } = req.body;
        const senderId = req.user._id;

        const receiver = await User.findById(receiverId);
        if (!receiver) {
            return res.status(404).json({ message: "Recipient not found" });
        }
        const isBlocked = req.user.blockedUsers?.some(id => id.toString() === receiverId.toString()) ||
                          receiver.blockedUsers?.some(id => id.toString() === senderId.toString());
        if (isBlocked) {
            return res.status(403).json({ message: "Action forbidden due to block status" });
        }

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
        const convo = await Conversation.findOne({
            _id: req.params.conversationId,
            participants: req.user._id,
        }).populate("participants", "username name avatar");
        if (!convo) {
            return res.status(403).json({ message: "Conversation not found or unauthorized" });
        }
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
        const convo = await Conversation.findOneAndDelete({
            _id: req.params.conversationId,
            participants: req.user._id
        });

        if (!convo) {
            return res.status(404).json({ message: "Conversation not found or unauthorized" });
        }

        res.json({ message: "Conversation deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};