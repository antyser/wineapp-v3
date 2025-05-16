import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';
import RootNavigator from './src/navigation/RootNavigator';
import { theme } from './src/theme/theme';
import { AuthProvider } from './src/auth/AuthContext';

// Enable screens for better navigation performance
enableScreens();


export default function App() {
    // ---- START DIAGNOSTIC PROBE ----
    React.useEffect(() => {
      console.log(
        '[JSI check] nativeCallSyncHook =',
        // @ts-ignore because nativeCallSyncHook is not in standard global types
        global.nativeCallSyncHook ?? 'undefined'
      );
      console.log(
        '[TurboModules check] isNewArch =',
        // @ts-ignore because _IS_NEW_ARCH_ENABLED is not in standard global types
        global._IS_NEW_ARCH_ENABLED ?? 'undefined' // Use undefined if not present
      );
    }, []);
    // ---- END DIAGNOSTIC PROBE ----
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <AuthProvider>
          <StatusBar style="auto" />
          <RootNavigator />
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
