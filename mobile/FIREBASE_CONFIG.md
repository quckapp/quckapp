# Firebase Configuration Management

This project uses separate Firebase configurations for development and production environments.

## Configuration Files

- `google-services.dev.json` - Development Firebase configuration (quckchat-dev)
- `google-services.prod.json` - Production Firebase configuration (quckchat-2a047)
- `google-services.json` - Active configuration (auto-generated, not committed to git)

## Switching Between Environments

### Using npm scripts (Recommended)

```bash
# Switch to development Firebase
npm run firebase:dev

# Switch to production Firebase
npm run firebase:prod
```

### Using Node directly

```bash
# Development
node scripts/firebase-config.js dev

# Production
node scripts/firebase-config.js prod
```

## Important Notes

⚠️ **After switching Firebase configurations, you MUST rebuild the app:**

```bash
# For Android
npx expo run:android

# For iOS
npx expo run:ios
```

The Firebase configuration is baked into the native build, so hot reloading won't pick up changes.

## Environment Details

### Development (quckchat-dev)
- **Project ID:** quckchat-dev
- **Project Number:** 641051509982
- **Use for:** Local development, testing, staging

### Production (quckchat-2a047)
- **Project ID:** quckchat-2a047
- **Project Number:** 866846360242
- **Use for:** Production releases, app store builds

## Building for Production

Before building a production release:

1. Switch to production Firebase:
   ```bash
   npm run firebase:prod
   ```

2. Verify the configuration:
   ```bash
   cat google-services.json
   # Should show quckchat-2a047 project
   ```

3. Build the app:
   ```bash
   # For EAS builds
   eas build --platform android --profile production

   # Or local build
   npx expo run:android --variant release
   ```

## Troubleshooting

### Firebase not initialized error
- Make sure you've switched to the correct environment
- Rebuild the app after switching
- Check that `android/app/google-services.json` exists

### Push notifications not working
- Verify you're using the correct Firebase project
- Check that FCM is enabled in Firebase Console
- Ensure backend is using matching Firebase credentials

## Git Configuration

The active `google-services.json` file should be in `.gitignore` to avoid committing environment-specific configs. The source files (`google-services.dev.json` and `google-services.prod.json`) are committed to the repository.
