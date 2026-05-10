import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

const optionalAuthMiddleware = async (req, res, next) => {
    try {
        const token = req.cookies?.token;
        if (!token) {
            return next();
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (user) {
            req.user = user;
        }
        next();
    } catch (error) {
        // If token is invalid, just proceed as guest
        next();
    }
};

export default optionalAuthMiddleware;
