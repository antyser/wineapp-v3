export default {
  expo: {
    name: 'wineapp',
    slug: 'wineapp',
    version: '1.0.9',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true, // Enable React Native New Architecture
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      appleTeamId: '2S263GWYYC',
      supportsTablet: true,
      bundleIdentifier: 'app.aisomm.somm',
      infoPlist: {
        NSCameraUsageDescription: 'We need access to your camera to scan wine labels',
        NSPhotoLibraryUsageDescription: 'We need access to your photos to upload wine labels',
        LSApplicationQueriesSchemes: ['https', 'http'],
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      package: 'app.aisomm.somm',
    },
    web: {
      favicon: './assets/favicon.png',
    },
    scheme: 'wineapp',
    extra: {
      env: process.env.ENV,
      eas: {
        projectId: '91dae555-3419-4f54-bb71-3e6a1d866047',
      },
    },
    plugins: [
      'expo-secure-store',
      [
        'expo-image-picker',
        {
          photosPermission: 'The app accesses your photos to let you share them with your friends.',
          cameraPermission: 'The app accesses your camera to let you scan wine labels.',
        },
      ],
    ],
  },
};
