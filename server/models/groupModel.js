import mongoose from "mongoose";

const groupMemberSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  role: {
    type: String,
    enum: ['admin', 'moderator', 'member'],
    default: 'member',
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: false });

const groupSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      maxlength: 500,
    },
    coverPicture: String,
    profilePicture: String,
    createdBy: {
      type: String,
      required: true,
    },
    members: [groupMemberSchema],
    privacy: {
      type: String,
      enum: ['public', 'private'],
      default: 'public',
    },
    rules: [String],
  },
  {
    timestamps: true,
  }
);

// Indexes
groupSchema.index({ name: 'text', description: 'text' }); // Text search
groupSchema.index({ 'members.userId': 1 });
groupSchema.index({ createdBy: 1 });
groupSchema.index({ privacy: 1, createdAt: -1 });

const GroupModel = mongoose.model("Groups", groupSchema);
export default GroupModel;

