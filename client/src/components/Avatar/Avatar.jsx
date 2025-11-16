import React, { useState } from "react";
import "./Avatar.css";

const Avatar = ({ 
  user, 
  profilePicture, 
  firstname, 
  lastname, 
  username,
  size = "40px",
  className = ""
}) => {
  const [imageError, setImageError] = useState(false);

  // Get initials from firstname and lastname, or username
  const getInitials = () => {
    if (firstname && lastname) {
      return `${firstname.charAt(0).toUpperCase()}${lastname.charAt(0).toUpperCase()}`;
    }
    if (firstname) {
      return firstname.charAt(0).toUpperCase();
    }
    if (username) {
      return username.charAt(0).toUpperCase();
    }
    if (user?.firstname && user?.lastname) {
      return `${user.firstname.charAt(0).toUpperCase()}${user.lastname.charAt(0).toUpperCase()}`;
    }
    if (user?.firstname) {
      return user.firstname.charAt(0).toUpperCase();
    }
    if (user?.username) {
      return user.username.charAt(0).toUpperCase();
    }
    return "?";
  };

  // Get background color based on initials (for consistent colors)
  const getBackgroundColor = (initials) => {
    const colors = [
      "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8",
      "#F7DC6F", "#BB8FCE", "#85C1E2", "#F8B739", "#52BE80",
      "#EC7063", "#5DADE2", "#58D68D", "#F4D03F", "#AF7AC5"
    ];
    const index = initials.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const initials = getInitials();
  const backgroundColor = getBackgroundColor(initials);
  const imageUrl = profilePicture || user?.profilePicture;
  const serverPublic = process.env.REACT_APP_PUBLIC_FOLDER;

  // If no image URL or image failed to load, show initials
  if (!imageUrl || imageError) {
    return (
      <div
        className={`avatar avatar-initials ${className}`}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          backgroundColor: backgroundColor,
          color: "#FFFFFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: `calc(${size} * 0.4)`,
          fontWeight: "bold",
          textTransform: "uppercase",
          flexShrink: 0
        }}
      >
        {initials}
      </div>
    );
  }

  // Show profile picture
  return (
    <img
      src={serverPublic + imageUrl}
      alt="Profile"
      className={`avatar ${className}`}
      style={{ 
        width: size, 
        height: size, 
        borderRadius: "50%", 
        objectFit: "cover",
        flexShrink: 0
      }}
      onError={() => setImageError(true)}
    />
  );
};

export default Avatar;

