import Notification from "../models/notification.model.js";

export const getNotifications = async (req, res) => {
    const notifications = await Notification.find({ recipient: req.user._id, }).populate("sender", "name username avatar").populate("post").sort({ createdAt: -1 });
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
        const notification = await Notification.findOneAndDelete({
            _id: req.params.id,
            recipient: req.user._id,
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
        if (!ids || !Array.isArray(ids)) {
            return res.status(400).json({
                success: false,
                message: "Invalid request"
            });
        }
        await Notification.deleteMany({ _id: { $in: ids }, recipient: req.user._id});
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
        await Notification.deleteMany({ recipient: req.user._id });
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
