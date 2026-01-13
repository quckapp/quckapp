import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Logo as SvgLogo } from './svg/Logo';

interface LogoProps {
  width?: number;
  height?: number;
}

export const Logo: React.FC<LogoProps> = ({ width = 200, height = 60 }) => {
  return (
    <View style={styles.container}>
      <SvgLogo width={60} height={60} />
      <Text style={styles.text}>QuckChat</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    fontWeight: '600',
    color: '#333',
    fontSize: 28,
  },
});
