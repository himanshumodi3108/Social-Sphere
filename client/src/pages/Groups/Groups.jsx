import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./Groups.css";
import { getGroups, createGroup, joinGroup, leaveGroup } from "../../api/GroupRequests";
import { useSelector } from "react-redux";
import Avatar from "../../components/Avatar/Avatar";
import SEO from "../../components/SEO/SEO";
import { UilSearch, UilTimes, UilUsersAlt, UilLock, UilUnlock } from "@iconscout/react-unicons";

const Groups = () => {
  const navigate = useNavigate();
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
      // console.error("Error fetching groups:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (groupData) => {
    try {
      const response = await createGroup(groupData);
      const group = response?.data || response;
      setShowCreateModal(false);
      
      // Navigate to the newly created group
      const groupId = group?._id || group?.id;
      if (groupId) {
        // Convert to string in case it's an ObjectId
        navigate(`/groups/${String(groupId)}`);
      } else {
        // console.warn("Group created but no ID returned:", group);
        fetchGroups();
      }
    } catch (error) {
      // console.error("Error creating group:", error);
      alert(error.response?.data?.message || "Failed to create group");
    }
  };

  const handleJoinGroup = async (e, groupId) => {
    e.stopPropagation(); // Prevent navigation when clicking join button
    try {
      await joinGroup(groupId);
      fetchGroups();
    } catch (error) {
      // console.error("Error joining group:", error);
      alert(error.response?.data?.message || "Failed to join group");
    }
  };

  const handleLeaveGroup = async (e, groupId) => {
    e.stopPropagation(); // Prevent navigation when clicking leave button
    if (!window.confirm("Are you sure you want to exit from this group?")) {
      return;
    }
    try {
      const response = await leaveGroup(groupId);
      if (response?.data?.requiresAdminPromotion) {
        alert("You are the only admin. Please promote another member to admin before exiting. You can do this in the group details page.");
      } else if (response?.data?.mustDelete) {
        if (window.confirm("As the creator, you cannot exit while there are other members. Would you like to delete the group instead?")) {
          // Navigate to group detail page where they can delete
          navigate(`/groups/${groupId}`);
        }
      } else {
        fetchGroups();
      }
    } catch (error) {
      // console.error("Error leaving group:", error);
      const errorData = error.response?.data;
      if (errorData?.requiresAdminPromotion) {
        alert("You are the only admin. Please promote another member to admin before exiting. You can do this in the group details page.");
      } else if (errorData?.mustDelete) {
        if (window.confirm("As the creator, you cannot exit while there are other members. Would you like to delete the group instead?")) {
          navigate(`/groups/${groupId}`);
        }
      } else {
        alert(errorData?.message || error.message || "Failed to exit from group");
      }
    }
  };

  const handleGroupClick = (groupId) => {
    navigate(`/groups/${groupId}`);
  };

  return (
    <div className="Groups">
      <SEO 
        title="Groups - SocialSphere"
        description="Discover and join groups on SocialSphere. Connect with communities, share interests, and build meaningful relationships."
        keywords="groups, communities, social groups, join groups, create groups, socialsphere"
      />
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
        <div className="search-input-wrapper">
          <UilSearch size="20" />
          <input
            type="text"
            placeholder="Search groups by name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && fetchGroups()}
          />
          {searchTerm && (
            <UilTimes 
              size="18" 
              onClick={() => {
                setSearchTerm("");
                fetchGroups();
              }}
              className="clear-search"
            />
          )}
        </div>
        <button onClick={fetchGroups} className="search-btn">Search</button>
      </div>

      {loading ? (
        <div className="loading">Loading groups...</div>
      ) : (
        <div className="Groups-list">
          {groups.length === 0 ? (
            <div className="no-groups">
              <p>No groups found. Create one to get started!</p>
            </div>
          ) : (
            groups.map((group) => (
              <div 
                key={group._id} 
                className="Group-card"
                onClick={() => handleGroupClick(group._id)}
              >
                {group.coverPicture && (
                  <img 
                    src={process.env.REACT_APP_PUBLIC_FOLDER + group.coverPicture} 
                    alt="Cover" 
                    className="group-cover"
                  />
                )}
                <div className="group-content">
                  <div className="group-header-info">
                    <Avatar
                      profilePicture={group.profilePicture}
                      firstname={group.name}
                      size="60px"
                    />
                    <div className="group-title-section">
                      <h3>{group.name}</h3>
                      <div className="group-privacy-badge">
                        {group.privacy === 'private' ? (
                          <><UilLock size="14" /> Private</>
                        ) : (
                          <><UilUnlock size="14" /> Public</>
                        )}
                      </div>
                    </div>
                  </div>
                  {group.description && (
                    <p className="group-description">{group.description}</p>
                  )}
                  <div className="group-stats">
                    <span><UilUsersAlt size="16" /> {group.memberCount || 0} members</span>
                    {group.creator && (
                      <span className="group-creator">Created by {group.creator.name || group.creator.username}</span>
                    )}
                  </div>
                  <div className="group-actions" onClick={(e) => e.stopPropagation()}>
                    {(() => {
                      // Check if user is creator
                      const isCreator = user?._id && group.createdBy && (
                        String(group.createdBy) === String(user._id) || 
                        String(group.createdBy._id || group.createdBy) === String(user._id)
                      );
                      
                      // Check if user is member (use backend isMember flag or check members array)
                      const isMember = group.isMember || isCreator || (user?._id && group.members?.some(m => {
                        const memberId = m.userId || m._id;
                        return String(memberId) === String(user._id) || String(memberId?._id || memberId) === String(user._id);
                      }));

                      if (isMember) {
                        return (
                          <button 
                            className="leave-btn"
                            onClick={(e) => handleLeaveGroup(e, group._id)}
                          >
                            Exit from Group
                          </button>
                        );
                      } else {
                        return (
                          <button 
                            className="join-btn"
                            onClick={(e) => handleJoinGroup(e, group._id)}
                          >
                            Join Group
                          </button>
                        );
                      }
                    })()}
                    <button 
                      className="view-btn"
                      onClick={() => handleGroupClick(group._id)}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
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
  const [creating, setCreating] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("Group name is required");
      return;
    }
    setCreating(true);
    try {
      await onCreate(formData);
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setCreating(false);
      }
    } catch (error) {
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setCreating(false);
      }
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Group</h2>
          <UilTimes onClick={onClose} className="close-icon" />
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Group Name *</label>
            <input
              type="text"
              placeholder="Enter group name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              maxLength={100}
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              placeholder="What is this group about?"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              maxLength={500}
            />
            <span className="char-count">{formData.description.length}/500</span>
          </div>
          <div className="form-group">
            <label>Privacy</label>
            <select
              value={formData.privacy}
              onChange={(e) => setFormData({ ...formData, privacy: e.target.value })}
            >
              <option value="public">🌐 Public - Anyone can find and join</option>
              <option value="private">🔒 Private - Only invited members can join</option>
            </select>
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={creating}>Cancel</button>
            <button type="submit" disabled={creating || !formData.name.trim()}>
              {creating ? "Creating..." : "Create Group"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Groups;

