import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';

const MONGODB_URI = 'mongodb://mongo:jYdcUUEOpuDzWbhbMnDGIJeWcBsLCdUk@nozomi.proxy.rlwy.net:43740/quickchat-dev?authSource=admin';

const userSchema = new mongoose.Schema({
  phoneNumber: String,
  email: String,
  password: String,
  username: String,
  displayName: String,
  role: { type: String, default: 'user' },
  status: { type: String, default: 'online' },
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: true },
  isBanned: { type: Boolean, default: false },
  fcmTokens: { type: [String], default: [] },
  linkedDevices: { type: Array, default: [] },
  permissions: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

async function seedAdmin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const User = mongoose.model('User', userSchema);

    // Check if admin already exists
    const existingAdmin = await User.findOne({ phoneNumber: '+1234567890' });
    if (existingAdmin) {
      console.log('Admin user already exists, updating...');
      // Update to admin role and ensure isActive
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await User.updateOne(
        { phoneNumber: '+1234567890' },
        {
          $set: {
            role: 'admin',
            isActive: true,
            isVerified: true,
            isBanned: false,
            password: hashedPassword,
            username: 'admin',
            displayName: 'Admin User',
            permissions: ['manage_users', 'manage_reports', 'view_analytics', 'manage_settings', 'view_audit_logs', 'ban_users', 'delete_content']
          }
        }
      );
      console.log('Updated existing user to admin role with all permissions');
    } else {
      // Create new admin user
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await User.create({
        phoneNumber: '+1234567890',
        email: 'admin@quckchat.com',
        password: hashedPassword,
        username: 'admin',
        displayName: 'Admin User',
        role: 'admin',
        status: 'online',
        isActive: true,
        isVerified: true,
        isBanned: false,
        permissions: ['manage_users', 'manage_reports', 'view_analytics', 'manage_settings', 'view_audit_logs', 'ban_users', 'delete_content'],
      });
      console.log('Admin user created successfully');
    }

    console.log('\n=================================');
    console.log('Admin Login Credentials:');
    console.log('Phone: +1234567890');
    console.log('Password: admin123');
    console.log('=================================\n');

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
}

seedAdmin();
