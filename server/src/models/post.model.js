import mongoose from "mongoose";

const postSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  content: {
    type: String,
    maxlength: 1000
  },

  image: {
    type: String,
  },

  imagePublicId: {
    type: String,
  },

  intent: {
    type: String,
    enum: ["ask", "build", "share", "discuss", "reflect"],
    required: true
  },

  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],

  commentsCount: {
    type: Number,
    default: 0,
  },

  sharesCount: {
    type: Number,
    default: 0,
  },

}, { timestamps: true });

export default mongoose.model("Post", postSchema);