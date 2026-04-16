import express from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import { createConversation, getConversation, getUserConversations, deleteConversation } from "../controllers/conversation.controller.js";

const conversationRouter = express.Router();

conversationRouter.post("/", authMiddleware, createConversation)
conversationRouter.get("/", authMiddleware, getUserConversations);
conversationRouter.get("/:conversationId", authMiddleware, getConversation);
conversationRouter.delete("/:conversationId", authMiddleware, deleteConversation);

export default conversationRouter