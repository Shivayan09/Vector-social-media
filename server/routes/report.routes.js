import express from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import { createCommentReport, createPostReport } from "../controllers/report.controller.js";
import { reportRateLimiter } from "../middlewares/rateLimit.middleware.js";

const reportRouter = express.Router();

reportRouter.post("/posts", authMiddleware, reportRateLimiter, createPostReport);
reportRouter.post("/comments", authMiddleware, reportRateLimiter, createCommentReport);

export default reportRouter;
