import express from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import isModerator from "../middlewares/isModerator.js";
import {
  createPostReport,
  getAllReports,
  getMyReports,
  getReportById,
  takeReportAction,
  updateReportStatus,
} from "../controllers/report.controller.js";

const reportRouter = express.Router();

reportRouter.post("/posts", authMiddleware, createPostReport);
reportRouter.get("/my", authMiddleware, getMyReports);
reportRouter.get("/", authMiddleware, isModerator, getAllReports);
reportRouter.get("/:id", authMiddleware, isModerator, getReportById);
reportRouter.patch("/:id/status", authMiddleware, isModerator, updateReportStatus);
reportRouter.patch("/:id/action", authMiddleware, isModerator, takeReportAction);

export default reportRouter;
