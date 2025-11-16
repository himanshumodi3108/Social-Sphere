import mongoose from "mongoose";

const notificationSchema = mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['like', 'comment', 'follow', 'mention', 'post', 'group_invite', 'group_post', 'message', 'story'],
    },
    fromUserId: {
      type: String,
      required: true,
    },
    postId: {
      type: String,
      sparse: true,
    },
    commentId: {
      type: String,
      sparse: true,
    },
    groupId: {
      type: String,
      sparse: true,
    },
    chatId: {
      type: String,
      sparse: true,
    },
    message: {
      type: String,
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    link: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, createdAt: -1 });

const NotificationModel = mongoose.model("Notifications", notificationSchema);
export default NotificationModel;

