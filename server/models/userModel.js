import mongoose from "mongoose";

const UserSchema = mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true, // Allows multiple null values but enforces uniqueness for non-null
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    firstname: {
      type: String,
      required: true,
      trim: true,
    },
    lastname: {
      type: String,
      required: true,
      trim: true,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    profilePicture: String,
    coverPicture: String,
    about: String,
    livesIn: String,
    worksAt: String,
    relationship: String,
    country: String,
    followers: [],
    following: [],
    blocked: {
      type: Array,
      default: [],
    },
    savedPosts: {
      type: Array,
      default: [],
    },
    privacy: {
      profile: {
        type: String,
        enum: ['public', 'private', 'friends'],
        default: 'public',
      },
      posts: {
        type: String,
        enum: ['public', 'friends', 'private'],
        default: 'public',
      },
    },
  },
  { timestamps: true }
);

// Add indexes for better query performance
UserSchema.index({ username: 1 }, { unique: true });
UserSchema.index({ email: 1 }, { sparse: true });
UserSchema.index({ followers: 1 });
UserSchema.index({ following: 1 });
UserSchema.index({ blocked: 1 });

const UserModel = mongoose.model("Users", UserSchema);
export default UserModel;
