import React, { useEffect, useMemo, useRef } from "react";
import { getTimelinePosts } from "../../actions/PostsAction";
import Post from "../Post/Post";
import { useSelector, useDispatch } from "react-redux";
import "./Posts.css";
import { useParams } from "react-router-dom";
import Spinner from "../Spinner/Spinner";
import { io } from "socket.io-client";

const Posts = ({ posts: externalPosts }) => {
  const params = useParams()
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.authReducer.authData);
  const { posts, loading } = useSelector((state) => state.postReducer);
  
  const socketRef = useRef(null);

  useEffect(() => {
    // Only fetch if external posts not provided
    if (user?._id && !externalPosts) {
      dispatch(getTimelinePosts(user._id));
    }
  }, [dispatch, user?._id, externalPosts]);

  // Set up Socket.io listener for new posts from followed users
  useEffect(() => {
    if (!user?._id || externalPosts) return; // Don't listen if viewing external posts

    // Connect to socket
    const socketUrl = process.env.REACT_APP_SOCKET_URL || "http://localhost:8800";
    socketRef.current = io(socketUrl);

    socketRef.current.on('new-post', (data) => {
      const { authorId } = data;
      if (user._id && (String(authorId) !== String(user._id))) {
        dispatch(getTimelinePosts(user._id));
      }
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.off('new-post');
        socketRef.current.disconnect();
      }
    };
  }, [user?._id, externalPosts, dispatch]);

  // Sort and filter posts
  const sortedAndFilteredPosts = useMemo(() => {
    // Use external posts if provided, otherwise use Redux posts
    const postsToUse = externalPosts || posts;
    
    if (!postsToUse || !Array.isArray(postsToUse)) {
      return [];
    }

    let filteredPosts = postsToUse;

    // Filter by user ID if viewing a specific profile (follower's profile)
    if (params.id) {
      filteredPosts = filteredPosts.filter((post) => {
        const postUserId = post.userId ? String(post.userId) : null;
        const paramId = params.id ? String(params.id) : null;
        return postUserId === paramId;
      });
    }

    // Sort by timestamp/creation date (newest first)
    // Priority: createdAt (Mongoose default), then timestamp, then updatedAt
    const sorted = [...filteredPosts].sort((a, b) => {
      // Get timestamp from post - prioritize createdAt (Mongoose timestamps)
      const getTimestamp = (post) => {
        // Try createdAt first (Mongoose timestamps: true)
        if (post.createdAt) {
          const date = new Date(post.createdAt);
          if (!isNaN(date.getTime())) return date.getTime();
        }
        // Try timestamp field
        if (post.timestamp) {
          const date = new Date(post.timestamp);
          if (!isNaN(date.getTime())) return date.getTime();
        }
        // Try created_at
        if (post.created_at) {
          const date = new Date(post.created_at);
          if (!isNaN(date.getTime())) return date.getTime();
        }
        // Try updatedAt as fallback
        if (post.updatedAt) {
          const date = new Date(post.updatedAt);
          if (!isNaN(date.getTime())) return date.getTime();
        }
        // If no valid timestamp found, use 0 (will appear last)
        return 0;
      };

      const timestampA = getTimestamp(a);
      const timestampB = getTimestamp(b);

      // Sort newest first (descending order by timestamp)
      return timestampB - timestampA;
    });

    return sorted;
  }, [externalPosts, posts, params.id]);

  // Use external posts if provided
  const displayPosts = externalPosts || posts;
  const isLoading = loading && !externalPosts;

  if (isLoading && (!displayPosts || displayPosts.length === 0)) {
    return (
      <div className="Posts">
        <Spinner size="50px" />
      </div>
    );
  }

  if (!displayPosts || sortedAndFilteredPosts.length === 0) {
    return (
      <div className="Posts">
        <div style={{ textAlign: "center", padding: "2rem", color: "var(--gray)" }}>
          No Posts
        </div>
      </div>
    );
  }

  return (
    <div className="Posts">
      {sortedAndFilteredPosts.map((post) => {
        return <Post data={post} key={post._id || post.id || Math.random()} />;
      })}
      {isLoading && (
        <div style={{ marginTop: "1rem" }}>
          <Spinner size="40px" />
        </div>
      )}
    </div>
  );
};

export default Posts;
