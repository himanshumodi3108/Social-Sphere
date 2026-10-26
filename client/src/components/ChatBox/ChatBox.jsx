import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { addMessage, getMessages } from "../../api/MessageRequests";
import { getUser } from "../../api/UserRequests";
import "./ChatBox.css";
import { format } from "timeago.js";
import InputEmoji from 'react-input-emoji';
import Avatar from "../Avatar/Avatar";
import {
  initializeChatEncryption,
  encryptMessageAES,
  decryptMessageAES,
  getChatKey,
  importSharedKey,
} from "../../utils/encryption";

const ChatBox = ({ chat, currentUser, setSendMessage, receivedMessage }) => {
  const [userData, setUserData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [encryptionReady, setEncryptionReady] = useState(false);
  const [sharedKey, setSharedKey] = useState(null);

  const scroll = useRef();
  const imageRef = useRef();

  const handleChange = (text) => {
    setNewMessage(text);
  };

  // Fetch data for header
  useEffect(() => {
    if (!chat || !chat.members) return;
    
    const userId = chat.members.find((id) => String(id) !== String(currentUser));
    
    const getUserData = async () => {
      if (!userId) return;
      try {
        const response = await getUser(userId);
        const data = response?.data || response;
        if (data) {
          setUserData(data);
        }
      } catch (error) {
        // console.error("Error fetching user data in ChatBox:", error);
      }
    };

    getUserData();
  }, [chat, currentUser]);

  // Initialize Encryption
  useEffect(() => {
    const initEncryption = async () => {
      if (!chat || !currentUser) return;
      
      try {
        const otherUserId = chat.members.find((id) => String(id) !== String(currentUser));
        if (!otherUserId) return;

        await initializeChatEncryption(chat._id, otherUserId, currentUser);
        const keyData = getChatKey(chat._id);
        
        if (keyData && keyData.sharedKey) {
          const key = await importSharedKey(keyData.sharedKey);
          setSharedKey(key);
          setEncryptionReady(true);
        }
      } catch (error) {
        setEncryptionReady(false);
      }
    };

    if (chat) {
      initEncryption();
    }
  }, [chat, currentUser]);

  // Fetch Messages
  useEffect(() => {
    const fetchMessages = async () => {
      if (!chat || !encryptionReady || !sharedKey) return;
      
      try {
        const { data } = await getMessages(chat._id);
        
        const decryptedMessages = await Promise.all(
          data.map(async (msg) => {
            try {
              if (msg.text && msg.text.startsWith("encrypted:")) {
                const encryptedText = msg.text.replace("encrypted:", "");
                const decryptedText = await decryptMessageAES(encryptedText, sharedKey);
                return { ...msg, text: decryptedText };
              }
              return msg;
            } catch (error) {
              return { ...msg, text: "[Unable to decrypt message]" };
            }
          })
        );
        
        setMessages(decryptedMessages);
      } catch (error) {
        // console.error("Error fetching messages:", error);
      }
    };

    if (chat !== null && encryptionReady) {
      fetchMessages();
    }
  }, [chat, encryptionReady, sharedKey]);

  // Auto scroll to bottom
  useEffect(() => {
    scroll.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle Send with Keyboard Enter support
  const handleSend = async (textOrEvent) => {
    if (textOrEvent && typeof textOrEvent.preventDefault === 'function') {
      textOrEvent.preventDefault();
    }
    
    // Support text directly passed from InputEmoji onEnter or from state
    const textToSend = typeof textOrEvent === 'string' ? textOrEvent.trim() : newMessage.trim();
    if (!textToSend || !encryptionReady || !sharedKey) return;

    try {
      const encryptedText = await encryptMessageAES(textToSend, sharedKey);
      const encryptedMessage = `encrypted:${encryptedText}`;

      const message = {
        senderId: currentUser,
        text: encryptedMessage,
        chatId: chat._id,
      };

      const receiverId = chat.members.find((id) => String(id) !== String(currentUser));
      setSendMessage({ ...message, receiverId });
      
      // Optimistically clear input
      setNewMessage("");

      try {
        const { data } = await addMessage(message);
        const decryptedText = await decryptMessageAES(encryptedText, sharedKey);
        const decryptedData = { ...data, text: decryptedText };
        setMessages((prev) => [...prev, decryptedData]);
      } catch (error) {
        // console.error("Error sending message:", error);
      }
    } catch (error) {
      // console.error("Error encrypting message:", error);
    }
  };

  // Receive message via socket
  useEffect(() => {
    const handleReceivedMessage = async () => {
      if (receivedMessage === null || receivedMessage.chatId !== chat._id || !sharedKey) return;

      try {
        let decryptedMessage = receivedMessage;
        
        if (receivedMessage.text && receivedMessage.text.startsWith("encrypted:")) {
          const encryptedText = receivedMessage.text.replace("encrypted:", "");
          const decryptedText = await decryptMessageAES(encryptedText, sharedKey);
          decryptedMessage = { ...receivedMessage, text: decryptedText };
        }
        
        setMessages((prev) => [...prev, decryptedMessage]);
      } catch (error) {
        setMessages((prev) => [...prev, { ...receivedMessage, text: "[Unable to decrypt message]" }]);
      }
    };

    if (encryptionReady) {
      handleReceivedMessage();
    }
  }, [receivedMessage, chat, sharedKey, encryptionReady]);

  return (
    <div className="ChatBox-container">
      {chat ? (
        <>
          {/* Modern Chat Header */}
          <div className="chat-header">
            <Link 
              to={userData?._id ? `/profile/${userData._id}` : '#'}
              className="chat-header-user"
              style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '0.85rem' }}
            >
              <Avatar
                user={userData}
                profilePicture={userData?.profilePicture}
                firstname={userData?.firstname}
                lastname={userData?.lastname}
                username={userData?.username}
                size="46px"
                className="followerImage"
              />
              <div className="chat-header-info">
                <span className="chat-header-name">
                  {userData ? `${userData.firstname} ${userData.lastname}` : "Loading..."}
                </span>
                <span className="chat-header-subtext">
                  {userData?.username ? `@${userData.username}` : "Direct Message"}
                  <span className="e2ee-tag">🔒 End-to-end encrypted</span>
                </span>
              </div>
            </Link>
          </div>

          {/* Chat Body */}
          <div className="chat-body">
            {messages.length === 0 ? (
              <div className="chat-empty-convo">
                <div className="chat-empty-convo-icon">👋</div>
                <div className="chat-empty-convo-title">No messages yet</div>
                <div className="chat-empty-convo-sub">Send a message to break the ice!</div>
              </div>
            ) : (
              messages.map((message, index) => {
                const isOwn = String(message.senderId) === String(currentUser);
                return (
                  <div
                    key={message._id || index}
                    ref={index === messages.length - 1 ? scroll : null}
                    className={`message-wrapper ${isOwn ? "own-wrapper" : "other-wrapper"}`}
                  >
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
            <button
              type="button"
              className="attach-button"
              onClick={() => imageRef.current.click()}
              title="Attach photo"
            >
              +
            </button>

            <div className="input-emoji-container">
              <InputEmoji
                value={newMessage}
                onChange={handleChange}
                onEnter={handleSend}
                cleanOnEnter
                disabled={!encryptionReady}
                placeholder={
                  encryptionReady
                    ? "Type a message... (Press Enter to send)"
                    : "Initializing secure chat..."
                }
              />
            </div>

            <button
              type="button"
              className="send-button"
              onClick={handleSend}
              disabled={!newMessage.trim() || !encryptionReady}
              title="Send (Enter)"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
              <span>Send</span>
            </button>

            <input
              type="file"
              style={{ display: "none" }}
              ref={imageRef}
              accept="image/*"
            />
          </div>
        </>
      ) : (
        <div className="chatbox-empty-container">
          <div className="chatbox-empty-icon-circle">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#0096FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <h3>Your Messages</h3>
          <p>Select a conversation from the sidebar to chat securely in real-time.</p>
        </div>
      )}
    </div>
  );
};

export default ChatBox;
