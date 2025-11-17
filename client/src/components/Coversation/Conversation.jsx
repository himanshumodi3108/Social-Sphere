import React, { useState } from "react";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { getUser } from "../../api/UserRequests";
import Avatar from "../Avatar/Avatar";
import { UilUsersAlt } from "@iconscout/react-unicons";

const Conversation = ({ data, currentUser, online }) => {
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
    // Handle both ObjectId and string formats
    const userId = data.members.find((id) => {
      const idStr = String(id);
      const currentUserStr = String(currentUser);
      return idStr !== currentUserStr;
    });
    
    const getUserData = async () => {
      if (!userId) {
        // console.error("Could not find other user in conversation");
        return;
      }
      
      try {
        const response = await getUser(userId);
        const userData = response?.data || response;
        if (userData) {
          setUserData(userData);
          dispatch({type:"SAVE_USER", data: userData});
        } else {
          // console.error("No user data received for userId:", userId);
        }
      } catch(error) {
        // console.error("Error fetching user data in Conversation:", error);
      }
    };

    getUserData();
  }, [data.members, currentUser, isGroup, dispatch]);

  return (
    <>
      <div className="follower conversation">
        <div>
          {!isGroup && online && <div className="online-dot"></div>}
          {isGroup ? (
            // Group display
            <>
              <Avatar
                profilePicture={data.profilePicture}
                firstname={data.name}
                size="50px"
                className="followerImage"
              />
              <div className="name" style={{fontSize: '0.8rem'}}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <UilUsersAlt size="14" />
                  {data.name}
                </span>
                <span style={{color: "#0096FF", fontSize: '0.75rem'}}>
                  {data.memberCount || 0} members
                </span>
              </div>
            </>
          ) : (
            // Individual user display
            <>
              <Avatar
                user={userData}
                profilePicture={userData?.profilePicture}
                firstname={userData?.firstname}
                lastname={userData?.lastname}
                username={userData?.username}
                size="50px"
                className="followerImage"
              />
              <div className="name" style={{fontSize: '0.8rem'}}>
                <span>{userData?.firstname} {userData?.lastname}</span>
                <span style={{color: online?"#51e200":""}}>{online? "Online" : "Offline"}</span>
              </div>
            </>
          )}
        </div>
      </div>
      <hr style={{ width: "85%", border: "0.1px solid #ececec" }} />
    </>
  );
};

export default Conversation;