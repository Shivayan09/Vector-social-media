import jwt from "jsonwebtoken";

export const generateToken = (id, version = 0) => {
  return jwt.sign(
    { id, version },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

export const getCookieOptions = () => {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
};
