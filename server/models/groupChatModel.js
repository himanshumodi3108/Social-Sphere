import mongoose from "mongoose";

const GroupChatSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

GroupChatSchema.index({ groupId: 1 });
const GroupChatModel = mongoose.model("GroupChat", GroupChatSchema);
export default GroupChatModel;


