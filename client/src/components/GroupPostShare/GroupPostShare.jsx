import React, { useState, useRef } from "react";
import "./GroupPostShare.css";
import { UilScenery, UilPlayCircle, UilLocationPoint, UilSchedule, UilTimes } from "@iconscout/react-unicons";
import { useDispatch, useSelector } from "react-redux";
import { uploadImage } from "../../actions/UploadAction";
import { createGroupPost } from "../../api/GroupRequests";
import Avatar from "../Avatar/Avatar";

const GroupPostShare = ({ groupId, onPostCreated }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.authReducer.authData);
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(null);
  const [video, setVideo] = useState(null);
  const [location, setLocation] = useState(null);
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [locationInput, setLocationInput] = useState("");
  const [scheduledAt, setScheduledAt] = useState(null);
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [scheduleDateTime, setScheduleDateTime] = useState("");
  const [postText, setPostText] = useState("");
  const desc = useRef();
  const imageRef = useRef();
  const videoRef = useRef();

  const onImageChange = (event) => {
    if (event.target.files && event.target.files[0]) {
      let img = event.target.files[0];
      setImage(img);
      setVideo(null);
    }
  };

  const onVideoChange = (event) => {
    if (event.target.files && event.target.files[0]) {
      let vid = event.target.files[0];
      if (vid.type.startsWith('video/')) {
        setVideo(vid);
        setImage(null);
      } else {
        alert("Please select a valid video file");
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.shiftKey && e.key === "Enter") {
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (postText.trim() || image || video) {
        handleUpload(e);
      }
    }
  };

  const handleUpload = async (e) => {
    if (e) {
      e.preventDefault();
    }

    if (!postText.trim() && !image && !video) {
      return;
    }

    if (scheduledAt && new Date(scheduledAt) < new Date()) {
      alert("Scheduled time must be in the future");
      return;
    }

    setLoading(true);

    const newPost = {
      desc: postText.trim(),
    };

    if (image) {
      try {
        const data = new FormData();
        const fileName = Date.now() + image.name;
        data.append("name", fileName);
        data.append("file", image);
        const uploadResponse = await dispatch(uploadImage(data));
        const sanitizedFileName = uploadResponse?.payload?.data?.filename || 
                                  uploadResponse?.payload?.data?.data?.filename ||
                                  uploadResponse?.data?.filename ||
                                  fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        newPost.image = sanitizedFileName;
      } catch (err) {
        // console.error("Error uploading image:", err);
        alert("Failed to upload image. Please try again.");
        setLoading(false);
        return;
      }
    }

    if (video) {
      try {
        const data = new FormData();
        const fileName = Date.now() + video.name;
        data.append("name", fileName);
        data.append("file", video);
        const uploadResponse = await dispatch(uploadImage(data));
        const sanitizedFileName = uploadResponse?.payload?.data?.filename || 
                                  uploadResponse?.payload?.data?.data?.filename ||
                                  uploadResponse?.data?.filename ||
                                  fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        newPost.video = sanitizedFileName;
      } catch (err) {
        // console.error("Error uploading video:", err);
        alert("Failed to upload video. Please try again.");
        setLoading(false);
        return;
      }
    }

    if (location) {
      newPost.location = location;
    }

    if (scheduledAt) {
      newPost.scheduledAt = scheduledAt;
    }

    try {
      await createGroupPost(groupId, newPost);
      resetShare();
      if (onPostCreated) {
        onPostCreated();
      }
    } catch (err) {
      // console.error("Error creating group post:", err);
      alert(err.response?.data?.message || "Failed to create post. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSubmit = () => {
    if (locationInput.trim()) {
      setLocation({
        name: locationInput.trim()
      });
      setShowLocationInput(false);
      setLocationInput("");
    }
  };

  const handleScheduleSubmit = () => {
    if (scheduleDateTime) {
      setScheduledAt(scheduleDateTime);
      setShowSchedulePicker(false);
    }
  };

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
    <div className="GroupPostShare">
      <Avatar user={user} profilePicture={user?.profilePicture} firstname={user?.firstname} lastname={user?.lastname} username={user?.username} size="50px" />
      <div>
        <div className="post-input-wrapper">
          <textarea
            placeholder="What's happening in this group? Use #hashtags to tag your post! (Shift+Enter for new line, Enter to submit)"
            value={postText}
            onChange={(e) => setPostText(e.target.value)}
            onKeyDown={handleKeyDown}
            ref={desc}
            rows={3}
            className="post-textarea"
          />
        </div>
        <div className="postOptions">
          <div className="option" style={{ color: "var(--photo)" }} onClick={() => imageRef.current.click()}>
            <UilScenery /> Photo
          </div>
          <div className="option" style={{ color: "var(--video)" }} onClick={() => videoRef.current.click()}>
            <UilPlayCircle /> Video
          </div>
          <div className="option hide-in-mobile" style={{ color: "var(--location)" }} onClick={() => setShowLocationInput(true)}>
            <UilLocationPoint /> Location
          </div>
          <div className="option hide-in-mobile" style={{ color: "var(--shedule)" }} onClick={() => setShowSchedulePicker(true)}>
            <UilSchedule /> Schedule
          </div>
          
          <button className="button ps-button" onClick={handleUpload} disabled={loading} style={{background:"#0096FF"}}>
            {loading ? "Posting..." : "Post"}
          </button>

          <div style={{ display: "none" }}>
            <input type="file" ref={imageRef} onChange={onImageChange} accept="image/*" />
            <input type="file" ref={videoRef} onChange={onVideoChange} accept="video/*" />
          </div>
        </div>

        {showLocationInput && (
          <div className="modal-overlay" onClick={() => setShowLocationInput(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Add Location</h3>
                <UilTimes onClick={() => setShowLocationInput(false)} />
              </div>
              <div className="modal-body">
                <input type="text" placeholder="Enter location name" value={locationInput} onChange={(e) => setLocationInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { handleLocationSubmit(); } }} className="location-input" autoFocus />
                <div className="modal-actions">
                  <button onClick={() => setShowLocationInput(false)} className="cancel-btn">Cancel</button>
                  <button onClick={handleLocationSubmit} className="submit-btn">Add</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showSchedulePicker && (
          <div className="modal-overlay" onClick={() => setShowSchedulePicker(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Schedule Post</h3>
                <UilTimes onClick={() => setShowSchedulePicker(false)} />
              </div>
              <div className="modal-body">
                <input type="datetime-local" value={scheduleDateTime} onChange={(e) => setScheduleDateTime(e.target.value)} min={new Date().toISOString().slice(0, 16)} className="schedule-input" />
                {scheduledAt && (<p className="schedule-info">Post will be published on: {new Date(scheduledAt).toLocaleString()}</p>)}
                <div className="modal-actions">
                  <button onClick={() => { setShowSchedulePicker(false); setScheduledAt(null); setScheduleDateTime(""); }} className="cancel-btn">Cancel</button>
                  <button onClick={handleScheduleSubmit} className="submit-btn">Schedule</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {image && (
          <div className="previewImage">
            <UilTimes onClick={() => setImage(null)} />
            <img src={URL.createObjectURL(image)} alt="preview" />
          </div>
        )}

        {video && (
          <div className="previewVideo">
            <UilTimes onClick={() => setVideo(null)} />
            <video src={URL.createObjectURL(video)} controls style={{ width: "100%", maxHeight: "20rem", borderRadius: "0.5rem" }} />
          </div>
        )}

        {location && (
          <div className="location-tag">
            <UilLocationPoint size="16" />
            <span>{location.name}</span>
            <UilTimes size="16" onClick={() => setLocation(null)} />
          </div>
        )}

        {scheduledAt && (
          <div className="schedule-tag">
            <UilSchedule size="16" />
            <span>Scheduled: {new Date(scheduledAt).toLocaleString()}</span>
            <UilTimes size="16" onClick={() => { setScheduledAt(null); setScheduleDateTime(""); }} />
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupPostShare;


