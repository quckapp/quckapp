/**
 * PM2 Ecosystem Configuration
 * Production process manager for QuckChat Backend
 *
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 start ecosystem.config.js --env production
 *   pm2 start ecosystem.config.js --env staging
 *
 * Commands:
 *   pm2 list                    - List all processes
 *   pm2 logs quckchat-backend   - View logs
 *   pm2 monit                   - Monitor processes
 *   pm2 reload ecosystem.config.js - Zero-downtime reload
 *   pm2 stop all               - Stop all processes
 *   pm2 delete all             - Remove all processes
 */

module.exports = {
  apps: [
    {
      // Application name
      name: 'quckchat-backend',

      // Entry point
      script: 'dist/main.js',

      // Working directory
      cwd: './',

      // Cluster mode for load balancing
      instances: 'max', // Use all available CPU cores
      exec_mode: 'cluster',

      // Auto-restart settings
      autorestart: true,
      watch: false, // Don't watch files in production
      max_memory_restart: '1G', // Restart if memory exceeds 1GB

      // Restart delay
      restart_delay: 4000, // 4 seconds between restarts

      // Max restarts before stopping
      max_restarts: 10,

      // Graceful shutdown timeout
      kill_timeout: 5000, // 5 seconds

      // Wait for ready signal
      wait_ready: true,
      listen_timeout: 10000, // 10 seconds to wait for ready signal

      // Log configuration
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/pm2/error.log',
      out_file: './logs/pm2/out.log',
      merge_logs: true,
      log_type: 'json',

      // Environment variables (default - development)
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },

      // Production environment
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,

        // Performance
        UV_THREADPOOL_SIZE: 16,

        // Memory management
        NODE_OPTIONS: '--max-old-space-size=1024',
      },

      // Staging environment
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3000,
      },

      // Process metrics
      exp_backoff_restart_delay: 100, // Exponential backoff on restarts

      // Source map support for error stack traces
      source_map_support: true,

      // Node.js arguments
      node_args: [
        '--enable-source-maps',
      ],

      // Disable version management
      increment_var: false,
    },

    // Worker process for background jobs (optional)
    {
      name: 'quckchat-worker',
      script: 'dist/worker.js',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',

      env: {
        NODE_ENV: 'development',
      },

      env_production: {
        NODE_ENV: 'production',
      },

      // Only start in production (disable by default)
      // Remove this line when you have a worker.js
      // ignore_watch: ['node_modules'],
    },
  ],

  // Deployment configuration
  deploy: {
    production: {
      // SSH user
      user: 'deploy',

      // Target server(s)
      host: ['your-server.com'],

      // Git reference to deploy
      ref: 'origin/main',

      // Git repository
      repo: 'git@github.com:your-username/quckchat-backend.git',

      // Path on server
      path: '/var/www/quckchat-backend',

      // Pre-deploy commands (run on local machine)
      'pre-deploy-local': '',

      // Post-deploy commands (run on server)
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',

      // Pre-setup commands
      'pre-setup': '',

      // SSH options
      ssh_options: 'StrictHostKeyChecking=no',

      // Environment variables for deployment
      env: {
        NODE_ENV: 'production',
      },
    },

    staging: {
      user: 'deploy',
      host: ['staging.your-server.com'],
      ref: 'origin/develop',
      repo: 'git@github.com:your-username/quckchat-backend.git',
      path: '/var/www/quckchat-backend-staging',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env staging',
      env: {
        NODE_ENV: 'staging',
      },
    },
  },
};
