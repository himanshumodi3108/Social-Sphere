# SocialSphere

A modern, full-stack social media platform built with React, Node.js, Express, MongoDB, and Socket.io. SocialSphere enables users to connect, share posts, chat securely, create stories, join groups, and interact in real-time.

## 🌟 Features

### Core Features
- **User Authentication & Authorization** - Secure JWT-based authentication with protected routes and logout confirmation
- **Social Feed** - Timeline posts from friends and followed users with real-time updates
- **Post Management** - Create, edit, delete, like, and comment on posts with privacy controls
  - **Rich Media Posts** - Upload photos and videos
  - **Location Tagging** - Add location information to posts
  - **Post Scheduling** - Schedule posts for future publication
  - **Privacy Controls** - Public, Friends, or Private post visibility
  - **Hashtag Support** - Use #hashtags to tag and categorize posts
- **Real-time Chat** - End-to-end encrypted messaging with Socket.io for instant communication
- **Stories** - 24-hour disappearing stories with reactions and views
- **Groups** - Create and join communities based on interests
- **Notifications** - Real-time notifications for likes, comments, messages, and new posts
- **User Profiles** - Customizable profiles with privacy settings
- **Search** - Search for users, posts, and groups
- **Follow/Unfollow** - Connect with other users
- **Save Posts** - Bookmark favorite posts for later
- **Landing Page** - Beautiful landing page with features showcase

### Security Features
- End-to-end encryption for chat messages (AES-GCM)
- JWT token-based authentication
- Password hashing with bcrypt
- Rate limiting for API endpoints
- Helmet.js for security headers
- Input validation and sanitization

### UI/UX Features
- Responsive design for all devices (mobile, tablet, desktop)
- Toast notifications using Sonner
- Modal confirmations for critical actions (logout, etc.)
- Real-time updates via Socket.io
- Loading states and error handling
- Smooth animations and transitions
- Keyboard shortcuts (Enter to submit, Shift+Enter for new line)
- Dynamic view management (Saved Posts, Create Group, Home navigation)

## 🏗️ Tech Stack

### Frontend
- **React 17** - UI library
- **Redux** - State management with Redux Persist
- **React Router DOM** - Client-side routing
- **Axios** - HTTP client
- **Socket.io Client** - Real-time communication
- **Mantine UI** - UI component library
- **Sonner** - Toast notifications
- **React Input Emoji** - Emoji picker
- **Timeago.js** - Relative time formatting

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database with Mongoose ODM
- **Socket.io** - Real-time bidirectional communication
- **JWT** - Authentication tokens
- **Bcrypt** - Password hashing
- **Multer** - File upload handling
- **Helmet** - Security middleware
- **Winston** - Logging

## 📁 Project Structure

```
SocialSphere/
├── client/                 # React frontend application
│   ├── public/            # Static assets
│   ├── src/
│   │   ├── actions/       # Redux actions
│   │   ├── api/           # API request functions
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── reducers/      # Redux reducers
│   │   ├── store/         # Redux store configuration
│   │   ├── utils/         # Utility functions (encryption, etc.)
│   │   └── App.js         # Main app component
│   └── package.json
│
├── server/                # Express backend API
│   ├── controllers/       # Route controllers
│   ├── models/           # Mongoose models
│   ├── routes/           # API routes
│   ├── middleware/       # Custom middleware
│   ├── utils/            # Utility functions
│   ├── public/           # Uploaded files
│   └── index.js          # Server entry point
│
├── socket/               # Socket.io server
│   └── index.js         # Socket server configuration
│
└── package.json         # Root package.json with scripts
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- MongoDB database (local or cloud like MongoDB Atlas)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd SocialSphere
   ```

2. **Install dependencies**
   ```bash
   # Install all dependencies (server, client, socket)
   npm run install-all
   
   # Or install individually:
   npm run install-server
   npm run install-client
   npm run install-socket
   ```

3. **Environment Setup**

   Create `.env` files in each directory:

   **`server/.env`**
   ```env
   MONGO_URI=your_mongodb_connection_string
   JWTKEY=your_jwt_secret_key
   PORT=5000
   FRONTEND_URL=http://localhost:3000
   ```

   **`client/.env`**
   ```env
   REACT_APP_PUBLIC_FOLDER=http://localhost:5000/images/
   REACT_APP_BACKEND_URL=http://localhost:5000
   REACT_APP_SOCKET_URL=http://localhost:8800
   REACT_APP_GENERATE_SOURCEMAP=false
   ```

   **`socket/.env`**
   ```env
   PORT=8800
   FRONTEND_URL=http://localhost:3000
   BACKEND_URL=http://localhost:5000
   ```

### Running the Application

You need to run three servers simultaneously:

1. **Start the Backend Server**
   ```bash
   npm run start-server
   # Or: cd server && npm start
   ```
   Server runs on `http://localhost:5000`

2. **Start the Socket Server**
   ```bash
   npm run start-socket
   # Or: cd socket && npm start
   ```
   Socket server runs on `http://localhost:8800`

3. **Start the Frontend Client**
   ```bash
   npm run start-client
   # Or: cd client && npm start
   ```
   Client runs on `http://localhost:3000`

The application will automatically open in your browser at `http://localhost:3000`.

## 📝 Available Scripts

### Root Level
- `npm run install-all` - Install all dependencies
- `npm run install-server` - Install server dependencies
- `npm run install-client` - Install client dependencies
- `npm run install-socket` - Install socket dependencies
- `npm run start-server` - Start backend server
- `npm run start-client` - Start frontend client
- `npm run start-socket` - Start socket server

### Client Scripts
- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests

### Server Scripts
- `npm start` - Start server with nodemon
- `npm run build` - Install dependencies

## 🔐 Security

- **Authentication**: JWT tokens stored securely
- **Password Hashing**: Bcrypt with salt rounds
- **Encryption**: AES-GCM for end-to-end chat encryption
- **Rate Limiting**: Prevents API abuse
- **Input Validation**: Express-validator for request validation
- **Security Headers**: Helmet.js for HTTP headers
- **CORS**: Configured for allowed origins only

## 🗄️ Database Models

- **User** - User accounts, profiles, and settings
- **Post** - User posts with privacy settings, media (images/videos), location, and scheduling
  - Supports image and video uploads
  - Location tagging with name and coordinates
  - Scheduled publication date/time
  - Privacy levels (public, friends, private)
- **Comment** - Comments on posts with likes
- **Chat** - Chat conversations between users
- **Message** - Encrypted chat messages
- **Story** - 24-hour disappearing stories
- **Notification** - User notifications for various activities
- **Group** - User groups/communities
- **GroupPost** - Posts within groups

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `PUT /api/users/:id/follow` - Follow user
- `PUT /api/users/:id/unfollow` - Unfollow user
- `GET /api/users/:id/saved` - Get saved posts

### Posts
- `POST /api/posts` - Create post (supports image, video, location, scheduledAt)
- `GET /api/posts/:id` - Get post by ID
- `PUT /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post
- `PUT /api/posts/:id/like` - Like/unlike post
- `POST /api/posts/:id/comment` - Add comment
- `PUT /api/posts/:id/comment/:commentId/like` - Like comment
- `GET /api/posts/:id/timeline` - Get timeline posts (paginated)

### Chat & Messages
- `GET /api/chat` - Get user chats
- `POST /api/chat` - Create chat
- `GET /api/message/:chatId` - Get messages
- `POST /api/message` - Send message

### Stories
- `POST /api/story` - Create story
- `GET /api/story/timeline` - Get timeline stories
- `GET /api/story/:userId` - Get user stories
- `PUT /api/story/:storyId/view` - View story
- `PUT /api/story/:storyId/react` - React to story
- `DELETE /api/story/:storyId` - Delete story

### Groups
- `GET /api/group` - Get all groups
- `POST /api/group` - Create group
- `GET /api/group/:id` - Get group by ID
- `PUT /api/group/:id/join` - Join group
- `PUT /api/group/:id/leave` - Leave group

### Notifications
- `GET /api/notification` - Get user notifications
- `PUT /api/notification/:id/read` - Mark notification as read

### Search
- `GET /api/search?q=query` - Search users, posts, groups

## 🔄 Real-time Features

Socket.io is used for real-time updates:
- **New Post Notifications** - Instant notifications when followed users create posts
- **New Message Notifications** - Real-time message delivery
- **Story Notifications** - Notifications when followed users create stories
- **Real-time Chat Messages** - Instant message delivery with encryption
- **Live Notification Updates** - Real-time notification bell updates
- **Online Status** - Track user online/offline status
- **Typing Indicators** - See when users are typing in chat

## 🎨 Key Components

### Frontend Components
- **Posts** - Display and manage posts with real-time updates
- **PostShare** - Create new posts with media, location, and scheduling
  - Photo and video upload
  - Location tagging
  - Post scheduling
  - Privacy controls
  - Hashtag support
- **ChatBox** - Chat interface with end-to-end encryption
- **Stories** - Story viewer and creator
- **ProfileModal** - User profile editor
- **NotificationBell** - Notification center with real-time updates
- **Groups** - Group management and creation
- **PostSide** - Central feed with dynamic views (Posts, Saved Posts, Create Group)
- **Landing** - Beautiful landing page with features showcase