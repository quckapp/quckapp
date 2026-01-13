// WebRTC compatibility layer for Expo Go
// This module provides safe imports that won't crash in Expo Go

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

let RTCView: React.ComponentType<any> | null = null;
let mediaDevices: any = null;
let RTCPeerConnection: any = null;
let RTCIceCandidate: any = null;
let RTCSessionDescription: any = null;
let MediaStream: any = null;

export let webrtcAvailable = false;

try {
  console.log('🔍 Attempting to load react-native-webrtc...');
  const webrtc = require('react-native-webrtc');
  console.log('📦 WebRTC module loaded, keys:', Object.keys(webrtc || {}));

  RTCView = webrtc.RTCView;
  mediaDevices = webrtc.mediaDevices;
  RTCPeerConnection = webrtc.RTCPeerConnection;
  MediaStream = webrtc.MediaStream;

  // RTCIceCandidate and RTCSessionDescription might not be exported in newer versions
  // react-native-webrtc can accept plain objects directly for these
  RTCIceCandidate = webrtc.RTCIceCandidate || null;
  RTCSessionDescription = webrtc.RTCSessionDescription || null;

  console.log('🔍 WebRTC components:', {
    RTCView: !!RTCView,
    mediaDevices: !!mediaDevices,
    RTCPeerConnection: !!RTCPeerConnection,
    RTCIceCandidate: !!RTCIceCandidate,
    RTCSessionDescription: !!RTCSessionDescription,
    MediaStream: !!MediaStream,
  });

  if (RTCPeerConnection && mediaDevices) {
    webrtcAvailable = true;
    console.log('✅ WebRTC is available and ready!');
  } else {
    console.warn('⚠️ WebRTC module loaded but native components are null');
  }
} catch (error: any) {
  console.warn('❌ WebRTC not available. Error:', error?.message || error);
  console.warn('📱 This may be expected in Expo Go - video/audio calls require a development build.');
}

// Fallback RTCView component for when WebRTC isn't available
const FallbackRTCView: React.FC<any> = ({ style }) => (
  <View style={[styles.fallback, style]}>
    <Text style={styles.fallbackText}>Video calls require a development build</Text>
  </View>
);

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    color: '#888',
    textAlign: 'center',
    padding: 20,
  },
});

// Export the actual component or fallback
export const SafeRTCView = RTCView || FallbackRTCView;

export {
  mediaDevices,
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  MediaStream,
};
