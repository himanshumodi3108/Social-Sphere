import React, { useEffect, useState } from "react";
import { useRef } from "react";
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

  const handleChange = (newMessage) => {
    setNewMessage(newMessage);
  };

  // fetching data for header
  useEffect(() => {
    if (!chat || !chat.members) return;
    
    // Find the other user in the conversation (not the current user)
    // Handle both ObjectId and string formats
    const userId = chat.members.find((id) => {
      const idStr = String(id);
      const currentUserStr = String(currentUser);
      return idStr !== currentUserStr;
    });
    
    const getUserData = async () => {
      if (!userId) {
        console.error("Could not find other user in chat");
        return;
      }
      
      try {
        const response = await getUser(userId);
        const userData = response?.data || response;
        if (userData) {
          setUserData(userData);
        } else {
          console.error("No user data received for userId:", userId);
        }
      } catch (error) {
        console.error("Error fetching user data in ChatBox:", error);
      }
    };

    getUserData();
  }, [chat, currentUser]);

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
        console.error("Error initializing encryption:", error);
        setEncryptionReady(false);
      }
    };

    if (chat) {
      initEncryption();
    }
  }, [chat, currentUser]);

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
              console.error("Error decrypting message:", error);
              return { ...msg, text: "[Unable to decrypt message]" };
            }
          })
        );
        
        setMessages(decryptedMessages);
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    };

    if (chat !== null && encryptionReady) {
      fetchMessages();
    }
  }, [chat, encryptionReady, sharedKey]);


  useEffect(() => {
    scroll.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);



  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !encryptionReady || !sharedKey) return;

    try {
      const encryptedText = await encryptMessageAES(newMessage.trim(), sharedKey);
      const encryptedMessage = `encrypted:${encryptedText}`;

      const message = {
        senderId: currentUser,
        text: encryptedMessage,
        chatId: chat._id,
      };

      const receiverId = chat.members.find((id) => String(id) !== String(currentUser));
      
      setSendMessage({ ...message, receiverId });
      
      try {
        const { data } = await addMessage(message);
        const decryptedText = await decryptMessageAES(encryptedText, sharedKey);
        const decryptedData = { ...data, text: decryptedText };
        setMessages([...messages, decryptedData]);
        setNewMessage("");
      } catch (error) {
        console.error("Error sending message:", error);
      }
    } catch (error) {
      console.error("Error encrypting message:", error);
    }
  };

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
        console.error("Error decrypting message:", error);
        setMessages((prev) => [...prev, { ...receivedMessage, text: "[Unable to decrypt message]" }]);
      }
    };

    if (encryptionReady) {
      handleReceivedMessage();
    }
  }, [receivedMessage, chat, sharedKey, encryptionReady]);



  const scroll = useRef();
  const imageRef = useRef();
  return (
    <>
      <div className="ChatBox-container">
        {chat ? (
          <>
            {/* chat-header */}
            <div className="chat-header">
              <div className="follower">
                <div>
                  <Avatar
                    user={userData}
                    profilePicture={userData?.profilePicture}
                    firstname={userData?.firstname}
                    lastname={userData?.lastname}
                    username={userData?.username}
                    size="50px"
                    className="followerImage"
                  />
                  <div className="name" style={{ fontSize: "0.9rem" }}>
                    <span>
                      {userData?.firstname} {userData?.lastname}
                    </span>
                  </div>
                </div>
              </div>
              <hr
                style={{
                  width: "95%",
                  border: "0.1px solid #ececec",
                  marginTop: "20px",
                }}
              />
            </div>
            <div className="chat-body">
              {messages.map((message, index) => (
                <div 
                  key={message._id || index}
                  ref={index === messages.length - 1 ? scroll : null} 
                  className={
                    String(message.senderId) === String(currentUser)
                      ? "message own"
                      : "message"
                  }
                >
                  <span>{message.text}</span>
                  <span>{format(message.createdAt)}</span>
                </div>
              ))}
            </div>
            <div className="chat-sender">
              <div onClick={() => imageRef.current.click()}>+</div>
              <InputEmoji
                value={newMessage}
                onChange={handleChange}
                onEnter={handleSend}
                disabled={!encryptionReady}
                placeholder={encryptionReady ? "Type a message... (Press Enter to send)" : "Initializing encryption..."}
              />
              <div 
                className="send-button button" 
                onClick={handleSend}
                style={{ opacity: encryptionReady ? 1 : 0.5, cursor: encryptionReady ? "pointer" : "not-allowed" }}
              >
                Send
              </div>
              <input
                type="file"
                name=""
                id=""
                style={{ display: "none" }}
                ref={imageRef}
              />
            </div>
          </>
        ) : (
          <span className="chatbox-empty-message">
            Tap on a chat to start conversation...
          </span>
        )}
      </div>
    </>
  );
};

export default ChatBox;