---
sidebar_position: 2
title: Postman Collection
description: Ready-to-use Postman collection for QuckChat API
---

# Postman Collection

A complete Postman collection for testing the QuckChat API with pre-configured requests and environments.

## Downloads

### Collection
[Download Postman Collection](/postman/QuckChat-API.postman_collection.json)

### Environments
- [Development Environment](/postman/QuckChat-Development.postman_environment.json)
- [Production Environment](/postman/QuckChat-Production.postman_environment.json)

## Import Instructions

### Method 1: Import Files

1. Open Postman
2. Click **Import** in the top left
3. Drag and drop the collection JSON file
4. Import the environment file separately

### Method 2: Import via Link

1. Click **Import** > **Link**
2. Paste the raw URL to the collection
3. Click **Continue** > **Import**

## Collection Structure

```
QuckChat API
├── Auth
│   ├── Send OTP
│   ├── Verify OTP
│   ├── Refresh Token
│   ├── Logout
│   ├── Get Sessions
│   ├── Terminate Session
│   ├── Setup 2FA
│   └── Enable 2FA
├── Users
│   ├── Get Current User
│   ├── Update Profile
│   ├── Search Users
│   ├── Get User by ID
│   ├── Update Status
│   └── Get Linked Devices
├── Conversations
│   ├── Get Conversations
│   ├── Create Private Conversation
│   ├── Create Group Conversation
│   ├── Get Conversation
│   ├── Update Conversation
│   ├── Add Members
│   ├── Remove Member
│   └── Mark All as Read
├── Messages
│   ├── Get Messages
│   ├── Get Message by ID
│   ├── Edit Message
│   ├── Delete Message
│   ├── Add Reaction
│   ├── Remove Reaction
│   ├── Mark as Read
│   └── Search Messages
├── Calls
│   ├── Initiate Call
│   ├── Get Call Details
│   ├── Answer Call
│   ├── Reject Call
│   ├── End Call
│   └── Get Call History
├── Upload
│   ├── Upload Image
│   ├── Upload Video
│   ├── Upload Audio
│   └── Upload File
└── Health
    └── Health Check
```

## Variables

The collection uses these variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `baseUrl` | API base URL | `http://localhost:3000/api/v1` |
| `accessToken` | JWT access token | Auto-set on login |
| `refreshToken` | JWT refresh token | Auto-set on login |
| `phoneNumber` | Test phone number | `+1234567890` |
| `userId` | Current user ID | Auto-set on login |
| `conversationId` | Active conversation | Auto-set on create |
| `messageId` | Target message ID | Set manually |
| `callId` | Active call ID | Auto-set on initiate |

## Authentication Flow

### 1. Send OTP
```
POST /auth/send-otp
{
  "phoneNumber": "+1234567890"
}
```

### 2. Verify OTP
```
POST /auth/verify-otp
{
  "phoneNumber": "+1234567890",
  "code": "123456"
}
```

The collection automatically extracts and stores tokens:
- `accessToken` - Used for all authenticated requests
- `refreshToken` - Used to refresh access token
- `userId` - Current user's ID

### 3. Use Protected Endpoints
All subsequent requests automatically include:
```
Authorization: Bearer {{accessToken}}
```

## Quick Start Testing

### 1. Setup
1. Import collection and environment
2. Select **QuckChat - Development** environment
3. Set your `phoneNumber` variable

### 2. Authenticate
1. Run **Send OTP** request
2. Note: In development, OTP might be logged or use a test code
3. Run **Verify OTP** with the code
4. Tokens are automatically saved

### 3. Test APIs
1. Run **Get Current User** to verify auth
2. Run **Get Conversations** to list chats
3. Create a conversation using **Create Private Conversation**
4. View messages using **Get Messages**

## Pre-request Scripts

The collection includes automatic scripts:

### Token Extraction
```javascript
// In Verify OTP post-response script
var jsonData = pm.response.json();
if (jsonData.accessToken) {
    pm.collectionVariables.set('accessToken', jsonData.accessToken);
}
if (jsonData.refreshToken) {
    pm.collectionVariables.set('refreshToken', jsonData.refreshToken);
}
if (jsonData.user && jsonData.user._id) {
    pm.collectionVariables.set('userId', jsonData.user._id);
}
```

### Resource ID Extraction
```javascript
// In Create Conversation post-response script
var jsonData = pm.response.json();
if (jsonData._id) {
    pm.collectionVariables.set('conversationId', jsonData._id);
}
```

## Testing Tips

### File Uploads
For upload endpoints, select a file in the **Body** tab:
1. Select **form-data**
2. Hover over the `file` key
3. Change type to **File**
4. Select your file

### Pagination
Many endpoints support pagination:
```
GET /messages/conversation/{{conversationId}}?page=1&limit=50
```

### Search
Use query parameters for search:
```
GET /users/search?q=john
GET /messages/search/query?q=hello
```

## Environment Configuration

### Development
```json
{
  "baseUrl": "http://localhost:3000/api/v1",
  "phoneNumber": "+1234567890"
}
```

### Production
```json
{
  "baseUrl": "https://api.quckchat.com/api/v1",
  "phoneNumber": ""
}
```

## Running Tests with Newman

```bash
# Install Newman
npm install -g newman

# Run collection with environment
newman run QuckChat-API.postman_collection.json \
  -e QuckChat-Development.postman_environment.json \
  --reporters cli,html

# Run specific folder
newman run QuckChat-API.postman_collection.json \
  -e QuckChat-Development.postman_environment.json \
  --folder "Auth"
```

## Troubleshooting

### 401 Unauthorized
- Token may have expired
- Run **Verify OTP** again to get new tokens
- Check that environment is selected

### 404 Not Found
- Verify `baseUrl` is correct
- Ensure the backend is running
- Check the resource ID exists

### Connection Refused
- Verify backend is running: `npm run start:dev`
- Check port (default: 3000)
- Verify no firewall blocking
