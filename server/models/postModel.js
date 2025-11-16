import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  text: { type: String, required: true },
  likes: { type: Array, default: [] },
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

const postSchema = mongoose.Schema(
  {
    userId: { type: String, required: true },
    desc: { 
      type: String,
      trim: true,
      maxlength: 2000,
    },
    likes: [],
    comments: [commentSchema],
    createdAt: {
      type: Date,
      default: new Date(),
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
    privacy: {
      type: String,
      enum: ['public', 'friends', 'private'],
      default: 'public',
    },
    editedAt: {
      type: Date,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Add indexes for better query performance
postSchema.index({ userId: 1, createdAt: -1 });
postSchema.index({ 'comments.userId': 1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ likes: 1 });

var PostModel = mongoose.model("Posts", postSchema);

export default PostModel;
