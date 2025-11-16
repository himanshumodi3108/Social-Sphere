import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { getGroup, joinGroup, leaveGroup, deleteGroup, getGroupPosts } from "../../api/GroupRequests";
import Posts from "../../components/Posts/Posts";
import PostShare from "../../components/PostShare/PostShare";
import GroupEvents from "../../components/GroupEvents/GroupEvents";
import Avatar from "../../components/Avatar/Avatar";
import "./GroupDetail.css";
import { UilEdit, UilTrashAlt, UilArrowLeft } from "@iconscout/react-unicons";

const GroupDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.authReducer.authData);
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    if (id) {
      fetchGroup();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (id && group?.isMember) {
      fetchGroupPosts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, group?.isMember]);

  const fetchGroup = async () => {
    setLoading(true);
    try {
      const { data } = await getGroup(id);
      setGroup(data);
    } catch (error) {
      console.error("Error fetching group:", error);
      if (error.response?.status === 403) {
        alert("This is a private group. You need to be a member to view it.");
        navigate("/groups");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupPosts = async () => {
    try {
      const { data } = await getGroupPosts(id);
      const postsArray = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
      setPosts(postsArray);
    } catch (error) {
      console.error("Error fetching group posts:", error);
      setPosts([]);
    }
  };

  const handleJoin = async () => {
    try {
      await joinGroup(id);
      fetchGroup();
    } catch (error) {
      console.error("Error joining group:", error);
      alert("Failed to join group. Please try again.");
    }
  };

  const handleLeave = async () => {
    if (!window.confirm("Are you sure you want to leave this group?")) {
      return;
    }
    try {
      await leaveGroup(id);
      navigate("/groups");
    } catch (error) {
      console.error("Error leaving group:", error);
      alert("Failed to leave group. Please try again.");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this group? This action cannot be undone.")) {
      return;
    }
    try {
      await deleteGroup(id);
      navigate("/groups");
    } catch (error) {
      console.error("Error deleting group:", error);
      alert("Failed to delete group. Please try again.");
    }
  };

  if (loading) {
    return <div className="group-loading">Loading group...</div>;
  }

  if (!group) {
    return <div className="group-error">Group not found</div>;
  }

  const isAdmin = group.members?.some(m => String(m.userId) === String(user?._id) && m.role === 'admin');
  const isCreator = String(group.createdBy) === String(user?._id);
  const isMember = group.isMember || false;

  return (
    <div className="GroupDetail">
      <button className="back-button" onClick={() => navigate("/groups")}>
        <UilArrowLeft size="20" />
        Back to Groups
      </button>

      {/* Group Header */}
      <div className="group-header">
        {group.coverPicture && (
          <img
            src={process.env.REACT_APP_PUBLIC_FOLDER + group.coverPicture}
            alt="Cover"
            className="group-cover"
          />
        )}
        <div className="group-info">
          <div className="group-profile-section">
            <Avatar
              profilePicture={group.profilePicture}
              firstname={group.name}
              size="100px"
            />
            <div className="group-details">
              <h1>{group.name}</h1>
              {group.description && <p className="group-description">{group.description}</p>}
              <div className="group-meta">
                <span>{group.memberCount || 0} members</span>
                <span>•</span>
                <span>{group.privacy}</span>
                {group.createdBy && (
                  <>
                    <span>•</span>
                    <span>Created by {group.creator?.name || "Unknown"}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="group-actions">
            {isCreator ? (
              <>
                <button
                  className="edit-group-btn"
                  onClick={() => {
                    // TODO: Implement edit group modal
                    alert("Edit group functionality coming soon!");
                  }}
                >
                  <UilEdit size="18" />
                  Edit Group
                </button>
                <button
                  className="delete-group-btn"
                  onClick={handleDelete}
                >
                  <UilTrashAlt size="18" />
                  Delete Group
                </button>
              </>
            ) : isMember ? (
              <button
                className="leave-group-btn"
                onClick={handleLeave}
              >
                Leave Group
              </button>
            ) : (
              <button
                className="join-group-btn"
                onClick={handleJoin}
              >
                Join Group
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Group Rules */}
      {group.rules && group.rules.length > 0 && (
        <div className="group-rules">
          <h3>Group Rules</h3>
          <ul>
            {group.rules.map((rule, index) => (
              <li key={index}>{rule}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Group Members */}
      {group.members && group.members.length > 0 && (
        <div className="group-members">
          <h3>Members ({group.memberCount || 0})</h3>
          <div className="members-list">
            {group.members.slice(0, 10).map((member) => (
              <div key={member.userId} className="member-item">
                <Avatar
                  profilePicture={member.profilePicture}
                  firstname={member.name?.split(' ')[0]}
                  lastname={member.name?.split(' ').slice(1).join(' ')}
                  username={member.username}
                  size="40px"
                />
                <div className="member-info">
                  <span className="member-name">{member.name || member.username}</span>
                  <span className="member-role">{member.role}</span>
                </div>
              </div>
            ))}
            {group.memberCount > 10 && (
              <div className="more-members">
                +{group.memberCount - 10} more
              </div>
            )}
          </div>
        </div>
      )}

      {/* Group Events */}
      {isMember && (
        <GroupEvents 
          groupId={id} 
          isMember={isMember} 
          isAdmin={isAdmin || isCreator}
        />
      )}

      {/* Group Posts */}
      {isMember && (
        <div className="group-posts">
          <h3>Group Posts</h3>
          <PostShare />
          <Posts posts={posts} />
        </div>
      )}

      {!isMember && (
        <div className="join-prompt">
          <p>Join this group to see and create posts!</p>
          <button className="join-group-btn" onClick={handleJoin}>
            Join Group
          </button>
        </div>
      )}
    </div>
  );
};

export default GroupDetail;

