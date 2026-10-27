import mongoose from "mongoose";
import UserModel from "../models/userModel.js";
import ChatModel from "../models/chatModel.js";
import PostModel from "../models/postModel.js";
import bcrypt from "bcrypt";
import jwt from 'jsonwebtoken';
import logger from "../utils/logger.js";
import { getPaginationParams, createPaginationResponse } from "../utils/pagination.js";
import { createNotification } from "./NotificationController.js";
import { generateSecret, verifyTotp, getOtpAuthUrl } from "../utils/totp.js";
import { sendOtpEmail, sendSms } from "../utils/mailService.js";

// Get a User
export const getUser = async (req, res) => {
  const id = req.params.id;

  try {
    let user = null;
    
    // Try multiple methods to find the user
    if (mongoose.Types.ObjectId.isValid(id)) {
      user = await UserModel.findById(id);
      if (!user) {
        user = await UserModel.findOne({ _id: String(id) });
      }
    } else {
      user = await UserModel.findOne({ _id: id });
      if (!user && mongoose.Types.ObjectId.isValid(id)) {
        user = await UserModel.findById(new mongoose.Types.ObjectId(id));
      }
    }
    
    if (user) {
      const { password, ...otherDetails } = user._doc || user;
      
      // Clean up followers and following arrays
      if (Array.isArray(otherDetails.followers)) {
        otherDetails.followers = otherDetails.followers.filter(f => f !== null && f !== undefined && f !== '');
      }
      if (Array.isArray(otherDetails.following)) {
        otherDetails.following = otherDetails.following.filter(f => f !== null && f !== undefined && f !== '');
      }

      // Check requesting viewer identity
      let currentUserId = req.userId;
      if (!currentUserId && req.headers.authorization) {
        try {
          const token = req.headers.authorization.split(" ")[1];
          if (token) {
            const decoded = jwt.verify(token, process.env.JWTKEY);
            currentUserId = decoded?.id;
          }
        } catch (e) {
          // ignore invalid or expired token
        }
      }

      const isSelf = currentUserId && String(currentUserId) === String(user._id);

      // Redact sensitive PII and SPII for third-party viewers
      if (!isSelf) {
        delete otherDetails.email;
        delete otherDetails.emailVerified;
        delete otherDetails.phone;
        delete otherDetails.phoneVerified;
        delete otherDetails.mfa;
        delete otherDetails.resetPasswordOtp;
        delete otherDetails.resetPasswordExpires;
        delete otherDetails.blocked;
        delete otherDetails.savedPosts;
      } else {
        delete otherDetails.resetPasswordOtp;
        delete otherDetails.resetPasswordExpires;
        if (otherDetails.mfa) {
          otherDetails.mfa = {
            enabled: Boolean(otherDetails.mfa.enabled),
            method: otherDetails.mfa.method || 'email',
          };
        }
      }
      
      res.status(200).json(otherDetails);
    } else {
      logger.warn("User not found", { userId: id });
      res.status(404).json({ message: "User not found", id: id });
    }
  } catch (error) {
    logger.error("Error in getUser", { error: error.message, userId: id });
    res.status(500).json({ message: error.message || "Failed to fetch user" });
  }
};

// Get all users with pagination
export const getAllUsers = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);
    const currentUserId = req.userId || req.query.currentUserId;
    const search = req.query.search;

    // Build query - exclude blocked users if currentUserId is provided
    let query = {};
    let blockedUserIds = [];
    
    if (currentUserId) {
      // Optimize: Only fetch blocked array, not entire user
      const currentUser = await UserModel.findById(currentUserId).select('blocked').lean();
      if (currentUser && Array.isArray(currentUser.blocked) && currentUser.blocked.length > 0) {
        blockedUserIds = currentUser.blocked.map(id => String(id));
        query._id = { $nin: currentUser.blocked };
      }
    }

    // Add search functionality - optimized with regex (text index requires exact setup)
    if (search && search.trim()) {
      const searchTerm = search.trim();
      // Escape special regex characters and use case-insensitive search
      const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escapedTerm, 'i');
      
      // Use $or for searching across multiple fields
      query.$or = [
        { firstname: searchRegex },
        { lastname: searchRegex },
        { username: searchRegex }
      ];
      
      // If query already has _id filter, combine with $and
      if (query._id) {
        query = {
          $and: [
            { _id: query._id },
            { $or: query.$or }
          ]
        };
      }
    }

    // Get total count (optimized)
    const total = await UserModel.countDocuments(query);

    // Fetch users with pagination - use lean() for better performance
    let users = await UserModel.find(query)
      .select('-password -email -emailVerified -blocked -savedPosts')
      .skip(skip)
      .limit(limit)
      .lean();

    // Clean up arrays
    users = users.map((user) => {
      if (Array.isArray(user.followers)) {
        user.followers = user.followers.filter(f => f !== null && f !== undefined && f !== '');
      }
      if (Array.isArray(user.following)) {
        user.following = user.following.filter(f => f !== null && f !== undefined && f !== '');
      }
      return user;
    });

    logger.info("Users fetched", { count: users.length, page, limit, total, search: !!search });
    res.status(200).json(createPaginationResponse(users, total, page, limit));
  } catch (error) {
    logger.error("Error in getAllUsers", { error: error.message });
    res.status(500).json({ message: error.message || "Failed to fetch users" });
  }
};

// Update a user
export const updateUser = async (req, res) => {
  const id = req.params.id;
  const { _id, currentUserAdmin, password, ...updateData } = req.body;
  
  if (id === _id || currentUserAdmin) {
    try {
      // Hash password if provided
      if (password) {
        const salt = await bcrypt.genSalt(10);
        updateData.password = await bcrypt.hash(password, salt);
      }

      const user = await UserModel.findByIdAndUpdate(id, updateData, {
        new: true,
      });
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Clean up arrays
      let needsSave = false;
      if (Array.isArray(user.followers)) {
        const originalLength = user.followers.length;
        user.followers = user.followers.filter(f => f !== null && f !== undefined && f !== '');
        if (user.followers.length !== originalLength) {
          needsSave = true;
        }
      }
      if (Array.isArray(user.following)) {
        const originalLength = user.following.length;
        user.following = user.following.filter(f => f !== null && f !== undefined && f !== '');
        if (user.following.length !== originalLength) {
          needsSave = true;
        }
      }
      if (needsSave) {
        await user.save();
      }
      
      const userObj = user.toObject();
      if (userObj.password) {
        delete userObj.password;
      }
      
      const token = jwt.sign(
        { username: user.username, id: user._id },
        process.env.JWTKEY,
        { expiresIn: process.env.JWT_EXPIRES_IN || "1h" }
      );

      logger.info("User updated successfully", { userId: id });
      res.status(200).json({ user: userObj, token });
    } catch (error) {
      logger.error("Error updating user", { error: error.message, userId: id });
      res.status(500).json({ message: error.message || "Failed to update user" });
    }
  } else {
    res.status(403).json({ message: "Access Denied! You can update only your own Account." });
  }
};

// Delete a user
export const deleteUser = async (req, res) => {
  const id = req.params.id;
  const { currentUserId, currentUserAdmin } = req.body;

  if (currentUserId == id || currentUserAdmin) {
    try {
      await UserModel.findByIdAndDelete(id);
      logger.info("User deleted successfully", { userId: id });
      res.status(200).json({ message: "User Deleted Successfully!" });
    } catch (error) {
      logger.error("Error deleting user", { error: error.message, userId: id });
      res.status(500).json({ message: error.message || "Failed to delete user" });
    }
  } else {
    res.status(403).json({ message: "Access Denied!" });
  }
};

// Follow a User
export const followUser = async (req, res) => {
  const id = req.params.id; // The user being followed
  const _id = req.userId || req.body._id; // The logged-in user

  if (!_id) {
    logger.warn("No user ID found in follow request", { userId: req.userId, bodyId: req.body._id });
    return res.status(401).json({ message: "User ID not found. Please log in again." });
  }

  if (String(_id) === String(id)) {
    return res.status(403).json({ message: "Action Forbidden" });
  }

  try {
    const followUser = await UserModel.findById(id);
    const followingUser = await UserModel.findById(_id);

    if (!followUser || !followingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user is blocked
    if (Array.isArray(followUser.blocked) && followUser.blocked.some(b => String(b) === String(_id))) {
      return res.status(403).json({ message: "You cannot follow this user" });
    }

    const followersAsStrings = (followUser.followers || []).map(f => String(f));
    
    if (!followersAsStrings.includes(String(_id))) {
      await followUser.updateOne({ $push: { followers: _id } });
      await followingUser.updateOne({ $push: { following: id } });

      // Create chat if it doesn't exist
      const user1 = new mongoose.Types.ObjectId(_id);
      const user2 = new mongoose.Types.ObjectId(id);
      const existingChat = await ChatModel.findOne({ members: { $all: [user1, user2] } });

      if (!existingChat) {
        const newChat = new ChatModel({ members: [user1, user2] });
        await newChat.save();
        logger.info("New chat created", { user1: _id, user2: id });
      }

      // Fetch updated user data
      const updatedFollowingUser = await UserModel.findById(_id);
      const updatedFollowUser = await UserModel.findById(id);
      
      const updatedFollowingUserObj = updatedFollowingUser ? updatedFollowingUser.toObject() : null;
      const updatedFollowUserObj = updatedFollowUser ? updatedFollowUser.toObject() : null;
      
      if (updatedFollowingUserObj) {
        delete updatedFollowingUserObj.password;
        if (Array.isArray(updatedFollowingUserObj.followers)) {
          updatedFollowingUserObj.followers = updatedFollowingUserObj.followers.filter(f => f !== null && f !== undefined && f !== '');
        }
        if (Array.isArray(updatedFollowingUserObj.following)) {
          updatedFollowingUserObj.following = updatedFollowingUserObj.following.filter(f => f !== null && f !== undefined && f !== '');
        }
      }
      if (updatedFollowUserObj) {
        delete updatedFollowUserObj.password;
        if (Array.isArray(updatedFollowUserObj.followers)) {
          updatedFollowUserObj.followers = updatedFollowUserObj.followers.filter(f => f !== null && f !== undefined && f !== '');
        }
        if (Array.isArray(updatedFollowUserObj.following)) {
          updatedFollowUserObj.following = updatedFollowUserObj.following.filter(f => f !== null && f !== undefined && f !== '');
        }
      }
      
      // Create notification for followed user
      await createNotification(id, 'follow', _id, {});

      logger.info("User followed successfully", { follower: _id, following: id });
      return res.status(200).json({ 
        message: "User followed successfully",
        updatedUser: updatedFollowingUserObj,
        followedUser: updatedFollowUserObj
      });
    } else {
      return res.status(403).json({ message: "You are already following this user." });
    }
  } catch (error) {
    logger.error("Error in followUser", { error: error.message, follower: _id, following: id });
    return res.status(500).json({ message: error.message || "Failed to follow user" });
  }
};

// Unfollow a User
export const unfollowUser = async (req, res) => {
  const id = req.params.id;
  const _id = req.userId || req.body._id;

  if (!_id) {
    logger.warn("No user ID found in unfollow request", { userId: req.userId, bodyId: req.body._id });
    return res.status(401).json({ message: "User ID not found. Please log in again." });
  }

  if (String(_id) === String(id)) {
    return res.status(403).json({ message: "Action Forbidden" });
  }
  
  try {
    const unFollowUser = await UserModel.findById(id);
    const unFollowingUser = await UserModel.findById(_id);

    if (!unFollowUser || !unFollowingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const unFollowUserFollowersAsStrings = (unFollowUser.followers || []).map(f => String(f));
    
    if (unFollowUserFollowersAsStrings.includes(String(_id))) {
      await unFollowUser.updateOne({ $pull: { followers: _id } });
      await unFollowingUser.updateOne({ $pull: { following: id } });
      
      // Fetch updated user data
      const updatedUnfollowingUser = await UserModel.findById(_id);
      const updatedUnfollowUser = await UserModel.findById(id);
      
      const updatedUnfollowingUserObj = updatedUnfollowingUser ? updatedUnfollowingUser.toObject() : null;
      const updatedUnfollowUserObj = updatedUnfollowUser ? updatedUnfollowUser.toObject() : null;
      
      if (updatedUnfollowingUserObj) {
        delete updatedUnfollowingUserObj.password;
        if (Array.isArray(updatedUnfollowingUserObj.followers)) {
          updatedUnfollowingUserObj.followers = updatedUnfollowingUserObj.followers.filter(f => f !== null && f !== undefined && f !== '');
        }
        if (Array.isArray(updatedUnfollowingUserObj.following)) {
          updatedUnfollowingUserObj.following = updatedUnfollowingUserObj.following.filter(f => f !== null && f !== undefined && f !== '');
        }
      }
      if (updatedUnfollowUserObj) {
        delete updatedUnfollowUserObj.password;
        if (Array.isArray(updatedUnfollowUserObj.followers)) {
          updatedUnfollowUserObj.followers = updatedUnfollowUserObj.followers.filter(f => f !== null && f !== undefined && f !== '');
        }
        if (Array.isArray(updatedUnfollowUserObj.following)) {
          updatedUnfollowUserObj.following = updatedUnfollowUserObj.following.filter(f => f !== null && f !== undefined && f !== '');
        }
      }
      
      logger.info("User unfollowed successfully", { unfollower: _id, unfollowing: id });
      res.status(200).json({ 
        message: "Unfollowed Successfully!",
        updatedUser: updatedUnfollowingUserObj,
        unfollowedUser: updatedUnfollowUserObj
      });
    } else {
      res.status(403).json({ message: "You are not following this User" });
    }
  } catch (error) {
    logger.error("Error in unfollowUser", { error: error.message, unfollower: _id, unfollowing: id });
    res.status(500).json({ message: error.message || "Failed to unfollow user" });
  }
};

// Block a user
export const blockUser = async (req, res) => {
  const blockUserId = req.params.id; // User to block
  const userId = req.userId || req.body._id; // Current user

  if (!userId) {
    return res.status(401).json({ message: "User ID not found. Please log in again." });
  }

  if (String(userId) === String(blockUserId)) {
    return res.status(403).json({ message: "You cannot block yourself" });
  }

  try {
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!Array.isArray(user.blocked)) {
      user.blocked = [];
    }

    if (!user.blocked.some(b => String(b) === String(blockUserId))) {
      // Add to blocked list
      user.blocked.push(blockUserId);
      
      // Unfollow each other if following
      const blockedUser = await UserModel.findById(blockUserId);
      if (blockedUser) {
        // Remove from each other's followers/following
        await user.updateOne({ $pull: { following: blockUserId, followers: blockUserId } });
        await blockedUser.updateOne({ $pull: { following: userId, followers: userId } });
      }
      
      await user.save();
      
      logger.info("User blocked successfully", { userId, blockedUserId });
      res.status(200).json({ message: "User blocked successfully" });
    } else {
      res.status(400).json({ message: "User is already blocked" });
    }
  } catch (error) {
    logger.error("Error blocking user", { error: error.message, userId, blockUserId });
    res.status(500).json({ message: error.message || "Failed to block user" });
  }
};

// Unblock a user
export const unblockUser = async (req, res) => {
  const unblockUserId = req.params.id;
  const userId = req.userId || req.body._id;

  if (!userId) {
    return res.status(401).json({ message: "User ID not found. Please log in again." });
  }

  try {
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (Array.isArray(user.blocked) && user.blocked.some(b => String(b) === String(unblockUserId))) {
      await user.updateOne({ $pull: { blocked: unblockUserId } });
      
      logger.info("User unblocked successfully", { userId, unblockUserId });
      res.status(200).json({ message: "User unblocked successfully" });
    } else {
      res.status(400).json({ message: "User is not blocked" });
    }
  } catch (error) {
    logger.error("Error unblocking user", { error: error.message, userId, unblockUserId });
    res.status(500).json({ message: error.message || "Failed to unblock user" });
  }
};

// Save/Bookmark a post
export const savePost = async (req, res) => {
  const postId = req.params.id;
  const userId = req.userId || req.body._id;

  if (!userId) {
    return res.status(401).json({ message: "User ID not found. Please log in again." });
  }

  try {
    const user = await UserModel.findById(userId);
    const post = await PostModel.findById(postId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (!Array.isArray(user.savedPosts)) {
      user.savedPosts = [];
    }

    const isSaved = user.savedPosts.some(p => String(p) === String(postId));

    if (isSaved) {
      // Unsave
      await user.updateOne({ $pull: { savedPosts: postId } });
      logger.info("Post unsaved", { userId, postId });
      res.status(200).json({ message: "Post unsaved", saved: false });
    } else {
      // Save
      await user.updateOne({ $push: { savedPosts: postId } });
      logger.info("Post saved", { userId, postId });
      res.status(200).json({ message: "Post saved", saved: true });
    }
  } catch (error) {
    logger.error("Error saving post", { error: error.message, userId, postId });
    res.status(500).json({ message: error.message || "Failed to save post" });
  }
};

// Get saved posts
export const getSavedPosts = async (req, res) => {
  const userId = req.userId || req.params.id;

  if (!userId) {
    return res.status(401).json({ message: "User ID not found. Please log in again." });
  }

  try {
    const { page, limit, skip } = getPaginationParams(req);
    const user = await UserModel.findById(userId).select('savedPosts');

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const savedPostIds = Array.isArray(user.savedPosts) ? user.savedPosts : [];
    const total = savedPostIds.length;

    // Get posts with pagination
    const postIds = savedPostIds.slice(skip, skip + limit);
    const posts = await PostModel.find({ _id: { $in: postIds } })
      .sort({ createdAt: -1 });

    logger.info("Saved posts fetched", { userId, count: posts.length, page, limit });
    res.status(200).json(createPaginationResponse(posts, total, page, limit));
  } catch (error) {
    logger.error("Error fetching saved posts", { error: error.message, userId });
    res.status(500).json({ message: error.message || "Failed to fetch saved posts" });
  }
};

// Change Password (authenticated in settings)
export const changePassword = async (req, res) => {
  const { id } = req.params;
  const currentUserId = req.userId;

  if (String(currentUserId) !== String(id)) {
    return res.status(403).json({ message: "Access denied. You can only change your own password." });
  }

  const { currentPassword, newPassword } = req.body;

  try {
    const user = await UserModel.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect current password." });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    logger.info("Password changed successfully in settings", { userId: id });
    res.status(200).json({ message: "Password updated successfully!" });
  } catch (error) {
    logger.error("Error changing password", { error: error.message, userId: id });
    res.status(500).json({ message: error.message || "Failed to update password." });
  }
};

// Setup MFA - Generate TOTP Secret or send SMS/Email verification code
export const setupMfa = async (req, res) => {
  const { id } = req.params;
  const currentUserId = req.userId;

  if (String(currentUserId) !== String(id)) {
    return res.status(403).json({ message: "Access denied." });
  }

  const { method } = req.body; // 'totp', 'email', 'phone'

  try {
    const user = await UserModel.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (method === "totp") {
      const secret = generateSecret();
      const otpauthUrl = getOtpAuthUrl(user.username, secret);
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(otpauthUrl)}`;

      user.mfa.tempSecret = secret;
      await user.save();

      return res.status(200).json({
        method: "totp",
        secret,
        qrCodeUrl,
        otpauthUrl,
        message: "Scan the QR code with Google Authenticator or enter the secret key manually.",
      });
    } else if (method === "email") {
      if (!user.email) {
        return res.status(400).json({
          message: "Please add and save an email address in your profile before enabling Email MFA.",
        });
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      user.mfa.otpCode = otp;
      user.mfa.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();

      await sendOtpEmail({
        to: user.email,
        name: user.firstname,
        code: otp,
        purpose: "SocialSphere 2FA Setup",
      });

      return res.status(200).json({
        method: "email",
        destination: user.email,
        message: `A verification code has been sent to ${user.email}.`,
      });
    } else if (method === "phone") {
      if (!user.phone) {
        return res.status(400).json({
          message: "Please add and save a phone number in your profile before enabling SMS MFA.",
        });
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      user.mfa.otpCode = otp;
      user.mfa.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();

      await sendSms({
        to: user.phone,
        message: `Your SocialSphere MFA activation code is: ${otp}. Valid for 10 minutes.`,
      });

      return res.status(200).json({
        method: "phone",
        destination: user.phone,
        message: `A verification code has been sent to ${user.phone}.`,
      });
    } else {
      return res.status(400).json({ message: "Invalid MFA method requested." });
    }
  } catch (error) {
    logger.error("Error setting up MFA", { error: error.message, userId: id });
    res.status(500).json({ message: error.message || "Failed to set up MFA." });
  }
};

// Enable MFA after user enters confirmation code
export const enableMfa = async (req, res) => {
  const { id } = req.params;
  const currentUserId = req.userId;

  if (String(currentUserId) !== String(id)) {
    return res.status(403).json({ message: "Access denied." });
  }

  const { method, code } = req.body;

  try {
    const user = await UserModel.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    let isValid = false;

    if (method === "totp") {
      if (!user.mfa.tempSecret) {
        return res.status(400).json({ message: "Please initiate TOTP setup first." });
      }
      isValid = verifyTotp(user.mfa.tempSecret, code);
      if (isValid) {
        user.mfa.enabled = true;
        user.mfa.method = "totp";
        user.mfa.totpSecret = user.mfa.tempSecret;
        user.mfa.tempSecret = undefined;
      }
    } else if (method === "email" || method === "phone") {
      const now = new Date();
      if (
        user.mfa.otpCode &&
        user.mfa.otpCode.trim() === String(code).trim() &&
        user.mfa.otpExpires &&
        user.mfa.otpExpires > now
      ) {
        isValid = true;
        user.mfa.enabled = true;
        user.mfa.method = method;
        user.mfa.otpCode = undefined;
        user.mfa.otpExpires = undefined;
      }
    }

    if (!isValid) {
      return res.status(400).json({ message: "Invalid or expired verification code." });
    }

    await user.save();

    logger.info("MFA enabled successfully", { userId: id, method });
    res.status(200).json({
      message: "Two-Factor Authentication is now enabled!",
      mfa: { enabled: true, method: user.mfa.method },
    });
  } catch (error) {
    logger.error("Error enabling MFA", { error: error.message, userId: id });
    res.status(500).json({ message: error.message || "Failed to enable MFA." });
  }
};

// Disable MFA with password verification
export const disableMfa = async (req, res) => {
  const { id } = req.params;
  const currentUserId = req.userId;

  if (String(currentUserId) !== String(id)) {
    return res.status(403).json({ message: "Access denied." });
  }

  const { password } = req.body;

  try {
    const user = await UserModel.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (!password) {
      return res.status(400).json({ message: "Password is required to disable Two-Factor Authentication." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect password." });
    }

    user.mfa.enabled = false;
    user.mfa.totpSecret = undefined;
    user.mfa.tempSecret = undefined;
    user.mfa.otpCode = undefined;
    user.mfa.otpExpires = undefined;
    await user.save();

    logger.info("MFA disabled", { userId: id });
    res.status(200).json({
      message: "Two-Factor Authentication has been disabled.",
      mfa: { enabled: false, method: user.mfa.method },
    });
  } catch (error) {
    logger.error("Error disabling MFA", { error: error.message, userId: id });
    res.status(500).json({ message: error.message || "Failed to disable MFA." });
  }
};
