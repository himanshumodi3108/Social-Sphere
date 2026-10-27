import React from 'react'
import FollowersCard from '../FollowersCard/FollowersCard'
import LogoSearch from '../LogoSearch/LogoSearch'
import ProfileCard from '../ProfileCard/ProfileCard'
import './ProfileSide.css'
const ProfileSide = () => {
  return (
    <div className="ProfileSide">
      <div style={{ width: "100%", paddingBottom: "10px" }}>
        <LogoSearch />
      </div>
      <ProfileCard location="homepage" />
      <FollowersCard />
    </div>
    )
}
export default ProfileSide