import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { getTimelineStories, createStory, deleteStory } from "../../api/StoryRequests";
import { uploadImage } from "../../actions/UploadAction";
import Avatar from "../Avatar/Avatar";
import StoryViewer from "../StoryViewer/StoryViewer";
import "./Stories.css";
import { UilPlus, UilTimes } from "@iconscout/react-unicons";

const getPublicBase = () => {
  if (process.env.REACT_APP_PUBLIC_FOLDER) {
    const p = process.env.REACT_APP_PUBLIC_FOLDER;
    return p.endsWith('/') ? p : `${p}/`;
  }
  const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  return isProduction 
    ? 'https://social-sphere-da82.onrender.com/images/' 
    : 'http://localhost:5000/images/';
};

const getMediaUrl = (filename) => {
  if (!filename) return '';
  if (
    filename.startsWith('http://') ||
    filename.startsWith('https://') ||
    filename.startsWith('data:') ||
    filename.startsWith('blob:')
  ) {
    return filename;
  }
  const base = getPublicBase();
  const clean = filename.replace(/^\/+/, '');
  return `${base}${encodeURIComponent(clean)}`;
};

// Story Thumbnail component with multi-level image fallback and initials recovery
const StoryThumbnail = ({ image, user, alt = "Story", size = "60px" }) => {
  const initialSource = image || user?.profilePicture;
  const [currentSrc, setCurrentSrc] = useState(initialSource ? getMediaUrl(initialSource) : null);
  const [failed, setFailed] = useState(!initialSource);
  const [triedSanitized, setTriedSanitized] = useState(false);
  const [triedProfile, setTriedProfile] = useState(false);

  useEffect(() => {
    const src = image || user?.profilePicture;
    setCurrentSrc(src ? getMediaUrl(src) : null);
    setFailed(!src);
    setTriedSanitized(false);
    setTriedProfile(false);
  }, [image, user?.profilePicture]);

  const handleError = () => {
    const targetFile = image || user?.profilePicture;
    // Step 1: Try sanitized filename (replace spaces / special chars with underscores)
    if (!triedSanitized && targetFile) {
      setTriedSanitized(true);
      const sanitized = targetFile.replace(/[^a-zA-Z0-9.-]/g, '_');
      const sanitizedUrl = getMediaUrl(sanitized);
      if (sanitizedUrl !== currentSrc) {
        setCurrentSrc(sanitizedUrl);
        return;
      }
    }

    // Step 2: If we were showing a story image, try falling back to the author's profile picture
    if (!triedProfile && image && user?.profilePicture && user.profilePicture !== image) {
      setTriedProfile(true);
      const profileUrl = getMediaUrl(user.profilePicture);
      if (profileUrl !== currentSrc) {
        setCurrentSrc(profileUrl);
        return;
      }
    }

    // Step 3: All image attempts failed, fallback to initials Avatar
    setFailed(true);
  };

  if (!currentSrc || failed) {
    return (
      <Avatar
        user={user}
        firstname={user?.firstname || user?.name?.split(' ')[0]}
        lastname={user?.lastname || user?.name?.split(' ').slice(1).join(' ')}
        username={user?.username}
        size={size}
      />
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      className="story-avatar"
      onError={handleError}
    />
  );
};

const Stories = () => {
  const { user } = useSelector((state) => state.authReducer.authData);
  const dispatch = useDispatch();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [storyImage, setStoryImage] = useState(null);
  const [storyText, setStoryText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [viewerInitialUserIndex, setViewerInitialUserIndex] = useState(0);
  const imageRef = React.useRef();

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    setLoading(true);
    try {
      const { data } = await getTimelineStories();
      setStories(data || []);
    } catch (error) {
      // console.error("Error fetching stories:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setStoryImage(e.target.files[0]);
    }
  };

  const handleCreateStory = async () => {
    if (!storyImage) {
      alert("Please select an image");
      return;
    }

    setUploading(true);
    try {
      // Upload image first with pre-sanitized filename
      const formData = new FormData();
      const safeUploadName = `${Date.now()}_${storyImage.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      formData.append("name", safeUploadName);
      formData.append("file", storyImage);

      const uploadResponse = await dispatch(uploadImage(formData));
      // Get the sanitized filename from the upload response
      const sanitizedFileName = uploadResponse?.payload?.data?.filename || 
                                uploadResponse?.payload?.data?.data?.filename ||
                                uploadResponse?.data?.filename ||
                                uploadResponse?.data?.name ||
                                safeUploadName;

      // Create story with the sanitized filename
      await createStory({
        image: sanitizedFileName,
        text: storyText.trim() || undefined,
      });

      setShowCreateModal(false);
      setStoryImage(null);
      setStoryText("");
      fetchStories();
    } catch (error) {
      // console.error("Error creating story:", error);
      alert("Failed to create story. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteStory = async (storyId) => {
    if (!window.confirm("Are you sure you want to delete this story?")) {
      return;
    }
    try {
      await deleteStory(storyId);
      fetchStories();
    } catch (error) {
      // console.error("Error deleting story:", error);
      alert("Failed to delete story. Please try again.");
    }
  };

  if (loading) {
    return <div className="stories-loading">Loading stories...</div>;
  }

  // Find if current user has an active story in timeline
  const myStoryGroup = stories.find((s) => String(s.user?._id) === String(user?._id));
  const myLatestStory = myStoryGroup?.stories?.[myStoryGroup.stories.length - 1] || myStoryGroup?.stories?.[0];

  return (
    <div className="Stories">
      <div className="stories-container">
        {/* Create Story Card */}
        <div className="story-card create-story" onClick={() => setShowCreateModal(true)}>
          <div className="story-image-wrapper">
            <StoryThumbnail
              image={myLatestStory?.image || user?.profilePicture}
              user={user}
              alt="Your story"
            />
            <div className="add-story-icon">
              <UilPlus size="24" color="white" />
            </div>
          </div>
          <span className="story-username">Your Story</span>
        </div>

        {/* Stories List */}
        {stories.map((storyGroup, groupIndex) => {
          const latestStory = storyGroup.stories?.[storyGroup.stories.length - 1] || storyGroup.stories?.[0];
          const isCurrentUser = String(storyGroup.user?._id) === String(user?._id);

          return (
            <div
              key={storyGroup.user?._id || groupIndex}
              className="story-card"
              onClick={() => {
                setViewerInitialUserIndex(groupIndex);
                setShowViewer(true);
              }}
            >
              <div className="story-image-wrapper">
                <StoryThumbnail
                  image={latestStory?.image || storyGroup.user?.profilePicture}
                  user={storyGroup.user}
                  alt={storyGroup.user?.name || storyGroup.user?.username || "Story"}
                />
                {storyGroup.stories && storyGroup.stories.length > 0 && (
                  <div className="story-indicator"></div>
                )}
              </div>
              <span className="story-username">
                {isCurrentUser ? "You" : (storyGroup.user?.name?.split(' ')[0] || storyGroup.user?.username)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Create Story Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => !uploading && setShowCreateModal(false)}>
          <div className="modal-content story-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Story</h2>
              <UilTimes
                size="24"
                onClick={() => !uploading && setShowCreateModal(false)}
                style={{ cursor: "pointer" }}
              />
            </div>
            <div className="story-form">
              {storyImage ? (
                <div className="story-preview">
                  <img src={URL.createObjectURL(storyImage)} alt="Preview" />
                  <UilTimes
                    size="20"
                    onClick={() => setStoryImage(null)}
                    className="remove-image"
                  />
                </div>
              ) : (
                <div
                  className="story-upload-area"
                  onClick={() => imageRef.current?.click()}
                >
                  <UilPlus size="48" />
                  <p>Click to upload image</p>
                </div>
              )}
              <textarea
                placeholder="Add text to your story (optional, max 200 chars)"
                value={storyText}
                onChange={(e) => setStoryText(e.target.value.slice(0, 200))}
                maxLength={200}
                rows={3}
                className="story-text-input"
              />
              <div className="modal-actions">
                <button
                  className="cancel-btn"
                  onClick={() => setShowCreateModal(false)}
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  className="create-btn"
                  onClick={handleCreateStory}
                  disabled={!storyImage || uploading}
                >
                  {uploading ? "Creating..." : "Create Story"}
                </button>
              </div>
              <input
                type="file"
                ref={imageRef}
                onChange={handleImageChange}
                accept="image/*"
                style={{ display: "none" }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Story Viewer */}
      {showViewer && stories.length > 0 && (
        <StoryViewer
          stories={stories}
          initialUserIndex={viewerInitialUserIndex}
          initialStoryIndex={0}
          onClose={() => setShowViewer(false)}
        />
      )}
    </div>
  );
};

export default Stories;

