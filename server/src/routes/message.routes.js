import express from "express";
import { deleteMessage, getMessages, sendMessage, getUnreadCount, markConversationAsRead } from "../controllers/message.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import { messageWriteLimiter } from "../middlewares/rateLimit.middleware.js";

const messageRouter = express.Router();

messageRouter.get("/:conversationId", authMiddleware, getMessages);
messageRouter.post("/", authMiddleware, messageWriteLimiter, sendMessage);
messageRouter.delete("/:messageId", authMiddleware, messageWriteLimiter, deleteMessage);
messageRouter.get("/:conversationId/unread-count", authMiddleware, getUnreadCount);
messageRouter.patch("/:conversationId/read-all", authMiddleware, messageWriteLimiter, markConversationAsRead);

export default messageRouter;
