import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const UserSchema = new mongoose.Schema(
  {
    phoneNumber: { type: String, required: true, unique: true },
    email: { type: String, default: null },
    password: { type: String, required: true },
    username: { type: String, required: true },
    displayName: { type: String, required: true },
    avatar: { type: String, default: null },
    bio: { type: String, default: null },
    status: { type: String, default: 'offline' },
    lastSeen: { type: Date, default: Date.now },
    fcmTokens: { type: [String], default: [] },
    linkedDevices: { type: Array, default: [] },
    publicKey: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: true },
    role: { type: String, default: 'user' },
    permissions: { type: [String], default: [] },
    isBanned: { type: Boolean, default: false },
    banReason: { type: String, default: null },
    bannedAt: { type: Date, default: null },
    bannedBy: { type: String, default: null },
  },
  { timestamps: true },
);

async function createAdmin() {
  const mongoUri =
    process.env.MONGODB_URI_DEV || process.env.MONGODB_URI || 'mongodb://localhost:27017/quckchat';

  console.log('Connecting to MongoDB...');
  console.log('URI:', mongoUri.replace(/:[^:@]+@/, ':****@'));
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  const User = mongoose.model('User', UserSchema);

  // Admin credentials
  const adminData = {
    phoneNumber: '+1234567890',
    email: 'admin@quckchat.com',
    password: await bcrypt.hash('Admin@123', 10),
    username: 'admin',
    displayName: 'Super Admin',
    isVerified: true,
    role: 'super_admin',
    permissions: [
      'manage_users',
      'manage_reports',
      'manage_communities',
      'view_analytics',
      'manage_settings',
      'view_audit_logs',
      'manage_moderators',
      'ban_users',
      'delete_content',
    ],
  };

  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({
      $or: [{ phoneNumber: adminData.phoneNumber }, { username: adminData.username }],
    });

    if (existingAdmin) {
      console.log('Admin user already exists. Updating role, permissions, and password...');
      await User.updateOne(
        { _id: existingAdmin._id },
        {
          $set: {
            role: 'super_admin',
            permissions: adminData.permissions,
            isVerified: true,
            isActive: true,
            password: adminData.password,
          },
        },
      );
      console.log('Admin updated successfully!');
    } else {
      await User.create(adminData);
      console.log('Admin user created successfully!');
    }

    console.log('\n========================================');
    console.log('Admin Credentials:');
    console.log('========================================');
    console.log('Phone Number: +1234567890');
    console.log('Password: Admin@123');
    console.log('========================================\n');
  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

createAdmin();
