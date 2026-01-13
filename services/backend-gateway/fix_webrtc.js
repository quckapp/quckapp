const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'mobile/src/services/webrtc.ts');

let content = fs.readFileSync(filePath, 'utf8');

// Fix 1: Remove new RTCSessionDescription(offer) wrapper - pass plain object
content = content.replace(
  /await pc\.setRemoteDescription\(new RTCSessionDescription\(offer\)\);/g,
  '// Pass plain object directly - react-native-webrtc accepts this without wrapping\n      await pc.setRemoteDescription(offer);'
);

// Fix 2: Remove new RTCSessionDescription(answer) wrapper - pass plain object
content = content.replace(
  /await pc\.setRemoteDescription\(new RTCSessionDescription\(answer\)\);/g,
  '// Pass plain object directly - react-native-webrtc accepts this without wrapping\n        await pc.setRemoteDescription(answer);'
);

// Fix 3: Remove new RTCIceCandidate(candidate) wrapper - pass plain object
content = content.replace(
  /await pc\.addIceCandidate\(new RTCIceCandidate\(candidate\)\);/g,
  '// Pass plain object directly - react-native-webrtc accepts this without wrapping\n        await pc.addIceCandidate(candidate);'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed webrtc.ts - removed RTCSessionDescription and RTCIceCandidate wrappers');
