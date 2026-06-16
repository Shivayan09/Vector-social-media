import mongoose from "mongoose";

const postSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  authorIsPrivate: {
    type: Boolean,
    default: false
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

  isEdited: {
    type: Boolean,
    default: false
  },

  editedAt: {
    type: Date,
    default: null
  },

  isDeleted: {
    type: Boolean,
    default: false
  },

  deletedAt: {
    type: Date,
    default: null
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

  sharedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],

  isFlaggedForReview: {
    type: Boolean,
    default: false,
  },

  isPinned: {
    type: Boolean,
    default: false,
  },

  poll: {
  question: {
    type: String,
    trim: true,
  },

  options: [
    {
      text: {
        type: String,
        required: true,
        trim: true,
      },

      voters: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        }
      ]
    }
  ],

  expiresAt: {
    type: Date,
  },

  isActive: {
    type: Boolean,
    default: true,
  }
},

}, { timestamps: true });

// Text index for searching posts by content and intent
postSchema.index({ content: "text", intent: "text" });
postSchema.index({ author: 1, _id: -1 });

// Compound index for efficient cursor-based pagination on user profile posts
// Used by getPostsByUser controller for O(log N) lookups instead of O(N) collection scans
postSchema.index({ author: 1, _id: -1 });

postSchema.pre("save", function () {

  if (typeof this.content === "string") {
    this.content = this.content.trim();
  }

  if (this.poll?.options?.length > 0) {

    if (this.poll.options.length < 2) {
      throw new Error(
        "Poll must contain at least 2 options"
      );
    }

    if (this.poll.options.length > 6) {
      throw new Error(
        "Maximum 6 poll options allowed"
      );
    }
  }
});

export default mongoose.model("Post", postSchema);