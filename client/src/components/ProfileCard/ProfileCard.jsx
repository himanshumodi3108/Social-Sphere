import React, { useEffect, useState } from "react";
import "./ProfileCard.css";
import { Link, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import * as UserApi from "../../api/UserRequests";
import Avatar from "../Avatar/Avatar";

const ProfileCard = ({location}) => {
  const { user: currentUser } = useSelector((state) => state.authReducer.authData);
  const posts = useSelector((state)=>state.postReducer.posts)
  const serverPublic = process.env.REACT_APP_PUBLIC_FOLDER;
  const params = useParams();
  const [profileUser, setProfileUser] = useState(null);

  // Determine which user to display
  const isViewingOtherProfile = location === "profilePage" && params.id && params.id !== currentUser?._id;
  const displayUser = isViewingOtherProfile ? profileUser : currentUser;

  // Fetch profile user data if viewing someone else's profile
  useEffect(() => {
    const fetchProfileUser = async () => {
      if (isViewingOtherProfile && params.id) {
        try {
          const response = await UserApi.getUser(params.id);
          const userData = response?.data || response;
          setProfileUser(userData);
        } catch (error) {
          console.error("Error fetching profile user:", error);
        }
      }
    };
    fetchProfileUser();
  }, [params.id, isViewingOtherProfile]);

  // Refresh profile user when viewing other profiles and follow/unfollow happens
  useEffect(() => {
    if (!isViewingOtherProfile && currentUser) {
      // If viewing own profile, clear profileUser so it uses currentUser
      setProfileUser(null);
      return;
    }

    if (isViewingOtherProfile && currentUser && params.id) {
      // Refresh profile user data when current user's following list changes
      // This ensures the profile user's followers count updates when current user follows/unfollows them
      const fetchProfileUser = async () => {
        try {
          const response = await UserApi.getUser(params.id);
          const userData = response?.data || response;
          setProfileUser(userData);
        } catch (error) {
          console.error("Error refreshing profile user:", error);
        }
      };
      
      // Reduced delay for faster updates, but still allow server to process
      const timeoutId = setTimeout(() => {
        fetchProfileUser();
      }, 300);
      
      return () => clearTimeout(timeoutId);
    }
  }, [currentUser?.following, params.id, isViewingOtherProfile, currentUser?._id]);
  
  // Also refresh when viewing own profile if followers might have changed
  // This handles cases where someone else follows/unfollows you
  useEffect(() => {
    if (!isViewingOtherProfile && currentUser?._id && location === "profilePage") {
      // When viewing own profile, the currentUser from Redux should be up to date
      // But we can add a periodic refresh or listen for changes
      // For now, the Redux state should handle this via UPDATING_SUCCESS
    }
  }, [currentUser?.followers, isViewingOtherProfile, location, currentUser?._id]);
  
  // Listen for follow/unfollow events to refresh stats immediately
  useEffect(() => {
    const refreshProfileUser = async (userId) => {
      if (!userId || !isViewingOtherProfile || String(params.id) !== String(userId)) {
        return;
      }
      
      try {
        const response = await UserApi.getUser(userId);
        const userData = response?.data || response;
        if (userData && userData._id) {
          setProfileUser(userData);
        }
      } catch (error) {
        console.error("Error refreshing profile user:", error);
      }
    };
    
    const handleUserFollowed = async (event) => {
      const { followedUserId, followedUser } = event.detail || {};
      
      // If viewing the profile of the user that was just followed, refresh immediately
      if (isViewingOtherProfile && params.id && String(params.id) === String(followedUserId)) {
        // Try to use the followedUser data from the event if it's valid
        if (followedUser && followedUser._id && Array.isArray(followedUser.followers)) {
          // Validate the data structure before using it
          const isValidUser = followedUser._id && 
                             Array.isArray(followedUser.followers) && 
                             Array.isArray(followedUser.following);
          if (isValidUser) {
            setProfileUser(followedUser);
            // Also do a fresh fetch after a short delay to ensure accuracy
            setTimeout(() => refreshProfileUser(followedUserId), 200);
          } else {
            // If data structure is invalid, fetch fresh data
            refreshProfileUser(followedUserId);
          }
        } else {
          // No data in event, fetch fresh data
          refreshProfileUser(followedUserId);
        }
      }
    };
    
    const handleUserUnfollowed = async (event) => {
      const { unfollowedUserId, unfollowedUser } = event.detail || {};
      
      // If viewing the profile of the user that was just unfollowed, refresh immediately
      if (isViewingOtherProfile && params.id && String(params.id) === String(unfollowedUserId)) {
        // Try to use the unfollowedUser data from the event if it's valid
        if (unfollowedUser && unfollowedUser._id && Array.isArray(unfollowedUser.followers)) {
          // Validate the data structure before using it
          const isValidUser = unfollowedUser._id && 
                             Array.isArray(unfollowedUser.followers) && 
                             Array.isArray(unfollowedUser.following);
          if (isValidUser) {
            setProfileUser(unfollowedUser);
            // Also do a fresh fetch after a short delay to ensure accuracy
            setTimeout(() => refreshProfileUser(unfollowedUserId), 200);
          } else {
            // If data structure is invalid, fetch fresh data
            refreshProfileUser(unfollowedUserId);
          }
        } else {
          // No data in event, fetch fresh data
          refreshProfileUser(unfollowedUserId);
        }
      }
    };
    
    window.addEventListener('userFollowed', handleUserFollowed);
    window.addEventListener('userUnfollowed', handleUserUnfollowed);
    
    return () => {
      window.removeEventListener('userFollowed', handleUserFollowed);
      window.removeEventListener('userUnfollowed', handleUserUnfollowed);
    };
  }, [isViewingOtherProfile, params.id]);

  // Add null checks and default values
  if (!currentUser || !displayUser) {
    return <div>Loading...</div>;
  }

  // Ensure followers and following are arrays
  // For own profile, use currentUser which updates from Redux
  // For other profiles, use profileUser which is fetched from server
  // Filter out null, undefined, or invalid entries before counting
  const followersArray = Array.isArray(displayUser?.followers) 
    ? displayUser.followers.filter(f => f !== null && f !== undefined && f !== '') 
    : [];
  const followingArray = Array.isArray(displayUser?.following) 
    ? displayUser.following.filter(f => f !== null && f !== undefined && f !== '') 
    : [];
  
  const followersCount = followersArray.length;
  const followingCount = followingArray.length;
  
  // Debug logging (can be removed later)
  // console.log("ProfileCard stats:", {
  //   isViewingOtherProfile,
  //   displayUser: displayUser?._id,
  //   followersCount,
  //   followingCount,
  //   followersArray: followersArray.length,
  //   followingArray: followingArray.length
  // });
  
  // Compare userId as strings to handle both ObjectId and string formats
  // Ensure posts is an array before filtering
  const postsCount = Array.isArray(posts) && displayUser._id 
    ? posts.filter((post) => post.userId && String(post.userId) === String(displayUser._id)).length 
    : 0;

  return (
    <div className="ProfileCard">
      <div className="ProfileImages">
        <img src={
            displayUser.coverPicture
              ? serverPublic + displayUser.coverPicture
              : serverPublic + "defaultCover.jpg"
          } alt="CoverImage" />
        <Avatar
          user={displayUser}
          profilePicture={displayUser.profilePicture}
          firstname={displayUser.firstname}
          lastname={displayUser.lastname}
          username={displayUser.username}
          size="90px"
          className="profile-avatar"
        />
       
      </div>
      <div className="ProfileName">
        <span>{displayUser.firstname} {displayUser.lastname}</span>
        <span>{displayUser.worksAt? displayUser.worksAt : 'Write about yourself'}</span>
      </div>

      <div className="followStatus">
        <hr />
        <div>
          <div className="follow">
            <span>{followersCount}</span>
            <span>Followers</span>
          </div>
          <div className="vl"></div>
          <div className="follow">
            <span>{followingCount}</span>
            <span>Following</span>
          </div>
          {/* for profilepage */}
          {location === "profilePage" && (
            <>
              <div className="vl"></div>
              <div className="follow">
                <span>{postsCount}</span>
                <span>Posts</span>
              </div>{" "}
            </>
          )}
        </div>
        <hr />
      </div>

      {location === "profilePage" ? (
        ""
      ) : (
        <span>
          <Link to={`/profile/${currentUser._id}`} style={{ textDecoration: "none", color: "inherit" }}>
            My Profile
          </Link>
        </span>
      )}
    </div>
  );
};

export default ProfileCard;
