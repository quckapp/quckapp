import React from 'react';
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';

interface IconProps {
  width?: number;
  height?: number;
  color?: string;
}

// Chat Bubble Icon
export const ChatBubbleIcon: React.FC<IconProps> = ({
  width = 24,
  height = 24,
  color = '#000000'
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 2H4C2.9 2 2.01 2.9 2.01 4L2 22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z"
        fill={color}
      />
    </Svg>
  );
};

// Send Icon
export const SendIcon: React.FC<IconProps> = ({
  width = 24,
  height = 24,
  color = '#000000'
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z"
        fill={color}
      />
    </Svg>
  );
};

// Microphone Icon
export const MicIcon: React.FC<IconProps> = ({
  width = 24,
  height = 24,
  color = '#000000'
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 14C13.66 14 14.99 12.66 14.99 11L15 5C15 3.34 13.66 2 12 2C10.34 2 9 3.34 9 5V11C9 12.66 10.34 14 12 14Z"
        fill={color}
      />
      <Path
        d="M17.3 11C17.3 14 14.76 16.1 12 16.1C9.24 16.1 6.7 14 6.7 11H5C5 14.41 7.72 17.23 11 17.72V21H13V17.72C16.28 17.24 19 14.42 19 11H17.3Z"
        fill={color}
      />
    </Svg>
  );
};

// Image/Gallery Icon
export const ImageIcon: React.FC<IconProps> = ({
  width = 24,
  height = 24,
  color = '#000000'
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 19V5C21 3.9 20.1 3 19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19ZM8.5 13.5L11 16.51L14.5 12L19 18H5L8.5 13.5Z"
        fill={color}
      />
    </Svg>
  );
};

// Video Call Icon
export const VideoCallIcon: React.FC<IconProps> = ({
  width = 24,
  height = 24,
  color = '#000000'
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17 10.5V7C17 6.45 16.55 6 16 6H4C3.45 6 3 6.45 3 7V17C3 17.55 3.45 18 4 18H16C16.55 18 17 17.55 17 17V13.5L21 17.5V6.5L17 10.5Z"
        fill={color}
      />
    </Svg>
  );
};

// Phone Call Icon
export const PhoneCallIcon: React.FC<IconProps> = ({
  width = 24,
  height = 24,
  color = '#000000'
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20.01 15.38C18.78 15.38 17.59 15.18 16.48 14.82C16.13 14.7 15.74 14.79 15.47 15.06L13.9 17.03C11.07 15.68 8.42 13.13 7.01 10.2L8.96 8.54C9.23 8.26 9.31 7.87 9.2 7.52C8.83 6.41 8.64 5.22 8.64 3.99C8.64 3.45 8.19 3 7.65 3H4.19C3.65 3 3 3.24 3 3.99C3 13.28 10.73 21 20.01 21C20.72 21 21 20.37 21 19.82V16.37C21 15.83 20.55 15.38 20.01 15.38Z"
        fill={color}
      />
    </Svg>
  );
};

// Star Icon
export const StarIcon: React.FC<IconProps & { filled?: boolean }> = ({
  width = 24,
  height = 24,
  color = '#000000',
  filled = false
}) => {
  if (filled) {
    return (
      <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27Z"
          fill={color}
        />
      </Svg>
    );
  }

  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 9.24L14.81 8.63L12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27L18.18 21L16.54 13.97L22 9.24ZM12 15.4L8.24 17.67L9.24 13.39L5.92 10.51L10.3 10.13L12 6.1L13.71 10.14L18.09 10.52L14.77 13.4L15.77 17.68L12 15.4Z"
        fill={color}
      />
    </Svg>
  );
};

// Double Check Icon (Message Read)
export const DoubleCheckIcon: React.FC<IconProps> = ({
  width = 24,
  height = 24,
  color = '#000000'
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 7L16.59 5.59L10.25 11.93L11.66 13.34L18 7Z"
        fill={color}
      />
      <Path
        d="M22.24 5.59L11.66 16.17L7.48 12L6.07 13.41L11.66 19L23.66 7L22.24 5.59Z"
        fill={color}
      />
      <Path
        d="M0.41 13.41L6 19L7.41 17.59L1.83 12L0.41 13.41Z"
        fill={color}
      />
    </Svg>
  );
};

// Checkmark Icon (Message Sent)
export const CheckmarkIcon: React.FC<IconProps> = ({
  width = 24,
  height = 24,
  color = '#000000'
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z"
        fill={color}
      />
    </Svg>
  );
};

// More Options Icon
export const MoreIcon: React.FC<IconProps> = ({
  width = 24,
  height = 24,
  color = '#000000'
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="5" r="2" fill={color} />
      <Circle cx="12" cy="12" r="2" fill={color} />
      <Circle cx="12" cy="19" r="2" fill={color} />
    </Svg>
  );
};
