const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Android mipmap sizes for launcher icons
const androidIconSizes = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

// Android adaptive icon foreground sizes (with extra padding for safe zone)
const adaptiveIconSizes = {
  'mipmap-mdpi': 108,
  'mipmap-hdpi': 162,
  'mipmap-xhdpi': 216,
  'mipmap-xxhdpi': 324,
  'mipmap-xxxhdpi': 432,
};

const svgPath = path.join(__dirname, '..', 'QuckChatIcon.svg');
const androidResPath = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');

// Read and color the SVG
const svgContent = fs.readFileSync(svgPath, 'utf8');
const coloredSvg = svgContent.replace(/fill="#000000"/g, 'fill="#0066FF"');

async function generateAndroidIcons() {
  console.log('Generating Android launcher icons...');

  for (const [folder, size] of Object.entries(androidIconSizes)) {
    const folderPath = path.join(androidResPath, folder);

    // Create folder if it doesn't exist
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    // Generate ic_launcher.png (legacy launcher icon with background)
    try {
      await sharp(Buffer.from(coloredSvg))
        .resize(Math.floor(size * 0.7), Math.floor(size * 0.7), {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .extend({
          top: Math.floor(size * 0.15),
          bottom: Math.floor(size * 0.15),
          left: Math.floor(size * 0.15),
          right: Math.floor(size * 0.15),
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toFile(path.join(folderPath, 'ic_launcher.png'));

      console.log(`✅ Generated ${folder}/ic_launcher.png (${size}x${size})`);
    } catch (error) {
      console.error(`❌ Failed to generate ${folder}/ic_launcher.png:`, error.message);
    }

    // Generate ic_launcher_round.png (round launcher icon)
    try {
      // Create the icon first, then apply circular mask
      const iconBuffer = await sharp(Buffer.from(coloredSvg))
        .resize(Math.floor(size * 0.6), Math.floor(size * 0.6), {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .extend({
          top: Math.floor(size * 0.2),
          bottom: Math.floor(size * 0.2),
          left: Math.floor(size * 0.2),
          right: Math.floor(size * 0.2),
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toBuffer();

      // Create circular mask of same size
      const circle = Buffer.from(
        `<svg width="${size}" height="${size}">
          <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="white"/>
        </svg>`
      );

      await sharp(iconBuffer)
        .composite([{
          input: circle,
          blend: 'dest-in'
        }])
        .png()
        .toFile(path.join(folderPath, 'ic_launcher_round.png'));

      console.log(`✅ Generated ${folder}/ic_launcher_round.png (${size}x${size})`);
    } catch (error) {
      console.error(`❌ Failed to generate ${folder}/ic_launcher_round.png:`, error.message);
    }
  }

  // Generate adaptive icon foregrounds
  console.log('\nGenerating Android adaptive icon foregrounds...');

  for (const [folder, size] of Object.entries(adaptiveIconSizes)) {
    const folderPath = path.join(androidResPath, folder);

    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    try {
      // Adaptive icons need the foreground image centered with padding
      // The actual icon should be about 66% of the full size to stay in safe zone
      const iconSize = Math.floor(size * 0.5);
      const padding = Math.floor((size - iconSize) / 2);

      await sharp(Buffer.from(coloredSvg))
        .resize(iconSize, iconSize, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .extend({
          top: padding,
          bottom: padding,
          left: padding,
          right: padding,
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(path.join(folderPath, 'ic_launcher_foreground.png'));

      console.log(`✅ Generated ${folder}/ic_launcher_foreground.png (${size}x${size})`);
    } catch (error) {
      console.error(`❌ Failed to generate ${folder}/ic_launcher_foreground.png:`, error.message);
    }
  }

  console.log('\nDone! Android icons generated.');
  console.log('Run "npx expo run:android" to rebuild with new icons.');
}

generateAndroidIcons();
