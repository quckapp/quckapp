# QuckChat Mobile

Production-ready React Native chat application with real-time messaging and audio/video calling.

[![React Native](https://img.shields.io/badge/React_Native-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-000020?style=flat&logo=expo&logoColor=white)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Redux](https://img.shields.io/badge/Redux-593D88?style=flat&logo=redux&logoColor=white)](https://redux.js.org/)
[![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=flat&logo=socket.io&logoColor=white)](https://socket.io/)

## 🚀 Features

- ✅ **User Authentication** - Login and registration
- ✅ **Real-time Chat** - Instant messaging with Socket.io
- ✅ **Audio/Video Calls** - WebRTC-powered calling
- ✅ **Group Conversations** - Create and manage group chats
- ✅ **Message Reactions** - React to messages with emoji
- ✅ **Read Receipts** - See when messages are read
- ✅ **Typing Indicators** - See when others are typing
- ✅ **Push Notifications** - Stay updated with new messages
- ✅ **File Sharing** - Share images, videos, and files
- ✅ **User Search** - Find and connect with users
- ✅ **Offline Support** - Redux Persist for offline data
- ✅ **Modern UI** - Clean and intuitive interface

## 📋 Prerequisites

- Node.js 18+ or 20+
- npm or yarn
- Expo CLI
- iOS Simulator (Mac) or Android Emulator
- OR physical device with Expo Go app

## 🛠️ Installation

1. **Clone the repository**
```bash
git clone https://github.com/QuckChat/quckchat-mobile.git
cd quckchat-mobile
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure API endpoints**

Edit the following files to point to your backend:

**src/services/api.ts:**
```typescript
const API_URL = __DEV__
  ? 'http://localhost:3000/api/v1'  // or your local IP
  : 'https://your-production-backend.com/api/v1';
```

**src/services/socket.ts & webrtc.ts:**
```typescript
const SOCKET_URL = __DEV__
  ? 'http://localhost:3000'
  : 'https://your-production-backend.com';
```

> **Note:**
> - iOS Simulator: use `http://localhost:3000`
> - Android Emulator: use `http://10.0.2.2:3000`
> - Physical Device: use `http://YOUR_LOCAL_IP:3000`

4. **Start the app**
```bash
npm start
```

Then:
- Press `i` for iOS Simulator
- Press `a` for Android Emulator
- Scan QR code with Expo Go app for physical device

## 📱 Running on Devices

### iOS (Mac required)
```bash
npm run ios
```

### Android
```bash
npm run android
```

### Web (for testing)
```bash
npm run web
```

## 🏗️ Project Structure

```
src/
├── navigation/              # Navigation setup
│   ├── RootNavigator.tsx   # Root navigation
│   ├── AuthNavigator.tsx   # Auth screens
│   └── MainNavigator.tsx   # Main app screens
├── screens/
│   ├── auth/               # Authentication screens
│   │   ├── LoginScreen.tsx
│   │   └── RegisterScreen.tsx
│   ├── main/               # Main app screens
│   │   ├── ConversationsScreen.tsx
│   │   ├── ChatScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   ├── NewConversationScreen.tsx
│   │   └── NewGroupScreen.tsx
│   └── CallScreen.tsx      # WebRTC calling screen
├── services/               # API & WebSocket services
│   ├── api.ts             # HTTP client (Axios)
│   ├── socket.ts          # Socket.io client
│   ├── webrtc.ts          # WebRTC service
│   └── notifications.ts   # Push notifications
├── store/                  # Redux store
│   ├── index.ts           # Store configuration
│   └── slices/            # Redux slices
│       ├── authSlice.ts
│       ├── conversationsSlice.ts
│       ├── messagesSlice.ts
│       ├── callSlice.ts
│       └── usersSlice.ts
└── App.tsx                 # App entry point
```

## 🔧 Technology Stack

- **React Native** - Cross-platform mobile framework
- **Expo SDK 50** - Development platform
- **TypeScript** - Type safety
- **Redux Toolkit** - State management
- **React Navigation 6** - Navigation
- **Socket.io Client** - Real-time communication
- **react-native-webrtc** - WebRTC for calls
- **Gifted Chat** - Chat UI components
- **Expo Notifications** - Push notifications
- **Redux Persist** - Offline data persistence

## 🔐 Backend Integration

This app requires the QuckChat backend to function:
👉 [QuckChat Backend](https://github.com/QuckChat/quckchat-backend)

Follow the backend setup instructions to run the API server.

## 📲 Building for Production

### Using EAS Build (Recommended)

1. **Install EAS CLI**
```bash
npm install -g eas-cli
```

2. **Login to Expo**
```bash
eas login
```

3. **Configure build**
```bash
eas build:configure
```

4. **Build for Android**
```bash
eas build --platform android
```

5. **Build for iOS**
```bash
eas build --platform ios
```

6. **Submit to stores**
```bash
# Android
eas submit --platform android

# iOS
eas submit --platform ios
```

## 🎨 Key Screens

### Authentication
- **Login Screen** - Email/password login
- **Register Screen** - New user registration

### Main App
- **Conversations** - List of all chats with unread counts
- **Chat** - Real-time messaging with reactions and typing indicators
- **Call** - Audio/video calling interface
- **Profile** - User profile and settings
- **New Conversation** - Search and start new chats
- **New Group** - Create group conversations

## 🔔 Push Notifications

To enable push notifications:

1. Create a Firebase project
2. Download `google-services.json` (Android) and `GoogleService-Info.plist` (iOS)
3. Add Firebase configuration to your Expo project
4. Configure backend with Firebase Admin SDK credentials

## 🧪 Development Tips

### Testing on Different Devices

**iOS Simulator:**
```bash
npm run ios
```

**Android Emulator:**
```bash
npm run android
```

**Physical Device:**
1. Install Expo Go app
2. Run `npm start`
3. Scan QR code

### Debugging

- Use React Native Debugger
- Enable Remote JS Debugging in dev menu
- Check console logs in terminal

### Hot Reloading

- Shake device to open dev menu
- Enable Fast Refresh for instant updates

## 🌐 Environment Configuration

The app automatically detects development vs production:

```typescript
// Development (local backend)
__DEV__ === true

// Production (deployed backend)
__DEV__ === false
```

Update URLs in:
- `src/services/api.ts`
- `src/services/socket.ts`
- `src/services/webrtc.ts`

## 📝 Scripts

```bash
# Start Expo dev server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run on Web
npm run web

# Lint code
npm run lint

# Format code
npm run format

# Build for production
npm run build:android
npm run build:ios
```

## 🐛 Troubleshooting

### Cannot connect to backend
- Verify backend is running
- Check API URLs in service files
- Use correct IP for physical devices
- Disable VPN/firewall if blocking

### WebRTC not working
- Grant camera/microphone permissions
- Test on physical device (simulators may not support WebRTC)
- Configure TURN server in backend for production

### Build errors
- Clear cache: `expo start -c`
- Delete node_modules: `rm -rf node_modules && npm install`
- Check Expo SDK compatibility

## 📄 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

For issues and questions, please open an issue on GitHub.

---

Built with ❤️ using React Native, Expo, and WebRTC
