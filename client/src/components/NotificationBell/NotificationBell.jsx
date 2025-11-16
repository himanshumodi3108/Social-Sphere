import React, { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { getUnreadCount, getNotifications, markAsRead, markAllAsRead } from "../../api/NotificationRequests";
import { io } from "socket.io-client";
import "./NotificationBell.css";
import Noti from "../../img/noti.png";

const NotificationBell = () => {
  const { user } = useSelector((state) => state.authReducer.authData);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const socketRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!user?._id) return;

    // Connect to socket
    const socketUrl = process.env.REACT_APP_SOCKET_URL || "http://localhost:8800";
    socketRef.current = io(socketUrl);
    
    // Join notification room
    socketRef.current.emit("join-notifications", user._id);

    // Listen for new notifications
    socketRef.current.on("new-notification", (notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    // Fetch initial unread count
    fetchUnreadCount();

    return () => {
      if (socketRef.current) {
        socketRef.current.emit("leave-notifications", user._id);
        socketRef.current.disconnect();
      }
    };
  }, [user?._id]);

  useEffect(() => {
    if (showDropdown) {
      fetchNotifications();
    }
  }, [showDropdown]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const { data } = await getUnreadCount();
      setUnreadCount(data.count || 0);
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const { data } = await getNotifications(1, 10, false);
      setNotifications(data.data || []);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      handleMarkAsRead(notification._id);
    }
    if (notification.link) {
      window.location.href = notification.link;
    }
    setShowDropdown(false);
  };

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <div 
        className="notification-bell" 
        onClick={() => setShowDropdown(!showDropdown)}
      >
        <img src={Noti} alt="Notifications" />
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </div>

      {showDropdown && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllAsRead} className="mark-all-read">
                Mark all as read
              </button>
            )}
          </div>

          <div className="notification-list">
            {loading ? (
              <div className="loading">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="no-notifications">No notifications</div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`notification-item ${!notification.read ? 'unread' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  {notification.fromUser?.profilePicture ? (
                    <img
                      src={process.env.REACT_APP_PUBLIC_FOLDER + notification.fromUser.profilePicture}
                      alt="User"
                      className="notification-avatar"
                    />
                  ) : (
                    <div className="notification-avatar-placeholder">
                      {notification.fromUser?.name?.charAt(0) || 'U'}
                    </div>
                  )}
                  <div className="notification-content">
                    <p className="notification-message">{notification.message}</p>
                    <span className="notification-time">
                      {new Date(notification.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {!notification.read && <div className="unread-dot"></div>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;

