import React from "react";
import ProfileSide from "../profileSide/ProfileSide";
import RightSide from "../RightSide/RightSide";
import "./SettingsLayout.css";

const SettingsLayout = ({ children }) => {
  return (
    <div className="SettingsLayout">
      {/* ProfileSide - Always Visible in Desktop */}
      <ProfileSide />

      {/* Settings Content (Center) */}
      <div className="settings-center">
        {children}
      </div>

      {/* RightSide - Always Visible in Desktop */}
      <RightSide />
    </div>
  );
};

export default SettingsLayout;

