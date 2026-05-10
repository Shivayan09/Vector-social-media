import express from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import { createCommentReport, createPostReport } from "../controllers/report.controller.js";

const reportRouter = express.Router();

reportRouter.post("/posts", authMiddleware, createPostReport);
reportRouter.post("/comments", authMiddleware, createCommentReport);

export default reportRouter;
