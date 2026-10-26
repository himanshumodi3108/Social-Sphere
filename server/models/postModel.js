import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users",
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const postSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    desc: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users",
      },
    ],
    comments: [commentSchema],
    image: String,
    video: String,
    location: {
      name: String,
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },
    scheduledAt: Date,
    feeling: {
      type: {
        type: String,
        enum: [
          'happy', 'sad', 'excited', 'loved', 'blessed', 'grateful', 'proud', 'thankful',
          'amazed', 'confused', 'stressed', 'tired', 'angry', 'worried', 'hopeful',
          'nostalgic', 'silly', 'motivated', 'peaceful', 'energetic', 'calm', 'anxious',
          'confident', 'curious', 'determined', 'frustrated', 'inspired', 'lonely',
          'optimistic', 'overwhelmed', 'relieved', 'surprised', 'thoughtful', 'triumphant',
          'uncomfortable', 'wonderful', 'accomplished', 'adventurous', 'amused', 'annoyed',
          'ashamed', 'awesome', 'awful', 'bored', 'brave', 'busy', 'challenged',
          'cheerful', 'comfortable', 'content', 'cool', 'crazy', 'creative', 'cute',
          'disappointed', 'dramatic', 'embarrassed', 'emotional', 'exhausted', 'fantastic',
          'fine', 'fired', 'fit', 'fresh', 'friendly', 'frightened', 'full', 'funny',
          'generous', 'gentle', 'gifted', 'glad', 'glorious', 'good', 'gorgeous',
          'graceful', 'great', 'guilty', 'healthy', 'helpless', 'hilarious', 'hopeless',
          'horrible', 'hot', 'hungry', 'hurt', 'important', 'impressed', 'incredible',
          'innocent', 'insecure', 'intelligent', 'interested', 'jealous', 'jolly',
          'joyful', 'kind', 'lazy', 'lost', 'lovely', 'lucky', 'mad', 'mean',
          'miserable', 'nervous', 'nice', 'pained', 'perfect', 'pessimistic', 'pissed',
          'pleased', 'popular', 'positive', 'powerful', 'pumped', 'ready', 'refreshed',
          'regretful', 'relaxed', 'safe', 'satisfied', 'scared', 'secure', 'sensitive',
          'serious', 'shocked', 'sick', 'sleepy', 'smart', 'sore', 'sorry', 'special',
          'strong', 'stupid', 'successful', 'super', 'sweet', 'sympathetic', 'terrible',
          'terrific', 'touched', 'troubled', 'unhappy', 'upset', 'warm', 'weak',
          'weird', 'welcome'
        ],
      },
      activity: String,
    },
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

const PostModel = mongoose.model("Posts", postSchema);

export default PostModel;
