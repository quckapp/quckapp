const fs = require('fs');
const path = require('path');

/**
 * Script to switch between Firebase configurations (dev/prod)
 * Usage: node scripts/firebase-config.js [dev|prod]
 */

const env = process.argv[2] || 'dev';

if (!['dev', 'prod'].includes(env)) {
  console.error('❌ Invalid environment. Use "dev" or "prod"');
  process.exit(1);
}

const rootDir = path.join(__dirname, '..');
const sourceFile = path.join(rootDir, `google-services.${env}.json`);
const targetFile = path.join(rootDir, 'google-services.json');
const androidTargetFile = path.join(rootDir, 'android', 'app', 'google-services.json');

try {
  // Check if source file exists
  if (!fs.existsSync(sourceFile)) {
    console.error(`❌ Source file not found: ${sourceFile}`);
    process.exit(1);
  }

  // Copy to root directory
  fs.copyFileSync(sourceFile, targetFile);
  console.log(`✅ Copied ${env} config to google-services.json`);

  // Copy to android app directory if it exists
  if (fs.existsSync(path.join(rootDir, 'android', 'app'))) {
    fs.copyFileSync(sourceFile, androidTargetFile);
    console.log(`✅ Copied ${env} config to android/app/google-services.json`);
  }

  console.log(`\n🔧 Firebase environment set to: ${env.toUpperCase()}`);

  if (env === 'dev') {
    console.log('📱 Development Firebase: quckchat-dev');
  } else {
    console.log('📱 Production Firebase: quckchat-2a047');
  }

  console.log('\n⚠️  Remember to rebuild the app for changes to take effect!');
  console.log('   Run: npx expo run:android\n');

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
