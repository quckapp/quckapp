import { useEffect, useRef, useCallback } from 'react';
import { Animated } from 'react-native';

/**
 * Custom Hook Pattern - Encapsulates progress animation logic
 * Single Responsibility: Only handles progress bar animation
 * Performance: Uses native driver for smooth 60fps animations
 */

interface UseStatusProgressProps {
  duration?: number; // Duration in milliseconds
  onComplete?: () => void; // Callback when animation completes
  isPaused?: boolean; // Pause/resume support
}

export const useStatusProgress = ({
  duration = 5000,
  onComplete,
  isPaused = false,
}: UseStatusProgressProps) => {
  const progress = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  /**
   * Start progress animation
   * Algorithm: Linear interpolation from 0 to 1
   * Time Complexity: O(1) to start
   */
  const startProgress = useCallback(() => {
    // Reset to 0
    progress.setValue(0);

    // Create animation
    animationRef.current = Animated.timing(progress, {
      toValue: 1,
      duration: duration,
      useNativeDriver: false, // Can't use native driver for width/height
    });

    // Start animation with completion callback
    animationRef.current.start(({ finished }) => {
      if (finished && onComplete) {
        onComplete();
      }
    });
  }, [progress, duration, onComplete]);

  /**
   * Stop and reset progress
   * Time Complexity: O(1)
   */
  const stopProgress = useCallback(() => {
    if (animationRef.current) {
      animationRef.current.stop();
    }
    progress.setValue(0);
  }, [progress]);

  /**
   * Complete current progress immediately
   * Algorithm: Animate remaining progress in 300ms
   * Use case: When user taps to skip
   */
  const completeProgress = useCallback(
    (callback?: () => void) => {
      if (animationRef.current) {
        animationRef.current.stop();
      }

      // Animate to completion quickly (300ms)
      Animated.timing(progress, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished && callback) {
          callback();
        }
      });
    },
    [progress]
  );

  /**
   * Pause progress animation
   * Time Complexity: O(1)
   */
  const pauseProgress = useCallback(() => {
    if (animationRef.current) {
      animationRef.current.stop();
    }
  }, []);

  /**
   * Resume progress animation
   * Algorithm: Continue from current value to 1
   */
  const resumeProgress = useCallback(() => {
    progress.stopAnimation((currentValue) => {
      const remainingDuration = duration * (1 - currentValue);

      animationRef.current = Animated.timing(progress, {
        toValue: 1,
        duration: remainingDuration,
        useNativeDriver: false,
      });

      animationRef.current.start(({ finished }) => {
        if (finished && onComplete) {
          onComplete();
        }
      });
    });
  }, [progress, duration, onComplete]);

  /**
   * Auto-pause/resume based on isPaused prop
   */
  useEffect(() => {
    if (isPaused) {
      pauseProgress();
    } else {
      resumeProgress();
    }
  }, [isPaused, pauseProgress, resumeProgress]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, []);

  return {
    progress, // Animated value (0 to 1)
    startProgress,
    stopProgress,
    completeProgress,
    pauseProgress,
    resumeProgress,
  };
};
