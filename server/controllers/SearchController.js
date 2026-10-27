import UserModel from "../models/userModel.js";
import PostModel from "../models/postModel.js";
import logger from "../utils/logger.js";
import { getPaginationParams } from "../utils/pagination.js";

// Search for users, posts, and hashtags
export const search = async (req, res) => {
  const { query, type } = req.query;

  logger.info("Search request received", { query, type });

  if (!query || query.trim() === "") {
    return res.status(200).json({ 
      users: [],
      posts: [],
      hashtags: [],
      query: ""
    });
  }

  try {
    const searchTerm = query.trim();
    const isHashtag = searchTerm.startsWith("#");
    const searchText = isHashtag ? searchTerm.substring(1) : searchTerm;
    const escapedSearchText = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const currentUserId = req.userId;

    const { page, limit, skip } = getPaginationParams(req);
    const searchRegex = new RegExp(escapedSearchText, "i");

    // ================= 1. SEARCH USERS =================
    let users = [];
    let userTotal = 0;

    if (!type || type === 'users' || type === 'all') {
      let userQuery = {
        $or: [
          { firstname: searchRegex },
          { lastname: searchRegex },
          { username: searchRegex }
        ]
      };

      if (currentUserId) {
        const currentUser = await UserModel.findById(currentUserId).select('blocked').lean();
        if (currentUser && Array.isArray(currentUser.blocked) && currentUser.blocked.length > 0) {
          userQuery._id = { $nin: currentUser.blocked };
        }
      }

      userTotal = await UserModel.countDocuments(userQuery);
      const rawUsers = await UserModel.find(userQuery)
        .select("-password -email -emailVerified -phone -phoneVerified -mfa -resetPasswordOtp -resetPasswordExpires -blocked -savedPosts")
        .skip(skip)
        .limit(limit)
        .lean();

      users = rawUsers.map((u) => ({
        ...u,
        followers: Array.isArray(u.followers) ? u.followers.filter(Boolean) : [],
        following: Array.isArray(u.following) ? u.following.filter(Boolean) : [],
      }));
    }

    // ================= 2. SEARCH POSTS =================
    let posts = [];
    let postTotal = 0;

    if (!type || type === 'posts' || type === 'all' || type === 'hashtags') {
      let postQuery = {
        privacy: { $ne: 'private' }
      };

      if (isHashtag) {
        postQuery.desc = new RegExp(`#${escapedSearchText}\\b`, "i");
      } else {
        postQuery.$or = [
          { desc: searchRegex },
          { 'location.name': searchRegex }
        ];
      }

      postTotal = await PostModel.countDocuments(postQuery);
      const rawPosts = await PostModel.find(postQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'firstname lastname username profilePicture')
        .lean();

      posts = rawPosts.map((post) => {
        const author = post.userId && typeof post.userId === 'object' ? post.userId : {};
        const authorName = (author.firstname && author.lastname)
          ? `${author.firstname} ${author.lastname}`
          : (author.username || 'User');

        return {
          ...post,
          userId: author._id || post.userId,
          authorName,
          authorUsername: author.username || 'user',
          authorProfilePicture: author.profilePicture || null,
          likes: Array.isArray(post.likes) ? post.likes : [],
          comments: Array.isArray(post.comments) ? post.comments : []
        };
      });
    }

    // ================= 3. EXTRACT HASHTAGS =================
    let hashtags = [];
    if (!type || type === 'hashtags' || type === 'all') {
      try {
        const tagRegex = new RegExp(`#${escapedSearchText}\\w*`, 'i');
        const tagPosts = await PostModel.find({ desc: tagRegex })
          .select('desc')
          .limit(30)
          .lean();

        const counts = {};
        tagPosts.forEach((p) => {
          if (p.desc) {
            const matches = p.desc.match(/#[\w\u0590-\u05ff]+/g);
            if (matches) {
              matches.forEach((tag) => {
                const cleanTag = tag.trim();
                if (cleanTag.toLowerCase().includes(searchText.toLowerCase())) {
                  counts[cleanTag] = (counts[cleanTag] || 0) + 1;
                }
              });
            }
          }
        });

        hashtags = Object.keys(counts)
          .map((tag) => ({ tag, count: counts[tag] }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);
      } catch (err) {
        hashtags = [];
      }
    }

    logger.info("Search completed", {
      query: searchTerm,
      userCount: users.length,
      postCount: posts.length,
      hashtagCount: hashtags.length
    });

    res.status(200).json({
      users,
      posts,
      hashtags,
      pagination: {
        users: { total: userTotal, page, limit, pages: Math.ceil(userTotal / limit) },
        posts: { total: postTotal, page, limit, pages: Math.ceil(postTotal / limit) }
      },
      query: searchTerm
    });
  } catch (error) {
    logger.error("Error in search", { error: error.message, stack: error.stack, query });
    res.status(500).json({
      message: error.message || "Search failed",
      users: [],
      posts: [],
      hashtags: [],
      query
    });
  }
};
