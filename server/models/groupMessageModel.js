import mongoose from "mongoose";

const GroupMessageSchema = new mongoose.Schema(
  {
    groupChatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GroupChat",
      required: true,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
    senderId: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

GroupMessageSchema.index({ groupChatId: 1, createdAt: -1 });
GroupMessageSchema.index({ groupId: 1, createdAt: -1 });
const GroupMessageModel = mongoose.model("GroupMessage", GroupMessageSchema);
export default GroupMessageModel;


