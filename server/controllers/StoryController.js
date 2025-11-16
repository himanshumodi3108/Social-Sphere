import StoryModel from "../models/storyModel.js";
import UserModel from "../models/userModel.js";
import mongoose from "mongoose";
import logger from "../utils/logger.js";
import { getPaginationParams, createPaginationResponse } from "../utils/pagination.js";
import { createNotification } from "./NotificationController.js";

// Create a story
export const createStory = async (req, res) => {
  try {
    const userId = req.userId || req.body.userId;
    const { image, text } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }

    if (!image) {
      return res.status(400).json({ message: "Image is required" });
    }

    // Story expires in 24 hours
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const story = new StoryModel({
      userId,
      image,
      text: text ? text.trim() : undefined,
      expiresAt,
    });

    const savedStory = await story.save();

    logger.info("Story created", { storyId: savedStory._id, userId });

    // Notify followers about the new story
    try {
      const author = await UserModel.findById(userId).select('followers');
      const followers = (author?.followers || []).map(id => String(id));
      
      // Create notifications for all followers
      for (const followerId of followers) {
        await createNotification(followerId, 'story', userId, {});
      }
      
      logger.info("Story notifications created", { 
        storyId: savedStory._id, 
        userId,
        followerCount: followers.length 
      });
    } catch (notifError) {
      logger.error("Error creating story notifications", { 
        error: notifError.message,
        storyId: savedStory._id 
      });
    }

    // Populate user info
    const user = await UserModel.findById(userId).select('firstname lastname username profilePicture');
    const storyObj = savedStory.toObject();
    
    res.status(200).json({
      ...storyObj,
      author: {
        _id: user._id,
        name: `${user.firstname} ${user.lastname}`.trim() || user.username,
        username: user.username,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    logger.error("Error creating story", { error: error.message, userId: req.userId });
    res.status(500).json({ message: error.message || "Failed to create story" });
  }
};

// Get user's stories
export const getUserStories = async (req, res) => {
  try {
    const userId = req.params.id;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const stories = await StoryModel.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    // Populate author info
    const user = await UserModel.findById(userId).select('firstname lastname username profilePicture');
    const storiesWithAuthor = stories.map(story => ({
      ...story,
      author: {
        _id: user._id,
        name: `${user.firstname} ${user.lastname}`.trim() || user.username,
        username: user.username,
        profilePicture: user.profilePicture,
      },
    }));

    res.status(200).json(storiesWithAuthor);
  } catch (error) {
    logger.error("Error fetching user stories", { error: error.message, userId: req.params.id });
    res.status(500).json({ message: error.message || "Failed to fetch stories" });
  }
};

// Get timeline stories (stories from user and following)
export const getTimelineStories = async (req, res) => {
  try {
    const userId = req.userId || req.params.id;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Get user's following list
    const user = await UserModel.findById(userId).select('following');
    const followingIds = (user?.following || []).map(id => String(id));
    const userIds = [String(userId), ...followingIds];

    // Get stories from user and following
    const stories = await StoryModel.find({ userId: { $in: userIds } })
      .sort({ createdAt: -1 })
      .lean();

    // Group stories by user
    const storiesByUser = {};
    const userIdsToFetch = new Set();

    stories.forEach(story => {
      const uid = String(story.userId);
      if (!storiesByUser[uid]) {
        storiesByUser[uid] = [];
        userIdsToFetch.add(uid);
      }
      storiesByUser[uid].push(story);
    });

    // Fetch user info for all story authors
    const users = await UserModel.find({ _id: { $in: Array.from(userIdsToFetch) } })
      .select('firstname lastname username profilePicture')
      .lean();

    const userMap = {};
    users.forEach(user => {
      userMap[String(user._id)] = {
        _id: user._id,
        name: `${user.firstname} ${user.lastname}`.trim() || user.username,
        username: user.username,
        profilePicture: user.profilePicture,
      };
    });

    // Format response
    const timelineStories = Object.keys(storiesByUser).map(uid => ({
      user: userMap[uid] || { _id: uid, name: 'Unknown User', username: 'unknown' },
      stories: storiesByUser[uid],
    }));

    res.status(200).json(timelineStories);
  } catch (error) {
    logger.error("Error fetching timeline stories", { error: error.message, userId: req.userId });
    res.status(500).json({ message: error.message || "Failed to fetch timeline stories" });
  }
};

// View a story (add to views)
export const viewStory = async (req, res) => {
  try {
    const storyId = req.params.id;
    const userId = req.userId || req.body.userId;

    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }

    const story = await StoryModel.findById(storyId);
    if (!story) {
      return res.status(404).json({ message: "Story not found" });
    }

    // Add user to views if not already viewed
    const viewsArray = Array.isArray(story.views) ? story.views : [];
    if (!viewsArray.some(v => String(v) === String(userId))) {
      await story.updateOne({ $push: { views: userId } });
    }

    logger.info("Story viewed", { storyId, userId });

    res.status(200).json({ message: "Story viewed", views: viewsArray.length + 1 });
  } catch (error) {
    logger.error("Error viewing story", { error: error.message, storyId });
    res.status(500).json({ message: error.message || "Failed to view story" });
  }
};

// React to a story (like/unlike)
export const reactToStory = async (req, res) => {
  try {
    const storyId = req.params.id;
    const userId = req.userId || req.body.userId;

    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }

    const story = await StoryModel.findById(storyId);
    if (!story) {
      return res.status(404).json({ message: "Story not found" });
    }

    // Get current reactions array
    const reactionsArray = Array.isArray(story.reactions) ? story.reactions : [];
    const isLiked = reactionsArray.some(id => String(id) === String(userId));

    if (isLiked) {
      // Remove reaction
      await story.updateOne({ $pull: { reactions: userId } });
      logger.info("Story reaction removed", { storyId, userId });
      res.status(200).json({ message: "Reaction removed", liked: false });
    } else {
      // Add reaction
      await story.updateOne({ $push: { reactions: userId } });
      logger.info("Story reaction added", { storyId, userId });
      res.status(200).json({ message: "Reaction added", liked: true });
    }
  } catch (error) {
    logger.error("Error reacting to story", { error: error.message, storyId });
    res.status(500).json({ message: error.message || "Failed to react to story" });
  }
};

// Delete a story
export const deleteStory = async (req, res) => {
  try {
    const storyId = req.params.id;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }

    const story = await StoryModel.findById(storyId);
    if (!story) {
      return res.status(404).json({ message: "Story not found" });
    }

    if (String(story.userId) !== String(userId)) {
      return res.status(403).json({ message: "You can only delete your own stories" });
    }

    await StoryModel.findByIdAndDelete(storyId);

    logger.info("Story deleted", { storyId, userId });

    res.status(200).json({ message: "Story deleted successfully" });
  } catch (error) {
    logger.error("Error deleting story", { error: error.message, storyId });
    res.status(500).json({ message: error.message || "Failed to delete story" });
  }
};

