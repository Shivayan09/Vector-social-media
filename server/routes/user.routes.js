import express from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import { uploadImage } from "../middlewares/upload.middleware.js";
import { getAllUsers, getFollowers, getFollowing, getUserProfile, searchUsers, toggleFollowUser, updateProfile, uploadAvatar, getSuggestedUsers, getFollowRequests, acceptFollowRequest, rejectFollowRequest, getSentFollowRequests, blockUser, unblockUser, getUserAnalytics } from "../controllers/user.controller.js";
import { followActionLimiter, searchLimiter, socialActionLimiter } from "../middlewares/rateLimit.middleware.js";


const userRouter = express.Router();


userRouter.post("/avatar", authMiddleware, uploadImage("avatar"), uploadAvatar);
userRouter.put("/update-profile", authMiddleware, updateProfile);
userRouter.put("/:id/follow", authMiddleware, followActionLimiter, toggleFollowUser);
userRouter.put("/:id/block", authMiddleware, socialActionLimiter, blockUser);
userRouter.put("/:id/unblock", authMiddleware, socialActionLimiter, unblockUser);
userRouter.get("/suggestions", authMiddleware, getSuggestedUsers);
userRouter.get("/follow-requests", authMiddleware, getFollowRequests);
userRouter.get("/follow-requests/sent", authMiddleware, getSentFollowRequests);
userRouter.put("/:id/accept-request", authMiddleware, followActionLimiter, acceptFollowRequest);
userRouter.put("/:id/reject-request", authMiddleware, followActionLimiter, rejectFollowRequest);
userRouter.get("/all", authMiddleware, getAllUsers);
userRouter.get("/search", searchLimiter, authMiddleware, searchUsers);
userRouter.get("/analytics", authMiddleware, getUserAnalytics);
userRouter.get("/:username", getUserProfile);
userRouter.get("/:id/followers", authMiddleware, getFollowers);
userRouter.get("/:id/following", authMiddleware, getFollowing);

export default userRouter;
