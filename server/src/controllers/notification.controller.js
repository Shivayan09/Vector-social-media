import Notification from "../models/notification.model.js";

export const getNotifications = async (req, res) => {
    const currentUserId = req.user?._id || req.user?.id;
    const notifications = await Notification.find({ recipient: currentUserId })
        .populate("sender", "name username avatar _id")
        .populate("post")
        .populate("conversation")
        .sort({ createdAt: -1 });
    return res.json(notifications);
};

export const markAsRead = async (req, res) => {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
    return res.json({
        success: true
    });
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
