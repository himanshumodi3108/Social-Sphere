import GroupModel from "../models/groupModel.js";
import UserModel from "../models/userModel.js";
import mongoose from "mongoose";
import logger from "../utils/logger.js";
import { getPaginationParams, createPaginationResponse } from "../utils/pagination.js";
import { createNotification } from "./NotificationController.js";

// Create a group
export const createGroup = async (req, res) => {
  try {
    const userId = req.userId;
    const { name, description, coverPicture, profilePicture, privacy, rules } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Group name is required" });
    }

    const group = new GroupModel({
      name: name.trim(),
      description: description ? description.trim() : undefined,
      coverPicture,
      profilePicture,
      createdBy: userId,
      privacy: privacy || 'public',
      rules: Array.isArray(rules) ? rules : [],
      members: [{
        userId: userId,
        role: 'admin',
        joinedAt: new Date(),
      }],
    });

    const savedGroup = await group.save();

    logger.info("Group created", { groupId: savedGroup._id, userId });

    res.status(200).json(savedGroup);
  } catch (error) {
    logger.error("Error creating group", { error: error.message, userId: req.userId });
    res.status(500).json({ message: error.message || "Failed to create group" });
  }
};

// Get groups (public + user's groups)
export const getGroups = async (req, res) => {
  try {
    const userId = req.userId;
    const { page, limit, skip } = getPaginationParams(req);
    const { search, privacy } = req.query;

    // Build query
    let query = {};
    
    if (privacy === 'public') {
      query.privacy = 'public';
    } else if (privacy === 'private' && userId) {
      query.$or = [
        { privacy: 'private', 'members.userId': userId },
        { createdBy: userId },
      ];
    } else if (userId) {
      // Show public groups + user's groups
      query.$or = [
        { privacy: 'public' },
        { 'members.userId': userId },
        { createdBy: userId },
      ];
    } else {
      query.privacy = 'public';
    }

    // Search
    if (search) {
      query.$text = { $search: search };
    }

    // Get total count
    const total = await GroupModel.countDocuments(query);

    // Fetch groups
    let groups = await GroupModel.find(query)
      .sort(search ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Populate creator info - optimized with single query
    const creatorIds = [...new Set(groups.map(g => String(g.createdBy)))];
    const creators = creatorIds.length > 0 
      ? await UserModel.find({ _id: { $in: creatorIds } })
          .select('firstname lastname username profilePicture')
          .lean()
      : [];

    const creatorMap = {};
    creators.forEach(creator => {
      creatorMap[String(creator._id)] = {
        _id: creator._id,
        name: `${creator.firstname} ${creator.lastname}`.trim() || creator.username,
        username: creator.username,
        profilePicture: creator.profilePicture,
      };
    });

    const groupsWithCreator = groups.map(group => {
      const isCreator = userId && String(group.createdBy) === String(userId);
      const isMember = userId ? group.members?.some(m => String(m.userId) === String(userId)) : false;
      return {
        ...group,
        creator: creatorMap[String(group.createdBy)],
        memberCount: group.members ? group.members.length : 0,
        isMember: isCreator || isMember, // Creator is always considered a member
      };
    });

    logger.info("Groups fetched", { count: groupsWithCreator.length, page, limit, total });

    res.status(200).json(createPaginationResponse(groupsWithCreator, total, page, limit));
  } catch (error) {
    logger.error("Error fetching groups", { error: error.message });
    res.status(500).json({ message: error.message || "Failed to fetch groups" });
  }
};

// Get group details
export const getGroup = async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = req.userId;

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

    // Populate creator and members - optimized with parallel queries
    const memberIds = group.members?.map(m => m.userId) || [];
    
    // Fetch creator and members in parallel for better performance
    const [creator, members] = await Promise.all([
      UserModel.findById(group.createdBy)
        .select('firstname lastname username profilePicture')
        .lean(),
      memberIds.length > 0 
        ? UserModel.find({ _id: { $in: memberIds } })
            .select('firstname lastname username profilePicture')
            .lean()
        : Promise.resolve([])
    ]);

    const memberMap = {};
    members.forEach(member => {
      memberMap[String(member._id)] = {
        _id: member._id,
        name: `${member.firstname} ${member.lastname}`.trim() || member.username,
        username: member.username,
        profilePicture: member.profilePicture,
        role: group.members.find(m => String(m.userId) === String(member._id))?.role || 'member',
      };
    });

    const groupObj = group.toObject();
    res.status(200).json({
      ...groupObj,
      creator: {
        _id: creator._id,
        name: `${creator.firstname} ${creator.lastname}`.trim() || creator.username,
        username: creator.username,
        profilePicture: creator.profilePicture,
      },
      members: Object.values(memberMap),
      memberCount: group.members?.length || 0,
      isMember: userId ? group.members?.some(m => String(m.userId) === String(userId)) : false,
    });
  } catch (error) {
    logger.error("Error fetching group", { error: error.message, groupId: req.params.id });
    res.status(500).json({ message: error.message || "Failed to fetch group" });
  }
};

// Update group
export const updateGroup = async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = req.userId;
    const { name, description, coverPicture, profilePicture, privacy, rules } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }

    const group = await GroupModel.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if user is admin or creator
    const isAdmin = group.members?.some(m => String(m.userId) === String(userId) && m.role === 'admin');
    const isCreator = String(group.createdBy) === String(userId);

    if (!isAdmin && !isCreator) {
      return res.status(403).json({ message: "Only admins can update the group" });
    }

    const updateData = {};
    if (name) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (coverPicture !== undefined) updateData.coverPicture = coverPicture;
    if (profilePicture !== undefined) updateData.profilePicture = profilePicture;
    if (privacy) updateData.privacy = privacy;
    if (rules) updateData.rules = Array.isArray(rules) ? rules : [];

    await group.updateOne({ $set: updateData });

    logger.info("Group updated", { groupId, userId });

    const updatedGroup = await GroupModel.findById(groupId);
    res.status(200).json(updatedGroup);
  } catch (error) {
    logger.error("Error updating group", { error: error.message, groupId: req.params.id });
    res.status(500).json({ message: error.message || "Failed to update group" });
  }
};

// Delete group
export const deleteGroup = async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }

    const group = await GroupModel.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const isCreator = String(group.createdBy) === String(userId);
    const isAdmin = group.members?.some(m => String(m.userId) === String(userId) && m.role === 'admin');

    // Creator or admin can delete
    if (!isCreator && !isAdmin) {
      return res.status(403).json({ message: "Only the creator or admins can delete the group" });
    }

    await GroupModel.findByIdAndDelete(groupId);

    logger.info("Group deleted", { groupId, userId, deletedBy: isCreator ? 'creator' : 'admin' });

    res.status(200).json({ message: "Group deleted successfully" });
  } catch (error) {
    logger.error("Error deleting group", { error: error.message, groupId: req.params.id });
    res.status(500).json({ message: error.message || "Failed to delete group" });
  }
};

// Join group
export const joinGroup = async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }

    const group = await GroupModel.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if user is the creator
    if (String(group.createdBy) === String(userId)) {
      return res.status(400).json({ message: "You are the creator of this group. You are already a member." });
    }

    // Check if already a member
    const isMember = group.members?.some(m => String(m.userId) === String(userId));
    if (isMember) {
      return res.status(400).json({ message: "You are already a member of this group" });
    }

    // Add member
    await group.updateOne({
      $push: {
        members: {
          userId: userId,
          role: 'member',
          joinedAt: new Date(),
        },
      },
    });

    logger.info("User joined group", { groupId, userId });

    res.status(200).json({ message: "Successfully joined the group" });
  } catch (error) {
    logger.error("Error joining group", { error: error.message, groupId: req.params.id });
    res.status(500).json({ message: error.message || "Failed to join group" });
  }
};

// Leave group
export const leaveGroup = async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }

    const group = await GroupModel.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if user is a member
    const userMember = group.members?.find(m => String(m.userId) === String(userId));
    if (!userMember) {
      return res.status(400).json({ message: "You are not a member of this group" });
    }

    const isCreator = String(group.createdBy) === String(userId);
    const isAdmin = userMember.role === 'admin';
    
    // Count admins
    const adminCount = group.members?.filter(m => m.role === 'admin').length || 0;
    const totalMembers = group.members?.length || 0;

    // If creator is the only member, allow leaving (they can delete the group)
    if (isCreator && totalMembers === 1) {
      // Remove member (creator)
      await group.updateOne({
        $pull: {
          members: { userId: userId },
        },
      });

      logger.info("Creator left group (only member)", { groupId, userId });
      return res.status(200).json({ 
        message: "Successfully left the group. You can now delete the group if you wish.",
        canDelete: true 
      });
    }

    // If user is the only admin, they must promote another member first
    if (isAdmin && adminCount === 1 && totalMembers > 1) {
      return res.status(400).json({ 
        message: "You are the only admin. Please promote another member to admin before leaving.",
        requiresAdminPromotion: true 
      });
    }

    // If creator wants to leave and there are other members, they must delete the group
    if (isCreator && totalMembers > 1) {
      return res.status(400).json({ 
        message: "As the creator, you cannot leave the group while there are other members. Delete the group instead.",
        mustDelete: true 
      });
    }

    // Remove member
    await group.updateOne({
      $pull: {
        members: { userId: userId },
      },
    });

    logger.info("User left group", { groupId, userId });

    res.status(200).json({ message: "Successfully left the group" });
  } catch (error) {
    logger.error("Error leaving group", { error: error.message, groupId: req.params.id });
    res.status(500).json({ message: error.message || "Failed to leave group" });
  }
};

// Invite user to group
export const inviteToGroup = async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = req.userId;
    const { inviteUserId } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }

    if (!inviteUserId) {
      return res.status(400).json({ message: "User ID to invite is required" });
    }

    const group = await GroupModel.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if inviter is member
    const inviter = group.members?.find(m => String(m.userId) === String(userId));
    if (!inviter) {
      return res.status(403).json({ message: "You must be a member to invite others" });
    }

    // Check if user is already a member
    const isMember = group.members?.some(m => String(m.userId) === String(inviteUserId));
    if (isMember) {
      return res.status(400).json({ message: "User is already a member" });
    }

    // Create notification
    await createNotification(inviteUserId, 'group_invite', userId, { groupId });

    logger.info("User invited to group", { groupId, inviter: userId, invitee: inviteUserId });

    res.status(200).json({ message: "Invitation sent successfully" });
  } catch (error) {
    logger.error("Error inviting to group", { error: error.message, groupId: req.params.id });
    res.status(500).json({ message: error.message || "Failed to send invitation" });
  }
};

// Remove member from group (admin only)
export const removeMember = async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = req.userId;
    const { memberUserId } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }

    if (!memberUserId) {
      return res.status(400).json({ message: "Member user ID is required" });
    }

    const group = await GroupModel.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if user is admin or creator
    const isAdmin = group.members?.some(m => String(m.userId) === String(userId) && m.role === 'admin');
    const isCreator = String(group.createdBy) === String(userId);

    if (!isAdmin && !isCreator) {
      return res.status(403).json({ message: "Only admins can remove members" });
    }

    // Cannot remove creator
    if (String(group.createdBy) === String(memberUserId)) {
      return res.status(400).json({ message: "Cannot remove the group creator" });
    }

    // Cannot remove yourself
    if (String(userId) === String(memberUserId)) {
      return res.status(400).json({ message: "Cannot remove yourself. Leave the group instead." });
    }

    // Check if member exists
    const memberExists = group.members?.some(m => String(m.userId) === String(memberUserId));
    if (!memberExists) {
      return res.status(400).json({ message: "User is not a member of this group" });
    }

    // Remove member
    await group.updateOne({
      $pull: {
        members: { userId: memberUserId },
      },
    });

    logger.info("Member removed from group", { groupId, removedBy: userId, removedUser: memberUserId });

    res.status(200).json({ message: "Member removed successfully" });
  } catch (error) {
    logger.error("Error removing member", { error: error.message, groupId: req.params.id });
    res.status(500).json({ message: error.message || "Failed to remove member" });
  }
};

// Make member admin (creator/admin only)
export const makeMemberAdmin = async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = req.userId;
    const { memberUserId } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }

    if (!memberUserId) {
      return res.status(400).json({ message: "Member user ID is required" });
    }

    const group = await GroupModel.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if user is admin or creator
    const isAdmin = group.members?.some(m => String(m.userId) === String(userId) && m.role === 'admin');
    const isCreator = String(group.createdBy) === String(userId);

    if (!isAdmin && !isCreator) {
      return res.status(403).json({ message: "Only admins can promote members" });
    }

    // Check if member exists
    const memberExists = group.members?.some(m => String(m.userId) === String(memberUserId));
    if (!memberExists) {
      return res.status(400).json({ message: "User is not a member of this group" });
    }

    // Check if already admin
    const member = group.members.find(m => String(m.userId) === String(memberUserId));
    if (member.role === 'admin') {
      return res.status(400).json({ message: "User is already an admin" });
    }

    // Update member role to admin
    await group.updateOne({
      $set: {
        'members.$[elem].role': 'admin',
      },
    }, {
      arrayFilters: [{ 'elem.userId': memberUserId }],
    });

    logger.info("Member promoted to admin", { groupId, promotedBy: userId, promotedUser: memberUserId });

    res.status(200).json({ message: "Member promoted to admin successfully" });
  } catch (error) {
    logger.error("Error promoting member", { error: error.message, groupId: req.params.id });
    res.status(500).json({ message: error.message || "Failed to promote member" });
  }
};

// Add member directly (admin only)
export const addMember = async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = req.userId;
    const { memberUserId } = req.body;

    logger.info("Add member request received", { groupId, userId, memberUserId, body: req.body });

    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }

    if (!memberUserId) {
      return res.status(400).json({ message: "Member user ID is required" });
    }

    const group = await GroupModel.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if user is admin or creator
    const isAdmin = group.members?.some(m => String(m.userId) === String(userId) && m.role === 'admin');
    const isCreator = String(group.createdBy) === String(userId);

    if (!isAdmin && !isCreator) {
      return res.status(403).json({ message: "Only admins can add members" });
    }

    // Check if user exists
    const userToAdd = await UserModel.findById(memberUserId);
    if (!userToAdd) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if already a member
    const isMember = group.members?.some(m => String(m.userId) === String(memberUserId));
    if (isMember) {
      return res.status(400).json({ message: "User is already a member of this group" });
    }

    // Add member
    await group.updateOne({
      $push: {
        members: {
          userId: memberUserId,
          role: 'member',
          joinedAt: new Date(),
        },
      },
    });

    // Create notification
    await createNotification(memberUserId, 'group_invite', userId, { groupId });

    logger.info("Member added to group", { groupId, addedBy: userId, addedUser: memberUserId });

    res.status(200).json({ message: "Member added successfully" });
  } catch (error) {
    logger.error("Error adding member", { error: error.message, groupId: req.params.id });
    res.status(500).json({ message: error.message || "Failed to add member" });
  }
};

