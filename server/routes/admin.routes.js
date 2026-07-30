import express from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import adminMiddleware from "../middlewares/admin.middleware.js";
import {
    getFlaggedContent,
    dismissFlag,
    deleteFlaggedContent,
    toggleUserBan
} from "../controllers/admin.controller.js";

const router = express.Router();

router.use(authMiddleware);
router.use(adminMiddleware);

router.get("/flagged", getFlaggedContent);
router.patch("/dismiss/:type/:id", dismissFlag);
router.delete("/:type/:id", deleteFlaggedContent);
router.patch("/user/:id/ban", toggleUserBan);

export default router;
