/**
 * migrate-mongo configuration file
 * This file is used by the migrate-mongo CLI tool
 *
 * Usage:
 *   npx migrate-mongo create <migration-name>  - Create a new migration
 *   npx migrate-mongo up                       - Run all pending migrations
 *   npx migrate-mongo down                     - Rollback last migration
 *   npx migrate-mongo status                   - Show migration status
 */

require('dotenv').config();

const env = process.env.NODE_ENV || 'development';

let mongoUri;
if (env === 'production') {
  mongoUri =
    process.env.MONGODB_URI_PROD ||
    process.env.MONGODB_URI ||
    'mongodb://localhost:27017/quickchat';
} else {
  mongoUri =
    process.env.MONGODB_URI_DEV ||
    process.env.MONGODB_URI ||
    'mongodb://localhost:27017/quickchat-dev';
}

module.exports = {
  mongodb: {
    url: mongoUri,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },

  // The migrations dir, can be an relative or absolute path
  migrationsDir: 'src/common/database/migrations/scripts',

  // The mongodb collection where the applied changes are stored
  changelogCollectionName: 'migrations_changelog',

  // The file extension to create migrations and search for in migration dir
  migrationFileExtension: '.js',

  // Enable the algorithm to create a checksum of the file contents and use that in the comparison to determine
  // if the file should be run. Requires that scripts are coded to be run multiple times.
  useFileHash: false,

  // Don't change this, unless you know what you're doing
  moduleSystem: 'commonjs',
};
