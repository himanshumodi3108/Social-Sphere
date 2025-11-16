import MessageModel from "../models/messageModel.js";
import ChatModel from "../models/chatModel.js";
import { createNotification } from "./NotificationController.js";
import logger from "../utils/logger.js";

export const addMessage = async (req, res) => {
  const { chatId, senderId, text } = req.body;
  const message = new MessageModel({
    chatId,
    senderId,
    text,
  });
  try {
    const result = await message.save();
    
    // Create notification for the receiver
    try {
      const chat = await ChatModel.findById(chatId);
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
  try {
    const result = await MessageModel.find({ chatId });
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json(error);
  }
};
