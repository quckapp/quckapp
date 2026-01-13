---
sidebar_position: 5
title: Testing Guide
description: Complete guide to testing QuckChat features
---

# Setup and Testing Guide

## Quick Start

### Step 1: Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies (if not already done):**
   ```bash
   npm install
   ```

3. **Make sure MongoDB is running:**
   - Local MongoDB: `mongodb://localhost:27017/quickchat-dev`
   - Or use your MongoDB Atlas connection string in `.env`

4. **Start the backend server:**
   ```bash
   npm run start:dev
   ```

   You should see:
   ```
   [MongoDB] Connecting to development database...
   [Nest] Application successfully started
   Nest application is listening on port 3000
   ```

5. **Verify new modules are loaded:**
   Check the console output - you should see:
   - BroadcastModule initialized
   - CommunitiesModule initialized
   - StarredModule initialized

### Step 2: Mobile Setup

1. **Navigate to mobile directory:**
   ```bash
   cd mobile
   ```

2. **Install dependencies (if not already done):**
   ```bash
   npm install
   ```

3. **Start Metro bundler:**
   ```bash
   npx expo start
   ```

4. **Run on device/emulator:**
   - Press `a` for Android
   - Press `i` for iOS
   - Or scan QR code with Expo Go app

## Testing Each Feature

### 1. Broadcast Lists

#### Access

1. Open the app
2. Go to Conversations screen
3. Tap the three-dot menu in top right
4. Select "Broadcast Lists"

#### Test Steps

1. **View empty state:**
   - Should see megaphone icon
   - Message: "No broadcast lists yet"

2. **Check API connection:**
   - Open browser/Postman
   - Test: `GET http://localhost:3000/broadcast`
   - Should return `[]` (empty array) with 200 status

3. **Create broadcast list via API:**
   ```bash
   POST http://localhost:3000/broadcast
   Headers: Authorization: Bearer YOUR_TOKEN
   Body:
   {
     "name": "Test Broadcast",
     "recipients": ["USER_ID_1", "USER_ID_2"],
     "description": "Test description"
   }
   ```

4. **Verify in app:**
   - Pull to refresh or reopen screen
   - Should see the broadcast list
   - Should show recipient count

#### Troubleshooting

- **"Failed to load broadcast lists":**
  - Check backend is running on port 3000
  - Check JWT token is valid
  - Check console logs for API errors

### 2. Starred Messages

#### Access

1. Conversations screen - Menu - "Starred Messages"

#### Test Steps

1. **View empty state:**
   - Should see star icon
   - Message: "No starred messages"

2. **Star a message (API test):**
   ```bash
   POST http://localhost:3000/starred/MESSAGE_ID?conversationId=CONV_ID
   Headers: Authorization: Bearer YOUR_TOKEN
   ```

3. **View starred messages:**
   ```bash
   GET http://localhost:3000/starred
   Headers: Authorization: Bearer YOUR_TOKEN
   ```

4. **Verify in app:**
   - Should display starred message
   - Shows sender avatar and name
   - Shows conversation name
   - Shows message content

### 3. Communities

#### Access

1. Conversations screen - Menu - "Communities"

#### Test Steps

1. **View empty state:**
   - Should see people icon
   - Message: "No communities yet"

2. **Create community via API:**
   ```bash
   POST http://localhost:3000/communities
   Headers: Authorization: Bearer YOUR_TOKEN
   Body:
   {
     "name": "Tech Community",
     "description": "Tech discussions",
     "avatar": "https://example.com/avatar.jpg"
   }
   ```

3. **Verify in app:**
   - Should see community listed
   - Shows member count
   - Shows group count

4. **Test API endpoints:**
   ```bash
   # Get all communities
   GET http://localhost:3000/communities

   # Get specific community
   GET http://localhost:3000/communities/COMMUNITY_ID

   # Add members
   POST http://localhost:3000/communities/COMMUNITY_ID/members
   Body: { "memberIds": ["USER_ID_1", "USER_ID_2"] }
   ```

### 4. Linked Devices

#### Access

1. Profile tab - Settings - "Linked Devices"

#### Test Steps

1. **View empty state:**
   - Should see phone icon
   - Message: "No linked devices"

2. **Link a device via API:**
   ```bash
   POST http://localhost:3000/users/me/linked-devices
   Headers: Authorization: Bearer YOUR_TOKEN
   Body:
   {
     "deviceId": "device-12345",
     "deviceName": "iPhone 13",
     "deviceType": "mobile",
     "fcmToken": "optional-fcm-token"
   }
   ```

3. **Verify in app:**
   - Device should appear in list
   - Shows device name and type
   - Shows last active time

4. **Test unlink:**
   - Long press device or tap X icon
   - Confirm deletion
   - Device should be removed

### 5. Read All

#### Access

Conversations screen (button appears at top when unread messages exist)

#### Test Steps

1. **Create unread messages:**
   - Send messages from another user
   - Verify unread count appears

2. **See "Mark all as read" button:**
   - Should appear at top of conversations list
   - Blue highlight with checkmark icon

3. **Tap button:**
   - Shows "Success" alert
   - All unread counts reset to 0
   - Button disappears

4. **API test:**
   ```bash
   PUT http://localhost:3000/conversations/read-all
   Headers: Authorization: Bearer YOUR_TOKEN
   ```

## API Endpoint Testing

### Using Postman/Thunder Client

1. **Get Auth Token:**
   ```bash
   POST http://localhost:3000/auth/login
   Body:
   {
     "phoneNumber": "+1234567890",
     "password": "your-password"
   }
   ```
   Copy the `accessToken` from response.

2. **Set Authorization Header:**
   ```
   Authorization: Bearer YOUR_ACCESS_TOKEN
   ```

3. **Test Each Endpoint:**

   | Feature | Method | Endpoint | Test |
   |---------|--------|----------|------|
   | Broadcast | GET | `/broadcast` | List all |
   | Broadcast | POST | `/broadcast` | Create new |
   | Broadcast | GET | `/broadcast/:id` | Get one |
   | Broadcast | DELETE | `/broadcast/:id` | Delete |
   | Communities | GET | `/communities` | List all |
   | Communities | POST | `/communities` | Create new |
   | Communities | GET | `/communities/:id` | Get one |
   | Starred | GET | `/starred` | List all |
   | Starred | POST | `/starred/:messageId?conversationId=X` | Star message |
   | Starred | DELETE | `/starred/:messageId` | Unstar |
   | Linked Devices | GET | `/users/me/linked-devices` | List devices |
   | Linked Devices | POST | `/users/me/linked-devices` | Link device |
   | Linked Devices | DELETE | `/users/me/linked-devices/:id` | Unlink |
   | Read All | PUT | `/conversations/read-all` | Mark all read |

## Common Issues & Solutions

### Issue 1: "Cannot GET /broadcast"

**Solution:**
- Backend not running or wrong port
- Run: `cd backend && npm run start:dev`
- Check: http://localhost:3000 should be accessible

### Issue 2: "Failed to load X" in mobile app

**Solution:**
- Check API_URL in mobile config
- Verify: `mobile/src/config/api.config.ts`
- Should point to your backend (e.g., `http://10.0.2.2:3000` for Android emulator)

### Issue 3: "Module not found: BroadcastModule"

**Solution:**
- Ensure module is created: `backend/src/modules/broadcast/broadcast.module.ts`
- Check app.module.ts imports the module
- Restart backend server

### Issue 4: Empty arrays returned from API

**Solution:**
- Collections are empty (expected for new features)
- Create test data using Postman
- Or use MongoDB Compass to insert test documents

### Issue 5: 401 Unauthorized errors

**Solution:**
- Token expired - login again
- Token not sent - check Authorization header
- User not authenticated - check auth state in mobile app

### Issue 6: MongoDB connection errors

**Solution:**
- Check MongoDB is running: `mongod` or MongoDB Atlas
- Verify MONGODB_URI in `.env`
- Check firewall/network settings

## Verify Database Collections

Use MongoDB Compass or mongo shell:

```bash
# Connect to MongoDB
mongo mongodb://localhost:27017/quickchat-dev

# Check new collections exist
show collections

# Should see:
# - broadcast_lists
# - communities
# - starred_messages

# View documents
db.broadcast_lists.find().pretty()
db.communities.find().pretty()
db.starred_messages.find().pretty()

# Check user has linkedDevices field
db.users.findOne({}, { linkedDevices: 1 })
```

## Success Criteria

### Backend

- [x] Server starts without errors
- [x] All new modules load successfully
- [x] API endpoints return 200/201 status codes
- [x] MongoDB collections created automatically
- [x] JWT authentication works

### Mobile

- [x] All screens load without crashes
- [x] Navigation works smoothly
- [x] Empty states show properly
- [x] API calls complete successfully
- [x] Error messages are clear

### Integration

- [x] Backend and mobile communicate
- [x] Data persists in MongoDB
- [x] Real-time updates work (if applicable)
- [x] All CRUD operations functional

## Debugging Tips

### Enable Verbose Logging

**Backend:**
```typescript
// In main.ts or app.module.ts
app.useLogger(['log', 'error', 'warn', 'debug', 'verbose']);
```

**Mobile:**
```typescript
// In api.ts
console.log('API Request:', config.url, config.data);
console.log('API Response:', response.data);
```

### Check Network Requests

**Mobile (React Native):**
- Open React Native Debugger
- Go to Network tab
- See all API calls

**Backend:**
- Add logging middleware
- Check Nest.js logs in terminal

## Testing on Different Platforms

### Android Emulator

- API URL: `http://10.0.2.2:3000`
- Alternative: Use your machine's IP (e.g., `http://192.168.1.100:3000`)

### iOS Simulator

- API URL: `http://localhost:3000`
- Or use machine IP

### Physical Device

- Both devices must be on same WiFi
- Use machine's IP address: `http://192.168.X.X:3000`
- Check firewall allows connections on port 3000

## Quick Test Commands

```bash
# Terminal 1: Start Backend
cd backend
npm run start:dev

# Terminal 2: Start MongoDB (if local)
mongod

# Terminal 3: Start Mobile
cd mobile
npx expo start

# Terminal 4: Test APIs
curl http://localhost:3000/broadcast \
  -H "Authorization: Bearer YOUR_TOKEN"
```
