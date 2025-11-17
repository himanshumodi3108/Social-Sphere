import PostModel from "../models/postModel.js";
import UserModel from "../models/userModel.js";
import mongoose from "mongoose";
import logger from "../utils/logger.js";
import { getPaginationParams, createPaginationResponse } from "../utils/pagination.js";
import { createNotification } from "./NotificationController.js";

// Import socket.io dynamically to avoid starting the socket server on import
let io = null;
const getSocketIO = async () => {
  if (!io) {
    try {
      const socketModule = await import("../../socket/index.js");
      io = socketModule.default;
    } catch (error) {
      logger.error("Error importing socket module", { error: error.message });
    }
  }
  return io;
};

// creating a post
export const createPost = async (req, res) => {
  try {
    // Validate required fields
    if (!req.body.userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const { _id, ...bodyWithoutId } = req.body;
    
    const postData = {
      userId: String(bodyWithoutId.userId),
      desc: bodyWithoutId.desc || '',
      privacy: bodyWithoutId.privacy || 'public',
      likes: [],
      comments: []
    };
    
    if (bodyWithoutId.image) {
      postData.image = bodyWithoutId.image;
    }
    
    if (bodyWithoutId.video) {
      postData.video = bodyWithoutId.video;
    }
    
    if (bodyWithoutId.location) {
      postData.location = bodyWithoutId.location;
    }
    
    if (bodyWithoutId.scheduledAt) {
      postData.scheduledAt = new Date(bodyWithoutId.scheduledAt);
    }
    
    if (bodyWithoutId.feeling) {
      postData.feeling = bodyWithoutId.feeling;
    }
    
    try {
      const corruptedPost = await PostModel.findById(postData.userId);
      if (corruptedPost) {
        logger.warn("Found corrupted post with _id equal to userId, deleting it", {
          postId: corruptedPost._id,
          userId: postData.userId
        });
        await PostModel.findByIdAndDelete(postData.userId);
      }
    } catch (checkError) {
      logger.debug("Error checking for corrupted post", { error: checkError.message });
    }
    
    let savedPost;
    try {
      savedPost = await PostModel.create(postData);
    } catch (createError) {
      if (createError.code === 11000 && createError.keyPattern?._id) {
        logger.warn("Duplicate key error detected, attempting to delete corrupted post and retry", {
          userId: postData.userId,
          error: createError.message
        });
        try {
          await PostModel.findByIdAndDelete(postData.userId);
          savedPost = await PostModel.create(postData);
        } catch (retryError) {
          logger.error("Error retrying post creation after cleanup", { error: retryError.message });
          throw retryError;
        }
      } else {
        throw createError;
      }
    }
    
    logger.info("Post created successfully", { postId: String(savedPost._id), userId: String(savedPost.userId) });
    
    // Populate author information using aggregation
    const postWithAuthor = await PostModel.aggregate([
      { $match: { _id: savedPost._id } },
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
          authorProfilePicture: { $ifNull: ['$author.profilePicture', null] }
        }
      }
    ]);

    let finalPost;
    if (postWithAuthor && postWithAuthor.length > 0) {
      finalPost = postWithAuthor[0];
      finalPost.likes = Array.isArray(finalPost.likes) ? finalPost.likes : [];
      finalPost.comments = Array.isArray(finalPost.comments) ? finalPost.comments : [];
    } else {
      const postObj = savedPost.toObject();
      finalPost = {
        ...postObj,
        likes: Array.isArray(postObj.likes) ? postObj.likes : [],
        comments: Array.isArray(postObj.comments) ? postObj.comments : []
      };
    }

    // Notify followers about the new post via Socket.io and notifications
    try {
      const author = await UserModel.findById(savedPost.userId).select('followers');
      const followers = (author?.followers || []).map(id => String(id));
      
      // Emit new post event to all followers (only for public and friends posts)
      if (postData.privacy === 'public' || postData.privacy === 'friends') {
        // Get socket.io instance dynamically
        const socketIO = await getSocketIO();
        if (socketIO) {
          // Emit to all connected clients - they will filter on the client side
          socketIO.emit('new-post', {
            post: finalPost,
            authorId: savedPost.userId
          });
        }
        
        // Create notifications for all followers
        for (const followerId of followers) {
          await createNotification(followerId, 'post', savedPost.userId, { postId: String(savedPost._id) });
        }
        
        logger.info("New post event emitted and notifications created", { 
          postId: savedPost._id, 
          authorId: savedPost.userId,
          followerCount: followers.length 
        });
      }
    } catch (notifyError) {
      logger.error("Error notifying followers about new post", { 
        error: notifyError.message,
        postId: savedPost._id 
      });
    }

    res.status(200).json(finalPost);
  } catch (error) {
    logger.error("Error creating post", { error: error.message, stack: error.stack });
    res.status(500).json({ message: error.message || "Failed to create post" });
  }
};

// get a post
export const getPost = async (req, res) => {
  const id = req.params.id;

  try {
    const post = await PostModel.findById(id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    res.status(200).json(post);
  } catch (error) {
    logger.error("Error fetching post", { error: error.message, postId: id });
    res.status(500).json({ message: error.message || "Failed to fetch post" });
  }
};

// update post (edit post)
export const updatePost = async (req, res) => {
  const postId = req.params.id;
  const userId = req.userId || req.body.userId;
  const { desc, privacy } = req.body;

  try {
    if (!userId) {
      return res.status(401).json({ message: "User ID not found. Please log in again." });
    }

    const post = await PostModel.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (String(post.userId) !== String(userId)) {
      return res.status(403).json({ message: "You can only edit your own posts" });
    }

    // Update post fields
    const updateData = {};
    if (desc !== undefined) {
      updateData.desc = desc.trim();
      updateData.isEdited = true;
      updateData.editedAt = new Date();
    }
    if (privacy !== undefined) {
      updateData.privacy = privacy;
    }

    await post.updateOne({ $set: updateData });
    
    logger.info("Post updated successfully", { postId, userId });
    
    const updatedPost = await PostModel.findById(postId);
    res.status(200).json(updatedPost);
  } catch (error) {
    logger.error("Error updating post", { error: error.message, postId, userId });
    res.status(500).json({ message: error.message || "Failed to update post" });
  }
};

// delete a post
export const deletePost = async (req, res) => {
  const id = req.params.id;
  const userId = req.userId;

  try {
    const post = await PostModel.findById(id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Only allow deletion by post owner or admin
    if (userId && String(post.userId) !== String(userId)) {
      return res.status(403).json({ message: "You can only delete your own posts" });
    }

    await PostModel.findByIdAndDelete(id);
    
    logger.info("Post deleted successfully", { postId: id, userId });
    
    res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    logger.error("Error deleting post", { error: error.message, postId: id });
    res.status(500).json({ message: error.message || "Failed to delete post" });
  }
};

// like/dislike a post
export const likePost = async (req, res) => {
  const id = req.params.id;
  const { userId } = req.body;
  
  try {
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const post = await PostModel.findById(id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const likesArray = Array.isArray(post.likes) ? post.likes : [];
    const isLiked = likesArray.some(likeId => String(likeId) === String(userId));

    if (isLiked) {
      await post.updateOne({ $pull: { likes: userId } });
      res.status(200).json({ message: "Post unliked", liked: false });
    } else {
      await post.updateOne({ $push: { likes: userId } });
      
      // Create notification for post owner (if not liking own post)
      if (String(post.userId) !== String(userId)) {
        await createNotification(post.userId, 'like', userId, { postId: id });
      }
      
      res.status(200).json({ message: "Post liked", liked: true });
    }
  } catch (error) {
    logger.error("Error liking post", { error: error.message, postId: id });
    res.status(500).json({ message: error.message || "Failed to like post" });
  }
};

// Get timeline posts - Optimized with aggregation and pagination
export const getTimelinePosts = async (req, res) => {
  const userId = req.params.id;
  const { page, limit, skip } = getPaginationParams(req);

  try {
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Get current user and their following list
    const currentUser = await UserModel.findById(userId).select('following');
    const followingIds = (currentUser?.following || []).map(id => String(id));
    
    // Build user IDs array (current user + following)
    const userIds = [String(userId), ...followingIds];

    const pipeline = [
      {
        $match: {
          $or: [
            {
              userId: { $in: userIds },
              privacy: 'public'
            },
            {
              userId: { $in: userIds },
              privacy: 'friends'
            },
            {
              userId: String(userId),
              privacy: 'private'
            }
          ]
        }
      },
      // Sort by createdAt descending
      { $sort: { createdAt: -1 } },
      // Lookup author information
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
      // Add author fields
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
          authorProfilePicture: { $ifNull: ['$author.profilePicture', null] }
        }
      },
      // Lookup comment authors
      {
        $lookup: {
          from: 'users',
          let: { commentUserIds: '$comments.userId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: [{ $toString: '$_id' }, { $map: { input: '$$commentUserIds', as: 'id', in: { $toString: '$$id' } } }]
                }
              }
            },
            {
              $project: {
                _id: 1,
                firstname: 1,
                lastname: 1,
                username: 1,
                profilePicture: 1
              }
            }
          ],
          as: 'commentAuthors'
        }
      },
      // Process comments with author info
      {
        $addFields: {
          comments: {
            $map: {
              input: '$comments',
              as: 'comment',
              in: {
                $mergeObjects: [
                  '$$comment',
                  {
                    $let: {
                      vars: {
                        author: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: '$commentAuthors',
                                as: 'author',
                                cond: { $eq: [{ $toString: '$$author._id' }, { $toString: '$$comment.userId' }] }
                              }
                            },
                            0
                          ]
                        }
                      },
                      in: {
                        authorName: {
                          $cond: {
                            if: { $and: ['$$author.firstname', '$$author.lastname'] },
                            then: { $concat: ['$$author.firstname', ' ', '$$author.lastname'] },
                            else: { $ifNull: ['$$author.firstname', { $ifNull: ['$$author.lastname', 'Unknown User'] }] }
                          }
                        },
                        authorUsername: { $ifNull: ['$$author.username', 'Unknown User'] },
                        authorProfilePicture: { $ifNull: ['$$author.profilePicture', null] },
                        likes: { $ifNull: ['$$comment.likes', []] }
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      },
      // Ensure arrays are always arrays
      {
        $addFields: {
          likes: { $ifNull: ['$likes', []] },
          comments: { $ifNull: ['$comments', []] }
        }
      }
    ];

    // Get total count for pagination
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await PostModel.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    // Add pagination
    pipeline.push({ $skip: skip }, { $limit: limit });

    // Execute aggregation
    const posts = await PostModel.aggregate(pipeline);

    logger.info("Timeline posts fetched", { userId, count: posts.length, page, limit });

    res.status(200).json(createPaginationResponse(posts, total, page, limit));
  } catch (error) {
    logger.error("Error fetching timeline posts", { error: error.message, stack: error.stack, userId });
    res.status(500).json({ message: error.message || "Failed to fetch timeline posts" });
  }
};

// Add comment to a post
export const addComment = async (req, res) => {
  const postId = req.params.id;
  const userId = req.userId || req.body.userId;
  const { text } = req.body;

  try {
    if (!userId) {
      return res.status(401).json({ message: "User ID not found. Please log in again." });
    }

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Comment text is required" });
    }

    const post = await PostModel.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const newComment = {
      userId: userId,
      text: text.trim(),
      likes: []
    };

    post.comments.push(newComment);
    await post.save();

    // Fetch comment author info using aggregation
    const commentWithAuthor = await PostModel.aggregate([
      { $match: { _id: post._id } },
      { $unwind: '$comments' },
      { $match: { 'comments._id': post.comments[post.comments.length - 1]._id } },
      {
        $lookup: {
          from: 'users',
          let: { userId: { $toString: '$comments.userId' } },
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
        $project: {
          _id: '$comments._id',
          userId: '$comments.userId',
          text: '$comments.text',
          likes: { $ifNull: ['$comments.likes', []] },
          createdAt: '$comments.createdAt',
          authorName: {
            $cond: {
              if: { $and: ['$author.firstname', '$author.lastname'] },
              then: { $concat: ['$author.firstname', ' ', '$author.lastname'] },
              else: { $ifNull: ['$author.firstname', { $ifNull: ['$author.lastname', 'Unknown User'] }] }
            }
          },
          authorUsername: { $ifNull: ['$author.username', 'Unknown User'] },
          authorProfilePicture: { $ifNull: ['$author.profilePicture', null] }
        }
      }
    ]);

    if (commentWithAuthor && commentWithAuthor.length > 0) {
      res.status(200).json(commentWithAuthor[0]);
    } else {
      const savedComment = post.comments[post.comments.length - 1];
      res.status(200).json(savedComment.toObject ? savedComment.toObject() : savedComment);
    }
  } catch (error) {
    logger.error("Error adding comment", { error: error.message, postId, userId });
    res.status(500).json({ message: error.message || "Failed to add comment" });
  }
};

// Like/unlike a comment
export const likeComment = async (req, res) => {
  const postId = req.params.id;
  const commentId = req.params.commentId;
  const { userId } = req.body;

  try {
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const post = await PostModel.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const likesArray = Array.isArray(comment.likes) ? comment.likes : [];
    const likeIndex = likesArray.findIndex(id => String(id) === String(userId));

    if (likeIndex > -1) {
      // Unlike
      comment.likes.splice(likeIndex, 1);
    } else {
      // Like
      comment.likes.push(userId);
    }

    await post.save();

    logger.info("Comment like toggled", { postId, commentId, userId, liked: likeIndex === -1 });

    res.status(200).json({ 
      message: likeIndex > -1 ? "Comment unliked" : "Comment liked",
      likes: comment.likes 
    });
  } catch (error) {
    logger.error("Error liking comment", { error: error.message, postId, commentId });
    res.status(500).json({ message: error.message || "Failed to like comment" });
  }
};
