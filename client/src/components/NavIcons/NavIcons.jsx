import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

import Home from "../../img/home1.png";
import Chat from "../../img/chat1.png";
import User from "../../img/user.png";

import { UilSetting, UilBookmark } from "@iconscout/react-unicons";
import NotificationBell from "../NotificationBell/NotificationBell";
import "./NavIcons.css";

const NavIcons = () => {
  // Get user from Redux store
  const { user } = useSelector((state) => state.authReducer.authData);
  const location = useLocation();

  const handleShowSaved = () => {
    // Only show on home page
    if (location.pathname === "/home" || location.pathname === "/") {
      window.dispatchEvent(new Event('show-saved-posts'));
    } else {
      // Navigate to home first, then show saved
      window.location.href = "/home";
      setTimeout(() => {
        window.dispatchEvent(new Event('show-saved-posts'));
      }, 100);
    }
  };

  const handleShowCreateGroup = () => {
    // Only show on home page
    if (location.pathname === "/home" || location.pathname === "/") {
      window.dispatchEvent(new Event('show-create-group'));
    } else {
      // Navigate to home first, then show create group
      window.location.href = "/home";
      setTimeout(() => {
        window.dispatchEvent(new Event('show-create-group'));
      }, 100);
    }
  };

  const handleHomeClick = (e) => {
    // If already on home, just reset the view
    if (location.pathname === "/home" || location.pathname === "/") {
      e.preventDefault();
      window.dispatchEvent(new Event('show-home'));
    } else {
      // If navigating to home, dispatch event after navigation
      setTimeout(() => {
        window.dispatchEvent(new Event('show-home'));
      }, 100);
    }
  };

  return (
    <div className="navIcons">
      <Link to="/home" onClick={handleHomeClick}>
        <img style={{ width: "1.5rem", height: "1.5rem" }} src={Home} alt="Home" />
      </Link>
      <div 
        onClick={handleShowCreateGroup}
        style={{ cursor: "pointer" }}
        title="Create Group"
      >
        <UilSetting size="24" />
      </div>
      <NotificationBell />
      
      {/* Redirect to logged-in user's profile */}
      {user?._id && (
        <Link to={`/profile/${user._id}`}>
          <img src={User} alt="Profile" />
        </Link>
      )}
      
      <Link to="/chat">
        <img src={Chat} alt="Chat" />
      </Link>
      <div 
        onClick={handleShowSaved}
        style={{ cursor: "pointer" }}
        title="Saved Posts"
      >
        <UilBookmark size="24" />
      </div>
    </div>
  );
};

export default NavIcons;
