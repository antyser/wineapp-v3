// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Disable Watchman
config.watchFolders = config.watchFolders || [];
config.resolver.assetExts.push('cjs');
config.watcher = {
  // Additional options for the watcher
  // https://facebook.github.io/metro/docs/configuration/#watcher
  healthCheck: {
    enabled: true,
    interval: 30000, // Check every 30 seconds
    timeout: 5000,   // Timeout after 5 seconds
  },
  useWatchman: false, // Explicitly disable Watchman
};

module.exports = config;
