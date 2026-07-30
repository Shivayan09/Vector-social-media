import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
{
  participants: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  ],
  participantsKey: {
    type: String,
  },
  deletedBy: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
},
{ timestamps: true }
);

conversationSchema.index({ participantsKey: 1 }, { unique: true, sparse: true });
conversationSchema.index({ participants: 1 });
conversationSchema.index({ deletedBy: 1, updatedAt: 1 });

export default mongoose.model("Conversation", conversationSchema);
