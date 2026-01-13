const fs = require('fs');
const path = require('path');

// Minimal 1x1 transparent PNG (base64)
const transparentPNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

// Simple 1024x1024 PNG with blue color (base64) - for app icon
const blueIconPNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);

const assetsDir = path.join(__dirname, 'assets');

// Create all required asset files
const assets = [
  { name: 'icon.png', data: blueIconPNG },
  { name: 'adaptive-icon.png', data: blueIconPNG },
  { name: 'splash.png', data: blueIconPNG },
  { name: 'favicon.png', data: transparentPNG },
  { name: 'notification-icon.png', data: transparentPNG }
];

assets.forEach(asset => {
  const filePath = path.join(assetsDir, asset.name);
  fs.writeFileSync(filePath, asset.data);
  console.log(`Created ${asset.name}`);
});

console.log('All assets created successfully!');
