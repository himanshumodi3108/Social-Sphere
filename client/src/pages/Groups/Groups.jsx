import React, { useState, useEffect } from "react";
import "./Groups.css";
import { getGroups, createGroup, joinGroup, leaveGroup } from "../../api/GroupRequests";
import { useSelector } from "react-redux";
import Avatar from "../../components/Avatar/Avatar";

const Groups = () => {
  const { user } = useSelector((state) => state.authReducer.authData);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const { data } = await getGroups(1, 20, searchTerm);
      setGroups(data.data || []);
    } catch (error) {
      console.error("Error fetching groups:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (groupData) => {
    try {
      await createGroup(groupData);
      setShowCreateModal(false);
      fetchGroups();
    } catch (error) {
      console.error("Error creating group:", error);
      alert("Failed to create group");
    }
  };

  const handleJoinGroup = async (groupId) => {
    try {
      await joinGroup(groupId);
      fetchGroups();
    } catch (error) {
      console.error("Error joining group:", error);
      alert("Failed to join group");
    }
  };

  const handleLeaveGroup = async (groupId) => {
    try {
      await leaveGroup(groupId);
      fetchGroups();
    } catch (error) {
      console.error("Error leaving group:", error);
      alert("Failed to leave group");
    }
  };

  return (
    <div className="Groups">
      <div className="Groups-header">
        <h2>Groups</h2>
        <button 
          className="create-group-btn"
          onClick={() => setShowCreateModal(true)}
        >
          Create Group
        </button>
      </div>

      <div className="Groups-search">
        <input
          type="text"
          placeholder="Search groups..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && fetchGroups()}
        />
        <button onClick={fetchGroups}>Search</button>
      </div>

      {loading ? (
        <div className="loading">Loading groups...</div>
      ) : (
        <div className="Groups-list">
          {groups.map((group) => (
            <div key={group._id} className="Group-card">
              {group.coverPicture && (
                <img 
                  src={process.env.REACT_APP_PUBLIC_FOLDER + group.coverPicture} 
                  alt="Cover" 
                  className="group-cover"
                />
              )}
              <div className="group-content">
                <Avatar
                  profilePicture={group.profilePicture}
                  firstname={group.name}
                  size="60px"
                />
                <h3>{group.name}</h3>
                {group.description && <p>{group.description}</p>}
                <div className="group-stats">
                  <span>{group.memberCount || 0} members</span>
                  <span>{group.privacy}</span>
                </div>
                {group.isMember ? (
                  <button 
                    className="leave-btn"
                    onClick={() => handleLeaveGroup(group._id)}
                  >
                    Leave Group
                  </button>
                ) : (
                  <button 
                    className="join-btn"
                    onClick={() => handleJoinGroup(group._id)}
                  >
                    Join Group
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateGroupModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateGroup}
        />
      )}
    </div>
  );
};

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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Create New Group</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Group Name *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <textarea
            placeholder="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
          />
          <select
            value={formData.privacy}
            onChange={(e) => setFormData({ ...formData, privacy: e.target.value })}
          >
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
          <div className="modal-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit">Create</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Groups;

