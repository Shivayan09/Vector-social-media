import express from "express";
import {
    createPost,
    deletePost,
    getPosts,
    getPostsByUser,
    getSinglePost,
    getTopPostsOfWeek,
    getTopPostsOfMonth,
    likePost,
    unlikePost,
    incrementShare,
    updatePost,
    toggleBookmark,
    getBookmarks,
    searchPosts,
    togglePinPost,
    votePoll,
    getPollResults
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
postRouter.post("/:id/like", authMiddleware, socialActionLimiter, likePost);
postRouter.post("/:id/unlike", authMiddleware, socialActionLimiter, unlikePost);
postRouter.put("/:id/share", authMiddleware, socialActionLimiter, incrementShare);
postRouter.put("/:id", authMiddleware, postWriteLimiter, uploadImage("image"), updatePost);
postRouter.delete("/:id", authMiddleware, postWriteLimiter, deletePost);
postRouter.post("/:id/vote",authMiddleware,socialActionLimiter,votePoll);
postRouter.get("/:id/poll-results",optionalAuth,getPollResults);
postRouter.post("/:id/bookmark", authMiddleware, socialActionLimiter, toggleBookmark);
postRouter.post("/:id/pin", authMiddleware, socialActionLimiter, togglePinPost);

export default postRouter;
