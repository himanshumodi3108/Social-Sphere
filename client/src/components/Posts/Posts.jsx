import React, { useEffect, useMemo } from "react";
import { getTimelinePosts, getUserPosts } from "../../actions/PostsAction";
import Post from "../Post/Post";
import { useSelector, useDispatch } from "react-redux";
import "./Posts.css";
import { useParams } from "react-router-dom";
import Spinner from "../Spinner/Spinner";
import { useSocket } from "../../context/SocketContext";

const Posts = ({ posts: externalPosts }) => {
  const params = useParams();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.authReducer.authData);
  const { posts, loading } = useSelector((state) => state.postReducer);
  const { socket } = useSocket();

  useEffect(() => {
    // Only fetch if external posts not provided
    if (!externalPosts) {
      if (params.id) {
        dispatch(getUserPosts(params.id));
      } else if (user?._id) {
        dispatch(getTimelinePosts(user._id));
      }
    }
  }, [dispatch, user?._id, params.id, externalPosts]);

  // Set up Socket.io listener for new posts using centralized SocketContext
  useEffect(() => {
    if (!socket || !user?._id || externalPosts) return;

    const handleNewPost = (data) => {
      const { authorId } = data;
      if (params.id && String(authorId) === String(params.id)) {
        dispatch(getUserPosts(params.id));
      } else if (!params.id && user._id && (String(authorId) !== String(user._id))) {
        dispatch(getTimelinePosts(user._id));
      }
    };

    socket.on("new-post", handleNewPost);

    return () => {
      socket.off("new-post", handleNewPost);
    };
  }, [socket, user?._id, externalPosts, dispatch, params.id]);

  // Sort and filter posts
  const sortedAndFilteredPosts = useMemo(() => {
    // Use external posts if provided, otherwise use Redux posts
    const postsToUse = externalPosts || posts;
    
    if (!postsToUse || !Array.isArray(postsToUse)) {
      return [];
    }

    let filteredPosts = postsToUse;

    // Filter by user ID if external posts were provided and viewing a specific profile
    if (externalPosts && params.id) {
      filteredPosts = filteredPosts.filter((post) => {
        const postUserId = post.userId?._id 
          ? String(post.userId._id) 
          : (post.userId ? String(post.userId) : null);
        const paramId = String(params.id);
        return postUserId === paramId;
      });
    }

    // Sort by timestamp/creation date (newest first)
    const sorted = [...filteredPosts].sort((a, b) => {
      const getTimestamp = (post) => {
        if (post.createdAt) {
          const date = new Date(post.createdAt);
          if (!isNaN(date.getTime())) return date.getTime();
        }
        if (post.timestamp) {
          const date = new Date(post.timestamp);
          if (!isNaN(date.getTime())) return date.getTime();
        }
        if (post.created_at) {
          const date = new Date(post.created_at);
          if (!isNaN(date.getTime())) return date.getTime();
        }
        if (post.updatedAt) {
          const date = new Date(post.updatedAt);
          if (!isNaN(date.getTime())) return date.getTime();
        }
        return 0;
      };

      const timestampA = getTimestamp(a);
      const timestampB = getTimestamp(b);

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
