import React, { useState, useRef, useEffect } from "react";
import "./PostShare.css";
import { UilScenery } from "@iconscout/react-unicons";
import { UilPlayCircle } from "@iconscout/react-unicons";
import { UilLocationPoint } from "@iconscout/react-unicons";
import { UilSchedule } from "@iconscout/react-unicons";
import { UilTimes } from "@iconscout/react-unicons";
import { useDispatch, useSelector } from "react-redux";
import { uploadImage, uploadPost } from "../../actions/UploadAction";
import { getTimelinePosts } from "../../actions/PostsAction";
import Avatar from "../Avatar/Avatar";

const PostShare = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.authReducer.authData);
  const loading = useSelector((state) => state.postReducer.uploading);
  const [image, setImage] = useState(null);
  const [video, setVideo] = useState(null);
  const [location, setLocation] = useState(null);
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [locationInput, setLocationInput] = useState("");
  const [scheduledAt, setScheduledAt] = useState(null);
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [scheduleDateTime, setScheduleDateTime] = useState("");
  const [postText, setPostText] = useState("");
  const [privacy, setPrivacy] = useState('public');
  const desc = useRef();
  const videoRef = useRef();

  // Update privacy when user data changes
  useEffect(() => {
    if (user?.privacy?.posts) {
      setPrivacy(user.privacy.posts);
    }
  }, [user?.privacy?.posts]);

  // handle Image Change
  const onImageChange = (event) => {
    if (event.target.files && event.target.files[0]) {
      let img = event.target.files[0];
      setImage(img);
      setVideo(null); // Remove video if image is selected
    }
  };

  // handle Video Change
  const onVideoChange = (event) => {
    if (event.target.files && event.target.files[0]) {
      let vid = event.target.files[0];
      // Check if file is a video
      if (vid.type.startsWith('video/')) {
        setVideo(vid);
        setImage(null); // Remove image if video is selected
      } else {
        alert("Please select a valid video file");
      }
    }
  };

  const imageRef = useRef();

  // Handle keyboard shortcuts
  const handleKeyDown = (e) => {
    // Shift+Enter: New line (default behavior)
    if (e.shiftKey && e.key === "Enter") {
      return; // Allow default behavior (new line)
    }
    // Enter: Submit post
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (postText.trim() || image || video) {
        handleUpload(e);
      }
    }
  };

  // handle post upload
  const handleUpload = async (e) => {
    if (e) {
      e.preventDefault();
    }

    // Don't submit if there's no content
    if (!postText.trim() && !image && !video) {
      return;
    }
    
    // Check if scheduled post is in the past
    if (scheduledAt && new Date(scheduledAt) < new Date()) {
      alert("Scheduled time must be in the future");
      return;
    }

    //post data
    const newPost = {
      userId: user._id,
      desc: postText.trim(),
      privacy: privacy,
    };

    // if there is an image with post
    if (image) {
      try {
        const data = new FormData();
        const fileName = Date.now() + image.name;
        data.append("name", fileName);
        data.append("file", image);
        
        // Wait for image upload to complete and get the sanitized filename
        const uploadResponse = await dispatch(uploadImage(data));
        // Get the sanitized filename from the upload response
        // Response structure: { payload: { data: { filename: "...", path: "..." } } }
        const sanitizedFileName = uploadResponse?.payload?.data?.filename || 
                                  uploadResponse?.payload?.data?.data?.filename ||
                                  uploadResponse?.data?.filename ||
                                  fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        
        newPost.image = sanitizedFileName;
      } catch (err) {
        console.error("Error uploading image:", err);
        alert("Failed to upload image. Please try again.");
        return; // Don't create post if image upload fails
      }
    }
    
    // if there is a video with post
    if (video) {
      try {
        const data = new FormData();
        const fileName = Date.now() + video.name;
        data.append("name", fileName);
        data.append("file", video);
        
        // Wait for video upload to complete and get the sanitized filename
        const uploadResponse = await dispatch(uploadImage(data)); // Using same upload endpoint
        const sanitizedFileName = uploadResponse?.payload?.data?.filename || 
                                  uploadResponse?.payload?.data?.data?.filename ||
                                  uploadResponse?.data?.filename ||
                                  fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        
        newPost.video = sanitizedFileName;
      } catch (err) {
        console.error("Error uploading video:", err);
        alert("Failed to upload video. Please try again.");
        return; // Don't create post if video upload fails
      }
    }
    
    // Add location if provided
    if (location) {
      newPost.location = location;
    }
    
    // Add scheduled time if provided
    if (scheduledAt) {
      newPost.scheduledAt = scheduledAt;
    }
    
    try {
      await dispatch(uploadPost(newPost));
      resetShare();
      // Refresh timeline to show the new post
      if (user?._id) {
        dispatch(getTimelinePosts(user._id));
      }
    } catch (err) {
      console.error("Error creating post:", err);
      alert("Failed to create post. Please try again.");
    }
  };

  // Handle location
  const handleLocationSubmit = () => {
    if (locationInput.trim()) {
      setLocation({
        name: locationInput.trim()
      });
      setShowLocationInput(false);
      setLocationInput("");
    }
  };

  // Handle schedule
  const handleScheduleSubmit = () => {
    if (scheduleDateTime) {
      setScheduledAt(scheduleDateTime);
      setShowSchedulePicker(false);
    }
  };

  // Reset Post Share
  const resetShare = () => {
    setImage(null);
    setVideo(null);
    setLocation(null);
    setScheduledAt(null);
    setPostText("");
    setShowLocationInput(false);
    setShowSchedulePicker(false);
    setLocationInput("");
    setScheduleDateTime("");
    if (desc.current) {
      desc.current.value = "";
    }
  };
  return (
    <div className="PostShare">
      <Avatar
        user={user}
        profilePicture={user?.profilePicture}
        firstname={user?.firstname}
        lastname={user?.lastname}
        username={user?.username}
        size="50px"
      />
      <div>
        <div className="post-input-wrapper">
          <textarea
            placeholder="What's happening? Use #hashtags to tag your post! (Shift+Enter for new line, Enter to submit)"
            value={postText}
            onChange={(e) => setPostText(e.target.value)}
            onKeyDown={handleKeyDown}
            ref={desc}
            rows={3}
            className="post-textarea"
          />
        </div>
            <div className="postOptions">
              <div
                className="option"
                style={{ color: "var(--photo)" }}
                onClick={() => imageRef.current.click()}
              >
                <UilScenery />
                Photo
              </div>

              <div 
                className="option" 
                style={{ color: "var(--video)" }}
                onClick={() => videoRef.current.click()}
              >
                <UilPlayCircle />
                Video
              </div>
              <div 
                className="option hide-in-mobile" 
                style={{ color: "var(--location)" }}
                onClick={() => setShowLocationInput(true)}
              >
                <UilLocationPoint />
                Location
              </div>
              <div 
                className="option hide-in-mobile" 
                style={{ color: "var(--shedule)" }}
                onClick={() => setShowSchedulePicker(true)}
              >
                <UilSchedule />
                Schedule
              </div>
              
              {/* Privacy Selector */}
              <select
                className="privacy-selector"
                value={privacy}
                onChange={(e) => setPrivacy(e.target.value)}
                title="Post Privacy"
              >
                <option value="public">🌐 Public</option>
                <option value="friends">👥 Friends</option>
                <option value="private">🔒 Private</option>
              </select>
              
              <button
                className="button ps-button"
                onClick={handleUpload}
                disabled={loading}
               style={{background:"#0096FF"}}
              >
                {loading ? "uploading" : "Share"}
              </button>

              <div style={{ display: "none" }}>
                <input type="file" ref={imageRef} onChange={onImageChange} accept="image/*" />
                <input type="file" ref={videoRef} onChange={onVideoChange} accept="video/*" />
              </div>
            </div>

        {/* Location Input Modal */}
        {showLocationInput && (
          <div className="modal-overlay" onClick={() => setShowLocationInput(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Add Location</h3>
                <UilTimes onClick={() => setShowLocationInput(false)} />
              </div>
              <div className="modal-body">
                <input
                  type="text"
                  placeholder="Enter location name"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleLocationSubmit();
                    }
                  }}
                  className="location-input"
                  autoFocus
                />
                <div className="modal-actions">
                  <button onClick={() => setShowLocationInput(false)} className="cancel-btn">
                    Cancel
                  </button>
                  <button onClick={handleLocationSubmit} className="submit-btn">
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Schedule Picker Modal */}
        {showSchedulePicker && (
          <div className="modal-overlay" onClick={() => setShowSchedulePicker(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Schedule Post</h3>
                <UilTimes onClick={() => setShowSchedulePicker(false)} />
              </div>
              <div className="modal-body">
                <input
                  type="datetime-local"
                  value={scheduleDateTime}
                  onChange={(e) => setScheduleDateTime(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="schedule-input"
                />
                {scheduledAt && (
                  <p className="schedule-info">
                    Post will be published on: {new Date(scheduledAt).toLocaleString()}
                  </p>
                )}
                <div className="modal-actions">
                  <button onClick={() => {
                    setShowSchedulePicker(false);
                    setScheduledAt(null);
                    setScheduleDateTime("");
                  }} className="cancel-btn">
                    Cancel
                  </button>
                  <button onClick={handleScheduleSubmit} className="submit-btn">
                    Schedule
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Preview Image */}
        {image && (
          <div className="previewImage">
            <UilTimes onClick={() => setImage(null)} />
            <img src={URL.createObjectURL(image)} alt="preview" />
          </div>
        )}

        {/* Preview Video */}
        {video && (
          <div className="previewVideo">
            <UilTimes onClick={() => setVideo(null)} />
            <video src={URL.createObjectURL(video)} controls style={{ width: "100%", maxHeight: "20rem", borderRadius: "0.5rem" }} />
          </div>
        )}

        {/* Show Location Tag */}
        {location && (
          <div className="location-tag">
            <UilLocationPoint size="16" />
            <span>{location.name}</span>
            <UilTimes size="16" onClick={() => setLocation(null)} />
          </div>
        )}

        {/* Show Schedule Tag */}
        {scheduledAt && (
          <div className="schedule-tag">
            <UilSchedule size="16" />
            <span>Scheduled: {new Date(scheduledAt).toLocaleString()}</span>
            <UilTimes size="16" onClick={() => {
              setScheduledAt(null);
              setScheduleDateTime("");
            }} />
          </div>
        )}
      </div>
    </div>
  );
};

export default PostShare;

