import express from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import upload from "../middlewares/upload.middleware.js";
import { getAllUsers, getFollowers, getFollowing, getUserProfile, searchUsers, toggleFollowUser, updateProfile, uploadAvatar, getSuggestedUsers } from "../controllers/user.controller.js";

const userRouter = express.Router();

userRouter.post("/avatar", authMiddleware, upload.single("avatar"), uploadAvatar);
userRouter.put("/update-profile", authMiddleware, updateProfile);
userRouter.put("/:id/follow", authMiddleware, toggleFollowUser);

userRouter.get("/all", getAllUsers);
userRouter.get("/search", searchUsers);
userRouter.get("/suggested", authMiddleware, getSuggestedUsers); 

userRouter.get("/:id/followers", authMiddleware, getFollowers);
userRouter.get("/:id/following", authMiddleware, getFollowing);

userRouter.get("/:username", getUserProfile); 

export default userRouter;