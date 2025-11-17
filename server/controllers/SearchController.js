import UserModel from "../models/userModel.js";
import PostModel from "../models/postModel.js";
import mongoose from "mongoose";
import logger from "../utils/logger.js";
import { getPaginationParams, createPaginationResponse } from "../utils/pagination.js";

// Search for users and posts
export const search = async (req, res) => {
  const { query, type, page: pageParam, limit: limitParam } = req.query;
  
  logger.info("Search request received", { query, type });

  if (!query || query.trim() === "") {
    return res.status(400).json({ 
      message: "Search query is required",
      users: [],
      posts: []
    });
  }

  try {
    const searchTerm = query.trim();
    const isHashtag = searchTerm.startsWith("#");
    const searchText = isHashtag ? searchTerm.substring(1) : searchTerm;
    const currentUserId = req.userId;

    // Get pagination params
    const { page, limit, skip } = getPaginationParams(req);

    // Build user query - exclude blocked users
    let userQuery = {
      $or: [
        { firstname: new RegExp(searchText, "i") },
        { lastname: new RegExp(searchText, "i") },
        { username: new RegExp(searchText, "i") }
      ]
    };

    // Exclude blocked users if currentUserId is provided
    if (currentUserId) {
      const currentUser = await UserModel.findById(currentUserId).select('blocked');
      if (currentUser && Array.isArray(currentUser.blocked) && currentUser.blocked.length > 0) {
        userQuery._id = { $nin: currentUser.blocked };
      }
    }

    // Search users
    let users = [];
    let userTotal = 0;
    
    if (!type || type === 'users' || type === 'all') {
      userTotal = await UserModel.countDocuments(userQuery);
      users = await UserModel.find(userQuery)
        .select("-password")
        .skip(skip)
        .limit(limit)
        .lean();

      // Clean up arrays
      users = users.map(user => {
        if (Array.isArray(user.followers)) {
          user.followers = user.followers.filter(f => f !== null && f !== undefined && f !== '');
        }
        if (Array.isArray(user.following)) {
          user.following = user.following.filter(f => f !== null && f !== undefined && f !== '');
        }
        return user;
      });
    }

    // Search posts using aggregation for better performance
    let posts = [];
    let postTotal = 0;

    if (!type || type === 'posts' || type === 'all') {
      // Build post query
      let postQuery = {};
      
      if (isHashtag) {
        postQuery.desc = new RegExp(`#${searchText}\\b`, "i");
      } else {
        // Search in description or location
        const searchRegex = new RegExp(searchText, "i");
        postQuery.$or = [
          { desc: searchRegex },
          { 'location.name': searchRegex }
        ];
      }

      // Only show public posts or posts from friends
      postQuery.privacy = { $in: ['public', 'friends'] };

      // Get total count
      postTotal = await PostModel.countDocuments(postQuery);

      // Use aggregation to fetch posts with author info efficiently
      const postsPipeline = [
        { $match: postQuery },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        // Lookup author
        {
          $lookup: {
            from: 'users',
            let: { userId: { $toString: '$userId' } },
            pipeline: [
              { $match: { $expr: { $eq: [{ $toString: '$_id' }, '$$userId'] } } },
              {
                $project: {
                  firstname: 1,
                  lastname: 1,
                  username: 1,
                  profilePicture: 1
                }
              }
            ],
            as: 'author'
          }
        },
        {
          $unwind: {
            path: '$author',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $addFields: {
            authorName: {
              $cond: {
                if: { $and: ['$author.firstname', '$author.lastname'] },
                then: { $concat: ['$author.firstname', ' ', '$author.lastname'] },
                else: { $ifNull: ['$author.firstname', { $ifNull: ['$author.lastname', 'Unknown User'] }] }
              }
            },
            authorUsername: { $ifNull: ['$author.username', 'Unknown User'] },
            authorProfilePicture: { $ifNull: ['$author.profilePicture', null] },
            likes: { $ifNull: ['$likes', []] },
            comments: { $ifNull: ['$comments', []] }
          }
        }
      ];

      posts = await PostModel.aggregate(postsPipeline);
    }

    logger.info("Search completed", { 
      query: searchTerm, 
      userCount: users.length, 
      postCount: posts.length,
      page,
      limit
    });

    // Return response based on type
    if (type === 'users') {
      res.status(200).json({
        users: createPaginationResponse(users, userTotal, page, limit),
        query: searchTerm
      });
    } else if (type === 'posts') {
      res.status(200).json({
        posts: createPaginationResponse(posts, postTotal, page, limit),
        query: searchTerm
      });
    } else {
      res.status(200).json({
        users: createPaginationResponse(users, userTotal, page, limit),
        posts: createPaginationResponse(posts, postTotal, page, limit),
        query: searchTerm
      });
    }
  } catch (error) {
    logger.error("Error in search", { error: error.message, stack: error.stack, query });
    res.status(500).json({ 
      message: error.message || "Search failed",
      users: [],
      posts: []
    });
  }
};
