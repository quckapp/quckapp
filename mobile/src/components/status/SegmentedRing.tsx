import React, { memo } from 'react';
import Svg, { Circle } from 'react-native-svg';

/**
 * Presentational Component Pattern - Pure UI component
 * Memoization: React.memo prevents unnecessary re-renders
 * Single Responsibility: Only renders the segmented ring visual
 *
 * Algorithm: SVG circle segments with strokeDasharray
 * Time Complexity: O(n) where n = number of segments
 */

interface SegmentedRingProps {
  segments: number;
  color?: string;
  size?: number;
  strokeWidth?: number;
}

const SegmentedRingComponent: React.FC<SegmentedRingProps> = ({
  segments,
  color = '#25D366',
  size = 64,
  strokeWidth = 3,
}) => {
  // Calculate circle properties
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Calculate segment properties
  const gapSize = 8; // Gap between segments in degrees
  const segmentAngle = (360 - gapSize * segments) / segments;
  const segmentLength = (segmentAngle / 360) * circumference;
  const gapLength = (gapSize / 360) * circumference;

  /**
   * Render individual segments
   * Each segment is a circle with strokeDasharray for gaps
   */
  const renderSegments = () => {
    return Array.from({ length: segments }).map((_, index) => {
      const rotation = index * (segmentAngle + gapSize) - 90;

      return (
        <Circle
          key={index}
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
          strokeDashoffset={0}
          rotation={rotation}
          origin={`${center}, ${center}`}
        />
      );
    });
  };

  return (
    <Svg
      width={size}
      height={size}
      style={{ position: 'absolute' }}
    >
      {renderSegments()}
    </Svg>
  );
};

/**
 * Custom comparison function for memo
 * Only re-render if props actually changed
 */
const arePropsEqual = (
  prevProps: SegmentedRingProps,
  nextProps: SegmentedRingProps
): boolean => {
  return (
    prevProps.segments === nextProps.segments &&
    prevProps.color === nextProps.color &&
    prevProps.size === nextProps.size &&
    prevProps.strokeWidth === nextProps.strokeWidth
  );
};

/**
 * Memoized export prevents unnecessary re-renders
 * Performance: Only re-renders when props change
 */
export const SegmentedRing = memo(SegmentedRingComponent, arePropsEqual);
