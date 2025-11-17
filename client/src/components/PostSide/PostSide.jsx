import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Posts from "../Posts/Posts";
import PostShare from "../PostShare/PostShare";
import SavedPosts from "../../pages/SavedPosts/SavedPosts";
import CreateGroupModal from "./CreateGroupModal";
import { createGroup } from "../../api/GroupRequests";
import "./PostSide.css";

const PostSide = () => {
  const location = useLocation();
  const [showSavedPosts, setShowSavedPosts] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  
  // Show PostShare only on home page, not on profile pages
  const isHomePage = location.pathname === "/home" || location.pathname === "/";

  // Listen for custom events to show saved posts or create group
  useEffect(() => {
    const handleShowSaved = () => {
      setShowCreateGroup(false); // Hide create group when showing saved posts
      setShowSavedPosts(true);
    };
    const handleShowGroup = () => {
      setShowSavedPosts(false); // Hide saved posts when showing create group
      setShowCreateGroup(true);
    };
    const handleHideSaved = () => setShowSavedPosts(false);
    const handleHideGroup = () => setShowCreateGroup(false);
    const handleShowHome = () => {
      // Reset both when navigating to home
      setShowSavedPosts(false);
      setShowCreateGroup(false);
    };

    window.addEventListener('show-saved-posts', handleShowSaved);
    window.addEventListener('show-create-group', handleShowGroup);
    window.addEventListener('hide-saved-posts', handleHideSaved);
    window.addEventListener('hide-create-group', handleHideGroup);
    window.addEventListener('show-home', handleShowHome);

    return () => {
      window.removeEventListener('show-saved-posts', handleShowSaved);
      window.removeEventListener('show-create-group', handleShowGroup);
      window.removeEventListener('hide-saved-posts', handleHideSaved);
      window.removeEventListener('hide-create-group', handleHideGroup);
      window.removeEventListener('show-home', handleShowHome);
    };
  }, []);

  // Reset when navigating away
  useEffect(() => {
    if (location.pathname === "/home" || location.pathname === "/") {
      setShowSavedPosts(false);
      setShowCreateGroup(false);
    }
  }, [location.pathname]);

  const handleCreateGroup = async (groupData) => {
    try {
      await createGroup(groupData);
      setShowCreateGroup(false);
      window.dispatchEvent(new Event('group-created'));
    } catch (error) {
      // console.error("Error creating group:", error);
      alert("Failed to create group");
    }
  };

  // Show saved posts
  if (showSavedPosts) {
    return (
      <div className="PostSide">
        <div className="postside-header">
          <h2>Saved Posts</h2>
          <button 
            className="close-btn"
            onClick={() => {
              setShowSavedPosts(false);
              setShowCreateGroup(false); // Ensure create group is also hidden
              window.dispatchEvent(new Event('hide-saved-posts'));
            }}
          >
            ✕
          </button>
        </div>
        <SavedPosts />
      </div>
    );
  }

  // Show create group modal
  if (showCreateGroup) {
    return (
      <div className="PostSide">
        <div className="postside-header">
          <h2>Create New Group</h2>
          <button 
            className="close-btn"
            onClick={() => {
              setShowCreateGroup(false);
              setShowSavedPosts(false); // Ensure saved posts is also hidden
              window.dispatchEvent(new Event('hide-create-group'));
            }}
          >
            ✕
          </button>
        </div>
        <CreateGroupModal
          onClose={() => {
            setShowCreateGroup(false);
            setShowSavedPosts(false); // Ensure saved posts is also hidden
            window.dispatchEvent(new Event('hide-create-group'));
          }}
          onCreate={handleCreateGroup}
        />
      </div>
    );
  }

  return (
    <div className="PostSide">
      {/* Only show PostShare on home page, not on profile pages */}
      {isHomePage && <PostShare />}
      <Posts />
      <div className="mobile-only">
        <br />
        <br />
        <br />
      </div>
    </div>
  );
};

export default PostSide;
