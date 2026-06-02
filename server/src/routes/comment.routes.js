import express from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import { addComment, getPostComments, deleteComment} from "../controllers/comment.controller.js";
import optionalAuth from "../middlewares/optionalAuth.middleware.js";
import { commentWriteLimiter } from "../middlewares/rateLimit.middleware.js";

const commentRouter = express.Router();

commentRouter.get("/:postId", optionalAuth, getPostComments);
commentRouter.post("/add/:postId", authMiddleware, commentWriteLimiter, addComment);
commentRouter.post("/:postId", authMiddleware, commentWriteLimiter, addComment);
commentRouter.delete("/delete/:commentId", authMiddleware, commentWriteLimiter, deleteComment);
commentRouter.delete("/:commentId", authMiddleware, commentWriteLimiter, deleteComment);

export default commentRouter;
