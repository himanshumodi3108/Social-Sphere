import React, { useState, useEffect } from "react";
import { useLocation, useSearchParams, useNavigate } from "react-router-dom";
import Posts from "../Posts/Posts";
import PostShare from "../PostShare/PostShare";
import SavedPosts from "../../pages/SavedPosts/SavedPosts";
import CreateGroupModal from "./CreateGroupModal";
import { createGroup } from "../../api/GroupRequests";
import "./PostSide.css";

const PostSide = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [eventTab, setEventTab] = useState(null);
  
  // Show PostShare only on home page, not on profile pages
  const isHomePage = location.pathname === "/home" || location.pathname === "/";

  // Check URL query parameters (primary navigation source)
  const currentTab = searchParams.get('tab') || eventTab;
  const showSavedPosts = currentTab === 'saved';
  const showCreateGroup = currentTab === 'create-group';

  // Support legacy event dispatchers as fallback
  useEffect(() => {
    const handleShowSaved = () => setSearchParams({ tab: 'saved' });
    const handleShowGroup = () => setSearchParams({ tab: 'create-group' });
    const handleHideSaved = () => setSearchParams({});
    const handleHideGroup = () => setSearchParams({});
    const handleShowHome = () => setSearchParams({});

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
  }, [setSearchParams]);

  const handleCreateGroup = async (groupData) => {
    try {
      await createGroup(groupData);
      setSearchParams({});
      setEventTab(null);
      window.dispatchEvent(new Event('group-created'));
    } catch (error) {
      alert("Failed to create group");
    }
  };

  const handleClose = () => {
    setSearchParams({});
    setEventTab(null);
  };

  // Show saved posts
  if (showSavedPosts) {
    return (
      <div className="PostSide">
        <div className="postside-header">
          <h2>Saved Posts</h2>
          <button 
            className="close-btn"
            onClick={handleClose}
            aria-label="Close saved posts"
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
            onClick={handleClose}
            aria-label="Close create group"
          >
            ✕
          </button>
        </div>
        <CreateGroupModal
          onClose={handleClose}
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
