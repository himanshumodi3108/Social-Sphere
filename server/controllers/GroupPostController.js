import GroupPostModel from "../models/groupPostModel.js";
import GroupModel from "../models/groupModel.js";
import UserModel from "../models/userModel.js";
import logger from "../utils/logger.js";
import { getPaginationParams, createPaginationResponse } from "../utils/pagination.js";
import { createNotification } from "./NotificationController.js";

// Create a group post
export const createGroupPost = async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }

    if (!req.body.desc && !req.body.image && !req.body.video) {
      return res.status(400).json({ message: "Post content is required" });
    }

    // Check if group exists and user is a member
    const group = await GroupModel.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const isMember = group.members?.some(m => String(m.userId) === String(userId));
    const isCreator = String(group.createdBy) === String(userId);

    if (!isMember && !isCreator) {
      return res.status(403).json({ message: "You must be a member to post in this group" });
    }

    const postData = {
      groupId: String(groupId),
      userId: String(userId),
      desc: req.body.desc || '',
      privacy: req.body.privacy || 'members',
      likes: [],
      comments: []
    };

    if (req.body.image) {
      postData.image = req.body.image;
    }

    if (req.body.video) {
      postData.video = req.body.video;
    }

    if (req.body.location) {
      postData.location = req.body.location;
    }

    if (req.body.scheduledAt) {
      postData.scheduledAt = new Date(req.body.scheduledAt);
    }

    const savedPost = await GroupPostModel.create(postData);

    logger.info("Group post created", { postId: String(savedPost._id), groupId, userId });

    // Populate author information
    const postWithAuthor = await GroupPostModel.aggregate([
      { $match: { _id: savedPost._id } },
      {
        $lookup: {
          from: 'users',
          let: { userId: { $toString: '$userId' } },
          pipeline: [
            { $match: { $expr: { $eq: [{ $toString: '$_id' }, '$$userId'] } } },
            { $project: { firstname: 1, lastname: 1, username: 1, profilePicture: 1 } }
          ],
          as: 'author'
        }
      },
      {
        $addFields: {
          author: { $arrayElemAt: ['$author', 0] }
        }
      }
    ]);

    const finalPost = postWithAuthor[0] || savedPost;

    // Notify group members (except the author)
    const memberIds = group.members
      ?.filter(m => String(m.userId) !== String(userId))
      ?.map(m => m.userId) || [];

    for (const memberId of memberIds) {
      await createNotification(memberId, 'group_post', userId, {
        groupId,
        postId: String(savedPost._id)
      });
    }

    res.status(200).json(finalPost);
  } catch (error) {
    logger.error("Error creating group post", { error: error.message, groupId: req.params.id });
    res.status(500).json({ message: error.message || "Failed to create group post" });
  }
};

// Get group posts
export const getGroupPosts = async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = req.userId;
    const { page, limit, skip } = getPaginationParams(req);

    // Check if group exists
    const group = await GroupModel.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check privacy
    if (group.privacy === 'private') {
      const isMember = userId && group.members?.some(m => String(m.userId) === String(userId));
      const isCreator = userId && String(group.createdBy) === String(userId);
      
      if (!isMember && !isCreator) {
        return res.status(403).json({ message: "This is a private group" });
      }
    }

    // Get total count
    const total = await GroupPostModel.countDocuments({ groupId });

    // Fetch posts
    const posts = await GroupPostModel.find({ groupId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Populate author information
    const userIds = [...new Set(posts.map(p => String(p.userId)))];
    const users = await UserModel.find({ _id: { $in: userIds } })
      .select('firstname lastname username profilePicture')
      .lean();

    const userMap = {};
    users.forEach(user => {
      userMap[String(user._id)] = {
        _id: user._id,
        firstname: user.firstname,
        lastname: user.lastname,
        username: user.username,
        profilePicture: user.profilePicture,
      };
    });

    const postsWithAuthors = posts.map(post => ({
      ...post,
      author: userMap[String(post.userId)] || null,
    }));

    logger.info("Group posts fetched", { groupId, count: postsWithAuthors.length, page, limit, total });

    res.status(200).json(createPaginationResponse(postsWithAuthors, total, page, limit));
  } catch (error) {
    logger.error("Error fetching group posts", { error: error.message, groupId: req.params.id });
    res.status(500).json({ message: error.message || "Failed to fetch group posts" });
  }
};


