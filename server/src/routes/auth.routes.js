import express from "express";
import rateLimit from "express-rate-limit";
import {
  getMe,
  login,
  logout,
  register,
  forgotPassword,
  resetPassword,
} from "../controllers/auth.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import { googleAuth } from "../controllers/googleAuth.controller.js";

const authRouter = express.Router();

/**
 * Shared rate limiter skip helper — disables limiting in test environments
 * so unit/integration tests are not affected by the middleware.
 */
const skipInTest = () => process.env.NODE_ENV === "test";

/** Protects login, forgot-password, and reset-password (10 req / 15 min per IP) */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skip: skipInTest,
  message: { success: false, message: "Too many attempts. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Protects registration — stricter window (5 req / 60 min per IP) */
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  skip: skipInTest,
  message: { success: false, message: "Too many registrations from this IP. Try again in an hour." },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Protects OAuth endpoints — Google auth can be abused to enumerate accounts
 * (10 req / 15 min per IP, same as authLimiter).
 */
const oauthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skip: skipInTest,
  message: { success: false, message: "Too many OAuth attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Normal auth routes
authRouter.post("/register", registerLimiter, register);
authRouter.get("/me", authMiddleware, getMe);
authRouter.post("/login", authLimiter, login);
authRouter.post("/logout", logout);
authRouter.post("/forgot-password", authLimiter, forgotPassword);
authRouter.post("/reset-password", authLimiter, resetPassword);

// Google OAuth — now rate-limited to prevent account enumeration abuse
authRouter.post("/google", oauthLimiter, googleAuth);

export default authRouter;
