import express from "express";
import { 
    createPost, 
    deletePost, 
    getPosts, 
    getPostsByUser, 
    getSinglePost, 
    getTopPostsOfWeek,
    getTopPostsOfMonth,
    toggleLike, 
    incrementShare 
} from "../controllers/post.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import upload from "../middlewares/upload.middleware.js";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

// Sets req.user if a valid token exists, but doesn't block the request
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

const postRouter = express.Router();

postRouter.post("/", authMiddleware, upload.single("image"), createPost);
postRouter.get("/top-week", getTopPostsOfWeek);
postRouter.get("/top-month", getTopPostsOfMonth);
postRouter.get("/", getPosts);
postRouter.get("/:postId", optionalAuth, getSinglePost);
postRouter.put("/:id/like", authMiddleware, toggleLike);
postRouter.put("/:id/share", authMiddleware, incrementShare);
postRouter.delete("/:id", authMiddleware, deletePost);
postRouter.get("/user/:userId", optionalAuth, getPostsByUser);

export default postRouter;