import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    surname: {
      type: String,
      default: "",
    },

    username: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },

    avatar: {
      type: String,
      default: "",
    },

    avatarPublicId: {
      type: String,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: function () {
        return !this.googleId;
      },
      minlength: 6,
      select: false,
    },

    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },

    provider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },

    description: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },

    bio: {
      type: String,
      trim: true,
      maxlength: 30,
      default: "",
    },

    phoneNumber: {
      type: String,
      trim: true,
      default: "",
    },

    resetToken: String,
    resetTokenExpiry: Date,

    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    followersCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },

    isProfileComplete: {
      type: Boolean,
      default: true,
    },

    isPrivate: {
      type: Boolean,
      default: false,
    },

    followRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

export default User;