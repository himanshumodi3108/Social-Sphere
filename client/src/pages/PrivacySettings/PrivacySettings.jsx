import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { updateUser } from "../../actions/UserAction";
import { useParams } from "react-router-dom";
import SettingsLayout from "../../components/SettingsLayout/SettingsLayout";
import "./PrivacySettings.css";
import { UilArrowLeft } from "@iconscout/react-unicons";
import { useNavigate } from "react-router-dom";

const PrivacySettings = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const params = useParams();
  const { user } = useSelector((state) => state.authReducer.authData);
  const [privacy, setPrivacy] = useState({
    profile: 'public',
    posts: 'public',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user?.privacy) {
      setPrivacy({
        profile: user.privacy.profile || 'public',
        posts: user.privacy.posts || 'public',
      });
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await dispatch(updateUser(params.id, { privacy }));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("Error updating privacy settings:", error);
      alert("Failed to update privacy settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsLayout>
      <div className="PrivacySettings">
        <button className="back-button" onClick={() => navigate(-1)}>
          <UilArrowLeft size="20" />
          Back
        </button>

        <div className="privacy-settings-container">
        <h1>Privacy Settings</h1>
        <p className="privacy-description">
          Control who can see your profile and posts
        </p>

        <div className="privacy-section">
          <h2>Profile Privacy</h2>
          <p className="section-description">
            Control who can view your profile information
          </p>
          <div className="privacy-options">
            <label className="privacy-option">
              <input
                type="radio"
                name="profile"
                value="public"
                checked={privacy.profile === 'public'}
                onChange={(e) => setPrivacy({ ...privacy, profile: e.target.value })}
              />
              <div className="option-content">
                <span className="option-title">🌐 Public</span>
                <span className="option-description">
                  Anyone can view your profile
                </span>
              </div>
            </label>

            <label className="privacy-option">
              <input
                type="radio"
                name="profile"
                value="friends"
                checked={privacy.profile === 'friends'}
                onChange={(e) => setPrivacy({ ...privacy, profile: e.target.value })}
              />
              <div className="option-content">
                <span className="option-title">👥 Friends</span>
                <span className="option-description">
                  Only people who follow you can view your profile
                </span>
              </div>
            </label>

            <label className="privacy-option">
              <input
                type="radio"
                name="profile"
                value="private"
                checked={privacy.profile === 'private'}
                onChange={(e) => setPrivacy({ ...privacy, profile: e.target.value })}
              />
              <div className="option-content">
                <span className="option-title">🔒 Private</span>
                <span className="option-description">
                  Only you can view your profile
                </span>
              </div>
            </label>
          </div>
        </div>

        <div className="privacy-section">
          <h2>Post Privacy</h2>
          <p className="section-description">
            Set the default privacy for your new posts
          </p>
          <div className="privacy-options">
            <label className="privacy-option">
              <input
                type="radio"
                name="posts"
                value="public"
                checked={privacy.posts === 'public'}
                onChange={(e) => setPrivacy({ ...privacy, posts: e.target.value })}
              />
              <div className="option-content">
                <span className="option-title">🌐 Public</span>
                <span className="option-description">
                  Anyone can see your posts
                </span>
              </div>
            </label>

            <label className="privacy-option">
              <input
                type="radio"
                name="posts"
                value="friends"
                checked={privacy.posts === 'friends'}
                onChange={(e) => setPrivacy({ ...privacy, posts: e.target.value })}
              />
              <div className="option-content">
                <span className="option-title">👥 Friends</span>
                <span className="option-description">
                  Only people who follow you can see your posts
                </span>
              </div>
            </label>

            <label className="privacy-option">
              <input
                type="radio"
                name="posts"
                value="private"
                checked={privacy.posts === 'private'}
                onChange={(e) => setPrivacy({ ...privacy, posts: e.target.value })}
              />
              <div className="option-content">
                <span className="option-title">🔒 Private</span>
                <span className="option-description">
                  Only you can see your posts
                </span>
              </div>
            </label>
          </div>
        </div>

        <div className="privacy-actions">
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

export default PrivacySettings;

