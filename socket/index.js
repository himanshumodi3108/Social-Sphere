import { Server } from "socket.io";
import { createServer } from "http";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

dotenv.config();

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  },
});

const PORT = process.env.PORT || 8800;

// Only start the server if this file is run directly (not imported)
// Check if this module is being run directly by comparing import.meta.url with process.argv[1]
const __filename = fileURLToPath(import.meta.url);
const isRunDirectly = process.argv[1] && (
  process.argv[1].replace(/\\/g, '/').endsWith(__filename.replace(/\\/g, '/')) ||
  process.argv[1].replace(/\\/g, '/').endsWith('socket/index.js')
);

// Only start server if run directly, not when imported
if (isRunDirectly) {
  httpServer.listen(PORT, () => {
    console.log(`Socket.io server listening on port ${PORT}`);
  });
} else {
  // When imported, export io but don't start the server
  // The server should be started separately by running: node socket/index.js
}

let activeUsers = [];
const userSocketMap = new Map(); // userId -> socketId mapping

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Add new user
  socket.on("new-user-add", (newUserId) => {
    if (!newUserId) return;
    
    // Remove user if already exists (handle reconnection)
    activeUsers = activeUsers.filter((user) => user.userId !== newUserId);
    userSocketMap.delete(newUserId);
    
    // Add new user
    activeUsers.push({ userId: newUserId, socketId: socket.id });
    userSocketMap.set(newUserId, socket.id);
    
    console.log("User added:", newUserId, "Active users:", activeUsers.length);
    
    // Send all active users to new user
    io.emit("get-users", activeUsers);
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    // Remove user from active users
    const user = activeUsers.find((user) => user.socketId === socket.id);
    if (user) {
      activeUsers = activeUsers.filter((user) => user.socketId !== socket.id);
      userSocketMap.delete(user.userId);
      console.log("User disconnected:", user.userId, "Active users:", activeUsers.length);
      // Send updated active users to all clients
      io.emit("get-users", activeUsers);
    }
  });

  // Send message to a specific user
  socket.on("send-message", (data) => {
    const { receiverId } = data;
    const receiverSocketId = userSocketMap.get(receiverId);
    
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("recieve-message", data);
      console.log("Message sent to:", receiverId);
    } else {
      console.log("User not online:", receiverId);
    }
  });

  // Send notification to a specific user
  socket.on("send-notification", (data) => {
    const { userId, notification } = data;
    const userSocketId = userSocketMap.get(userId);
    
    if (userSocketId) {
      io.to(userSocketId).emit("new-notification", notification);
      console.log("Notification sent to:", userId);
    } else {
      console.log("User not online for notification:", userId);
    }
  });

  // Join user's notification room
  socket.on("join-notifications", (userId) => {
    if (userId) {
      socket.join(`notifications-${userId}`);
      console.log("User joined notifications room:", userId);
    }
  });

  // Leave user's notification room
  socket.on("leave-notifications", (userId) => {
    if (userId) {
      socket.leave(`notifications-${userId}`);
      console.log("User left notifications room:", userId);
    }
  });

  // Typing indicator for chat
  socket.on("typing", (data) => {
    const { chatId, userId, isTyping } = data;
    socket.to(`chat-${chatId}`).emit("user-typing", { userId, isTyping });
  });

  // Join chat room
  socket.on("join-chat", (chatId) => {
    if (chatId) {
      socket.join(`chat-${chatId}`);
      console.log("User joined chat:", chatId);
    }
  });

  // Leave chat room
  socket.on("leave-chat", (chatId) => {
    if (chatId) {
      socket.leave(`chat-${chatId}`);
      console.log("User left chat:", chatId);
    }
  });
});
// Helper function to emit notification to a user (can be called from other modules)
export const emitNotification = (userId, notification) => {
  const userSocketId = userSocketMap.get(userId);
  if (userSocketId) {
    io.to(userSocketId).emit("new-notification", notification);
    return true;
  }
  // Also emit to notification room as fallback
  io.to(`notifications-${userId}`).emit("new-notification", notification);
  return false;
};

// Helper function to get online status
export const isUserOnline = (userId) => {
  return userSocketMap.has(userId);
};

export default io;

