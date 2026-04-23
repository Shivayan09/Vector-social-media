import express from "express";
import { createPost, deletePost, getPosts, getPostsByUser, getSinglePost, getTopPostsOfWeek, toggleLike, incrementShare } from "../controllers/post.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const postRouter = express.Router();

postRouter.post("/", authMiddleware, createPost);
postRouter.get("/top-week", getTopPostsOfWeek);
postRouter.get("/", getPosts);
postRouter.get("/:postId", getSinglePost);
postRouter.put("/:id/like", authMiddleware, toggleLike);
postRouter.put("/:id/share", authMiddleware, incrementShare);
postRouter.delete("/:id", authMiddleware, deletePost);
postRouter.get("/user/:userId", getPostsByUser);

export default postRouter;