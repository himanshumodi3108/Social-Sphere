import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import SettingsLayout from "../../components/SettingsLayout/SettingsLayout";
import "./NotificationSettings.css";
import { UilArrowLeft } from "@iconscout/react-unicons";
import { useNavigate } from "react-router-dom";

const NotificationSettings = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.authReducer.authData);
  const [preferences, setPreferences] = useState({
    likes: true,
    comments: true,
    follows: true,
    mentions: true,
    posts: true,
    groupInvites: true,
    groupPosts: true,
    emailNotifications: false,
    pushNotifications: true,
    quietHours: false,
    quietStart: "22:00",
    quietEnd: "08:00",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load saved preferences if available
    if (user?.notificationPreferences) {
      setPreferences({ ...preferences, ...user.notificationPreferences });
    }
  }, [user]);

  const handleToggle = (key) => {
    setPreferences({ ...preferences, [key]: !preferences[key] });
  };

  const handleTimeChange = (key, value) => {
    setPreferences({ ...preferences, [key]: value });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      // TODO: Implement API call to save notification preferences
      // await updateNotificationPreferences(preferences);
      console.log("Saving preferences:", preferences);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("Error saving notification preferences:", error);
      alert("Failed to save notification preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsLayout>
      <div className="NotificationSettings">
        <button className="back-button" onClick={() => navigate(-1)}>
          <UilArrowLeft size="20" />
          Back
        </button>

        <div className="notification-settings-container">
          <h1>Notification Preferences</h1>
          <p className="settings-description">
            Control how and when you receive notifications
          </p>

          {/* In-App Notifications */}
          <div className="settings-section">
            <h2>In-App Notifications</h2>
            <p className="section-description">
              Choose which activities trigger notifications
            </p>
            <div className="preference-list">
              <div className="preference-item">
                <div className="preference-info">
                  <span className="preference-title">Likes</span>
                  <span className="preference-desc">When someone likes your post</span>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={preferences.likes}
                    onChange={() => handleToggle('likes')}
                  />
                  <span className="slider"></span>
                </label>
              </div>

              <div className="preference-item">
                <div className="preference-info">
                  <span className="preference-title">Comments</span>
                  <span className="preference-desc">When someone comments on your post</span>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={preferences.comments}
                    onChange={() => handleToggle('comments')}
                  />
                  <span className="slider"></span>
                </label>
              </div>

              <div className="preference-item">
                <div className="preference-info">
                  <span className="preference-title">Follows</span>
                  <span className="preference-desc">When someone follows you</span>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={preferences.follows}
                    onChange={() => handleToggle('follows')}
                  />
                  <span className="slider"></span>
                </label>
              </div>

              <div className="preference-item">
                <div className="preference-info">
                  <span className="preference-title">Mentions</span>
                  <span className="preference-desc">When someone mentions you</span>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={preferences.mentions}
                    onChange={() => handleToggle('mentions')}
                  />
                  <span className="slider"></span>
                </label>
              </div>

              <div className="preference-item">
                <div className="preference-info">
                  <span className="preference-title">New Posts</span>
                  <span className="preference-desc">When someone you follow posts</span>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={preferences.posts}
                    onChange={() => handleToggle('posts')}
                  />
                  <span className="slider"></span>
                </label>
              </div>

              <div className="preference-item">
                <div className="preference-info">
                  <span className="preference-title">Group Invites</span>
                  <span className="preference-desc">When you're invited to a group</span>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={preferences.groupInvites}
                    onChange={() => handleToggle('groupInvites')}
                  />
                  <span className="slider"></span>
                </label>
              </div>

              <div className="preference-item">
                <div className="preference-info">
                  <span className="preference-title">Group Posts</span>
                  <span className="preference-desc">When someone posts in your groups</span>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={preferences.groupPosts}
                    onChange={() => handleToggle('groupPosts')}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
          </div>

          {/* Delivery Methods */}
          <div className="settings-section">
            <h2>Delivery Methods</h2>
            <div className="preference-list">
              <div className="preference-item">
                <div className="preference-info">
                  <span className="preference-title">Push Notifications</span>
                  <span className="preference-desc">Receive notifications in your browser</span>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={preferences.pushNotifications}
                    onChange={() => handleToggle('pushNotifications')}
                  />
                  <span className="slider"></span>
                </label>
              </div>

              <div className="preference-item">
                <div className="preference-info">
                  <span className="preference-title">Email Notifications</span>
                  <span className="preference-desc">Receive notifications via email</span>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={preferences.emailNotifications}
                    onChange={() => handleToggle('emailNotifications')}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
          </div>

          {/* Quiet Hours */}
          <div className="settings-section">
            <h2>Quiet Hours</h2>
            <p className="section-description">
              Pause notifications during specific hours
            </p>
            <div className="preference-list">
              <div className="preference-item">
                <div className="preference-info">
                  <span className="preference-title">Enable Quiet Hours</span>
                  <span className="preference-desc">Turn off notifications during quiet hours</span>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={preferences.quietHours}
                    onChange={() => handleToggle('quietHours')}
                  />
                  <span className="slider"></span>
                </label>
              </div>

              {preferences.quietHours && (
                <div className="quiet-hours-time">
                  <div className="time-input-group">
                    <label>Start Time</label>
                    <input
                      type="time"
                      value={preferences.quietStart}
                      onChange={(e) => handleTimeChange('quietStart', e.target.value)}
                    />
                  </div>
                  <div className="time-input-group">
                    <label>End Time</label>
                    <input
                      type="time"
                      value={preferences.quietEnd}
                      onChange={(e) => handleTimeChange('quietEnd', e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="settings-actions">
            <button
              className="save-button"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : saved ? "✓ Saved!" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </SettingsLayout>
  );
};

export default NotificationSettings;

