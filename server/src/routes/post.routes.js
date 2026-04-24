import express from "express";
import { createPost, deletePost, getPosts, getPostsByUser, getSinglePost, getTopPostsOfWeek, toggleLike } from "../controllers/post.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import upload from "../middlewares/upload.middleware.js";

const postRouter = express.Router();

postRouter.post("/", authMiddleware, upload.single("image"), createPost);
postRouter.get("/top-week", getTopPostsOfWeek);
postRouter.get("/", getPosts);
postRouter.get("/:postId", getSinglePost);
postRouter.put("/:id/like", authMiddleware, toggleLike);
postRouter.delete("/:id", authMiddleware, deletePost);
postRouter.get("/user/:userId", getPostsByUser);

export default postRouter;