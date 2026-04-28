import express from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import { createPostReport } from "../controllers/report.controller.js";

const reportRouter = express.Router();

reportRouter.post("/posts", authMiddleware, createPostReport);

export default reportRouter;
