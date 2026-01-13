import React, { memo } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

/**
 * Presentational Component Pattern - Pure UI component
 * Memoization: React.memo prevents unnecessary re-renders
 * Single Responsibility: Only renders progress visualization
 *
 * Performance: Uses Animated.View for smooth animations
 */

interface ProgressBarProps {
  progress: Animated.Value; // 0 to 1
  totalSegments: number;
  currentSegment: number;
  barColor?: string;
  backgroundColor?: string;
  height?: number;
}

const ProgressBarComponent: React.FC<ProgressBarProps> = ({
  progress,
  totalSegments,
  currentSegment,
  barColor = '#fff',
  backgroundColor = 'rgba(0, 0, 0, 0.3)',
  height = 3,
}) => {
  /**
   * Calculate width percentage for each segment
   * Algorithm: Equal distribution
   * Time Complexity: O(1)
   */
  const segmentWidth = `${100 / totalSegments}%`;

  /**
   * Interpolate animated width
   * Maps progress (0-1) to width percentage (0-100)
   */
  const animatedWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  /**
   * Render individual progress segments
   * Time Complexity: O(n) where n = totalSegments
   */
  const renderSegments = () => {
    return Array.from({ length: totalSegments }).map((_, index) => {
      const isCompleted = index < currentSegment;
      const isActive = index === currentSegment;

      return (
        <View
          key={index}
          style={[
            styles.segment,
            {
              width: segmentWidth,
              backgroundColor: backgroundColor,
              height: height,
            },
          ]}
        >
          {isCompleted && (
            <View
              style={[
                styles.fill,
                {
                  width: '100%',
                  backgroundColor: barColor,
                  height: height,
                },
              ]}
            />
          )}
          {isActive && (
            <Animated.View
              style={[
                styles.fill,
                {
                  width: animatedWidth,
                  backgroundColor: barColor,
                  height: height,
                },
              ]}
            />
          )}
        </View>
      );
    });
  };

  return (
    <View style={styles.container}>
      {renderSegments()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 4,
    width: '100%',
  },
  segment: {
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    borderRadius: 2,
  },
});

/**
 * Custom comparison function for memo
 * Only re-render if relevant props changed
 * Note: progress is Animated.Value, so we skip it in comparison
 */
const arePropsEqual = (
  prevProps: ProgressBarProps,
  nextProps: ProgressBarProps
): boolean => {
  return (
    prevProps.totalSegments === nextProps.totalSegments &&
    prevProps.currentSegment === nextProps.currentSegment &&
    prevProps.barColor === nextProps.barColor &&
    prevProps.backgroundColor === nextProps.backgroundColor &&
    prevProps.height === nextProps.height
  );
};

/**
 * Memoized export prevents unnecessary re-renders
 * Performance optimization: Only re-renders when props change
 */
export const ProgressBar = memo(ProgressBarComponent, arePropsEqual);
