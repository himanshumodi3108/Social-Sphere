import React, { useState, useEffect, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { followUser, unfollowUser } from "../../actions/UserAction";
import Avatar from "../Avatar/Avatar";

const User = ({ person }) => {
  const { user } = useSelector((state) => state.authReducer.authData);
  const dispatch = useDispatch()
  
  // Check if current user is following this person
  // Check both: 1) if current user is in person's followers array, 2) if person is in current user's following array
  const isFollowing = useMemo(() => {
    if (!user?._id || !person?._id) return false;
    
    // Method 1: Check if current user is in person's followers array
    if (person?.followers && Array.isArray(person.followers)) {
      const followersAsStrings = person.followers.map(f => String(f));
      if (followersAsStrings.includes(String(user._id))) {
        return true;
      }
    }
    
    // Method 2: Check if person is in current user's following array (more reliable after follow/unfollow)
    if (user?.following && Array.isArray(user.following)) {
      const followingAsStrings = user.following.map(f => String(f));
      if (followingAsStrings.includes(String(person._id))) {
        return true;
      }
    }
    
    return false;
  }, [person?.followers, person?._id, user?._id, user?.following]);
  
  const [following, setFollowing] = useState(isFollowing);
  
  // Sync with Redux state and person prop changes
  useEffect(() => {
    setFollowing(isFollowing);
  }, [isFollowing]);
  
  const handleFollow = () => {
    const wasFollowing = following;
    // Optimistic update - update immediately for better UX
    setFollowing(!wasFollowing);
    
    // Dispatch the action (Redux thunk returns a promise)
    const actionPromise = wasFollowing
      ? dispatch(unfollowUser(person._id, user))
      : dispatch(followUser(person._id, user));
    
    // Handle promise if it's available
    if (actionPromise && typeof actionPromise.then === 'function') {
      actionPromise.catch((error) => {
        // Revert optimistic update on error
        setFollowing(wasFollowing);
        console.error("Follow/unfollow error:", error);
      });
    }
    
    // The useEffect will sync the state when Redux updates
  };
  
  return (
    <div className="follower">
      <div>
        <Avatar
          user={person}
          profilePicture={person.profilePicture}
          firstname={person.firstname}
          lastname={person.lastname}
          username={person.username}
          size="50px"
          className="followerImage"
        />
        <div className="name">
          <span>{person.firstname} {person.lastname}</span>
          <span>@{person.username}</span>
        </div>
      </div>
      <button
        className={
          following ? "button fc-button UnfollowButton" : "button fc-button"
        }
        onClick={handleFollow}
        style={{background:"#0096FF",color:"white", borderColor:"#0096FF"}}
      >
        {following ? "Unfollow" : "Follow"}
      </button>
    </div>
  );
};

export default User;
