import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import dashboardReducer from './slices/dashboardSlice';
import usersReducer from './slices/usersSlice';
import reportsReducer from './slices/reportsSlice';
import analyticsReducer from './slices/analyticsSlice';
import auditLogsReducer from './slices/auditLogsSlice';
import systemReducer from './slices/systemSlice';
import broadcastReducer from './slices/broadcastSlice';
import conversationsReducer from './slices/conversationsSlice';
import settingsReducer from './slices/settingsSlice';
import toastReducer from './slices/toastSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    dashboard: dashboardReducer,
    users: usersReducer,
    reports: reportsReducer,
    analytics: analyticsReducer,
    auditLogs: auditLogsReducer,
    system: systemReducer,
    broadcast: broadcastReducer,
    conversations: conversationsReducer,
    settings: settingsReducer,
    toast: toastReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
