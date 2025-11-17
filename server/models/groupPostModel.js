import mongoose from "mongoose";

const groupCommentSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  text: { type: String, required: true },
  likes: { type: Array, default: [] },
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

const groupPostSchema = mongoose.Schema(
  {
    groupId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
    },
    desc: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    image: String,
    video: String,
    location: {
      name: String,
      coordinates: {
        lat: Number,
        lng: Number
      }
    },
    scheduledAt: Date,
    likes: {
      type: Array,
      default: [],
    },
    comments: [groupCommentSchema],
    privacy: {
      type: String,
      enum: ['public', 'members'],
      default: 'members',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
groupPostSchema.index({ groupId: 1, createdAt: -1 });
groupPostSchema.index({ userId: 1 });
groupPostSchema.index({ createdAt: -1 });

const GroupPostModel = mongoose.model("GroupPosts", groupPostSchema);
export default GroupPostModel;

