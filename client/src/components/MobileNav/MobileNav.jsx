import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { 
  UilEstate, 
  UilChatBubbleUser, 
  UilUsersAlt, 
  UilUser, 
  UilPlus,
  UilSun,
  UilMoon,
  UilSetting
} from "@iconscout/react-unicons";
import { useTheme } from "../../context/ThemeContext";
import "./MobileNav.css";

const MobileNav = () => {
  const { user } = useSelector((state) => state.authReducer?.authData || {});
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  // Hide mobile nav on auth and landing pages
  if (location.pathname === "/auth" || location.pathname === "/landing" || !user?._id) {
    return null;
  }

  const isHome = location.pathname === "/home" || location.pathname === "/";
  const isChat = location.pathname.startsWith("/chat");
  const isGroups = location.pathname.startsWith("/groups");
  const isProfile = user?._id && location.pathname.startsWith(`/profile/${user._id}`);

  const handleCreatePostClick = () => {
    if (!isHome) {
      navigate("/home");
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 100);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
      <Link 
        to="/home" 
        className={`mobile-nav-item ${isHome ? "active" : ""}`}
        title="Home"
      >
        <UilEstate size="24" />
        <span>Home</span>
      </Link>

      <Link 
        to="/groups" 
        className={`mobile-nav-item ${isGroups ? "active" : ""}`}
        title="Groups"
      >
        <UilUsersAlt size="24" />
        <span>Groups</span>
      </Link>

      {/* Floating Center Create Action */}
      <button 
        type="button"
        className="mobile-nav-create-btn"
        onClick={handleCreatePostClick}
        aria-label="Create Post"
        title="Create Post"
      >
        <UilPlus size="24" color="#ffffff" />
      </button>

      <Link 
        to="/chat" 
        className={`mobile-nav-item ${isChat ? "active" : ""}`}
        title="Chat"
      >
        <UilChatBubbleUser size="24" />
        <span>Chat</span>
      </Link>

      {user?._id ? (
        <>
          <Link 
            to={`/profile/${user._id}`} 
            className={`mobile-nav-item ${isProfile ? "active" : ""}`}
            title="Profile"
          >
            <UilUser size="24" />
            <span>Profile</span>
          </Link>
          <Link 
            to="/settings" 
            className={`mobile-nav-item ${location.pathname.startsWith("/settings") ? "active" : ""}`}
            title="Settings"
          >
            <UilSetting size="24" />
            <span>Settings</span>
          </Link>
        </>
      ) : (
        <button
          type="button"
          onClick={toggleTheme}
          className="mobile-nav-item"
          title="Toggle Theme"
        >
          {isDark ? <UilSun size="22" color="#f5c32c" /> : <UilMoon size="22" color="#242d49" />}
          <span>Theme</span>
        </button>
      )}
    </nav>
  );
};

export default MobileNav;
