---
sidebar_position: 3
title: Railway Deployment
description: Deploy QuckChat to Railway
---

# Railway Environment Variables Setup

This guide helps you configure environment variables for production deployment on Railway.

## Required Environment Variables

### Application Settings
```bash
NODE_ENV=production
PORT=1900
API_PREFIX=api/v1
```

### MongoDB (Production)
```bash
MONGODB_URI_PROD=mongodb://mongo:password@host.proxy.rlwy.net:43740/quickchat?authSource=admin
```

### JWT Secrets
**IMPORTANT: Generate new strong secrets for production!**
```bash
JWT_SECRET=your-production-jwt-secret-change-this
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-production-refresh-secret-change-this
JWT_REFRESH_EXPIRES_IN=30d
```

### Encryption
**IMPORTANT: Generate a strong 32-character key!**
```bash
ENCRYPTION_KEY=your-32-character-encryption-key
```

### CORS Origins
Update with your production frontend URLs:
```bash
CORS_ORIGIN=https://your-mobile-app.com,https://your-web-app.com
```

### File Upload
```bash
MAX_FILE_SIZE=10485760
UPLOAD_DIRECTORY=./uploads
```

### Firebase (Push Notifications)
```bash
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
```

For `FIREBASE_PRIVATE_KEY`, use this exact format (as a single line with \\n):
```bash
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgk...\n-----END PRIVATE KEY-----
```

### WebRTC (Optional)
```bash
STUN_SERVER_URL=stun:stun.l.google.com:19302
TURN_SERVER_URL=
TURN_USERNAME=
TURN_CREDENTIAL=
```

### Rate Limiting
```bash
THROTTLE_TTL=60
THROTTLE_LIMIT=100
```

## How to Set Environment Variables on Railway

### Option 1: Railway Dashboard (Recommended)
1. Go to your Railway project dashboard
2. Click on your service
3. Go to the "Variables" tab
4. Click "New Variable" for each variable above
5. Paste the variable name and value
6. Click "Add"
7. Railway will automatically redeploy with new variables

### Option 2: Railway CLI
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Set variables
railway variables set NODE_ENV=production
railway variables set FIREBASE_PROJECT_ID=your-project-id
# ... repeat for all variables
```

### Option 3: Bulk Import (Fastest)
1. Create a file `railway.env` with all variables (format: KEY=VALUE)
2. In Railway Dashboard → Variables tab
3. Click "Raw Editor"
4. Paste all variables
5. Click "Update Variables"

## Important Notes

1. **Never commit .env files** - They're in .gitignore for security
2. **Use different secrets** for production vs development
3. **FIREBASE_PRIVATE_KEY format**: Must use `\n` (two characters: backslash + n) instead of actual newlines in Railway
4. **MONGODB_URI_PROD**: Should be set to your Railway MongoDB connection string
5. **Test after deployment**: Check logs to ensure Firebase initializes successfully

## Verification

After setting variables, check Railway logs for:
```
[MongoDB] Connecting to production database...
Firebase initialized successfully
```

If you see `Firebase credentials not configured`, double-check the three Firebase variables.

## Railway-Specific Configuration

### Procfile
```
web: npm run start:prod
```

### railway.json
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run start:prod",
    "healthcheckPath": "/api/v1/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Build Settings
- **Build Command**: `npm run build`
- **Start Command**: `npm run start:prod`
- **Watch Paths**: Leave empty for automatic detection

## Troubleshooting

### Build Fails
- Check Node.js version compatibility
- Verify all dependencies are in `package.json`
- Check build logs for specific errors

### App Crashes on Start
- Verify all required environment variables are set
- Check MongoDB connection string
- Review application logs

### Firebase Not Working
- Ensure `FIREBASE_PRIVATE_KEY` uses `\n` for newlines
- Verify project ID matches Firebase Console
- Check client email is correct
