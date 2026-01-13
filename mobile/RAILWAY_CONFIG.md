# Railway Production Configuration Guide

This guide explains how to configure the mobile app to connect to your Railway backend in production.

## Overview

The mobile app uses different backend URLs for development and production:
- **Development**: Local network (e.g., `http://192.168.29.198:1900`)
- **Production**: Railway public URL (e.g., `https://your-service.up.railway.app`)

## Getting Your Railway Public URL

### Method 1: Railway Dashboard (Recommended)

1. Go to https://railway.app/
2. Navigate to your project
3. Click on your **backend service**
4. Go to **Settings** tab
5. Scroll to **Networking** section
6. Find **Public Networking** → **Generate Domain** (if not already generated)
7. Copy the domain (e.g., `quickchat-backend-production.up.railway.app`)

### Method 2: Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Get the service URL
railway status
```

## Configuring the Mobile App

### Step 1: Update API Configuration

Open `mobile/src/config/api.config.ts` and update the production URLs:

```typescript
// Replace with your actual Railway public URL
const PRODUCTION_API_URL = 'https://YOUR-SERVICE-NAME.up.railway.app/api/v1';
const PRODUCTION_SOCKET_URL = 'https://YOUR-SERVICE-NAME.up.railway.app';
```

**Example:**
```typescript
const PRODUCTION_API_URL = 'https://quickchat-backend-production.up.railway.app/api/v1';
const PRODUCTION_SOCKET_URL = 'https://quickchat-backend-production.up.railway.app';
```

### Step 2: Verify Configuration

The app automatically detects the environment:
- **Development mode** (`__DEV__ = true`): Uses local network URLs
- **Production build** (`__DEV__ = false`): Uses Railway public URLs

## Railway Internal URLs

Railway provides two types of URLs for each service:

### 1. Public URL (External Access)
- Format: `https://your-service.up.railway.app`
- Used by: Mobile apps, web browsers, external services
- **This is what you configure in the mobile app**

### 2. Internal URL (Service-to-Service)
- Format: `http://service-name.railway.internal:PORT`
- Example: `http://quickchat-backend.railway.internal:1900`
- Used by: Other services within the same Railway project
- Benefits: Faster, free (no egress charges), private

## When to Use Each URL

### Use Public URL When:
- ✅ Mobile app connecting to backend
- ✅ Web app connecting to backend
- ✅ External webhooks
- ✅ Testing from outside Railway

### Use Internal URL When:
- ✅ Backend service calling another backend service
- ✅ Microservices architecture within Railway
- ✅ Reducing latency between services
- ✅ Avoiding egress charges

## Example Configuration

### Current Setup

```typescript
// Development (Local)
API_URL: http://192.168.29.198:1900/api/v1
SOCKET_URL: http://192.168.29.201:1900

// Production (Railway Public)
API_URL: https://quickchat-backend-production.up.railway.app/api/v1
SOCKET_URL: https://quickchat-backend-production.up.railway.app

// Railway Internal (Service-to-Service)
INTERNAL_URL: http://quickchat-backend.railway.internal:1900
```

## Building for Production

### Expo Development Build
```bash
# Development mode (__DEV__ = true)
npx expo start
```

### Production Build
```bash
# Android
npx expo build:android

# iOS
npx expo build:ios
```

Production builds automatically use the Railway URLs configured in `api.config.ts`.

## Troubleshooting

### Issue: Cannot connect to backend in production

**Check:**
1. ✅ Railway service is deployed and running
2. ✅ Public domain is generated in Railway
3. ✅ `api.config.ts` has correct Railway URL
4. ✅ Backend CORS allows your mobile app origin
5. ✅ SSL certificate is valid (Railway provides automatic HTTPS)

### Issue: Socket connection fails

**Solution:**
- Ensure SOCKET_URL uses `https://` (not `http://`)
- Railway automatically handles WebSocket upgrades on HTTPS
- Check backend Socket.IO CORS configuration

### Issue: Local development not working

**Solution:**
- Make sure you're on the same WiFi network as your development machine
- Update the local IP address in `api.config.ts` if it changed
- Run `ipconfig` (Windows) or `ifconfig` (Mac/Linux) to get current IP

## Backend CORS Configuration

Make sure your Railway backend allows requests from the mobile app:

```typescript
// backend/.env (Production)
CORS_ORIGIN=https://your-mobile-app-domain.com,https://your-web-app.com
```

For development, you can use `*` but it's not recommended for production.

## Security Best Practices

1. **Never hardcode sensitive data** in the mobile app
2. **Use HTTPS** for all production URLs
3. **Configure CORS properly** on the backend
4. **Rotate secrets regularly** (JWT secrets, API keys)
5. **Use environment variables** for different builds

## Additional Resources

- [Railway Documentation](https://docs.railway.app/)
- [Railway Networking Guide](https://docs.railway.app/deploy/networking)
- [Expo Building for Production](https://docs.expo.dev/build/introduction/)
