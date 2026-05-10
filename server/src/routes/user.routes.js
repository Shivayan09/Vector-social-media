import express from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import optionalAuthMiddleware from "../middlewares/optionalAuth.middleware.js";
import upload from "../middlewares/upload.middleware.js";
import { getAllUsers, getFollowers, getFollowing, getUserProfile, searchUsers, toggleFollowUser, updateProfile, uploadAvatar, blockUser, unblockUser } from "../controllers/user.controller.js";

const userRouter = express.Router();

userRouter.post("/avatar", authMiddleware, upload.single("avatar"), uploadAvatar);
userRouter.put("/update-profile", authMiddleware, updateProfile);
userRouter.put("/:id/follow", authMiddleware, toggleFollowUser);
userRouter.post("/:id/block", authMiddleware, blockUser);
userRouter.post("/:id/unblock", authMiddleware, unblockUser);
userRouter.get("/all", optionalAuthMiddleware, getAllUsers);
userRouter.get("/search", optionalAuthMiddleware, searchUsers);
userRouter.get("/:username", optionalAuthMiddleware, getUserProfile);
userRouter.get("/:id/followers", authMiddleware, getFollowers);
userRouter.get("/:id/following", authMiddleware, getFollowing);

export default userRouter;