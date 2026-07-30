import express from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import { createConversation, getConversation, getUserConversations, deleteConversation, getUnreadConversationCount } from "../controllers/conversation.controller.js";
import { conversationRateLimiter } from "../middlewares/rateLimit.middleware.js";

const conversationRouter = express.Router();

conversationRouter.post("/", authMiddleware, conversationRateLimiter, createConversation)
conversationRouter.get("/unread-count", authMiddleware, getUnreadConversationCount);
conversationRouter.get("/", authMiddleware, getUserConversations);
conversationRouter.get("/:conversationId", authMiddleware, getConversation);
conversationRouter.delete("/:conversationId", authMiddleware, deleteConversation);

export default conversationRouter