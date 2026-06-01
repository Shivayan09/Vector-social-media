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
    incrementShare,
    updatePost,toggleBookmark,
    getBookmarks,
    searchPosts
} from "../controllers/post.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import { uploadImage } from "../middlewares/upload.middleware.js";
import optionalAuth from "../middlewares/optionalAuth.middleware.js";
import { postWriteLimiter, searchLimiter, socialActionLimiter } from "../middlewares/rateLimit.middleware.js";

const postRouter = express.Router();

postRouter.post("/", authMiddleware, postWriteLimiter, uploadImage("image"), createPost);
postRouter.get("/search", searchLimiter, optionalAuth, searchPosts);
postRouter.get("/", optionalAuth, getPosts);
postRouter.get("/top-week", optionalAuth, getTopPostsOfWeek);
postRouter.get("/top-month", optionalAuth, getTopPostsOfMonth);
postRouter.get("/bookmarks", authMiddleware, getBookmarks); 
postRouter.get("/user/:userId", optionalAuth, getPostsByUser);
postRouter.get("/:postId", optionalAuth, getSinglePost);
postRouter.post("/like/:id", authMiddleware, socialActionLimiter, toggleLike);
postRouter.put("/:id/like", authMiddleware, socialActionLimiter, toggleLike);
postRouter.put("/:id/share", authMiddleware, socialActionLimiter, incrementShare);
postRouter.put("/:id", authMiddleware, postWriteLimiter, uploadImage("image"), updatePost);
postRouter.delete("/:id", authMiddleware, postWriteLimiter, deletePost);
postRouter.post("/:id/bookmark", authMiddleware, socialActionLimiter, toggleBookmark);

export default postRouter;
