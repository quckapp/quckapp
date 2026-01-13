import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers } from 'redux';
import authReducer from './slices/authSlice';
import conversationsReducer from './slices/conversationsSlice';
import messagesReducer from './slices/messagesSlice';
import callReducer from './slices/callSlice';
import usersReducer from './slices/usersSlice';
import settingsReducer from './slices/settingsSlice';
import networkReducer from './slices/networkSlice';
import statusReducer from './slices/statusSlice';
import callsHistoryReducer from './slices/callsHistorySlice';
import communitiesReducer from './slices/communitiesSlice';
import huddleReducer from './slices/huddleSlice';
import { authMiddleware } from './middleware/authMiddleware';

const rootReducer = combineReducers({
  auth: authReducer,
  conversations: conversationsReducer,
  messages: messagesReducer,
  call: callReducer,
  users: usersReducer,
  settings: settingsReducer,
  network: networkReducer,
  status: statusReducer,
  callsHistory: callsHistoryReducer,
  communities: communitiesReducer,
  huddle: huddleReducer,
});

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  // Persist all important data so app works offline and survives restarts
  whitelist: [
    'auth',           // User authentication state
    'settings',       // App settings
    'conversations',  // Chat conversations list
    'messages',       // All messages (cached)
    'users',          // User profiles and online status
    'callsHistory',   // Call history
    'communities',    // Communities data
  ],
  // Don't persist these (they should be fresh each session)
  // blacklist: ['call', 'network', 'status', 'huddle'],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'persist/PERSIST',
          'persist/REHYDRATE',
          'call/setLocalStream',
          'call/addRemoteStream',
        ],
        ignoredPaths: ['call.localStream', 'call.remoteStreams', 'messages.messagesByConversation'],
      },
      // Completely disable Immer for messages to avoid proxy wrapping issues with GiftedChat
      immutableCheck: false,
    }).concat(authMiddleware),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
