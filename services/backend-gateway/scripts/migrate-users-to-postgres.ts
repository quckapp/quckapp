/**
 * MongoDB to PostgreSQL User Migration Script
 * 
 * This script migrates user profiles, settings, and linked devices
 * from MongoDB to the Spring Boot PostgreSQL service.
 * 
 * Usage:
 *   npx ts-node scripts/migrate-users-to-postgres.ts [options]
 * 
 * Options:
 *   --dry-run      Simulate migration without making changes
 *   --batch-size   Number of users per batch (default: 100)
 *   --skip         Number of users to skip (for resuming)
 *   --limit        Maximum number of users to migrate
 * 
 * Environment Variables Required:
 *   MONGODB_URI - MongoDB connection string
 *   SPRING_AUTH_SERVICE_URL - Spring Boot auth service URL
 *   SPRING_AUTH_API_KEY - API key for Spring Boot migration endpoints
 */

import mongoose from "mongoose";
import axios, { AxiosInstance } from "axios";

interface MigrationConfig {
  mongoUri: string;
  springUrl: string;
  apiKey: string;
  batchSize: number;
  dryRun: boolean;
  skip: number;
  limit: number | null;
}

const userSchema = new mongoose.Schema({
  phoneNumber: String,
  username: String,
  displayName: String,
  email: String,
  password: String,
  avatar: String,
  bio: String,
  publicKey: String,
  status: String,
  lastSeen: Date,
  isActive: Boolean,
  isVerified: Boolean,
  role: String,
  permissions: [String],
  isBanned: Boolean,
  banReason: String,
  bannedAt: Date,
  bannedBy: mongoose.Schema.Types.ObjectId,
  fcmTokens: [String],
  linkedDevices: [{
    deviceId: String,
    deviceName: String,
    deviceType: String,
    fcmToken: String,
    lastActive: Date,
    linkedAt: Date,
  }],
  oauthProviders: [{
    provider: String,
    providerId: String,
    email: String,
    linkedAt: Date,
  }],
  twoFactorEnabled: Boolean,
  twoFactorSecret: String,
  backupCodes: [String],
  createdAt: Date,
  updatedAt: Date,
});

const userSettingsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  darkMode: { type: Boolean, default: false },
  autoDownloadMedia: { type: Boolean, default: true },
  saveToGallery: { type: Boolean, default: false },
  pushNotifications: { type: Boolean, default: true },
  messageNotifications: { type: Boolean, default: true },
  groupNotifications: { type: Boolean, default: true },
  callNotifications: { type: Boolean, default: true },
  soundEnabled: { type: Boolean, default: true },
  vibrationEnabled: { type: Boolean, default: true },
  showPreview: { type: Boolean, default: true },
  inAppNotifications: { type: Boolean, default: true },
  notificationLight: { type: Boolean, default: false },
  readReceipts: { type: Boolean, default: true },
  lastSeenVisible: { type: Boolean, default: true },
  profilePhotoVisibility: { type: String, default: "everyone" },
  statusVisibility: { type: String, default: "everyone" },
  fingerprintLock: { type: Boolean, default: false },
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
});

interface MigratedUserRequest {
  externalId: string;
  phoneNumber: string;
  username: string;
  displayName: string;
  email?: string;
  passwordHash: string;
  avatar?: string;
  bio?: string;
  publicKey?: string;
  status: string;
  lastSeen?: string;
  isActive: boolean;
  isVerified: boolean;
  role: string;
  permissions?: string[];
  isBanned: boolean;
  banReason?: string;
  bannedAt?: string;
  bannedBy?: string;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  backupCodes?: string[];
  linkedDevices?: any[];
  legacyFcmTokens?: string[];
  oauthProviders?: any[];
  createdAt?: string;
  updatedAt?: string;
}

interface MigratedSettingsRequest {
  externalId: string;
  darkMode: boolean;
  autoDownloadMedia: boolean;
  saveToGallery: boolean;
  pushNotifications: boolean;
  messageNotifications: boolean;
  groupNotifications: boolean;
  callNotifications: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  showPreview: boolean;
  inAppNotifications: boolean;
  notificationLight: boolean;
  readReceipts: boolean;
  lastSeenVisible: boolean;
  profilePhotoVisibility: string;
  statusVisibility: string;
  fingerprintLock: boolean;
  blockedUserExternalIds?: string[];
}

interface MigrationResult {
  total: number;
  successful: number;
  failed: number;
  errors: { externalId: string; error: string }[];
}

interface MigrationStats {
  totalUsers: number;
  migratedUsers: number;
  failedUsers: number;
  totalSettings: number;
  migratedSettings: number;
  failedSettings: number;
  startTime: Date;
  endTime?: Date;
  errors: { externalId: string; error: string }[];
}

class UserMigration {
  private config: MigrationConfig;
  private httpClient: AxiosInstance;
  private User: mongoose.Model<any>;
  private UserSettings: mongoose.Model<any>;
  private stats: MigrationStats;

  constructor(config: MigrationConfig) {
    this.config = config;
    this.httpClient = axios.create({
      baseURL: config.springUrl + "/v1/migration",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": config.apiKey,
      },
      timeout: 60000,
    });
    this.User = mongoose.model("User", userSchema);
    this.UserSettings = mongoose.model("UserSettings", userSettingsSchema);
    this.stats = {
      totalUsers: 0,
      migratedUsers: 0,
      failedUsers: 0,
      totalSettings: 0,
      migratedSettings: 0,
      failedSettings: 0,
      startTime: new Date(),
      errors: [],
    };
  }

  async run(): Promise<void> {
    console.log("Starting MongoDB to PostgreSQL user migration...");
    console.log("Mode: " + (this.config.dryRun ? "DRY RUN" : "LIVE"));
    console.log("Batch size: " + this.config.batchSize);

    try {
      console.log("Connecting to MongoDB...");
      await mongoose.connect(this.config.mongoUri);
      console.log("Connected to MongoDB");

      this.stats.totalUsers = await this.User.countDocuments();
      console.log("Total users in MongoDB: " + this.stats.totalUsers);

      await this.migrateUsers();
      await this.migrateSettings();

      this.stats.endTime = new Date();
      this.printSummary();
    } catch (error) {
      console.error("Migration failed:", error);
      throw error;
    } finally {
      await mongoose.disconnect();
      console.log("Disconnected from MongoDB");
    }
  }

  private async migrateUsers(): Promise<void> {
    console.log("Phase 1: Migrating Users");

    let skip = this.config.skip;
    let processed = 0;
    const limit = this.config.limit;

    while (true) {
      const batchSize = limit
        ? Math.min(this.config.batchSize, limit - processed)
        : this.config.batchSize;

      if (batchSize <= 0) break;

      const users = await this.User.find().skip(skip).limit(batchSize).lean();
      if (users.length === 0) break;

      console.log("Processing batch: " + (skip + 1) + " to " + (skip + users.length));

      const migratedUsers: MigratedUserRequest[] = users.map((user: any) => this.transformUser(user));

      if (this.config.dryRun) {
        console.log("[DRY RUN] Would migrate " + migratedUsers.length + " users");
        this.stats.migratedUsers += migratedUsers.length;
      } else {
        try {
          const result = await this.sendUsersBatch(migratedUsers);
          this.stats.migratedUsers += result.successful;
          this.stats.failedUsers += result.failed;
          this.stats.errors.push(...result.errors);
        } catch (error: any) {
          console.error("Batch failed:", error.message);
          this.stats.failedUsers += migratedUsers.length;
        }
      }

      skip += users.length;
      processed += users.length;

      const progress = ((skip / this.stats.totalUsers) * 100).toFixed(1);
      console.log("Progress: " + progress + "%");

      if (limit && processed >= limit) break;
    }
  }

  private async migrateSettings(): Promise<void> {
    console.log("Phase 2: Migrating User Settings");

    this.stats.totalSettings = await this.UserSettings.countDocuments();
    console.log("Total settings in MongoDB: " + this.stats.totalSettings);

    let skip = 0;

    while (true) {
      const settings = await this.UserSettings.find()
        .populate("userId", "_id")
        .populate("blockedUsers", "_id")
        .skip(skip)
        .limit(this.config.batchSize)
        .lean();

      if (settings.length === 0) break;

      const migratedSettings: MigratedSettingsRequest[] = settings
        .filter((s: any) => s.userId)
        .map((s: any) => this.transformSettings(s));

      if (this.config.dryRun) {
        console.log("[DRY RUN] Would migrate " + migratedSettings.length + " settings");
        this.stats.migratedSettings += migratedSettings.length;
      } else if (migratedSettings.length > 0) {
        try {
          const result = await this.sendSettingsBatch(migratedSettings);
          this.stats.migratedSettings += result.successful;
          this.stats.failedSettings += result.failed;
        } catch (error: any) {
          console.error("Batch failed:", error.message);
          this.stats.failedSettings += migratedSettings.length;
        }
      }

      skip += settings.length;
    }
  }

  private transformUser(user: any): MigratedUserRequest {
    return {
      externalId: user._id.toString(),
      phoneNumber: user.phoneNumber || "",
      username: user.username || user.phoneNumber || user._id.toString(),
      displayName: user.displayName || user.username || "User",
      email: user.email,
      passwordHash: user.password || "",
      avatar: user.avatar,
      bio: user.bio,
      publicKey: user.publicKey,
      status: (user.status || "offline").toUpperCase(),
      lastSeen: user.lastSeen?.toISOString(),
      isActive: user.isActive !== false,
      isVerified: user.isVerified === true,
      role: (user.role || "user").toUpperCase(),
      permissions: user.permissions || [],
      isBanned: user.isBanned === true,
      banReason: user.banReason,
      bannedAt: user.bannedAt?.toISOString(),
      bannedBy: user.bannedBy?.toString(),
      twoFactorEnabled: user.twoFactorEnabled === true,
      twoFactorSecret: user.twoFactorSecret,
      backupCodes: user.backupCodes || [],
      linkedDevices: user.linkedDevices?.map((d: any) => ({
        deviceId: d.deviceId,
        deviceName: d.deviceName,
        deviceType: (d.deviceType || "MOBILE").toUpperCase(),
        fcmToken: d.fcmToken,
        lastActive: d.lastActive?.toISOString(),
        linkedAt: d.linkedAt?.toISOString(),
      })) || [],
      legacyFcmTokens: user.fcmTokens?.filter((t: string) => {
        return !user.linkedDevices?.some((d: any) => d.fcmToken === t);
      }) || [],
      oauthProviders: user.oauthProviders?.map((p: any) => ({
        provider: p.provider?.toUpperCase(),
        providerId: p.providerId,
        email: p.email,
        linkedAt: p.linkedAt?.toISOString(),
      })) || [],
      createdAt: user.createdAt?.toISOString(),
      updatedAt: user.updatedAt?.toISOString(),
    };
  }

  private transformSettings(settings: any): MigratedSettingsRequest {
    return {
      externalId: settings.userId._id?.toString() || settings.userId.toString(),
      darkMode: settings.darkMode || false,
      autoDownloadMedia: settings.autoDownloadMedia !== false,
      saveToGallery: settings.saveToGallery || false,
      pushNotifications: settings.pushNotifications !== false,
      messageNotifications: settings.messageNotifications !== false,
      groupNotifications: settings.groupNotifications !== false,
      callNotifications: settings.callNotifications !== false,
      soundEnabled: settings.soundEnabled !== false,
      vibrationEnabled: settings.vibrationEnabled !== false,
      showPreview: settings.showPreview !== false,
      inAppNotifications: settings.inAppNotifications !== false,
      notificationLight: settings.notificationLight || false,
      readReceipts: settings.readReceipts !== false,
      lastSeenVisible: settings.lastSeenVisible !== false,
      profilePhotoVisibility: (settings.profilePhotoVisibility || "everyone").toUpperCase(),
      statusVisibility: (settings.statusVisibility || "everyone").toUpperCase(),
      fingerprintLock: settings.fingerprintLock || false,
      blockedUserExternalIds: settings.blockedUsers?.map((u: any) =>
        u._id?.toString() || u.toString()
      ) || [],
    };
  }

  private async sendUsersBatch(users: MigratedUserRequest[]): Promise<MigrationResult> {
    const response = await this.httpClient.post<MigrationResult>("/users/batch", users);
    return response.data;
  }

  private async sendSettingsBatch(settings: MigratedSettingsRequest[]): Promise<MigrationResult> {
    const response = await this.httpClient.post<MigrationResult>("/settings/batch", settings);
    return response.data;
  }

  private printSummary(): void {
    const duration = this.stats.endTime
      ? (this.stats.endTime.getTime() - this.stats.startTime.getTime()) / 1000
      : 0;

    console.log("Migration Summary");
    console.log("Duration: " + duration.toFixed(1) + " seconds");
    console.log("Mode: " + (this.config.dryRun ? "DRY RUN" : "LIVE"));
    console.log("Users - Total: " + this.stats.totalUsers + ", Migrated: " + this.stats.migratedUsers + ", Failed: " + this.stats.failedUsers);
    console.log("Settings - Total: " + this.stats.totalSettings + ", Migrated: " + this.stats.migratedSettings + ", Failed: " + this.stats.failedSettings);

    if (this.stats.errors.length > 0) {
      console.log("Errors (first 10):");
      this.stats.errors.slice(0, 10).forEach((err, i) => {
        console.log("  " + (i + 1) + ". " + err.externalId + ": " + err.error);
      });
    }
  }
}

function parseArgs(): MigrationConfig {
  const args = process.argv.slice(2);

  const config: MigrationConfig = {
    mongoUri: process.env.MONGODB_URI || "mongodb://localhost:27017/quckchat",
    springUrl: process.env.SPRING_AUTH_SERVICE_URL || "http://localhost:8081/api/auth",
    apiKey: process.env.SPRING_AUTH_API_KEY || "",
    batchSize: 100,
    dryRun: false,
    skip: 0,
    limit: null,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--dry-run":
        config.dryRun = true;
        break;
      case "--batch-size":
        config.batchSize = parseInt(args[++i], 10) || 100;
        break;
      case "--skip":
        config.skip = parseInt(args[++i], 10) || 0;
        break;
      case "--limit":
        config.limit = parseInt(args[++i], 10) || null;
        break;
    }
  }

  return config;
}

async function main(): Promise<void> {
  const config = parseArgs();

  if (!config.mongoUri) {
    console.error("Error: MONGODB_URI environment variable is required");
    process.exit(1);
  }

  if (!config.apiKey && !config.dryRun) {
    console.error("Error: SPRING_AUTH_API_KEY environment variable is required for live migration");
    process.exit(1);
  }

  const migration = new UserMigration(config);
  await migration.run();
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
