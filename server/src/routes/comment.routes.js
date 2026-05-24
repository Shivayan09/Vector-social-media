import express from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import { addComment, getPostComments, deleteComment} from "../controllers/comment.controller.js";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

const optionalAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.token;
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (user) req.user = user;
    }
  } catch {
    // Silently ignore — unauthenticated access is allowed
  }
  next();
};

const commentRouter = express.Router();

commentRouter.get("/:postId", optionalAuth, getPostComments);
commentRouter.post("/add/:postId", authMiddleware, addComment);
commentRouter.post("/:postId", authMiddleware, addComment);
commentRouter.delete("/delete/:commentId", authMiddleware, deleteComment);
commentRouter.delete("/:commentId", authMiddleware, deleteComment);

export default commentRouter;
