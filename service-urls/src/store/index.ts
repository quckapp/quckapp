import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import serviceUrlsReducer from './slices/serviceUrlsSlice';
import toastReducer from './slices/toastSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    serviceUrls: serviceUrlsReducer,
    toast: toastReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
