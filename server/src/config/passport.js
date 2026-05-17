import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/user.model.js";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.NODE_ENV === "production" ? "https://vector-uvl6.onrender.com/api/auth/google/callback" : "http://localhost:5000/api/auth/google/callback",

    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        let user = await User.findOne({ googleId: profile.id });
        if (!user) {
          user = await User.findOne({ email });
          if (user) {
            user.googleId = profile.id;
            user.provider = "google";
            await user.save();
          } else {
            user = await User.create({
              name: profile.name?.givenName || "",
              surname: profile.name?.familyName || "",
              email,
              googleId: profile.id,
              provider: "google",
              isProfileComplete: false,
            });
          }
        }
        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

export default passport;