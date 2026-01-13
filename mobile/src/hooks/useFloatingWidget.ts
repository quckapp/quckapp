import { useEffect, useState, useCallback } from 'react';
import floatingWidgetService, {
  FloatingWidgetEvent,
  StartWidgetOptions,
  UpdateContentOptions,
  WidgetEventCallback,
} from '../services/floatingWidget';

interface UseFloatingWidgetReturn {
  // State
  isRunning: boolean;
  hasPermission: boolean;

  // Actions
  requestPermission: () => Promise<boolean>;
  start: (options?: StartWidgetOptions) => Promise<boolean>;
  stop: () => Promise<boolean>;
  show: () => Promise<boolean>;
  hide: () => Promise<boolean>;
  updateContent: (options: UpdateContentOptions) => Promise<boolean>;

  // Refresh state
  refreshState: () => Promise<void>;
}

/**
 * Hook for using the floating widget in React components
 */
export function useFloatingWidget(
  onTap?: WidgetEventCallback,
  onMute?: WidgetEventCallback,
  onEndCall?: WidgetEventCallback,
  onClose?: WidgetEventCallback
): UseFloatingWidgetReturn {
  const [isRunning, setIsRunning] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  // Refresh state from native
  const refreshState = useCallback(async () => {
    const [running, permission] = await Promise.all([
      floatingWidgetService.isWidgetRunning(),
      floatingWidgetService.hasOverlayPermission(),
    ]);
    setIsRunning(running);
    setHasPermission(permission);
  }, []);

  // Initial state check
  useEffect(() => {
    refreshState();
  }, [refreshState]);

  // Set up event listeners
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    if (onTap) {
      unsubscribers.push(
        floatingWidgetService.addEventListener('onWidgetTapped', onTap)
      );
    }

    if (onMute) {
      unsubscribers.push(
        floatingWidgetService.addEventListener('onWidgetMutePressed', onMute)
      );
    }

    if (onEndCall) {
      unsubscribers.push(
        floatingWidgetService.addEventListener('onWidgetEndCallPressed', onEndCall)
      );
    }

    if (onClose) {
      unsubscribers.push(
        floatingWidgetService.addEventListener('onWidgetClosed', () => {
          setIsRunning(false);
          onClose?.();
        })
      );
    } else {
      // Always track widget closed state
      unsubscribers.push(
        floatingWidgetService.addEventListener('onWidgetClosed', () => {
          setIsRunning(false);
        })
      );
    }

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [onTap, onMute, onEndCall, onClose]);

  const requestPermission = useCallback(async () => {
    const result = await floatingWidgetService.requestOverlayPermission();
    setHasPermission(result);
    return result;
  }, []);

  const start = useCallback(async (options?: StartWidgetOptions) => {
    const result = await floatingWidgetService.startWidget(options);
    if (result) {
      setIsRunning(true);
    }
    return result;
  }, []);

  const stop = useCallback(async () => {
    const result = await floatingWidgetService.stopWidget();
    if (result) {
      setIsRunning(false);
    }
    return result;
  }, []);

  const show = useCallback(async () => {
    return floatingWidgetService.showWidget();
  }, []);

  const hide = useCallback(async () => {
    return floatingWidgetService.hideWidget();
  }, []);

  const updateContent = useCallback(async (options: UpdateContentOptions) => {
    return floatingWidgetService.updateContent(options);
  }, []);

  return {
    isRunning,
    hasPermission,
    requestPermission,
    start,
    stop,
    show,
    hide,
    updateContent,
    refreshState,
  };
}

export default useFloatingWidget;
