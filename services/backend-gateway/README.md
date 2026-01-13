# QuckChat Backend

Production-ready NestJS backend for QuckChat - a real-time chat application with audio/video calling capabilities.

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=flat&logo=socket.io&logoColor=white)](https://socket.io/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)

## 🚀 Features

- ✅ **JWT Authentication** - Secure authentication with refresh tokens
- ✅ **Real-time Messaging** - Socket.io for instant messaging
- ✅ **WebRTC Signaling** - Audio and video calling support
- ✅ **End-to-End Encryption** - AES encryption for messages
- ✅ **File Upload** - Images, videos, audio, and files
- ✅ **Push Notifications** - Firebase Cloud Messaging integration
- ✅ **Message Features** - Reactions, read receipts, typing indicators
- ✅ **Group Chat** - Create and manage group conversations
- ✅ **MongoDB** - Scalable NoSQL database with Mongoose
- ✅ **Docker Support** - Easy deployment with Docker Compose

## 📋 Prerequisites

- Node.js 18+ or 20+
- MongoDB 5+ or 7+
- npm or yarn

## 🛠️ Installation

1. **Clone the repository**
```bash
git clone https://github.com/QuckChat/quckchat-backend.git
cd quckchat-backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env
```

Edit `.env` file with your configuration:
```env
MONGODB_URI=mongodb://localhost:27017/quckchat
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-refresh-secret-key
ENCRYPTION_KEY=your-32-character-encryption-key
```

4. **Start MongoDB**
```bash
# Using Docker
docker-compose up -d mongodb

# Or use local MongoDB installation
```

5. **Run the application**
```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

The server will start at `http://localhost:3000`

## 🐳 Docker Deployment

```bash
# Start both MongoDB and backend
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 📚 API Documentation

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh access token

### Users
- `GET /api/v1/users/me` - Get current user profile
- `PUT /api/v1/users/me` - Update profile
- `GET /api/v1/users/search?q=query` - Search users

### Conversations
- `GET /api/v1/conversations` - Get user conversations
- `POST /api/v1/conversations/single` - Create single conversation
- `POST /api/v1/conversations/group` - Create group conversation

### Messages
- `GET /api/v1/messages/conversation/:id` - Get conversation messages
- `PUT /api/v1/messages/:id` - Edit message
- `DELETE /api/v1/messages/:id` - Delete message

### Upload
- `POST /api/v1/upload/image` - Upload image
- `POST /api/v1/upload/video` - Upload video
- `POST /api/v1/upload/audio` - Upload audio
- `POST /api/v1/upload/file` - Upload file

## 🔌 WebSocket Events

### Chat Namespace (`/chat`)

**Client → Server:**
- `message:send` - Send message
- `message:edit` - Edit message
- `message:delete` - Delete message
- `message:reaction:add` - Add reaction
- `typing:start` - Start typing
- `typing:stop` - Stop typing
- `message:read` - Mark message as read

**Server → Client:**
- `message:new` - New message received
- `message:edited` - Message edited
- `message:deleted` - Message deleted
- `typing:start` - User started typing
- `user:online` - User came online
- `user:offline` - User went offline

### WebRTC Namespace (`/webrtc`)

**Client → Server:**
- `call:initiate` - Start a call
- `call:answer` - Answer incoming call
- `call:reject` - Reject incoming call
- `call:end` - End active call
- `webrtc:offer` - Send WebRTC offer
- `webrtc:answer` - Send WebRTC answer
- `webrtc:ice-candidate` - Send ICE candidate

**Server → Client:**
- `call:incoming` - Incoming call notification
- `call:participant:joined` - Participant joined call
- `call:ended` - Call ended
- `webrtc:offer` - Receive WebRTC offer
- `webrtc:answer` - Receive WebRTC answer

## 🏗️ Project Structure

```
src/
├── common/
│   └── logger/              # Winston logger service
├── gateways/
│   ├── chat.gateway.ts      # Real-time messaging
│   └── webrtc.gateway.ts    # WebRTC signaling
├── modules/
│   ├── auth/                # Authentication module
│   ├── users/               # Users module
│   ├── conversations/       # Conversations module
│   ├── messages/            # Messages module
│   ├── upload/              # File upload module
│   └── notifications/       # Push notifications module
├── app.module.ts
└── main.ts
```

## 🔐 Security Features

- JWT authentication with refresh tokens
- Password hashing with bcrypt
- Message encryption (AES)
- Input validation with class-validator
- Rate limiting
- CORS protection
- Helmet security headers

## 🌐 Environment Variables

See `.env.example` for all configuration options:

- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 3000)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT secret key
- `JWT_REFRESH_SECRET` - Refresh token secret
- `ENCRYPTION_KEY` - Message encryption key
- `FIREBASE_*` - Firebase credentials for push notifications
- `TURN_SERVER_URL` - TURN server for WebRTC
- `STUN_SERVER_URL` - STUN server for WebRTC

## 📱 Mobile App

This backend works with our React Native mobile app:
👉 [QuckChat Mobile](https://github.com/QuckChat/quckchat-mobile)

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 📄 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

For issues and questions, please open an issue on GitHub.

---

Built with ❤️ using NestJS, Socket.io, and WebRTC
