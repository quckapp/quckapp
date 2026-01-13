export const lightTheme = {
  // Background colors - Clean and fresh
  background: '#FFFFFF',
  backgroundSecondary: '#F8F9FA',
  backgroundTertiary: '#F1F3F5',

  // Text colors - High contrast for readability
  text: '#1A1A1A',
  textSecondary: '#6C757D',
  textTertiary: '#ADB5BD',
  textInverse: '#FFFFFF',

  // Primary colors - Modern blue gradient
  primary: '#0066FF',
  primaryLight: '#4D94FF',
  primaryDark: '#0052CC',

  // Status colors - Vibrant and clear
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',

  // Border colors - Subtle but visible
  border: '#DEE2E6',
  borderLight: '#E9ECEF',

  // Card/Surface colors
  card: '#FFFFFF',
  surface: '#FFFFFF',

  // Chat specific - Beautiful message bubbles
  messageSent: '#0066FF',
  messageReceived: '#F1F3F5',
  messageSentText: '#FFFFFF',
  messageReceivedText: '#1A1A1A',

  // Other
  shadow: 'rgba(0, 0, 0, 0.08)',
  overlay: 'rgba(0, 0, 0, 0.6)',
  disabled: '#CED4DA',
  placeholder: '#ADB5BD',

  // Blur settings - Transparent with blur effect
  blur: {
    intensity: 80,
    tint: 'light' as 'light' | 'dark',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    headerBackground: 'rgba(255, 255, 255, 0.85)',
    modalBackground: 'rgba(255, 255, 255, 0.9)',
    cardBackground: 'rgba(255, 255, 255, 0.6)',
    inputBackground: 'rgba(248, 249, 250, 0.8)',
  },
};

export const darkTheme = {
  // Background colors - Deep, rich OLED-friendly blacks
  background: '#0A0A0B',
  backgroundSecondary: '#18181B',
  backgroundTertiary: '#27272A',

  // Text colors - Crisp and clear on dark
  text: '#F9FAFB',
  textSecondary: '#D1D5DB',
  textTertiary: '#9CA3AF',
  textInverse: '#0A0A0B',

  // Primary colors - Bright, vibrant blue for dark mode
  primary: '#3B82F6',
  primaryLight: '#60A5FA',
  primaryDark: '#2563EB',

  // Status colors - Vivid and eye-catching
  success: '#34D399',
  error: '#F87171',
  warning: '#FBBF24',

  // Border colors - Visible but not harsh
  border: '#374151',
  borderLight: '#4B5563',

  // Card/Surface colors - Elevated surfaces
  card: '#18181B',
  surface: '#27272A',

  // Chat specific - Beautiful contrast
  messageSent: '#3B82F6',
  messageReceived: '#27272A',
  messageSentText: '#FFFFFF',
  messageReceivedText: '#F9FAFB',

  // Other
  shadow: 'rgba(0, 0, 0, 0.5)',
  overlay: 'rgba(0, 0, 0, 0.8)',
  disabled: '#4B5563',
  placeholder: '#6B7280',

  // Blur settings - Transparent with blur effect
  blur: {
    intensity: 80,
    tint: 'dark' as 'light' | 'dark',
    backgroundColor: 'rgba(10, 10, 11, 0.7)',
    headerBackground: 'rgba(10, 10, 11, 0.85)',
    modalBackground: 'rgba(24, 24, 27, 0.9)',
    cardBackground: 'rgba(24, 24, 27, 0.6)',
    inputBackground: 'rgba(39, 39, 42, 0.8)',
  },
};

export type Theme = typeof lightTheme;
