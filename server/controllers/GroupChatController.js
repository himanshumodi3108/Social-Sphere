import GroupChatModel from "../models/groupChatModel.js";
import GroupMessageModel from "../models/groupMessageModel.js";
import GroupModel from "../models/groupModel.js";
import UserModel from "../models/userModel.js";
import { createNotification } from "./NotificationController.js";
import logger from "../utils/logger.js";

// Get or create group chat
export const getOrCreateGroupChat = async (req, res) => {
  try {
    const groupId = req.params.id; // Route uses :id, not :groupId
    const userId = req.userId;

    // Check if user is a member of the group
    const group = await GroupModel.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const isMember = group.members?.some(
      (m) => String(m.userId) === String(userId)
    );
    if (!isMember) {
      return res.status(403).json({ message: "You must be a member to access group chat" });
    }

    // Get or create group chat
    let groupChat = await GroupChatModel.findOne({ groupId });
    if (!groupChat) {
      groupChat = new GroupChatModel({ groupId });
      await groupChat.save();
    }

    res.status(200).json(groupChat);
  } catch (error) {
    logger.error("Error getting/creating group chat", { error: error.message });
    res.status(500).json({ message: error.message || "Failed to get group chat" });
  }
};

// Add message to group chat
export const addGroupMessage = async (req, res) => {
  try {
    logger.info("Add group message request received", { 
      params: req.params, 
      body: req.body, 
      userId: req.userId 
    });
    
    const groupId = req.params.id; // Route uses :id, not :groupId
    const { text } = req.body;
    const senderId = req.userId;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Message text is required" });
    }

    // Check if user is a member of the group
    const group = await GroupModel.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const isMember = group.members?.some(
      (m) => String(m.userId) === String(senderId)
    );
    if (!isMember) {
      return res.status(403).json({ message: "You must be a member to send messages" });
    }

    // Get or create group chat
    let groupChat = await GroupChatModel.findOne({ groupId });
    if (!groupChat) {
      groupChat = new GroupChatModel({ groupId });
      await groupChat.save();
    }

    // Create message
    const message = new GroupMessageModel({
      groupChatId: groupChat._id,
      groupId,
      senderId,
      text: text.trim(),
    });

    const savedMessage = await message.save();

    // Populate sender info - optimized with lean()
    const sender = await UserModel.findById(senderId).select(
      "firstname lastname username profilePicture"
    ).lean();

    const messageWithSender = {
      ...savedMessage.toObject(),
      sender: {
        _id: sender?._id,
        firstname: sender?.firstname,
        lastname: sender?.lastname,
        username: sender?.username,
        profilePicture: sender?.profilePicture,
      },
    };

    // Create notifications for all other members
    try {
      const otherMembers = group.members.filter(
        (m) => String(m.userId) !== String(senderId)
      );
      
      for (const member of otherMembers) {
        await createNotification(
          String(member.userId),
          "message",
          senderId,
          { groupId, groupChatId: groupChat._id }
        );
      }
    } catch (notifError) {
      logger.error("Error creating group message notifications", {
        error: notifError.message,
      });
    }

    logger.info("Group message added", {
      groupId,
      senderId,
      messageId: savedMessage._id,
    });

    res.status(200).json(messageWithSender);
  } catch (error) {
    logger.error("Error adding group message", { error: error.message });
    res.status(500).json({ message: error.message || "Failed to add message" });
  }
};

// Get group messages
export const getGroupMessages = async (req, res) => {
  try {
    const groupId = req.params.id; // Route uses :id, not :groupId
    const userId = req.userId;
    const { page = 1, limit = 50 } = req.query;

    // Check if user is a member of the group
    const group = await GroupModel.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const isMember = group.members?.some(
      (m) => String(m.userId) === String(userId)
    );
    if (!isMember) {
      return res.status(403).json({ message: "You must be a member to view messages" });
    }

    // Get group chat
    const groupChat = await GroupChatModel.findOne({ groupId });
    if (!groupChat) {
      return res.status(200).json([]);
    }

    // Get messages with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const messages = await GroupMessageModel.find({ groupChatId: groupChat._id })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    // Populate sender info for all messages - optimized with lean()
    const senderIds = [...new Set(messages.map((m) => m.senderId))];
    const senders = senderIds.length > 0
      ? await UserModel.find({ _id: { $in: senderIds } })
          .select("firstname lastname username profilePicture")
          .lean()
      : [];

    const senderMap = {};
    senders.forEach((sender) => {
      senderMap[String(sender._id)] = {
        _id: sender._id,
        firstname: sender.firstname,
        lastname: sender.lastname,
        username: sender.username,
        profilePicture: sender.profilePicture,
      };
    });

    const messagesWithSenders = messages
      .reverse() // Reverse to show oldest first
      .map((message) => ({
        ...message,
        sender: senderMap[String(message.senderId)] || {
          _id: message.senderId,
          username: "Unknown",
        },
      }));

    res.status(200).json(messagesWithSenders);
  } catch (error) {
    logger.error("Error getting group messages", { error: error.message });
    res.status(500).json({ message: error.message || "Failed to get messages" });
  }
};


