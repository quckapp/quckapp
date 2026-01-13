import React from 'react';
import Svg, { Path, Circle, G, Defs, LinearGradient, Stop } from 'react-native-svg';

interface LogoProps {
  width?: number;
  height?: number;
  color?: string;
}

export const Logo: React.FC<LogoProps> = ({
  width = 120,
  height = 120,
  color = '#007AFF'
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 120 120">
      <Defs>
        <LinearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={color} stopOpacity="1" />
          <Stop offset="100%" stopColor={color} stopOpacity="0.7" />
        </LinearGradient>
      </Defs>

      {/* Chat bubble */}
      <Path
        d="M80 30H40C31.7157 30 25 36.7157 25 45V65C25 73.2843 31.7157 80 40 80H50L60 90L70 80H80C88.2843 80 95 73.2843 95 65V45C95 36.7157 88.2843 30 80 30Z"
        fill="url(#gradient)"
      />

      {/* Lightning bolt for "Quick" */}
      <Path
        d="M60 45L52 60H60L55 70L68 55H60L65 45H60Z"
        fill="#FFFFFF"
      />

      {/* Dots representing chat */}
      <Circle cx="42" cy="52" r="3" fill="#FFFFFF" opacity="0.8" />
      <Circle cx="52" cy="52" r="3" fill="#FFFFFF" opacity="0.8" />
      <Circle cx="78" cy="52" r="3" fill="#FFFFFF" opacity="0.8" />
    </Svg>
  );
};

export const LogoIcon: React.FC<LogoProps> = ({
  width = 40,
  height = 40,
  color = '#007AFF'
}) => {
  return <Logo width={width} height={height} color={color} />;
};
