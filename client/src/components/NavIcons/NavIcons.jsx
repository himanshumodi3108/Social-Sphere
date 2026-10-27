import React from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";

import Home from "../../img/home1.png";
import Chat from "../../img/chat1.png";
import User from "../../img/user.png";

import { UilSetting, UilBookmark, UilUsersAlt, UilSun, UilMoon } from "@iconscout/react-unicons";
import NotificationBell from "../NotificationBell/NotificationBell";
import { useTheme } from "../../context/ThemeContext";
import "./NavIcons.css";

const NavIcons = () => {
  const { user } = useSelector((state) => state.authReducer.authData);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isDark, toggleTheme } = useTheme();

  const handleShowSaved = () => {
    navigate("/home?tab=saved");
  };

  const handleShowCreateGroup = () => {
    navigate("/home?tab=create-group");
  };

  const handleHomeClick = (e) => {
    if (location.pathname === "/home" && !searchParams.get("tab")) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      navigate("/home");
    }
  };

  const currentTab = searchParams.get("tab");

  return (
    <div className="navIcons">
      <Link to="/home" onClick={handleHomeClick} title="Home">
        <img style={{ width: "1.5rem", height: "1.5rem" }} src={Home} alt="Home" />
      </Link>

      <Link 
        to="/settings"
        style={{ 
          cursor: "pointer", 
          color: location.pathname.startsWith("/settings") ? "#0096FF" : "inherit",
          display: "flex",
          alignItems: "center"
        }}
        title="Settings"
      >
        <UilSetting size="24" />
      </Link>

      <NotificationBell />

      {/* Profile */}
      {user?._id && (
        <Link to={`/profile/${user._id}`} title="Profile">
          <img src={User} alt="Profile" />
        </Link>
      )}

      <Link to="/chat" title="Chat">
        <img src={Chat} alt="Chat" />
      </Link>

      <Link 
        to="/groups" 
        title="Groups"
        style={{ 
          color: location.pathname.startsWith("/groups") ? "#0096FF" : "inherit",
          display: "flex",
          alignItems: "center"
        }}
      >
        <UilUsersAlt size="24" />
      </Link>

      <div 
        onClick={handleShowSaved}
        style={{ 
          cursor: "pointer", 
          color: currentTab === "saved" ? "#0096FF" : "inherit" 
        }}
        title="Saved Posts"
      >
        <UilBookmark size="24" />
      </div>

      {/* Dark Mode Toggle */}
      <button
        onClick={toggleTheme}
        className="theme-toggle-btn"
        title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        aria-label="Toggle theme"
      >
        {isDark ? <UilSun size="22" color="#f5c32c" /> : <UilMoon size="22" color="#242d49" />}
      </button>
    </div>
  );
};

export default NavIcons;
