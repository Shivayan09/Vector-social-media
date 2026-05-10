import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";

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

    const conversations = await Conversation.find({
      participants: req.user._id
    })
      .populate("participants", "username name avatar")
      .sort({ updatedAt: -1 });

    const conversationsWithLastMessage = await Promise.all(
      conversations.map(async (convo) => {
        const lastMessage = await Message.findOne({ conversation: convo._id })
          .sort({ createdAt: -1 });
        
        if (!lastMessage) return null;

        return {
          ...convo.toObject(),
          lastMessage
        };
      })
    );

    res.json(conversationsWithLastMessage.filter(Boolean));

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