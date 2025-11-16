import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { getTimelineStories, createStory, deleteStory } from "../../api/StoryRequests";
import { uploadImage } from "../../actions/UploadAction";
import { useDispatch } from "react-redux";
import Avatar from "../Avatar/Avatar";
import StoryViewer from "../StoryViewer/StoryViewer";
import "./Stories.css";
import { UilPlus, UilTimes } from "@iconscout/react-unicons";

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
      console.error("Error fetching stories:", error);
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
      // Upload image first
      const formData = new FormData();
      const fileName = Date.now() + storyImage.name;
      formData.append("name", fileName);
      formData.append("file", storyImage);

      const uploadResponse = await dispatch(uploadImage(formData));
      // Get the sanitized filename from the upload response
      // The server sanitizes filenames (replaces spaces with underscores)
      // Response structure: { data: { filename: "...", path: "..." } }
      // axios wraps the response in { data: { ... } }
      const sanitizedFileName = uploadResponse?.payload?.data?.filename || 
                                uploadResponse?.payload?.data?.data?.filename ||
                                uploadResponse?.data?.filename ||
                                fileName.replace(/[^a-zA-Z0-9.-]/g, '_');

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
      console.error("Error creating story:", error);
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
      console.error("Error deleting story:", error);
      alert("Failed to delete story. Please try again.");
    }
  };

  if (loading) {
    return <div className="stories-loading">Loading stories...</div>;
  }

  return (
    <div className="Stories">
      <div className="stories-container">
        {/* Create Story Card */}
        <div className="story-card create-story" onClick={() => setShowCreateModal(true)}>
          <div className="story-image-wrapper">
            {user?.profilePicture ? (
              <img
                src={process.env.REACT_APP_PUBLIC_FOLDER + user.profilePicture}
                alt="Your story"
                className="story-avatar"
              />
            ) : (
              <Avatar
                user={user}
                firstname={user?.firstname}
                lastname={user?.lastname}
                username={user?.username}
                size="60px"
              />
            )}
            <div className="add-story-icon">
              <UilPlus size="24" color="white" />
            </div>
          </div>
          <span className="story-username">Your Story</span>
        </div>

        {/* Other Users' Stories */}
        {stories.map((storyGroup, groupIndex) => (
          <div
            key={storyGroup.user._id}
            className="story-card"
            onClick={() => {
              setViewerInitialUserIndex(groupIndex);
              setShowViewer(true);
            }}
          >
            <div className="story-image-wrapper">
              {storyGroup.user.profilePicture ? (
                <img
                  src={process.env.REACT_APP_PUBLIC_FOLDER + storyGroup.user.profilePicture}
                  alt={storyGroup.user.name}
                  className="story-avatar"
                />
              ) : (
                <Avatar
                  firstname={storyGroup.user.name?.split(' ')[0]}
                  lastname={storyGroup.user.name?.split(' ').slice(1).join(' ')}
                  username={storyGroup.user.username}
                  size="60px"
                />
              )}
              {storyGroup.stories && storyGroup.stories.length > 0 && (
                <div className="story-indicator"></div>
              )}
            </div>
            <span className="story-username">
              {storyGroup.user.name?.split(' ')[0] || storyGroup.user.username}
            </span>
          </div>
        ))}
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

