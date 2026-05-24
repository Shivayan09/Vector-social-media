import express from "express";
import auth from "../middlewares/auth.middleware.js";
import {deleteAllNotifications, deleteMultipleNotifications, deleteNotification, getNotifications, markAllAsRead, markAsRead } from "../controllers/notification.controller.js";

const notificationRouter = express.Router();

notificationRouter.get("/", auth, getNotifications);
notificationRouter.put("/read-all", auth, markAllAsRead);
notificationRouter.delete("/all", auth, deleteAllNotifications);
notificationRouter.put("/:id/read", auth, markAsRead);
notificationRouter.delete("/:id", auth, deleteNotification);
notificationRouter.post("/bulk-delete", auth, deleteMultipleNotifications);

export default notificationRouter;