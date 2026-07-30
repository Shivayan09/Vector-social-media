import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

const authMiddleware = async (req, res, next) => {
    try {
        // Validate JWT_SECRET is configured
        if (!process.env.JWT_SECRET) {
            console.error("[Auth Error] JWT_SECRET environment variable not configured");
            return res.status(500).json({
                success: false,
                message: "Authentication service configuration error",
            });
        }

        const token = req.cookies?.token;
        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized. Token missing!",
            });
        }

        // Verify JWT token and handle specific errors
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (tokenError) {
            // Distinguish between token expiry and invalid token
            if (tokenError.name === "TokenExpiredError") {
                return res.status(401).json({
                    success: false,
                    message: "Token expired. Please login again.",
                });
            }
            // Any other JWT verification error (invalid signature, malformed, etc)
            return res.status(401).json({
                success: false,
                message: "Invalid token!",
            });
        }

        // Verify user exists in database
        let user;
        try {
            user = await User.findById(decoded.id);
        } catch (dbError) {
            console.error("[Auth Database Error] Failed to fetch user:", dbError.message);
            return res.status(500).json({
                success: false,
                message: "Database error. Please try again later.",
            });
        }

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized. User not found!",
            });
        }

        if (user.isBanned) {
            return res.status(403).json({
                success: false,
                message: "Your account has been banned.",
            });
        }

        // Verify token version (handles password reset token invalidation)
        if ((decoded.version || 0) !== (user.tokenVersion || 0)) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized. Token invalidated due to password reset!",
            });
        }

        req.user = user;
        next();
    } catch (error) {
        // Catch-all for unexpected errors (should rarely happen with proper error handling above)
        console.error("[Auth Middleware Unexpected Error]:", error.message);
        return res.status(500).json({
            success: false,
            message: "Authentication service error",
        });
    }
};

export default authMiddleware;
