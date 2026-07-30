import express from "express";
import rateLimit from "express-rate-limit";
import { getMe, login, logout, register, forgotPassword, resetPassword} from "./controllers/auth.controller.js";
import authMiddleware from "./middlewares/auth.middleware.js";
import { googleAuth } from "./controllers/googleAuth.controller.js";

const authRouter = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skip: () => process.env.NODE_ENV === "test",
  message: { success: false, message: "Too many attempts. Try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  skip: () => process.env.NODE_ENV === "test",
  message: { success: false, message: "Too many registrations from this IP." },
  standardHeaders: true,
  legacyHeaders: false,
});

authRouter.post("/register", registerLimiter, register);
authRouter.get("/me", authMiddleware, getMe);
authRouter.post("/login", authLimiter, login);
authRouter.post("/logout", logout);
authRouter.post("/forgot-password", authLimiter, forgotPassword);

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skip: () => process.env.NODE_ENV === "test",
  keyGenerator: (req) => req.body?.resetToken || req.ip,
  message: { success: false, message: "Too many attempts. Try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

authRouter.post("/reset-password", resetPasswordLimiter, resetPassword);
authRouter.post("/google", registerLimiter, googleAuth);

export default authRouter;
