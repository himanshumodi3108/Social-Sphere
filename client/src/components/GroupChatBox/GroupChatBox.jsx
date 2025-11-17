import React, { useEffect, useState, useRef } from "react";
import { addGroupMessage, getGroupMessages } from "../../api/GroupRequests";
import "./GroupChatBox.css";
import { format } from "timeago.js";
import InputEmoji from 'react-input-emoji';
import Avatar from "../Avatar/Avatar";
import { io } from "socket.io-client";

const GroupChatBox = ({ groupId, currentUser, groupName }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState(null);
  const [receivedMessage, setReceivedMessage] = useState(null);
  const scroll = useRef();

  // Initialize socket connection
  useEffect(() => {
    const socketUrl = process.env.REACT_APP_SOCKET_URL || "http://localhost:8800";
    const newSocket = io(socketUrl);
    setSocket(newSocket);

    // Join group chat room
    if (groupId) {
      newSocket.emit("join-group-chat", groupId);
    }

    // Listen for new group messages
    newSocket.on("receive-group-message", (data) => {
      if (data.groupId === groupId) {
        setReceivedMessage(data);
      }
    });

    return () => {
      newSocket.emit("leave-group-chat", groupId);
      newSocket.disconnect();
    };
  }, [groupId]);

  // Handle received messages - prevent duplicates
  useEffect(() => {
    if (receivedMessage && receivedMessage.groupId === groupId) {
      setMessages((prev) => {
        // Check if message already exists to prevent duplicates
        const messageExists = prev.some(
          (msg) => msg._id === receivedMessage._id || 
          (msg.senderId === receivedMessage.senderId && 
           msg.text === receivedMessage.text && 
           Math.abs(new Date(msg.createdAt) - new Date(receivedMessage.createdAt)) < 1000)
        );
        if (messageExists) {
          return prev;
        }
        return [...prev, receivedMessage];
      });
    }
  }, [receivedMessage, groupId]);

  // Fetch messages
  useEffect(() => {
    const fetchMessages = async () => {
      if (!groupId) return;
      
      setLoading(true);
      try {
        const { data } = await getGroupMessages(groupId);
        const messagesArray = Array.isArray(data) ? data : [];
        
        // Deduplicate messages by _id
        const uniqueMessages = messagesArray.reduce((acc, message) => {
          const exists = acc.find((msg) => msg._id === message._id);
          if (!exists) {
            acc.push(message);
          }
          return acc;
        }, []);
        
        setMessages(uniqueMessages);
      } catch (error) {
        // console.error("Error fetching group messages:", error);
        // If 404, group chat might not exist yet - initialize empty
        if (error.response?.status === 404) {
          setMessages([]);
        } else {
          setMessages([]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [groupId]);

  // Auto-scroll to bottom
  useEffect(() => {
    scroll.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleChange = (newMessage) => {
    setNewMessage(newMessage);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !groupId) return;

    try {
      const { data } = await addGroupMessage(groupId, newMessage.trim());
      
      // Add message to local state first
      setMessages((prev) => {
        // Check if message already exists to prevent duplicates
        const messageExists = prev.some(
          (msg) => msg._id === data._id || 
          (msg.senderId === data.senderId && 
           msg.text === data.text && 
           Math.abs(new Date(msg.createdAt || Date.now()) - new Date(data.createdAt || Date.now())) < 1000)
        );
        if (messageExists) {
          return prev;
        }
        return [...prev, data];
      });
      
      // Emit to socket for real-time updates
      if (socket) {
        socket.emit("send-group-message", {
          ...data,
          groupId,
        });
      }
      
      setNewMessage("");
    } catch (error) {
      // console.error("Error sending message:", error);
      alert("Failed to send message. Please try again.");
    }
  };

  if (!groupId) {
    return (
      <div className="GroupChatBox-container">
        <span className="chatbox-empty-message">
          Join the group to start chatting...
        </span>
      </div>
    );
  }

  return (
    <div className="GroupChatBox-container">
      {/* Chat Header */}
      <div className="group-chat-header">
        <div className="group-chat-title">
          <h3>{groupName || "Group Chat"}</h3>
          <span className="member-count">{messages.length > 0 && `${messages.length} messages`}</span>
        </div>
        <hr
          style={{
            width: "95%",
            border: "0.1px solid #ececec",
            marginTop: "10px",
          }}
        />
      </div>

      {/* Chat Body */}
      <div className="group-chat-body">
        {loading ? (
          <div className="loading-messages">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="no-messages">No messages yet. Be the first to say something!</div>
        ) : (
          messages.map((message, index) => {
            const isOwnMessage = String(message.senderId) === String(currentUser);
            // Create unique key - use _id if available, otherwise combine senderId, text, and timestamp
            const uniqueKey = message._id 
              ? message._id
              : `msg-${message.senderId}-${message.text?.substring(0, 20)}-${message.createdAt || Date.now()}-${index}`;
            return (
              <div
                key={uniqueKey}
                ref={index === messages.length - 1 ? scroll : null}
                className={`group-message ${isOwnMessage ? "own" : ""}`}
              >
                {!isOwnMessage && (
                  <div className="message-sender-info">
                    <Avatar
                      profilePicture={message.sender?.profilePicture}
                      firstname={message.sender?.firstname}
                      lastname={message.sender?.lastname}
                      username={message.sender?.username}
                      size="30px"
                    />
                    <span className="sender-name">
                      {message.sender?.firstname && message.sender?.lastname
                        ? `${message.sender.firstname} ${message.sender.lastname}`
                        : message.sender?.username || "Unknown"}
                    </span>
                  </div>
                )}
                <div className="message-content">
                  <span className="message-text">{message.text}</span>
                  <span className="message-time">{format(message.createdAt)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Chat Sender */}
      <div className="group-chat-sender">
        <InputEmoji
          value={newMessage}
          onChange={handleChange}
          onEnter={handleSend}
          placeholder="Type a message... (Press Enter to send)"
        />
        <div
          className="send-button button"
          onClick={handleSend}
          style={{ cursor: newMessage.trim() ? "pointer" : "not-allowed", opacity: newMessage.trim() ? 1 : 0.5 }}
        >
          Send
        </div>
      </div>
    </div>
  );
};

export default GroupChatBox;


