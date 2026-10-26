import React, { useEffect, useState, useRef } from "react";
import { addGroupMessage, getGroupMessages } from "../../api/GroupRequests";
import "./GroupChatBox.css";
import { format } from "timeago.js";
import InputEmoji from 'react-input-emoji';
import Avatar from "../Avatar/Avatar";
import { useSocket } from "../../context/SocketContext";
import { UilUsersAlt } from "@iconscout/react-unicons";

const GroupChatBox = ({ groupId, currentUser, groupName }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [receivedMessage, setReceivedMessage] = useState(null);
  const scroll = useRef();
  const { socket } = useSocket();

  // Join group chat room on centralized socket
  useEffect(() => {
    if (!socket || !groupId) return;

    socket.emit("join-group-chat", groupId);

    const handleGroupMessage = (data) => {
      if (data.groupId === groupId) {
        setReceivedMessage(data);
      }
    };

    socket.on("receive-group-message", handleGroupMessage);

    return () => {
      socket.emit("leave-group-chat", groupId);
      socket.off("receive-group-message", handleGroupMessage);
    };
  }, [socket, groupId]);

  // Handle received messages - prevent duplicates
  useEffect(() => {
    if (receivedMessage && receivedMessage.groupId === groupId) {
      setMessages((prev) => {
        const messageExists = prev.some(
          (msg) => msg._id === receivedMessage._id || 
          (msg.senderId === receivedMessage.senderId && 
           msg.text === receivedMessage.text && 
           Math.abs(new Date(msg.createdAt || Date.now()) - new Date(receivedMessage.createdAt || Date.now())) < 1000)
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

  const handleChange = (text) => {
    setNewMessage(text);
  };

  const handleSend = async (textOrEvent) => {
    if (textOrEvent && typeof textOrEvent.preventDefault === 'function') {
      textOrEvent.preventDefault();
    }
    
    const messageToSend = typeof textOrEvent === 'string' ? textOrEvent.trim() : newMessage.trim();
    if (!messageToSend || !groupId) return;

    try {
      const { data } = await addGroupMessage(groupId, messageToSend);
      
      setMessages((prev) => {
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
      
      if (socket) {
        socket.emit("send-group-message", {
          ...data,
          groupId,
        });
      }
      
      setNewMessage("");
    } catch (error) {
      // console.error("Error sending message:", error);
    }
  };

  if (!groupId) {
    return (
      <div className="GroupChatBox-container">
        <div className="chatbox-empty-container">
          <div className="chatbox-empty-icon-circle">
            <UilUsersAlt size="48" color="#0096FF" />
          </div>
          <h3>Group Chat</h3>
          <p>Select a group to start conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="GroupChatBox-container">
      {/* Modern Group Chat Header */}
      <div className="chat-header">
        <div className="chat-header-user">
          <div className="group-header-icon-badge">
            <UilUsersAlt size="24" color="#0096FF" />
          </div>
          <div className="chat-header-info">
            <span className="chat-header-name">{groupName || "Group Chat"}</span>
            <span className="chat-header-subtext">
              Community Chat • {messages.length} {messages.length === 1 ? "message" : "messages"}
            </span>
          </div>
        </div>
      </div>

      {/* Chat Body */}
      <div className="chat-body group-chat-body">
        {loading ? (
          <div className="chat-empty-convo">
            <div className="chat-loading-spinner" />
            <div className="chat-empty-convo-sub">Loading group conversation...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="chat-empty-convo">
            <div className="chat-empty-convo-icon">👥</div>
            <div className="chat-empty-convo-title">No messages in this group yet</div>
            <div className="chat-empty-convo-sub">Be the first to say something to everyone!</div>
          </div>
        ) : (
          messages.map((message, index) => {
            const isOwn = String(message.senderId) === String(currentUser);
            const uniqueKey = message._id || `msg-${index}`;
            return (
              <div
                key={uniqueKey}
                ref={index === messages.length - 1 ? scroll : null}
                className={`message-wrapper ${isOwn ? "own-wrapper" : "other-wrapper"}`}
              >
                {!isOwn && (
                  <div className="group-sender-header">
                    <span className="group-sender-name">
                      {message.sender?.firstname && message.sender?.lastname
                        ? `${message.sender.firstname} ${message.sender.lastname}`
                        : message.sender?.username || "Member"}
                    </span>
                  </div>
                )}
                <div className={`message ${isOwn ? "own" : "other"}`}>
                  <span className="message-text">{message.text}</span>
                  <div className="message-meta">
                    <span className="message-time">{format(message.createdAt)}</span>
                    {isOwn && <span className="message-check" title="Sent">✓✓</span>}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Chat Sender */}
      <div className="chat-sender">
        <div className="input-emoji-container">
          <InputEmoji
            value={newMessage}
            onChange={handleChange}
            onEnter={handleSend}
            cleanOnEnter
            placeholder="Type a group message... (Press Enter to send)"
          />
        </div>

        <button
          type="button"
          className="send-button"
          onClick={handleSend}
          disabled={!newMessage.trim()}
          title="Send (Enter)"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
          <span>Send</span>
        </button>
      </div>
    </div>
  );
};

export default GroupChatBox;
