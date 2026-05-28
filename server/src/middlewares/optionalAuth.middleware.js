import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.token;
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (user && (decoded.version || 0) === (user.tokenVersion || 0)) req.user = user;
    }
  } catch {
    // Silently ignore — unauthenticated access is allowed
  }
  next();
};
export default optionalAuth;