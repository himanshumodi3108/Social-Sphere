import React from "react";
import PostSide from "../../components/PostSide/PostSide";
import ProfileCard from "../../components/ProfileCard/ProfileCard";
import ProfileLeft from "../../components/ProfileLeft/ProfileLeft";
import RightSide from "../../components/RightSide/RightSide";
import SEO from "../../components/SEO/SEO";
import "./Profile.css";

const Profile = () => {
  return (
    <div className="Profile">
      <SEO 
        title="User Profile - SocialSphere"
        description="View user profile, posts, followers, and activity on SocialSphere."
      />

      <ProfileLeft />

      <div className="Profile-center">
        <ProfileCard location="profilePage" />

        <div >
          <PostSide />
        </div>
        <br />
      </div>

      <RightSide />
    </div>
  );
};
export default Profile;
