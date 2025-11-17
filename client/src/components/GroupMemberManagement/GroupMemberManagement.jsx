import React, { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { addMember, removeMember, makeMemberAdmin } from "../../api/GroupRequests";
import { searchUsers } from "../../api/UserRequests";
import Avatar from "../Avatar/Avatar";
import { UilUserPlus, UilUserMinus, UilAward, UilSearch, UilTimes } from "@iconscout/react-unicons";
import "./GroupMemberManagement.css";

const GroupMemberManagement = ({ group, onUpdate }) => {
  const { user } = useSelector((state) => state.authReducer.authData);
  const [showAddMember, setShowAddMember] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  const isAdmin = group?.members?.some(m => String(m.userId) === String(user?._id) && m.role === 'admin');
  const isCreator = String(group?.createdBy) === String(user?._id);
  const canManage = isAdmin || isCreator;

  const handleSearch = useCallback(async () => {
    if (!searchTerm.trim()) return;
    setLoading(true);
    try {
      const response = await searchUsers(searchTerm);
      // Handle paginated response structure
      const users = response?.data?.data || response?.data || [];
      // Filter out users who are already members
      const memberIds = group?.members?.map(m => String(m.userId || m._id)) || [];
      const filtered = users.filter(u => !memberIds.includes(String(u._id)));
      setSearchResults(filtered);
    } catch (error) {
      // console.error("Error searching users:", error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, group?.members]);

  useEffect(() => {
    if (searchTerm.trim().length > 2) {
      const timeoutId = setTimeout(() => {
        handleSearch();
      }, 500);
      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
    }
  }, [searchTerm, handleSearch]);

  const handleAddMember = async (userId) => {
    setActionLoading({ ...actionLoading, [`add-${userId}`]: true });
    try {
      await addMember(group._id, userId);
      setSearchTerm("");
      setSearchResults([]);
      setShowAddMember(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      // console.error("Error adding member:", error);
      alert(error.response?.data?.message || "Failed to add member");
    } finally {
      setActionLoading({ ...actionLoading, [`add-${userId}`]: false });
    }
  };

  const handleRemoveMember = async (memberUserId) => {
    if (!window.confirm("Are you sure you want to remove this member?")) {
      return;
    }
    setActionLoading({ ...actionLoading, [`remove-${memberUserId}`]: true });
    try {
      await removeMember(group._id, memberUserId);
      if (onUpdate) onUpdate();
    } catch (error) {
      // console.error("Error removing member:", error);
      alert(error.response?.data?.message || "Failed to remove member");
    } finally {
      setActionLoading({ ...actionLoading, [`remove-${memberUserId}`]: false });
    }
  };

  const handleMakeAdmin = async (memberUserId) => {
    if (!window.confirm("Are you sure you want to make this member an admin?")) {
      return;
    }
    setActionLoading({ ...actionLoading, [`admin-${memberUserId}`]: true });
    try {
      await makeMemberAdmin(group._id, memberUserId);
      if (onUpdate) onUpdate();
    } catch (error) {
      // console.error("Error promoting member:", error);
      alert(error.response?.data?.message || "Failed to promote member");
    } finally {
      setActionLoading({ ...actionLoading, [`admin-${memberUserId}`]: false });
    }
  };

  if (!canManage) {
    return null;
  }

  return (
    <div className="group-member-management">
      <div className="member-management-header">
        <h3>Manage Members</h3>
        <button
          className="add-member-btn"
          onClick={() => setShowAddMember(!showAddMember)}
        >
          <UilUserPlus size="18" />
          Add Member
        </button>
      </div>

      {showAddMember && (
        <div className="add-member-section">
          <div className="search-input-wrapper">
            <UilSearch size="18" />
            <input
              type="text"
              placeholder="Search users by name or username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="member-search-input"
            />
            <UilTimes
              size="18"
              onClick={() => {
                setShowAddMember(false);
                setSearchTerm("");
                setSearchResults([]);
              }}
              className="close-search"
            />
          </div>

          {loading && <div className="loading-text">Searching...</div>}

          {searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map((userResult) => (
                <div key={userResult._id} className="search-result-item">
                  <Avatar
                    profilePicture={userResult.profilePicture}
                    firstname={userResult.firstname}
                    lastname={userResult.lastname}
                    username={userResult.username}
                    size="40px"
                  />
                  <div className="user-info">
                    <span className="user-name">
                      {userResult.firstname} {userResult.lastname}
                    </span>
                    <span className="user-username">@{userResult.username}</span>
                  </div>
                  <button
                    className="add-btn"
                    onClick={() => handleAddMember(userResult._id)}
                    disabled={actionLoading[`add-${userResult._id}`]}
                  >
                    {actionLoading[`add-${userResult._id}`] ? "Adding..." : "Add"}
                  </button>
                </div>
              ))}
            </div>
          )}

          {searchTerm.trim().length > 2 && !loading && searchResults.length === 0 && (
            <div className="no-results">No users found</div>
          )}
        </div>
      )}

      <div className="members-list-management">
        {group?.members?.map((member, index) => {
          const isCurrentUser = String(member.userId) === String(user?._id);
          const isMemberAdmin = member.role === 'admin';
          const isMemberCreator = String(group.createdBy) === String(member.userId);
          const canRemove = canManage && !isMemberCreator && !isCurrentUser;
          const canPromote = canManage && !isMemberAdmin && !isMemberCreator && !isCurrentUser;
          
          // Create unique key - use _id if available, otherwise userId, otherwise index
          const memberKey = member._id || member.userId || `member-${index}`;

          return (
            <div key={memberKey} className="member-management-item">
              <Avatar
                profilePicture={member.profilePicture}
                firstname={member.name?.split(' ')[0]}
                lastname={member.name?.split(' ').slice(1).join(' ')}
                username={member.username}
                size="45px"
              />
              <div className="member-info">
                <div className="member-name-row">
                  <span className="member-name">{member.name || member.username}</span>
                  {isMemberCreator && (
                    <span className="role-badge creator">Creator</span>
                  )}
                  {isMemberAdmin && !isMemberCreator && (
                    <span className="role-badge admin">Admin</span>
                  )}
                  {!isMemberAdmin && !isMemberCreator && (
                    <span className="role-badge member">Member</span>
                  )}
                </div>
                {member.username && (
                  <span className="member-username">@{member.username}</span>
                )}
              </div>
              <div className="member-actions">
                {canPromote && (
                  <button
                    className="action-btn promote-btn"
                    onClick={() => handleMakeAdmin(member.userId)}
                    disabled={actionLoading[`admin-${member.userId}`]}
                    title="Make Admin"
                  >
                    <UilAward size="18" />
                    {actionLoading[`admin-${member.userId}`] ? "..." : "Make Admin"}
                  </button>
                )}
                {canRemove && (
                  <button
                    className="action-btn remove-btn"
                    onClick={() => handleRemoveMember(member.userId)}
                    disabled={actionLoading[`remove-${member.userId}`]}
                    title="Remove Member"
                  >
                    <UilUserMinus size="18" />
                    {actionLoading[`remove-${member.userId}`] ? "..." : "Remove"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GroupMemberManagement;

