import NotificationModel from "../models/notificationModel.js";
import UserModel from "../models/userModel.js";
import PostModel from "../models/postModel.js";
import logger from "../utils/logger.js";
import { getPaginationParams, createPaginationResponse } from "../utils/pagination.js";
// Import socket.io dynamically to avoid circular dependencies
let emitNotificationFn = null;
const getEmitNotification = async () => {
  if (!emitNotificationFn) {
    try {
      // Dynamic import to avoid circular dependency
      const socketModule = await import("../socket/index.js");
      emitNotificationFn = socketModule.emitNotification;
    } catch (error) {
      logger.error("Error importing socket module", { error: error.message });
    }
  }
  return emitNotificationFn;
};

// Create a notification
export const createNotification = async (userId, type, fromUserId, data = {}) => {
  try {
    // Don't notify if user is notifying themselves
    if (String(userId) === String(fromUserId)) {
      return null;
    }

    // Get from user info
    const fromUser = await UserModel.findById(fromUserId).select('firstname lastname username profilePicture');
    if (!fromUser) {
      return null;
    }

    const fromUserName = `${fromUser.firstname} ${fromUser.lastname}`.trim() || fromUser.username;

    // Build message based on type
    let message = '';
    let link = '';

    switch (type) {
      case 'like':
        message = `${fromUserName} liked your post`;
        link = `/post/${data.postId}`;
        break;
      case 'comment':
        message = `${fromUserName} commented on your post`;
        link = `/post/${data.postId}`;
        break;
      case 'follow':
        message = `${fromUserName} started following you`;
        link = `/profile/${fromUserId}`;
        break;
      case 'mention':
        message = `${fromUserName} mentioned you in a post`;
        link = `/post/${data.postId}`;
        break;
      case 'post':
        message = `${fromUserName} posted something new`;
        link = `/post/${data.postId}`;
        break;
      case 'group_invite':
        message = `${fromUserName} invited you to join a group`;
        link = `/group/${data.groupId}`;
        break;
      case 'group_post':
        message = `${fromUserName} posted in a group you're in`;
        link = `/group/${data.groupId}/post/${data.postId}`;
        break;
      case 'message':
        message = `${fromUserName} sent you a message`;
        link = `/chat`;
        break;
      case 'story':
        message = `${fromUserName} posted a new story`;
        link = `/home`;
        break;
      default:
        message = `${fromUserName} interacted with you`;
    }

    const notification = new NotificationModel({
      userId,
      type,
      fromUserId,
      postId: data.postId || null,
      commentId: data.commentId || null,
      groupId: data.groupId || null,
      message,
      link,
    });
    
    // Add chatId for message notifications
    if (type === 'message' && data.chatId) {
      notification.chatId = data.chatId;
    }

    const savedNotification = await notification.save();
    logger.info("Notification created", { notificationId: savedNotification._id, userId, type });
    
    // Emit real-time notification via Socket.io
    try {
      const emitNotification = await getEmitNotification();
      if (emitNotification) {
        const notificationData = {
          _id: savedNotification._id,
          userId: savedNotification.userId,
          type: savedNotification.type,
          fromUserId: savedNotification.fromUserId,
          postId: savedNotification.postId,
          commentId: savedNotification.commentId,
          groupId: savedNotification.groupId,
          chatId: savedNotification.chatId,
          message: savedNotification.message,
          link: savedNotification.link,
          read: savedNotification.read,
          createdAt: savedNotification.createdAt,
          fromUser: {
            _id: fromUser._id,
            name: fromUserName,
            username: fromUser.username,
            profilePicture: fromUser.profilePicture || null,
          }
        };
        emitNotification(userId, notificationData);
        logger.info("Notification emitted via Socket.io", { notificationId: savedNotification._id, userId });
      }
    } catch (emitError) {
      logger.error("Error emitting notification via Socket.io", { 
        error: emitError.message, 
        notificationId: savedNotification._id 
      });
    }
    
    return savedNotification;
  } catch (error) {
    logger.error("Error creating notification", { error: error.message, userId, type });
    return null;
  }
};

// Get user notifications
export const getNotifications = async (req, res) => {
  try {
    const userId = req.userId || req.params.id;
    const { page, limit, skip } = getPaginationParams(req);
    const { unreadOnly } = req.query;

    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }

    // Build query
    const query = { userId };
    if (unreadOnly === 'true') {
      query.read = false;
    }

    // Get total count
    const total = await NotificationModel.countDocuments(query);

    // Fetch notifications with pagination
    const notifications = await NotificationModel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Populate fromUser info
    const notificationsWithUser = await Promise.all(
      notifications.map(async (notification) => {
        try {
          const fromUser = await UserModel.findById(notification.fromUserId)
            .select('firstname lastname username profilePicture')
            .lean();

          if (fromUser) {
            return {
              ...notification,
              fromUser: {
                _id: fromUser._id,
                name: `${fromUser.firstname} ${fromUser.lastname}`.trim() || fromUser.username,
                username: fromUser.username,
                profilePicture: fromUser.profilePicture,
              },
            };
          }
          return notification;
        } catch (error) {
          logger.error("Error populating notification user", { error: error.message });
          return notification;
        }
      })
    );

    logger.info("Notifications fetched", { userId, count: notificationsWithUser.length, page, limit });

    res.status(200).json(createPaginationResponse(notificationsWithUser, total, page, limit));
  } catch (error) {
    logger.error("Error fetching notifications", { error: error.message, userId: req.userId });
    res.status(500).json({ message: error.message || "Failed to fetch notifications" });
  }
};

// Mark notification as read
export const markAsRead = async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }

    const notification = await NotificationModel.findById(notificationId);
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    if (String(notification.userId) !== String(userId)) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    notification.read = true;
    await notification.save();

    logger.info("Notification marked as read", { notificationId, userId });

    res.status(200).json({ message: "Notification marked as read", notification });
  } catch (error) {
    logger.error("Error marking notification as read", { error: error.message, notificationId });
    res.status(500).json({ message: error.message || "Failed to mark notification as read" });
  }
};

// Mark all notifications as read
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }

    const result = await NotificationModel.updateMany(
      { userId, read: false },
      { $set: { read: true } }
    );

    logger.info("All notifications marked as read", { userId, count: result.modifiedCount });

    res.status(200).json({ 
      message: "All notifications marked as read",
      count: result.modifiedCount 
    });
  } catch (error) {
    logger.error("Error marking all notifications as read", { error: error.message, userId });
    res.status(500).json({ message: error.message || "Failed to mark all notifications as read" });
  }
};

// Get unread count
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.userId || req.params.id;

    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }

    const count = await NotificationModel.countDocuments({ userId, read: false });

    res.status(200).json({ count });
  } catch (error) {
    logger.error("Error getting unread count", { error: error.message, userId });
    res.status(500).json({ message: error.message || "Failed to get unread count" });
  }
};

// Delete notification
export const deleteNotification = async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }

    const notification = await NotificationModel.findById(notificationId);
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    if (String(notification.userId) !== String(userId)) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await NotificationModel.findByIdAndDelete(notificationId);

    logger.info("Notification deleted", { notificationId, userId });

    res.status(200).json({ message: "Notification deleted successfully" });
  } catch (error) {
    logger.error("Error deleting notification", { error: error.message, notificationId });
    res.status(500).json({ message: error.message || "Failed to delete notification" });
  }
};

