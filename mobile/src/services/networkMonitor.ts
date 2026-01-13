import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { store } from '../store';
import { setNetworkStatus } from '../store/slices/networkSlice';
import api from './api';

let unsubscribe: (() => void) | null = null;

export const startNetworkMonitoring = () => {
  // Listen for network state changes
  unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
    const isConnected = state.isConnected ?? false;
    const connectionType = state.type;

    store.dispatch(setNetworkStatus({
      isConnected,
      connectionType,
    }));

    // If connection is restored, retry pending requests
    if (isConnected) {
      retryPendingRequests();
    }
  });

  // Get initial network state
  NetInfo.fetch().then((state: NetInfoState) => {
    const isConnected = state.isConnected ?? false;
    const connectionType = state.type;

    store.dispatch(setNetworkStatus({
      isConnected,
      connectionType,
    }));
  });
};

export const stopNetworkMonitoring = () => {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
};

export const retryPendingRequests = async () => {
  const { network } = store.getState();
  const { pendingRequests } = network;

  if (pendingRequests.length === 0) {
    return;
  }

  console.log(`Retrying ${pendingRequests.length} pending requests...`);

  // Try to retry all pending requests
  for (const request of pendingRequests) {
    try {
      await api({
        method: request.method,
        url: request.url,
        data: request.data,
        headers: request.headers,
      });

      // If successful, remove from queue
      const { removePendingRequest } = require('../store/slices/networkSlice');
      store.dispatch(removePendingRequest(request.id));

      console.log(`Successfully retried request: ${request.url}`);
    } catch (error) {
      console.log(`Failed to retry request: ${request.url}`, error);
      // Keep it in the queue for next retry
    }
  }
};

export const isOnline = (): boolean => {
  const { network } = store.getState();
  return network.isConnected;
};
