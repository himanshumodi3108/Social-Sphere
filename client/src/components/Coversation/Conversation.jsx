import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { getUser } from "../../api/UserRequests";
import Avatar from "../Avatar/Avatar";
import { UilUsersAlt } from "@iconscout/react-unicons";

const Conversation = ({ data, currentUser, online, isActive }) => {
  const [userData, setUserData] = useState(null);
  const dispatch = useDispatch();

  // Check if this is a group chat
  const isGroup = data.type === 'group';

  useEffect(() => {
    // For groups, we don't need to fetch user data
    if (isGroup) {
      return;
    }

    // Find the other user in the conversation (not the current user)
    const userId = data.members.find((id) => {
      const idStr = String(id);
      const currentUserStr = String(currentUser);
      return idStr !== currentUserStr;
    });
    
    const getUserData = async () => {
      if (!userId) return;
      
      try {
        const response = await getUser(userId);
        const userData = response?.data || response;
        if (userData) {
          setUserData(userData);
          dispatch({ type: "SAVE_USER", data: userData });
        }
      } catch (error) {
        // console.error("Error fetching user data in Conversation:", error);
      }
    };

    getUserData();
  }, [data.members, currentUser, isGroup, dispatch]);

  return (
    <div className={`follower conversation ${isActive ? "active-conversation" : ""}`}>
      <div className="conversation-inner">
        <div className="avatar-wrapper">
          {isGroup ? (
            <Avatar
              profilePicture={data.profilePicture}
              firstname={data.name}
              size="46px"
              className="followerImage"
            />
          ) : (
            <>
              <Avatar
                user={userData}
                profilePicture={userData?.profilePicture}
                firstname={userData?.firstname}
                lastname={userData?.lastname}
                username={userData?.username}
                size="46px"
                className="followerImage"
              />
              <span className={`status-dot ${online ? "online" : "offline"}`} />
            </>
          )}
        </div>

        <div className="conversation-details">
          {isGroup ? (
            <>
              <span className="conversation-name">
                <UilUsersAlt size="14" style={{ marginRight: "4px" }} />
                {data.name}
              </span>
              <span className="conversation-subtext group-count">
                {data.memberCount || 0} members
              </span>
            </>
          ) : (
            <>
              <span className="conversation-name">
                {userData ? `${userData.firstname} ${userData.lastname}` : "Loading..."}
              </span>
              <span className={`conversation-subtext ${online ? "online-text" : "offline-text"}`}>
                {online ? "Active now" : "Offline"}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Conversation;
