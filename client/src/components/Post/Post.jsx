import React, { useState, useEffect } from "react";
import "./Post.css";
import Comment from "../../img/comment.png";
import Share from "../../img/share.png";
import Heart from "../../img/like.png";
import Delete from "../../img/delete.png";
import NotLike from "../../img/notlike.png";
import { likePost, deletePost, addComment, likeComment, updatePost, savePost } from "../../api/PostsRequests";
import { useSelector, useDispatch } from "react-redux";
import Avatar from "../Avatar/Avatar";
import * as UserApi from "../../api/UserRequests";
import { UilEdit, UilBookmark, UilBookmarkFull } from "@iconscout/react-unicons";

const Post = ({ data }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.authReducer.authData);
  
  // State for fetched author data (fallback when server doesn't provide it)
  const [authorData, setAuthorData] = useState(null);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState(Array.isArray(data.comments) ? data.comments : []);
  const [commenting, setCommenting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(data.desc || "");
  const [editing, setEditing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Ensure likes is always an array
  const likesArray = Array.isArray(data.likes) ? data.likes : [];
  const [liked, setLiked] = useState(() => {
    // Check if current user has liked this post
    if (!user?._id || !likesArray.length) return false;
    return likesArray.some(likeId => String(likeId) === String(user._id));
  });
  const [likes, setLikes] = useState(likesArray.length);
  const [likedByUsers, setLikedByUsers] = useState([]);
  const [showLikedByModal, setShowLikedByModal] = useState(false);
  const [allLikedByUsers, setAllLikedByUsers] = useState([]);
  const [loadingLikedBy, setLoadingLikedBy] = useState(false);

  // Check if post is saved
  useEffect(() => {
    const checkSavedStatus = async () => {
      if (user?._id && user?.savedPosts) {
        const saved = Array.isArray(user.savedPosts) && user.savedPosts.some(id => String(id) === String(data._id));
        setIsSaved(saved);
      }
    };
    checkSavedStatus();
  }, [user?.savedPosts, data._id, user?._id]);

  // Compare userId as strings to handle both ObjectId and string formats
  const isUserAuthor = user?._id && data.userId && String(user._id) === String(data.userId);

  // Fetch users who liked the post
  useEffect(() => {
    const fetchLikedByUsers = async () => {
      const currentLikesArray = Array.isArray(data.likes) ? data.likes : [];
      if (currentLikesArray.length > 0) {
        try {
          const userPromises = currentLikesArray.slice(0, 3).map(async (likeId) => {
            try {
              const response = await UserApi.getUser(likeId);
              const userData = response?.data || response;
              return userData;
            } catch (error) {
              console.error(`Error fetching user ${likeId}:`, error);
              return null;
            }
          });
          const users = await Promise.all(userPromises);
          setLikedByUsers(users.filter(u => u !== null));
        } catch (error) {
          console.error("Error fetching liked by users:", error);
        }
      } else {
        setLikedByUsers([]);
      }
    };
    fetchLikedByUsers();
  }, [data.likes]);

  // Sync likes state when data.likes changes (e.g., after refresh or update)
  useEffect(() => {
    const currentLikesArray = Array.isArray(data.likes) ? data.likes : [];
    setLikes(currentLikesArray.length);
    
    if (user?._id && currentLikesArray.length > 0) {
      const isLiked = currentLikesArray.some(likeId => String(likeId) === String(user._id));
      setLiked(isLiked);
    } else {
      setLiked(false);
    }
  }, [data.likes, user?._id]);

  // Sync comments when data.comments changes
  useEffect(() => {
    if (Array.isArray(data.comments)) {
      setComments(data.comments);
    }
  }, [data.comments]);

  // Fetch author data if missing
  useEffect(() => {
    const fetchAuthorData = async () => {
      // Only fetch if:
      // 1. Not the current user's post
      // 2. Author data is missing
      // 3. We have a userId
      // 4. We haven't already fetched it
      if (!isUserAuthor && 
          (!data.authorName || !data.authorUsername) && 
          data.userId && 
          !authorData) {
        try {
          const response = await UserApi.getUser(data.userId);
          const userData = response?.data || response;
          if (userData) {
            setAuthorData({
              authorName: userData.firstname && userData.lastname 
                ? `${userData.firstname} ${userData.lastname}`.trim()
                : userData.firstname || userData.lastname || 'Unknown User',
              authorUsername: userData.username || 'Unknown User',
              authorProfilePicture: userData.profilePicture || null
            });
          }
        } catch (error) {
          console.error("Error fetching author data for post:", error);
        }
      }
    };

    fetchAuthorData();
  }, [data.userId, data.authorName, data.authorUsername, isUserAuthor, authorData]);
  


  
  const handleLike = async () => {
    // Optimistic update
    const wasLiked = liked;
    const currentLikesArray = Array.isArray(data.likes) ? [...data.likes] : [];
    
    // Calculate new likes array
    let newLikesArray;
    if (wasLiked) {
      // Remove user ID from likes
      newLikesArray = currentLikesArray.filter(likeId => String(likeId) !== String(user._id));
    } else {
      // Add user ID to likes
      newLikesArray = [...currentLikesArray, user._id];
    }
    
    // Update local state optimistically
    setLiked(!wasLiked);
    setLikes(newLikesArray.length);
    
    // Update Redux state
    dispatch({ 
      type: "UPDATE_POST_LIKES", 
      postId: data._id, 
      likes: newLikesArray 
    });
    
    try {
      // Call the API to update like on server
      await likePost(data._id, user._id);
    } catch (error) {
      // Revert optimistic update on error
      console.error("Error liking post:", error);
      setLiked(wasLiked);
      setLikes(currentLikesArray.length);
      
      // Revert Redux state
      dispatch({ 
        type: "UPDATE_POST_LIKES", 
        postId: data._id, 
        likes: currentLikesArray 
      });
    }
  };

  const handleDelete = async (postId) => {
    try {
      await deletePost(postId, { userId: user._id });
      console.log("Post deleted successfully.");
      window.alert("Post deleted successfully.");
      window.location.reload();
      // Add any additional logic or state updates after a successful deletion
    } catch (error) {
      console.error("Error deleting post:", error);
      // Handle errors appropriately
      // For example, you might want to show an error message to the user
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || commenting) return;

    setCommenting(true);
    try {
      const { data: newComment } = await addComment(data._id, user._id, commentText);
      setComments([...comments, newComment]);
      setCommentText("");
      
      // Update Redux state
      dispatch({
        type: "UPDATE_POST_COMMENTS",
        postId: data._id,
        comments: [...comments, newComment]
      });
    } catch (error) {
      console.error("Error adding comment:", error);
      alert("Failed to add comment. Please try again.");
    } finally {
      setCommenting(false);
    }
  };

  const handleLikeComment = async (commentId, currentLikes) => {
    if (!user?._id) return;

    const likesArray = Array.isArray(currentLikes) ? currentLikes : [];
    const isLiked = likesArray.some(likeId => String(likeId) === String(user._id));

    // Optimistic update
    const updatedComments = comments.map(comment => {
      if (String(comment._id) === String(commentId)) {
        const newLikes = isLiked
          ? likesArray.filter(id => String(id) !== String(user._id))
          : [...likesArray, user._id];
        return { ...comment, likes: newLikes };
      }
      return comment;
    });
    setComments(updatedComments);

    try {
      await likeComment(data._id, commentId, user._id);
      
      // Update Redux state
      dispatch({
        type: "UPDATE_POST_COMMENTS",
        postId: data._id,
        comments: updatedComments
      });
    } catch (error) {
      console.error("Error liking comment:", error);
      // Revert optimistic update
      setComments(comments);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        const postUrl = `${window.location.origin}/post/${data._id}`;
        await navigator.share({
          title: `${displayName}'s post`,
          text: data.desc || "Check out this post!",
          url: postUrl,
        });
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error("Error sharing:", error);
        }
      }
    } else {
      // Fallback: Copy to clipboard
      const postUrl = `${window.location.origin}/post/${data._id}`;
      navigator.clipboard.writeText(postUrl).then(() => {
        alert("Post link copied to clipboard!");
      }).catch(() => {
        alert("Unable to copy link. Please copy manually: " + postUrl);
      });
    }
  };

  const [editPrivacy, setEditPrivacy] = useState(data.privacy || 'public');

  useEffect(() => {
    setEditPrivacy(data.privacy || 'public');
  }, [data.privacy]);

  const handleEdit = () => {
    setIsEditing(true);
    setEditText(data.desc || "");
    setEditPrivacy(data.privacy || 'public');
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditText(data.desc || "");
  };

  const handleSaveEdit = async () => {
    if (!editText.trim() && !data.image) {
      alert("Post cannot be empty");
      return;
    }

    setEditing(true);
    try {
      await updatePost(data._id, { desc: editText.trim(), privacy: editPrivacy });
      setIsEditing(false);
      // Update Redux state
      dispatch({
        type: "UPDATE_POST",
        postId: data._id,
        desc: editText.trim(),
        isEdited: true,
        editedAt: new Date().toISOString(),
      });
      // Reload to get updated post
      window.location.reload();
    } catch (error) {
      console.error("Error updating post:", error);
      alert("Failed to update post. Please try again.");
    } finally {
      setEditing(false);
    }
  };

  const handleSavePost = async () => {
    setSaving(true);
    try {
      await savePost(data._id);
      setIsSaved(!isSaved);
      // Update user's savedPosts in Redux if needed
    } catch (error) {
      console.error("Error saving post:", error);
      alert("Failed to save post. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  
  // Use fetched author data if available, otherwise use data from server
  const effectiveAuthorName = authorData?.authorName || data.authorName;
  const effectiveAuthorUsername = authorData?.authorUsername || data.authorUsername;
  const effectiveAuthorProfilePicture = authorData?.authorProfilePicture || data.authorProfilePicture;

  // Get the correct username to display
  // Priority: If it's the current user's post, always use their current data
  // Otherwise use the author data (from server or fetched)
  let displayUsername;
  if (isUserAuthor && user?.username) {
    // Always use current user's username for their own posts
    displayUsername = user.username;
  } else {
    // For other users' posts, use author data but filter out hardcoded values
    displayUsername = effectiveAuthorUsername;
    if (!displayUsername || displayUsername === "hkmodi" || displayUsername === "hmodi" || displayUsername === "ppadia") {
      displayUsername = "Unknown User";
    }
  }
  
  // Get the correct author name to display
  // Priority: If it's the current user's post, always use their current data
  // Otherwise use the author data (from server or fetched)
  let displayName;
  if (isUserAuthor && user) {
    // Always use current user's name for their own posts
    const firstName = (user.firstname || '').trim();
    const lastName = (user.lastname || '').trim();
    displayName = firstName && lastName 
      ? `${firstName} ${lastName}` 
      : firstName || lastName || "User";
  } else {
    // For other users' posts, use author data
    displayName = effectiveAuthorName;
    
    // Only filter out known hardcoded/invalid values, but keep valid names
    if (displayName && displayName.trim() !== "") {
      // Check if it's a known hardcoded value
      const lowerName = displayName.toLowerCase().trim();
      if (lowerName === "hkmodi" || lowerName === "hmodi" || lowerName === "ppadia" || 
          lowerName === "unknown user" || lowerName === "user") {
        displayName = "User";
      }
      // If it contains hardcoded values, try to extract the real name
      else if (displayName.includes("hkmodi") || displayName.includes("hmodi")) {
        displayName = "User";
      }
    } else {
      // If no authorName provided, show "User" as fallback
      displayName = "User";
    }
  }

  return (
    <div className="Post">
      {/* Header with Avatar and Username */}
      <div className="postHeader">
        <div style={{fontFamily:"cursive", display: "flex", alignItems: "center", gap: "0.5rem", flex: 1 }}>
          <Avatar
            profilePicture={effectiveAuthorProfilePicture}
            firstname={isUserAuthor ? user?.firstname : (effectiveAuthorName?.split(' ')[0] || null)}
            lastname={isUserAuthor ? user?.lastname : (effectiveAuthorName?.split(' ').slice(1).join(' ') || null)}
            username={isUserAuthor ? user?.username : effectiveAuthorUsername}
            user={isUserAuthor ? user : null}
            size="32px"
          />
          <span style={{position:"relative", bottom:"2px"}}>
            {displayName}
          </span>
        </div>
        {!isUserAuthor && (
          <div 
            style={{ cursor: "pointer", display: "flex", alignItems: "center" }}
            onClick={handleSavePost}
            title={isSaved ? "Unsave post" : "Save post"}
          >
            {isSaved ? (
              <UilBookmarkFull size="20" color="#0096FF" />
            ) : (
              <UilBookmark size="20" />
            )}
          </div>
        )}
      </div>

      {/* Post Content (Description) - Above buttons */}
      {isEditing ? (
        <div className="post-edit-section">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="post-edit-textarea"
            rows={3}
            placeholder="Edit your post..."
          />
          <div className="edit-privacy-selector">
            <label>
              <b>Privacy:</b>
              <select
                value={editPrivacy}
                onChange={(e) => setEditPrivacy(e.target.value)}
                className="privacy-select"
              >
                <option value="public">🌐 Public</option>
                <option value="friends">👥 Friends</option>
                <option value="private">🔒 Private</option>
              </select>
            </label>
          </div>
          <div className="post-edit-actions">
            <button 
              className="cancel-edit-btn"
              onClick={handleCancelEdit}
              disabled={editing}
            >
              Cancel
            </button>
            <button 
              className="save-edit-btn"
              onClick={handleSaveEdit}
              disabled={editing || (!editText.trim() && !data.image)}
            >
              {editing ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      ) : (
        (data.desc || data.isEdited) && (
          <div className="postContent">
            <span>
              {(data.desc || "").split(/(\s+)/).map((word, index) => {
                // Check if word is a hashtag (starts with # and has at least one alphanumeric character after)
                // Match # followed by alphanumeric characters and underscores
                if (word.startsWith("#") && word.length > 1) {
                  // Extract the hashtag part (before any punctuation)
                  const hashtagMatch = word.match(/^(#[a-zA-Z0-9_]+)/);
                  if (hashtagMatch) {
                    const hashtag = hashtagMatch[1];
                    const rest = word.slice(hashtag.length);
                    return (
                      <span key={index}>
                        <span className="hashtag">{hashtag}</span>
                        {rest}
                      </span>
                    );
                  }
                }
                return <span key={index}>{word}</span>;
              })}
            </span>
            {data.isEdited && (
              <span className="edited-badge" title={`Edited ${data.editedAt ? new Date(data.editedAt).toLocaleString() : ''}`}>
                (edited)
              </span>
            )}
          </div>
        )
      )}

      {/* Post Image (if any) */}
      {data.image && (
        <img
          src={process.env.REACT_APP_PUBLIC_FOLDER + data.image}
          alt="Post content"
        />
      )}

      {/* Liked By Section */}
      {likes > 0 && likedByUsers.length > 0 && (
        <div className="liked-by-section">
          <span className="liked-by-text">
            Liked by{' '}
            {likedByUsers[0] && (
              <span className="liked-by-name">
                {likedByUsers[0].firstname && likedByUsers[0].lastname
                  ? `${likedByUsers[0].firstname} ${likedByUsers[0].lastname}`
                  : likedByUsers[0].username || 'User'}
              </span>
            )}
            {likes > 1 && (
              <>
                {likes === 2 && likedByUsers[1] ? (
                  <>
                    {' and '}
                    <span className="liked-by-name">
                      {likedByUsers[1].firstname && likedByUsers[1].lastname
                        ? `${likedByUsers[1].firstname} ${likedByUsers[1].lastname}`
                        : likedByUsers[1].username || 'User'}
                    </span>
                  </>
                ) : (
                  <>
                    {' and '}
                    <span 
                      className="liked-by-others"
                      onClick={() => isUserAuthor && setShowLikedByModal(true)}
                    >
                      {likes - 1} {likes - 1 === 1 ? 'other' : 'others'}
                    </span>
                  </>
                )}
              </>
            )}
          </span>
        </div>
      )}

      {/* Like, Comment, Share Buttons */}
      <div className="postReact">
        <img
          src={liked ? Heart : NotLike}
          alt="Like"
          style={{ cursor: "pointer" }}
          onClick={handleLike}
        />
        <img 
          src={Comment} 
          alt="Comment" 
          style={{ cursor: "pointer" }}
          onClick={() => setShowComments(!showComments)}
        />
        <img 
          src={Share} 
          alt="Share" 
          style={{ cursor: "pointer" }}
          onClick={handleShare}
        />
      </div>

      {/* Likes and Comments Count */}
      <div className="post-stats">
        {likes > 0 && (
          <span 
            style={{ color: "var(--gray)", fontSize: "12px", cursor: isUserAuthor ? "pointer" : "default" }}
            onClick={async () => {
              if (isUserAuthor) {
                setLoadingLikedBy(true);
                setShowLikedByModal(true);
                try {
                  const currentLikesArray = Array.isArray(data.likes) ? data.likes : [];
                  const userPromises = currentLikesArray.map(async (likeId) => {
                    try {
                      const response = await UserApi.getUser(likeId);
                      return response?.data || response;
                    } catch (error) {
                      console.error(`Error fetching user ${likeId}:`, error);
                      return null;
                    }
                  });
                  const users = await Promise.all(userPromises);
                  setAllLikedByUsers(users.filter(u => u !== null));
                } catch (error) {
                  console.error("Error fetching all liked by users:", error);
                } finally {
                  setLoadingLikedBy(false);
                }
              }
            }}
          >
            {likes} {likes === 1 ? 'like' : 'likes'}
          </span>
        )}
        {comments.length > 0 && (
          <span 
            style={{ color: "var(--gray)", fontSize: "12px", cursor: "pointer" }}
            onClick={() => setShowComments(!showComments)}
          >
            {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
          </span>
        )}
      </div>

      {/* Edit and Delete Buttons (only for post author) */}
      {isUserAuthor && (
        <div className="post-actions">
          <div 
            className="post-action-btn"
            onClick={handleEdit}
            title="Edit post"
          >
            <UilEdit size="18" />
            <span>Edit</span>
          </div>
          <div 
            className="post-action-btn delete-btn"
            onClick={() => {
              if (window.confirm("Are you sure you want to delete this post?")) {
                handleDelete(data._id);
              }
            }}
            title="Delete post"
          >
            <img 
              src={Delete} 
              alt="Delete"
              style={{ width: "18px", height: "18px" }}
            />
            <span>Delete</span>
          </div>
        </div>
      )}

      {/* Comments Section */}
      {showComments && (
        <div className="comments-section">
          {/* Add Comment */}
          <div className="add-comment">
            <Avatar
              user={user}
              profilePicture={user?.profilePicture}
              firstname={user?.firstname}
              lastname={user?.lastname}
              username={user?.username}
              size="32px"
            />
            <div className="comment-input-wrapper">
              <textarea
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleAddComment();
                  }
                }}
                rows={2}
                className="comment-textarea"
              />
              <button
                className="comment-submit-btn"
                onClick={handleAddComment}
                disabled={!commentText.trim() || commenting}
              >
                {commenting ? "Posting..." : "Post"}
              </button>
            </div>
          </div>

          {/* Comments List */}
          <div className="comments-list">
            {comments.map((comment) => {
              const commentLikes = Array.isArray(comment.likes) ? comment.likes : [];
              const isCommentLiked = user?._id && commentLikes.some(likeId => String(likeId) === String(user._id));
              
              return (
                <div key={comment._id} className="comment-item">
                  <Avatar
                    profilePicture={comment.authorProfilePicture}
                    firstname={comment.authorName?.split(' ')[0]}
                    lastname={comment.authorName?.split(' ').slice(1).join(' ')}
                    username={comment.authorUsername}
                    size="28px"
                  />
                  <div className="comment-content">
                    <div className="comment-header">
                      <span className="comment-author">{comment.authorName || "User"}</span>
                    </div>
                    <div className="comment-text">{comment.text}</div>
                    <div className="comment-actions">
                      <span
                        className="comment-like"
                        onClick={() => handleLikeComment(comment._id, comment.likes)}
                      >
                        {isCommentLiked ? "❤️" : "🤍"} {commentLikes.length}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Liked By Modal (for post author) */}
      {showLikedByModal && isUserAuthor && (
        <div className="liked-by-modal-overlay" onClick={() => setShowLikedByModal(false)}>
          <div className="liked-by-modal" onClick={(e) => e.stopPropagation()}>
            <div className="liked-by-modal-header">
              <h3>Liked by</h3>
              <button className="modal-close-btn" onClick={() => setShowLikedByModal(false)}>✕</button>
            </div>
            <div className="liked-by-modal-list">
              {loadingLikedBy ? (
                <div className="loading-liked-by">Loading...</div>
              ) : allLikedByUsers.length > 0 ? (
                allLikedByUsers.map((userData) => (
                  <div key={userData._id} className="liked-by-user-item">
                    <Avatar
                      user={userData}
                      profilePicture={userData?.profilePicture}
                      firstname={userData?.firstname}
                      lastname={userData?.lastname}
                      username={userData?.username}
                      size="40px"
                    />
                    <div className="liked-by-user-info">
                      <span className="liked-by-user-name">
                        {userData?.firstname && userData?.lastname
                          ? `${userData.firstname} ${userData.lastname}`
                          : userData?.username || 'User'}
                      </span>
                      <span className="liked-by-username">@{userData?.username || 'user'}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-likes">No likes yet</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Post;
