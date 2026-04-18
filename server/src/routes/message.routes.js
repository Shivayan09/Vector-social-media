import express from "express";
import { deleteMessage, getMessages, sendMessage, markConversationAsRead, getUnreadCount } from "../controllers/message.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const messageRouter = express.Router();

messageRouter.get("/:conversationId", authMiddleware, getMessages);
messageRouter.get("/:conversationId/unread-count", authMiddleware, getUnreadCount);
messageRouter.post("/", authMiddleware, sendMessage);
messageRouter.patch("/:conversationId/read-all", authMiddleware, markConversationAsRead);
messageRouter.delete("/:messageId", authMiddleware, deleteMessage);

export default messageRouter;