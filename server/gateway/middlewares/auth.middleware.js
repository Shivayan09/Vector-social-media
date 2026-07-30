import jwt from "jsonwebtoken";
import env from "../config/env.js";

export default function authenticate(req, res, next) {
    const token = req.cookies?.token;
    if (!token)
        return res.status(401).json({
            success: false,
            message: "Unauthorized",
        });

    try {
        req.user = jwt.verify(token, env.jwtSecret);
        next();
    } catch {
        return res.status(401).json({
            success: false,
            message: "Invalid token",
        });
    }
}