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
       /home/runner/work/Vector-social-media/Vector-social-media/server/src/middlewares/optionalAuth.middleware.js
16:14  error  'error' is defined but never used  @typescript-eslint/no-unused-vars
        next();
    }
};

export default optionalAuthMiddleware;
