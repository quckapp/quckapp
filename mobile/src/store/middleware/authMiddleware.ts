import { Middleware } from '@reduxjs/toolkit';
import { login, register, logout } from '../slices/authSlice';
import { notificationService } from '../../services/notifications';

/**
 * Middleware to handle side effects after authentication
 * - Registers FCM token with backend after successful login/registration
 * - Unregisters FCM token from backend on logout (BEFORE clearing auth state)
 */
export const authMiddleware: Middleware = (store) => (next) => async (action) => {
  // Unregister FCM token BEFORE logout (while we still have auth token)
  if (logout.match(action)) {
    console.log('🔓 Logout detected, unregistering FCM token...');
    try {
      // Only try to unregister if we have a refresh token (i.e., actually logged in)
      const state = store.getState();
      if (state.auth.refreshToken) {
        await notificationService.unregisterTokenFromBackend();
      } else {
        console.log('⚠️ No refresh token found, skipping FCM token unregistration');
      }
    } catch (error) {
      console.error('❌ Failed to unregister FCM token on logout:', error);
    }
  }

  // Process the action
  const result = next(action);

  // Register FCM token after successful login
  if (login.fulfilled.match(action)) {
    console.log('✅ Login successful, registering FCM token...');
    notificationService.registerTokenIfAvailable().catch((error) => {
      console.error('❌ Failed to register FCM token after login:', error);
    });
  }

  // Register FCM token after successful registration
  if (register.fulfilled.match(action)) {
    console.log('✅ Registration successful, registering FCM token...');
    notificationService.registerTokenIfAvailable().catch((error) => {
      console.error('❌ Failed to register FCM token after registration:', error);
    });
  }

  return result;
};
