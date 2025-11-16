import React, { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { viewStory, reactToStory } from "../../api/StoryRequests";
import Avatar from "../Avatar/Avatar";
import "./StoryViewer.css";
import { UilTimes, UilAngleLeft, UilAngleRight, UilHeart } from "@iconscout/react-unicons";

const StoryViewer = ({ stories, initialUserIndex = 0, initialStoryIndex = 0, onClose }) => {
  const { user } = useSelector((state) => state.authReducer.authData);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(initialStoryIndex);
  const [currentUserIndex, setCurrentUserIndex] = useState(initialUserIndex);
  const [progress, setProgress] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [liked, setLiked] = useState(false);
  const [reactions, setReactions] = useState(0);
  const progressIntervalRef = useRef(null);
  const storyTimeoutRef = useRef(null);

  // Get current story group and story
  const currentStoryGroup = stories[currentUserIndex];
  const currentStory = currentStoryGroup?.stories?.[currentStoryIndex];

  // Initialize reactions state when story changes
  useEffect(() => {
    if (currentStory) {
      const reactionsArray = Array.isArray(currentStory.reactions) ? currentStory.reactions : [];
      setReactions(reactionsArray.length);
      setLiked(user?._id && reactionsArray.some(id => String(id) === String(user._id)));
    }
  }, [currentStory, user?._id]);

  // Progress bar animation
  useEffect(() => {
    if (!currentStory) return;

    setProgress(0);
    
    // Clear any existing intervals/timeouts
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    if (storyTimeoutRef.current) {
      clearTimeout(storyTimeoutRef.current);
    }

    // Mark story as viewed
    const markAsViewed = async () => {
      try {
        await viewStory(currentStory._id);
      } catch (error) {
        console.error("Error marking story as viewed:", error);
      }
    };
    markAsViewed();

    // Progress bar animation (5 seconds per story)
    const duration = 5000;
    const interval = 50;
    const increment = (100 / duration) * interval;

    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressIntervalRef.current);
          return 100;
        }
        return prev + increment;
      });
    }, interval);

    // Auto-advance to next story
    const nextStory = () => {
      if (currentStoryIndex < currentStoryGroup.stories.length - 1) {
        setCurrentStoryIndex(currentStoryIndex + 1);
      } else if (currentUserIndex < stories.length - 1) {
        setCurrentUserIndex(currentUserIndex + 1);
        setCurrentStoryIndex(0);
      } else {
        onClose();
      }
    };

    storyTimeoutRef.current = setTimeout(nextStory, duration);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (storyTimeoutRef.current) {
        clearTimeout(storyTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStoryIndex, currentUserIndex, currentStory]);

  const handleNextStory = () => {
    if (currentStoryIndex < currentStoryGroup.stories.length - 1) {
      // Next story in same user's stories
      setCurrentStoryIndex(currentStoryIndex + 1);
    } else if (currentUserIndex < stories.length - 1) {
      // Next user's first story
      setCurrentUserIndex(currentUserIndex + 1);
      setCurrentStoryIndex(0);
    } else {
      // End of all stories
      onClose();
    }
  };

  const handlePrevStory = () => {
    if (currentStoryIndex > 0) {
      // Previous story in same user's stories
      setCurrentStoryIndex(currentStoryIndex - 1);
    } else if (currentUserIndex > 0) {
      // Previous user's last story
      const prevUserIndex = currentUserIndex - 1;
      const prevUserStories = stories[prevUserIndex]?.stories || [];
      if (prevUserStories.length > 0) {
        setCurrentUserIndex(prevUserIndex);
        setCurrentStoryIndex(prevUserStories.length - 1);
      }
    }
  };

  // Touch handlers for swipe
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      handleNextStory();
    } else if (isRightSwipe) {
      handlePrevStory();
    }
  };

  // Handle story reaction
  const handleReact = async () => {
    if (!currentStory || !user?._id) return;

    const wasLiked = liked;
    
    // Optimistic update
    setLiked(!wasLiked);
    if (wasLiked) {
      setReactions(Math.max(0, reactions - 1));
    } else {
      setReactions(reactions + 1);
    }

    try {
      await reactToStory(currentStory._id, user._id);
    } catch (error) {
      console.error("Error reacting to story:", error);
      // Revert optimistic update
      setLiked(wasLiked);
      setReactions(reactions);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === "ArrowLeft") {
        handlePrevStory();
      } else if (e.key === "ArrowRight") {
        handleNextStory();
      } else if (e.key === "Escape") {
        onClose();
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        handleReact();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStoryIndex, currentUserIndex, currentStory, user?._id]);

  if (!currentStory || !currentStoryGroup) {
    return null;
  }

  return (
    <div className="story-viewer-overlay" onClick={onClose}>
      <div
        className="story-viewer-container"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Progress bars */}
        <div className="story-progress-bars">
          {currentStoryGroup.stories.map((_, index) => (
            <div key={index} className="progress-bar-container">
              <div
                className="progress-bar"
                style={{
                  width: index < currentStoryIndex
                    ? "100%"
                    : index === currentStoryIndex
                    ? `${progress}%`
                    : "0%",
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="story-header">
          <div className="story-user-info">
            <Avatar
              profilePicture={currentStoryGroup.user.profilePicture}
              firstname={currentStoryGroup.user.name?.split(' ')[0]}
              lastname={currentStoryGroup.user.name?.split(' ').slice(1).join(' ')}
              username={currentStoryGroup.user.username}
              size="40px"
            />
            <div className="story-user-details">
              <span className="story-user-name">
                {currentStoryGroup.user.name || currentStoryGroup.user.username}
              </span>
              <span className="story-time">
                {new Date(currentStory.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
          <button className="story-close-btn" onClick={onClose}>
            <UilTimes size="24" />
          </button>
        </div>

        {/* Story content */}
        <div className="story-content">
          {currentStory.image && (
            <img
              src={`${process.env.REACT_APP_PUBLIC_FOLDER || 'http://localhost:5000/images/'}${encodeURIComponent(currentStory.image)}`}
              alt="Story"
              className="story-image"
              onError={(e) => {
                console.error("Error loading story image:", currentStory.image);
                const basePath = process.env.REACT_APP_PUBLIC_FOLDER || 'http://localhost:5000/images/';
                
                // Try sanitized filename (spaces replaced with underscores)
                const sanitizedFilename = currentStory.image.replace(/[^a-zA-Z0-9.-]/g, '_');
                const sanitizedPath = basePath + sanitizedFilename;
                
                // If current src doesn't match sanitized, try it
                if (e.target.src !== sanitizedPath) {
                  console.log("Trying sanitized filename:", sanitizedPath);
                  e.target.src = sanitizedPath;
                  return; // Let the image try to load with sanitized name
                }
                
                // Show error message if both attempts failed
                if (!e.target.parentElement.querySelector('.story-error')) {
                  const errorDiv = document.createElement('div');
                  errorDiv.className = 'story-error';
                  errorDiv.textContent = 'Failed to load story image';
                  e.target.parentElement.appendChild(errorDiv);
                }
                e.target.style.display = 'none';
              }}
              onLoad={(e) => {
                console.log("Story image loaded successfully:", currentStory.image);
                // Remove any error messages
                const errorDiv = e.target.parentElement.querySelector('.story-error');
                if (errorDiv) {
                  errorDiv.remove();
                }
              }}
            />
          )}
          {currentStory.text && (
            <div className="story-text-overlay">
              <p>{currentStory.text}</p>
            </div>
          )}
          
          {/* Reaction button */}
          <div className="story-reactions">
            <button
              className={`story-react-btn ${liked ? 'liked' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                handleReact();
              }}
              title="Like story (Space or Enter)"
            >
              {liked ? (
                <span className="heart-icon">❤️</span>
              ) : (
                <UilHeart size="32" color="#ffffff" />
              )}
            </button>
            {reactions > 0 && (
              <span className="story-reaction-count">{reactions}</span>
            )}
          </div>
        </div>

        {/* Navigation buttons */}
        <button
          className="story-nav-btn story-nav-prev"
          onClick={handlePrevStory}
          disabled={currentStoryIndex === 0 && currentUserIndex === 0}
        >
          <UilAngleLeft size="32" />
        </button>
        <button
          className="story-nav-btn story-nav-next"
          onClick={handleNextStory}
        >
          <UilAngleRight size="32" />
        </button>

        {/* Click areas for navigation */}
        <div className="story-click-area story-click-prev" onClick={handlePrevStory} />
        <div className="story-click-area story-click-next" onClick={handleNextStory} />
      </div>
    </div>
  );
};

export default StoryViewer;

