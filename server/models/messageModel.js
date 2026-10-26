import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
  {
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
      index: true,
    },
    text: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

MessageSchema.index({ chatId: 1, createdAt: 1 });

const MessageModel = mongoose.model("Message", MessageSchema);
export default MessageModel;
