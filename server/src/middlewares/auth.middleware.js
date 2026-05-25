import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.cookies?.token;
        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized. Token missing!",
            });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized. User not found!",
            });
        }

        if ((decoded.version || 0) !== (user.tokenVersion || 0)) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized. Token invalidated due to password reset!",
            });
        }

        req.user = user;
        next();
    } catch {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token!",
        });
    }
};

export default authMiddleware;
