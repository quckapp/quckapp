const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Icon sizes needed for Expo/React Native
const iconSizes = {
  'icon.png': 1024, // Main app icon
  'adaptive-icon.png': 1024, // Android adaptive icon foreground
  'favicon.png': 48, // Web favicon
  'notification-icon.png': 96, // Notification icon (should be simple/monochrome)
  'splash-icon.png': 512, // Splash screen icon
};

// Read the SVG file
const svgPath = path.join(__dirname, '..', 'QuckChatIcon.svg');
const assetsPath = path.join(__dirname, '..', 'assets');

// Create a colored version of the SVG (blue brand color)
const svgContent = fs.readFileSync(svgPath, 'utf8');

// Replace black fill with brand blue color
const coloredSvg = svgContent.replace(/fill="#000000"/g, 'fill="#0066FF"');

async function generateIcons() {
  console.log('Generating icons from QuckChatIcon.svg...');

  for (const [filename, size] of Object.entries(iconSizes)) {
    const outputPath = path.join(assetsPath, filename);

    try {
      // For notification icon, use white color (Android requires monochrome)
      let svgToUse = coloredSvg;
      if (filename === 'notification-icon.png') {
        svgToUse = svgContent.replace(/fill="#000000"/g, 'fill="#FFFFFF"');
      }

      await sharp(Buffer.from(svgToUse))
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 } // Transparent background
        })
        .png()
        .toFile(outputPath);

      console.log(`✅ Generated ${filename} (${size}x${size})`);
    } catch (error) {
      console.error(`❌ Failed to generate ${filename}:`, error.message);
    }
  }

  // Generate splash.png (larger with padding)
  try {
    const splashPath = path.join(assetsPath, 'splash.png');
    await sharp(Buffer.from(coloredSvg))
      .resize(400, 400, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 } // White background
      })
      .extend({
        top: 400,
        bottom: 400,
        left: 400,
        right: 400,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(splashPath);

    console.log('✅ Generated splash.png (1200x1200)');
  } catch (error) {
    console.error('❌ Failed to generate splash.png:', error.message);
  }

  console.log('\nDone! Icons generated in assets/ folder.');
  console.log('Run "npx expo run:android" to rebuild with new icons.');
}

generateIcons();
