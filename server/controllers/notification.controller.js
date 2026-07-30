import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";
import Follow from "../models/follow.model.js";
import asyncHandler from "../utils/asyncHandler.js";
export const getNotifications = asyncHandler(async (req, res) => {
        const currentUserId = req.user?._id || req.user?.id;
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 10, 50);
        const skip = (page - 1) * limit;
        const blockers = await User.find({ blockedUsers: currentUserId }).select("_id");
        const blockerIds = blockers.map(u => u._id);
        const blockedIds = req.user?.blockedUsers || [];
        const excludeIds = [...blockedIds, ...blockerIds];
        const filter = {
            recipient: currentUserId,
            sender: { $nin: excludeIds }
        };

        if (req.query.countOnly === "true") {
            const unreadCount = await Notification.countDocuments({ ...filter, isRead: false });
            return res.json({ unreadCount });
        }

        const notifications = await Notification.find(filter)
            .populate("sender", "name username avatar _id")
            .populate("post")
            .populate("conversation")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const followingDocs = await Follow.find({ follower: currentUserId, status: "accepted" }).select("following").lean();
        const followingUserIds = new Set(followingDocs.map(f => f.following.toString()));

        const senderIds = notifications
            .map(n => n.sender?._id)
            .filter(id => id);

        const requestedUsers = await Follow.find({
            following: { $in: senderIds },
            follower: currentUserId,
            status: "pending",
        }).select("following").lean();

        const requestedUserIds = new Set(
            requestedUsers.map((user) => user.following.toString())
        );

        const notificationsWithFollowState = notifications.map(notification => {
            if (notification.sender) {
                notification.sender.isFollowedByCurrentUser = followingUserIds.has(notification.sender._id.toString());
                notification.sender.isRequestedByCurrentUser = requestedUserIds.has(notification.sender._id.toString());
            }
            return notification;
        });

        return res.json(notificationsWithFollowState);
});


export const markAsRead = asyncHandler(async (req, res) => {
    const currentUserId = req.user?._id || req.user?.id;
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, recipient: currentUserId },
            { isRead: true, readAt: new Date() }
        );
        
        if (!notification) {
            return res.status(404).json({
                success: false,
                message: "Notification not found"
            });
        }

        return res.json({
            success: true
        });
});

export const deleteNotification = asyncHandler(async (req, res) => {
        const currentUserId = req.user?._id || req.user?.id;
        const notification = await Notification.findOneAndDelete({
            _id: req.params.id,
            recipient: currentUserId,
        });
        if (!notification) {
            return res.status(404).json({
                success: false,
                message: "Notification not found"
            });
        }
        return res.json({ success: true });
});

export const deleteMultipleNotifications = asyncHandler(async (req, res) => {
        const { ids } = req.body;
        const currentUserId = req.user?._id || req.user?.id;
        if (!ids || !Array.isArray(ids)) {
            return res.status(400).json({
                success: false,
                message: "Invalid request"
            });
        }
        await Notification.deleteMany({ _id: { $in: ids }, recipient: currentUserId });
        return res.json({
            success: true
        });
   
});

export const markAllAsRead = asyncHandler(async (req, res) => {
    const currentUserId = req.user?._id || req.user?.id;
    await Notification.updateMany(
            { recipient: currentUserId, isRead: false },
            { $set: { isRead: true, readAt: new Date() } }
        );
        return res.json({ success: true, message: "All notifications marked as read" });  
});

export const deleteAllNotifications = asyncHandler(async (req, res) => {
    const currentUserId = req.user?._id || req.user?.id;
        await Notification.deleteMany({ recipient: currentUserId });
        return res.json({
            success: true,
            message: "Notifications deleted"
        });
    
});
