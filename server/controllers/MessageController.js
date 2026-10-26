import MessageModel from "../models/messageModel.js";
import ChatModel from "../models/chatModel.js";
import { createNotification } from "./NotificationController.js";
import logger from "../utils/logger.js";

export const addMessage = async (req, res) => {
  const senderId = req.userId || req.body.senderId;
  const { chatId, text } = req.body;

  if (!chatId || !text) {
    return res.status(400).json({ message: "chatId and text are required" });
  }

  try {
    const chat = await ChatModel.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    // Verify sender is a member of the chat
    const isMember = chat.members.some(m => String(m) === String(senderId));
    if (!isMember) {
      return res.status(403).json({ message: "Access denied. You are not a member of this chat." });
    }

    const message = new MessageModel({
      chatId,
      senderId,
      text,
    });

    const result = await message.save();
    
    // Create notification for the receiver
    try {
      if (chat && chat.members) {
        const receiverId = chat.members.find(
          memberId => String(memberId) !== String(senderId)
        );
        if (receiverId) {
          await createNotification(String(receiverId), 'message', senderId, { chatId });
        }
      }
    } catch (notifError) {
      logger.error("Error creating message notification", { error: notifError.message });
    }
    
    res.status(200).json(result);
  } catch (error) {
    logger.error("Error adding message", { error: error.message });
    res.status(500).json(error);
  }
};

export const getMessages = async (req, res) => {
  const { chatId } = req.params;
  const currentUserId = req.userId;

  try {
    const chat = await ChatModel.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    // Verify requesting user is a member of the chat
    if (currentUserId && !chat.members.some(m => String(m) === String(currentUserId))) {
      return res.status(403).json({ message: "Access denied. You are not a member of this chat." });
    }

    const result = await MessageModel.find({ chatId });
    res.status(200).json(result);
  } catch (error) {
    logger.error("Error fetching messages", { error: error.message });
    res.status(500).json(error);
  }
};
