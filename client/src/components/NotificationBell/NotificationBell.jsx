import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { getUnreadCount, getNotifications, markAsRead, markAllAsRead } from "../../api/NotificationRequests";
import { useSocket } from "../../context/SocketContext";
import "./NotificationBell.css";
import Noti from "../../img/noti.png";
import Avatar from "../Avatar/Avatar";

const NotificationBell = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.authReducer.authData);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket || !user?._id) return;

    // Join notification room
    socket.emit("join-notifications", user._id);

    // Listen for new notifications
    const handleNewNotification = (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    };

    socket.on("new-notification", handleNewNotification);

    return () => {
      socket.emit("leave-notifications", user._id);
      socket.off("new-notification", handleNewNotification);
    };
  }, [socket, user?._id]);

  useEffect(() => {
    if (user?._id) {
      fetchUnreadCount();
    }
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
      // ignore
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const { data } = await getNotifications(1, 10, false);
      setNotifications(data.data || []);
    } catch (error) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      // ignore
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      // ignore
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      handleMarkAsRead(notification._id);
    }
    if (notification.link) {
      if (notification.link.startsWith('/')) {
        navigate(notification.link);
      } else {
        window.location.href = notification.link;
      }
    } else if (notification.fromUser?._id) {
      navigate(`/profile/${notification.fromUser._id}`);
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
                  <Avatar
                    profilePicture={notification.fromUser?.profilePicture}
                    firstname={notification.fromUser?.name?.split(' ')[0]}
                    lastname={notification.fromUser?.name?.split(' ').slice(1).join(' ')}
                    username={notification.fromUser?.username}
                    size="40px"
                    className="notification-avatar"
                  />
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
