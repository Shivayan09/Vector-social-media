import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import { getIO } from "../socket/socket.js";
import asyncHandler from "../utils/asyncHandler.js";

export const getUnreadConversationCount = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const conversationIds = await Conversation.distinct("_id", {
        participants: userId,
        deletedBy: { $ne: userId },
    });

    const count = await Message.aggregate([
        {
            $match: {
                conversation: { $in: conversationIds },
                sender: { $ne: userId },
                isDeleted: false,
                isRead: false,
            },
        },
        {
            $group: { _id: "$conversation" },
        },
        {
            $count: "total",
        },
    ]);

    res.json({ unreadCount: count[0]?.total ?? 0 });
});
export const createConversation = asyncHandler(async (req, res) => {
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

        const participantsKey = [senderId.toString(), receiverId.toString()]
            .sort()
            .join(":");

        let convo = await Conversation.findOne({ participantsKey });

        // Backfill participantsKey for existing conversations (and return it)
        if (!convo) {
            convo = await Conversation.findOneAndUpdate(
                { participants: { $all: [senderId, receiverId] }, participantsKey: { $exists: false } },
                { $set: { participantsKey } },
                { new: true }
            );
        }

        // Re-verify block status right before creating
        if (!convo) {
            const [freshReceiver, freshSender] = await Promise.all([
                User.findById(receiverId).select("blockedUsers"),
                User.findById(senderId).select("blockedUsers"),
            ]);
            const stillBlocked = freshSender?.blockedUsers?.some(id => id.toString() === receiverId.toString()) ||
                                freshReceiver?.blockedUsers?.some(id => id.toString() === senderId.toString());
            if (stillBlocked) {
                return res.status(403).json({ message: "Action forbidden due to block status" });
            }
        }

        // Create atomically; if the unique index races, fall back to the existing one
        if (!convo) {
            try {
                convo = await Conversation.findOneAndUpdate(
                    { participantsKey },
                    { $setOnInsert: { participants: [senderId, receiverId], participantsKey } },
                    { upsert: true, new: true }
                );
            } catch (err) {
                if (err?.code !== 11000) throw err;
                convo = await Conversation.findOne({ participantsKey });
            }
        }
        res.json(convo);
});

export const getConversation = asyncHandler(async (req, res) => {
        const convo = await Conversation.findOne({
            _id: req.params.conversationId,
            participants: req.user._id,
        }).populate("participants", "username name avatar");
        if (!convo) {
            return res.status(403).json({ message: "Conversation not found or unauthorized" });
        }

        const otherParticipant = convo.participants.find(
            p => p._id.toString() !== req.user._id.toString()
        );
        if (otherParticipant) {
            const otherUser = await User.findById(otherParticipant._id).select("blockedUsers");
            const isBlocked = req.user.blockedUsers?.some(
                id => id.toString() === otherParticipant._id.toString()
            ) || otherUser?.blockedUsers?.some(
                id => id.toString() === req.user._id.toString()
            );
            if (isBlocked) {
                return res.status(403).json({ message: "Action forbidden due to block status" });
            }
        }

        res.json(convo);
});

export const getUserConversations = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    let conversations = await Conversation.aggregate([
      // Match conversations for current user that have not been soft-deleted by them
      { $match: { participants: userId, deletedBy: { $ne: userId } } },

      // Identify the other participant(s) in each conversation
      {
        $addFields: {
          otherParticipants: {
            $filter: {
              input: "$participants",
              as: "p",
              cond: { $ne: ["$$p", userId] },
            },
          },
        },
      },

      // Filter: exclude conversations where current user has blocked any other participant
      {
        $lookup: {
          from: "users",
          let: { userId: userId },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$userId"] } } },
            { $project: { blockedUsers: 1 } },
          ],
          as: "currentUserDoc",
        },
      },
      {
        $match: {
          $expr: {
            $eq: [
              {
                $size: {
                  $filter: {
                    input: { $ifNull: [{ $arrayElemAt: ["$currentUserDoc.blockedUsers", 0] }, []] },
                    as: "blockedId",
                    cond: { $in: ["$$blockedId", "$otherParticipants"] },
                  },
                },
              },
              0,
            ],
          },
        },
      },

      // Filter: exclude conversations where any other participant has blocked the current user
      {
        $lookup: {
          from: "users",
          let: { others: "$otherParticipants" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$_id", "$$others"] },
                    { $in: [userId, { $ifNull: ["$blockedUsers", []] }] },
                  ],
                },
              },
            },
            { $project: { _id: 1 } },
          ],
          as: "usersWhoBlockedMe",
        },
      },
      { $match: { $expr: { $eq: [{ $size: "$usersWhoBlockedMe" }, 0] } } },

      // Remove temporary block-check fields before the expensive lookups below
      {
        $project: {
          currentUserDoc: 0,
          otherParticipants: 0,
          usersWhoBlockedMe: 0,
        },
      },

      // Lookup latest message
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
                    { $eq: ["$isDeleted", false] },
                  ],
                },
              },
            },
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
            {
              $lookup: {
                from: "users",
                localField: "sender",
                foreignField: "_id",
                as: "sender"
              }
            },
            {
              $unwind: {
                path: "$sender",
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $project: {
                _id: 1,
                conversation: 1,
                sender: { _id: 1, username: 1, name: 1, avatar: 1 },
                content: 1,
                isDeleted: 1,
                deletedAt: 1,
                isRead: 1,
                createdAt: 1,
                updatedAt: 1
              }
            }
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
                    { $eq: ["$isDeleted", false] },
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


    res.json(conversations);

});

export const deleteConversation = asyncHandler(async (req, res) => {

    const existingConvo = await Conversation.findOne({
        _id: req.params.conversationId,
        participants: req.user._id,
    });

    if (existingConvo) {
        const otherParticipant = existingConvo.participants.find(
            p => p.toString() !== req.user._id.toString()
        );

        if (otherParticipant) {
            const otherUser = await User.findById(otherParticipant).select("blockedUsers");

            const isBlocked =
                req.user.blockedUsers?.some(
                    id => id.toString() === otherParticipant.toString()
                ) ||
                otherUser?.blockedUsers?.some(
                    id => id.toString() === req.user._id.toString()
                );

            if (isBlocked) {
                return res.status(403).json({
                    message: "Action forbidden due to block status"
                });
            }
        }
    }

    const convo = await Conversation.findOneAndUpdate(
        {
            _id: req.params.conversationId,
            participants: req.user._id,
            deletedBy: { $ne: req.user._id },
        },
        { $addToSet: { deletedBy: req.user._id } },
        { new: true }
    );

    if (!convo) {
        const existingConvo = await Conversation.findOne({
            _id: req.params.conversationId,
            participants: req.user._id,
        });

        if (!existingConvo) {
            return res.status(404).json({
                message: "Conversation not found or unauthorized"
            });
        }

        return res.status(400).json({
            message: "Conversation already deleted"
        });
    }

    const otherParticipants = convo.participants.filter(
        (pid) => pid.toString() !== req.user._id.toString()
    );

    otherParticipants.forEach((pid) => {
        getIO().to(pid.toString()).emit(
            "conversation:participant_deleted",
            {
                conversationId: convo._id,
                deletedBy: req.user._id,
            }
        );
    });

    res.json({
        message: "Conversation deleted successfully",
        softDeleted: true,
    });

});