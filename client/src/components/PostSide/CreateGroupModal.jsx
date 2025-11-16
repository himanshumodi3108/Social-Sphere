import React, { useState } from "react";
import "./CreateGroupModal.css";

const CreateGroupModal = ({ onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    privacy: "public",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("Group name is required");
      return;
    }
    onCreate(formData);
  };

  return (
    <div className="create-group-container">
      <form onSubmit={handleSubmit} className="create-group-form">
        <div className="form-group">
          <label htmlFor="groupName">Group Name *</label>
          <input
            id="groupName"
            type="text"
            placeholder="Enter group name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            placeholder="Describe your group..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="privacy">Privacy</label>
          <select
            id="privacy"
            value={formData.privacy}
            onChange={(e) => setFormData({ ...formData, privacy: e.target.value })}
          >
            <option value="public">Public - Anyone can join</option>
            <option value="private">Private - Invite only</option>
          </select>
        </div>
        
        <div className="form-actions">
          <button type="button" className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="create-btn">
            Create Group
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateGroupModal;

