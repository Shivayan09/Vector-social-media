import { OAuth2Client } from "google-auth-library";
import crypto from "crypto";
import User from "../models/user.model.js";
import { generateToken, getCookieOptions } from "../utils/generateToken.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const MAX_USERNAME_ATTEMPTS = 12;

function normalizeUsernameBase(raw) {
  const base = String(raw || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();

  if (base.length >= 3) return base;
  return "user";
}

function buildUsernameCandidate(base, attempt) {
  if (attempt === 0) return base.slice(0, 30);

  const suffix = String(crypto.randomInt(1000, 10000));
  const head = base.slice(0, 30 - suffix.length);
  return `${head}${suffix}`;
}

function isDuplicateKeyError(err) {
  return (
    !!err &&
    (err.code === 11000 || err.code === 11001) &&
    (err.name === "MongoServerError" ||
      err.name === "MongoError" ||
      err.name === "MongoBulkWriteError")
  );
}

function getDuplicateField(err) {
  const keyPattern = err?.keyPattern && typeof err.keyPattern === "object" ? err.keyPattern : null;
  if (keyPattern) {
    const [field] = Object.keys(keyPattern);
    if (field) return field;
  }

  const keyValue = err?.keyValue && typeof err.keyValue === "object" ? err.keyValue : null;
  if (keyValue) {
    const [field] = Object.keys(keyValue);
    if (field) return field;
  }

  return null;
}

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
      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Google auth failed: missing email.",
        });
      }

      const existingByEmail = await User.findOne({ email });
      if (existingByEmail) {
        if (existingByEmail.googleId && existingByEmail.googleId !== sub) {
          return res.status(409).json({
            success: false,
            message: "Email is already linked to a different Google account.",
          });
        }

        existingByEmail.googleId = sub;
        existingByEmail.provider = "google";
        if (!existingByEmail.avatar && picture) existingByEmail.avatar = picture;
        if (!existingByEmail.name && (given_name || name)) {
          existingByEmail.name = given_name || name;
        }
        if (!existingByEmail.surname && family_name) {
          existingByEmail.surname = family_name;
        }
        existingByEmail.isProfileComplete = true;

        user = await existingByEmail.save();
      } else {
        const base = normalizeUsernameBase(given_name || name || email.split("@")[0]);

        for (let attempt = 0; attempt < MAX_USERNAME_ATTEMPTS; attempt++) {
          const username = buildUsernameCandidate(base, attempt);
          try {
            user = await User.create({
              googleId: sub,
              provider: "google",
              email,
              name: given_name || name || "User",
              surname: family_name || "",
              avatar: picture || "",
              username,
              bio: "",
              description: "",
              isProfileComplete: true,
            });
            break;
          } catch (err) {
            if (isDuplicateKeyError(err)) {
              const field = getDuplicateField(err);
              if (field === "username") {
                continue;
              }
              if (field === "email") {
                const fallbackUser = await User.findOne({ email });
                if (fallbackUser) {
                  fallbackUser.googleId = sub;
                  fallbackUser.provider = "google";
                  fallbackUser.isProfileComplete = true;
                  user = await fallbackUser.save();
                  break;
                }
              }
            }
            throw err;
          }
        }

        if (!user) {
          return res.status(409).json({
            success: false,
            message:
              "We couldn't allocate a unique username right now. Please retry Google sign-in.",
          });
        }
      }
    }

    const token = generateToken(user._id, user.tokenVersion || 0);

    res.cookie("token", token, getCookieOptions());

    res.json({
      success: true,
      isProfileComplete: !!user.isProfileComplete,
    });

  } catch (error) {
    if (isDuplicateKeyError(error)) {
      const field = getDuplicateField(error);
      if (field === "username") {
        return res.status(409).json({
          success: false,
          message:
            "Username collision detected. Please retry Google sign-in.",
        });
      }
      if (field === "email") {
        return res.status(409).json({
          success: false,
          message:
            "An account with this email already exists. Try signing in with username/password first.",
        });
      }
    }
    res.status(500).json({
      success: false,
      message: "Google auth failed",
    });
  }
};
