import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { FloatingWidget } = NativeModules;

// Event types
export type FloatingWidgetEvent =
  | 'onWidgetTapped'
  | 'onWidgetMutePressed'
  | 'onWidgetEndCallPressed'
  | 'onWidgetClosed';

// Icon types
export type WidgetIconType = 'chat' | 'call' | 'video';

// Options for starting the widget
export interface StartWidgetOptions {
  title?: string;
  subtitle?: string;
  iconType?: WidgetIconType;
}

// Options for updating widget content
export interface UpdateContentOptions {
  title?: string;
  subtitle?: string;
  iconType?: WidgetIconType;
}

// Event listener callback
export type WidgetEventCallback = (data?: any) => void;

class FloatingWidgetService {
  private static instance: FloatingWidgetService;
  private eventEmitter: NativeEventEmitter | null = null;
  private listeners: Map<FloatingWidgetEvent, Set<WidgetEventCallback>> = new Map();

  private constructor() {
    if (Platform.OS === 'android' && FloatingWidget) {
      this.eventEmitter = new NativeEventEmitter(FloatingWidget);
      this.setupEventListeners();
    }
  }

  static getInstance(): FloatingWidgetService {
    if (!FloatingWidgetService.instance) {
      FloatingWidgetService.instance = new FloatingWidgetService();
    }
    return FloatingWidgetService.instance;
  }

  private setupEventListeners() {
    if (!this.eventEmitter) return;

    const events: FloatingWidgetEvent[] = [
      'onWidgetTapped',
      'onWidgetMutePressed',
      'onWidgetEndCallPressed',
      'onWidgetClosed',
    ];

    events.forEach((event) => {
      this.eventEmitter?.addListener(event, (data) => {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
          callbacks.forEach((callback) => callback(data));
        }
      });
    });
  }

  /**
   * Check if overlay permission is granted
   */
  async hasOverlayPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    try {
      return await FloatingWidget.hasOverlayPermission();
    } catch (error) {
      console.error('Error checking overlay permission:', error);
      return false;
    }
  }

  /**
   * Request overlay permission - opens settings
   * Returns true if permission is already granted, false if user needs to enable it
   */
  async requestOverlayPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    try {
      return await FloatingWidget.requestOverlayPermission();
    } catch (error) {
      console.error('Error requesting overlay permission:', error);
      return false;
    }
  }

  /**
   * Start the floating widget
   */
  async startWidget(options?: StartWidgetOptions): Promise<boolean> {
    if (Platform.OS !== 'android') {
      console.warn('Floating widget is only available on Android');
      return false;
    }

    try {
      // Check permission first
      const hasPermission = await this.hasOverlayPermission();
      if (!hasPermission) {
        console.warn('Overlay permission not granted');
        return false;
      }

      return await FloatingWidget.startWidget(options || {});
    } catch (error) {
      console.error('Error starting widget:', error);
      return false;
    }
  }

  /**
   * Stop the floating widget
   */
  async stopWidget(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    try {
      return await FloatingWidget.stopWidget();
    } catch (error) {
      console.error('Error stopping widget:', error);
      return false;
    }
  }

  /**
   * Check if widget is currently running
   */
  async isWidgetRunning(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    try {
      return await FloatingWidget.isWidgetRunning();
    } catch (error) {
      console.error('Error checking widget status:', error);
      return false;
    }
  }

  /**
   * Show the widget (if service is running)
   */
  async showWidget(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    try {
      return await FloatingWidget.showWidget();
    } catch (error) {
      console.error('Error showing widget:', error);
      return false;
    }
  }

  /**
   * Hide the widget (but keep service running)
   */
  async hideWidget(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    try {
      return await FloatingWidget.hideWidget();
    } catch (error) {
      console.error('Error hiding widget:', error);
      return false;
    }
  }

  /**
   * Update widget content (title, subtitle, icon)
   */
  async updateContent(options: UpdateContentOptions): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    try {
      return await FloatingWidget.updateContent(options);
    } catch (error) {
      console.error('Error updating widget content:', error);
      return false;
    }
  }

  /**
   * Add event listener
   */
  addEventListener(event: FloatingWidgetEvent, callback: WidgetEventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  /**
   * Remove event listener
   */
  removeEventListener(event: FloatingWidgetEvent, callback: WidgetEventCallback): void {
    this.listeners.get(event)?.delete(callback);
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners(event?: FloatingWidgetEvent): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

// Export singleton instance
export const floatingWidgetService = FloatingWidgetService.getInstance();

// Export convenience functions
export const hasOverlayPermission = () => floatingWidgetService.hasOverlayPermission();
export const requestOverlayPermission = () => floatingWidgetService.requestOverlayPermission();
export const startFloatingWidget = (options?: StartWidgetOptions) =>
  floatingWidgetService.startWidget(options);
export const stopFloatingWidget = () => floatingWidgetService.stopWidget();
export const isFloatingWidgetRunning = () => floatingWidgetService.isWidgetRunning();
export const showFloatingWidget = () => floatingWidgetService.showWidget();
export const hideFloatingWidget = () => floatingWidgetService.hideWidget();
export const updateFloatingWidgetContent = (options: UpdateContentOptions) =>
  floatingWidgetService.updateContent(options);

export default floatingWidgetService;
