import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../hooks/useTheme';

interface GlassViewProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  intensity?: number;
  borderRadius?: number;
}

export const GlassView: React.FC<GlassViewProps> = ({
  children,
  style,
  intensity,
  borderRadius = 0
}) => {
  const theme = useTheme();

  const glassIntensity = intensity || theme.blur.intensity;

  return (
    <BlurView
      intensity={glassIntensity}
      tint={theme.blur.tint}
      style={[styles.container, { borderRadius }, style]}
    >
      <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.blur.cardBackground, borderRadius }]} />
      {children}
    </BlurView>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
