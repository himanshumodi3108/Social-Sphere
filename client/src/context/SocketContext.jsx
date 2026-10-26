import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { io } from "socket.io-client";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useSelector((state) => state.authReducer?.authData || {});
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user?._id) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
        setOnlineUsers([]);
      }
      return;
    }

    const socketUrl = process.env.REACT_APP_SOCKET_URL || "http://localhost:8800";
    const socket = io(socketUrl, {
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("new-user-add", user._id);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("get-users", (users) => {
      setOnlineUsers(users || []);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [user?._id]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, onlineUsers, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  return context || { socket: null, onlineUsers: [], isConnected: false };
};

export default SocketContext;
