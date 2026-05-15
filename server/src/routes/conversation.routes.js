import express from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import {
    createConversation,
    getConversation,
    getUserConversations,
    deleteConversation,
    clearUserConversations
} from "../controllers/conversation.controller.js";

const conversationRouter = express.Router();

conversationRouter.post("/", authMiddleware, createConversation)
conversationRouter.get("/", authMiddleware, getUserConversations);
conversationRouter.delete("/clear-all", authMiddleware, clearUserConversations);
conversationRouter.get("/:conversationId", authMiddleware, getConversation);
conversationRouter.delete("/:conversationId", authMiddleware, deleteConversation);

export default conversationRouter
