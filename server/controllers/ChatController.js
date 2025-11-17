import ChatModel from "../models/chatModel.js";
import UserModel from "../models/userModel.js";
import GroupModel from "../models/groupModel.js";
import logger from "../utils/logger.js";

export const createChat = async (req, res) => {
  const newChat = new ChatModel({
    members: [req.body.senderId, req.body.receiverId],
  });
  try {
    const result = await newChat.save();
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json(error);
  }
};

export const userChats = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Get all chats for the user
    const allChats = await ChatModel.find({
      members: { $in: [userId] },
    });

    // Get user's following list - optimized with lean()
    const user = await UserModel.findById(userId).select('following').lean();
    const followingIds = Array.isArray(user?.following) 
      ? user.following.map(id => String(id))
      : [];

    // Filter chats to only include users that the current user is following
    const filteredChats = [];
    
    for (const chat of allChats) {
      // Find the other member in the chat
      const otherMemberId = chat.members.find(memberId => String(memberId) !== String(userId));
      
      if (otherMemberId && followingIds.includes(String(otherMemberId))) {
        filteredChats.push({
          ...chat.toObject(),
          type: 'individual', // Mark as individual chat
        });
      }
    }

    // Get groups that the user is a member of - optimized query
    const userGroups = await GroupModel.find({
      $or: [
        { 'members.userId': userId },
        { createdBy: userId }
      ]
    })
    .select('_id name profilePicture members createdAt updatedAt')
    .lean()
    .then(groups => groups.map(group => ({
      ...group,
      memberCount: group.members?.length || 0
    })));

    // Format groups as chat-like objects
    const groupChats = userGroups.map(group => ({
      _id: `group-${group._id}`, // Prefix to distinguish from individual chats
      type: 'group',
      groupId: group._id,
      name: group.name,
      profilePicture: group.profilePicture,
      members: group.members?.map(m => m.userId) || [],
      memberCount: group.memberCount || group.members?.length || 0,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    }));

    // Combine individual chats and group chats, sort by updatedAt
    const allUserChats = [...filteredChats, ...groupChats].sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt || 0);
      const dateB = new Date(b.updatedAt || b.createdAt || 0);
      return dateB - dateA; // Most recent first
    });

    logger.info("User chats fetched", { 
      userId, 
      individualChats: filteredChats.length, 
      groupChats: groupChats.length,
      totalChats: allUserChats.length 
    });
    
    res.status(200).json(allUserChats);
  } catch (error) {
    logger.error("Error fetching user chats", { error: error.message, userId: req.params.userId });
    res.status(500).json(error);
  }
};
export const findChat = async (req, res) => {
  try {
    const chat = await ChatModel.findOne({
      members: { $all: [req.params.firstId, req.params.secondId] },
    });
    res.status(200).json(chat)
  } catch (error) {
    res.status(500).json(error)
  }
};