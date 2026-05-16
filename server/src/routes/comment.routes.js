import express from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import { addComment, getPostComments, deleteComment} from "../controllers/comment.controller.js";

const commentRouter = express.Router();

commentRouter.get("/:postId", getPostComments);
commentRouter.post("/add/:postId", authMiddleware, addComment);
commentRouter.post("/:postId", authMiddleware, addComment);
commentRouter.delete("/delete/:commentId", authMiddleware, deleteComment);
commentRouter.delete("/:commentId", authMiddleware, deleteComment);

export default commentRouter;
