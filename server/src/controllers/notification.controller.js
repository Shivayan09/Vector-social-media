import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";

export const getNotifications = async (req, res) => {
    const currentUserId = req.user?._id || req.user?.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const blockers = await User.find({ blockedUsers: currentUserId }).select("_id");
    const blockerIds = blockers.map(u => u._id);
    const blockedIds = req.user?.blockedUsers || [];
    const excludeIds = [...blockedIds, ...blockerIds];
    const notifications = await Notification.find({ 
        recipient: currentUserId,
        sender: { $nin: excludeIds } 
    })
        .populate("sender", "name username avatar _id")
        .populate("post")
        .populate("conversation")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    const followingUserIds = new Set(
        (req.user?.following || []).map(id => id.toString())
    );

    const senderIds = notifications
        .map(n => n.sender?._id)
        .filter(id => id);

    const requestedUsers = await User.find({
        _id: { $in: senderIds },
        followRequests: currentUserId,
    }).select("_id").lean();

    const requestedUserIds = new Set(
        requestedUsers.map((user) => user._id.toString())
    );

    const notificationsWithFollowState = notifications.map(notification => {
        if (notification.sender) {
            notification.sender.isFollowedByCurrentUser = followingUserIds.has(notification.sender._id.toString());
            notification.sender.isRequestedByCurrentUser = requestedUserIds.has(notification.sender._id.toString());
        }
        return notification;
    });

    return res.json(notificationsWithFollowState);
};


export const markAsRead = async (req, res) => {
    try {
        const currentUserId = req.user?._id || req.user?.id;
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, recipient: currentUserId },
            { isRead: true }
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
    } catch {
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

export const deleteNotification = async (req, res) => {
    try {
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
    } catch {
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

export const deleteMultipleNotifications = async (req, res) => {
    try {
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
    } catch {
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

export const deleteAllNotifications = async (req, res) => {
    try {
        const currentUserId = req.user?._id || req.user?.id;
        await Notification.deleteMany({ recipient: currentUserId });
        return res.json({
            success: true,
            message: "Notifications deleted"
        });
    } catch (err) {
        console.error(err)
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};
