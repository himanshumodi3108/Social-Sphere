import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { getGroup, joinGroup, leaveGroup, deleteGroup, getGroupPosts } from "../../api/GroupRequests";
import Posts from "../../components/Posts/Posts";
import GroupPostShare from "../../components/GroupPostShare/GroupPostShare";
import GroupMemberManagement from "../../components/GroupMemberManagement/GroupMemberManagement";
import GroupEvents from "../../components/GroupEvents/GroupEvents";
import GroupChatBox from "../../components/GroupChatBox/GroupChatBox";
import Avatar from "../../components/Avatar/Avatar";
import SEO from "../../components/SEO/SEO";
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
      // console.error("Error fetching group:", error);
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
      // console.error("Error fetching group posts:", error);
      setPosts([]);
    }
  };

  const handleJoin = async () => {
    try {
      await joinGroup(id);
      fetchGroup();
    } catch (error) {
      // console.error("Error joining group:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to join group. Please try again.";
      alert(errorMessage);
    }
  };

  const handleLeave = async () => {
    if (!window.confirm("Are you sure you want to exit from this group?")) {
      return;
    }
    try {
      const response = await leaveGroup(id);
      if (response?.data?.canDelete) {
        // Creator left as only member, show option to delete
        if (window.confirm("You have exited the group. Would you like to delete the group now?")) {
          handleDelete();
        } else {
          navigate("/groups");
        }
      } else {
        // Successfully left, navigate to groups page
        navigate("/groups");
      }
    } catch (error) {
      // console.error("Error leaving group:", error);
      const errorData = error.response?.data;
      
      if (errorData?.requiresAdminPromotion) {
        alert("You are the only admin. Please promote another member to admin before exiting. You can do this in the Member Management section.");
        // Refresh group data to show updated member list
        fetchGroup();
      } else if (errorData?.mustDelete) {
        if (window.confirm("As the creator, you cannot exit while there are other members. Would you like to delete the group instead?")) {
          handleDelete();
        }
      } else {
        const errorMessage = errorData?.message || error.message || "Failed to exit from group. Please try again.";
        alert(errorMessage);
      }
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
      // console.error("Error deleting group:", error);
      alert("Failed to delete group. Please try again.");
    }
  };

  if (loading) {
    return <div className="group-loading">Loading group...</div>;
  }

  if (!group) {
    return <div className="group-error">Group not found</div>;
  }

  // Check if user is creator (must check first before member check)
  const isCreator = group.createdBy && user?._id && (
    String(group.createdBy) === String(user._id) || 
    String(group.createdBy._id || group.createdBy) === String(user._id)
  );
  
  // Check if user is admin
  // Note: Backend transforms members array - members have _id (from populated user) not userId
  const isAdmin = group.members?.some(m => {
    const memberId = m._id || m.userId;
    const memberIdStr = String(memberId?._id || memberId);
    const userIdStr = String(user?._id);
    return memberIdStr === userIdStr && m.role === 'admin';
  });
  
  // Check if user is a member
  // Backend sets group.isMember, but also check members array as fallback
  // Note: Backend transforms members array - members have _id (from populated user) not userId
  const isMember = isCreator || group.isMember || group.members?.some(m => {
    const memberId = m._id || m.userId;
    const memberIdStr = String(memberId?._id || memberId);
    const userIdStr = String(user?._id);
    return memberIdStr === userIdStr;
  });

  // Count admins and total members
  // Note: members array from backend has role field preserved
  const adminCount = group.members?.filter(m => m.role === 'admin').length || 0;
  const totalMembers = group.memberCount || group.members?.length || 0;
  const isOnlyAdmin = isAdmin && adminCount === 1 && totalMembers > 1;
  const isCreatorOnlyMember = isCreator && totalMembers === 1;

  return (
    <div className="GroupDetail">
      <SEO 
        title={group ? `${group.name} - SocialSphere` : "Group - SocialSphere"}
        description={group?.description || "Join this group on SocialSphere to connect with members, share posts, and participate in group activities."}
        keywords={`${group?.name || "group"}, social group, community, ${group?.privacy || ""}, socialsphere`}
      />
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
            {!isMember ? (
              // Not a member - show Join button
              <button
                className="join-group-btn"
                onClick={handleJoin}
              >
                Join Group
              </button>
            ) : isCreator ? (
              // Creator - show Edit, Delete, and Exit (if only member)
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
                {isCreatorOnlyMember && (
                  <button
                    className="leave-group-btn"
                    onClick={handleLeave}
                  >
                    Exit from Group
                  </button>
                )}
                <button
                  className="delete-group-btn"
                  onClick={handleDelete}
                >
                  <UilTrashAlt size="18" />
                  Delete Group
                </button>
              </>
            ) : isAdmin ? (
              // Admin - show Delete and Exit buttons
              <>
                <button
                  className="delete-group-btn"
                  onClick={handleDelete}
                >
                  <UilTrashAlt size="18" />
                  Delete Group
                </button>
                <button
                  className="leave-group-btn"
                  onClick={handleLeave}
                  title={isOnlyAdmin ? "Promote another member to admin before exiting" : ""}
                >
                  Exit from Group
                </button>
              </>
            ) : (
              // Regular member - show Exit button
              <button
                className="leave-group-btn"
                onClick={handleLeave}
              >
                Exit from Group
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

      {/* Group Member Management (for admins) */}
      {isMember && (isAdmin || isCreator) && (
        <GroupMemberManagement group={group} onUpdate={fetchGroup} />
      )}

      {/* Group Members (read-only view) */}
      {group.members && group.members.length > 0 && (
        <div className="group-members">
          <h3>Members ({group.memberCount || 0})</h3>
          <div className="members-list">
            {group.members.slice(0, 10).map((member, index) => {
              // Use _id if available (from populated user), otherwise use userId or index
              const memberKey = member._id || member.userId || index;
              return (
                <div key={memberKey} className="member-item">
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
              );
            })}
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

      {/* Group Chat */}
      {isMember && (
        <div className="group-chat-section">
          <h3>Group Chat</h3>
          <GroupChatBox 
            groupId={id} 
            currentUser={user?._id} 
            groupName={group.name}
          />
        </div>
      )}

      {/* Group Posts */}
      {isMember && (
        <div className="group-posts">
          <h3>Group Posts</h3>
          <GroupPostShare groupId={id} onPostCreated={fetchGroupPosts} />
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

