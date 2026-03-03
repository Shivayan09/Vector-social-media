import jwt from "jsonwebtoken";

export const googleAuthCallback = async (req, res) => {
    const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
    try {
        const user = req.user;
        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            path: "/",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        if (!user.isProfileComplete) {
            return res.redirect(`${FRONTEND_URL}/auth/profile?register=google`);
        }
        res.redirect(`${FRONTEND_URL}/main?login=google`);
    } catch (err) {
        console.error(err);
        res.redirect(`${FRONTEND_URL}/auth/login?error=google`);
    }
};
