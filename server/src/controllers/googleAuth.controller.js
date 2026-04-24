import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleAuth = async (req, res) => {
  try {
    const { credential } = req.body;

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    const {
      sub,
      email,
      given_name,
      family_name,
      picture,
      name,
    } = payload;

    let user = await User.findOne({ googleId: sub });

    if (!user) {
      // generate base username
      const base =
        (given_name || name || "user")
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");

      let username;
      let counter = 0;

      // find unique username
      while (true) {
        const candidate =
          counter === 0
            ? base
            : `${base}${Math.floor(10 + Math.random() * 90)}`;

        const exists = await User.findOne({ username: candidate });

        if (!exists) {
          username = candidate;
          break;
        }

        counter++;
      }

      user = await User.create({
        googleId: sub,
        email,
        name: given_name || name,
        surname: family_name || "",
        avatar: picture,
        username,
        bio: "",
        description: "",
        isProfileComplete: true,
      });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite:
        process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      isProfileComplete: true,
    });

  } catch {
    res.status(500).json({
      success: false,
      message: "Google auth failed",
    });
  }
};
