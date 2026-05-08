import express from "express";
import jwt from "jsonwebtoken";
import authMiddleware from "../middlewares/auth.middleware.js";
import upload from "../middlewares/upload.middleware.js";
import User from "../models/user.model.js";
import { getAllUsers, getFollowers, getFollowing, getUserProfile, searchUsers, toggleFollowUser, updateProfile, uploadAvatar, getSuggestedUsers, acceptFollowRequest, rejectFollowRequest } from "../controllers/user.controller.js";

const userRouter = express.Router();

// Optional auth middleware - sets req.user if valid token exists, otherwise continues
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.token;
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (user) req.user = user;
    }
  } catch {
    // Silently ignore - user is just not authenticated
  }
  next();
};

userRouter.post("/avatar", authMiddleware, upload.single("avatar"), uploadAvatar);
userRouter.put("/update-profile", authMiddleware, updateProfile);
userRouter.put("/:id/follow", authMiddleware, toggleFollowUser);
userRouter.get("/suggestions", authMiddleware, getSuggestedUsers);
userRouter.get("/all", getAllUsers);
userRouter.get("/search", searchUsers);
userRouter.get("/:username", optionalAuth, getUserProfile);
userRouter.put("/:requestId/accept", authMiddleware, acceptFollowRequest);
userRouter.put("/:requestId/reject", authMiddleware, rejectFollowRequest);
userRouter.get("/:id/followers", authMiddleware, getFollowers);
userRouter.get("/:id/following", authMiddleware, getFollowing);

export default userRouter;