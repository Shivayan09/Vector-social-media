import express from "express";
import auth from "../middlewares/auth.middleware.js";
import { deleteAllNotifications, deleteMultipleNotifications, deleteNotification, getNotifications, markAllAsRead, markAsRead } from "../controllers/notification.controller.js";
import { notificationWriteLimiter } from "../middlewares/rateLimit.middleware.js";

const notificationRouter = express.Router();

notificationRouter.get("/", auth, getNotifications);
notificationRouter.put("/read-all", auth, notificationWriteLimiter, markAllAsRead);
notificationRouter.delete("/all", auth, notificationWriteLimiter, deleteAllNotifications);
notificationRouter.put("/:id/read", auth, markAsRead);
notificationRouter.delete("/:id", auth, deleteNotification);
notificationRouter.post("/bulk-delete", auth, notificationWriteLimiter, deleteMultipleNotifications);

export default notificationRouter;