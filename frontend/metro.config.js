const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);
config.resolver.unstable_enablePackageExports = false;
config.watchFolders = config.watchFolders || [];
config.resolver.assetExts.push('cjs');
config.watcher = {
  // Additional options for the watcher
  // https://facebook.github.io/metro/docs/configuration/#watcher
  healthCheck: {
    enabled: true,
    interval: 30000, // Check every 30 seconds
    timeout: 5000, // Timeout after 5 seconds
  },
};

module.exports = config;
