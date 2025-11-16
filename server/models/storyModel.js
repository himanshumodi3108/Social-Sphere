import mongoose from "mongoose";

const storySchema = mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    image: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      maxlength: 200,
    },
    views: {
      type: Array,
      default: [],
    },
    reactions: {
      type: Array,
      default: [],
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // Auto-delete after expiration
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
storySchema.index({ userId: 1, createdAt: -1 });
storySchema.index({ expiresAt: 1 });

const StoryModel = mongoose.model("Stories", storySchema);
export default StoryModel;

