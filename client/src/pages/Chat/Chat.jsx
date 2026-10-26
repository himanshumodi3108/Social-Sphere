import React, { useState, useEffect } from "react";
import ChatBox from "../../components/ChatBox/ChatBox";
import GroupChatBox from "../../components/GroupChatBox/GroupChatBox";
import Conversation from "../../components/Coversation/Conversation";
import LogoSearch from "../../components/LogoSearch/LogoSearch";
import NavIcons from "../../components/NavIcons/NavIcons";
import "./Chat.css";
import { userChats } from "../../api/ChatRequests";
import { useSelector } from "react-redux";
import { useSocket } from "../../context/SocketContext";

const Chat = () => {
  const { user } = useSelector((state) => state.authReducer.authData);
  const { socket, onlineUsers } = useSocket();

  const [chats, setChats] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [sendMessage, setSendMessage] = useState(null);
  const [receivedMessage, setReceivedMessage] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const getChats = async () => {
      try {
        if (user?._id) {
          const { data } = await userChats(user._id);
          if (isMounted) setChats(data);
        }
      } catch (error) {
        // console.log(error);
      }
    };

    getChats();

    return () => {
      isMounted = false;
    };
  }, [user?._id]);

  // Send message to socket server via centralized SocketContext
  useEffect(() => {
    if (sendMessage !== null && socket) {
      socket.emit("send-message", sendMessage);
    }
  }, [sendMessage, socket]);

  // Receive message from socket server for individual chats
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (data) => {
      if (currentChat && currentChat.type !== 'group') {
        setReceivedMessage(data);
      }
    };

    socket.on("recieve-message", handleReceiveMessage);

    return () => {
      socket.off("recieve-message", handleReceiveMessage);
    };
  }, [socket, currentChat]);

  const checkOnlineStatus = (chat) => {
    if (chat.type === 'group') {
      return false;
    }
    const chatMember = chat.members?.find((member) => member !== user._id);
    return onlineUsers.some((u) => u.userId === chatMember);
  };

  return (
    <div className="Chat">
      {/* Left Side */}
      <div className="Left-side-chat">
        <div className="hide-in-mobile">
          <LogoSearch />
        </div>
        <div className="Chat-container" style={{ overflowX: "hidden" }}>
          <h3 className="yep">Chats</h3>
          <div className="Chat-list">
            {chats.map((chat) => (
              <div
                key={chat._id}
                onClick={() => {
                  setCurrentChat(chat);
                }}
              >
                <Conversation
                  data={chat}
                  currentUser={user._id}
                  online={checkOnlineStatus(chat)}
                  isActive={
                    currentChat?._id === chat._id ||
                    (currentChat?.type === 'group' && currentChat?.groupId === chat.groupId)
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side */}
      <div className="Right-side-chat">
        <div className="nav-icons-container">
          <NavIcons />
        </div>

        <div className="chatbox-wrapper">
          {currentChat?.type === 'group' ? (
            <GroupChatBox
              groupId={currentChat.groupId}
              currentUser={user._id}
              groupName={currentChat.name}
            />
          ) : (
            <ChatBox
              chat={currentChat}
              currentUser={user._id}
              setSendMessage={setSendMessage}
              receivedMessage={receivedMessage}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;
