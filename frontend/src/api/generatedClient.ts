import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { client } from './generated/client.gen';
import * as api from './generated';
import { supabase } from '../lib/supabase';

// Force development mode for testing
const isDevelopment = process.env.NODE_ENV !== 'production';
const isWeb = Platform.OS === 'web';

// Log environment setup
console.log('[Generated API Client] Environment setup:', {
  isDevelopment,
  platform: Platform.OS,
  isWeb,
  nodeEnv: process.env.NODE_ENV,
  expoConfig: Constants.expoConfig ? 'defined' : 'undefined'
});

// Configure baseURL based on environment
let baseURL = 'https://api.wineapp.com';

if (isDevelopment) {
  if (isWeb) {
    // For web in development - use localhost
    baseURL = 'http://localhost:8000';
    console.log('[Generated API Client] Using web development URL:', baseURL);
  } else if (Platform.OS === 'android') {
    // For Android emulator
    baseURL = 'http://10.0.2.2:8000';
    console.log('[Generated API Client] Using Android emulator URL:', baseURL);
  } else {
    // For iOS simulator or other platforms
    baseURL = 'http://localhost:8000';
    console.log('[Generated API Client] Using iOS/other development URL:', baseURL);
  }
} else {
  // Production URL
  console.log('[Generated API Client] Using production URL:', baseURL);
}

// Configure the client
client.setConfig({
  baseUrl: baseURL,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add request interceptor for authentication
client.interceptors.request.use(async (request) => {
  try {
    // Get the current session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    // If there's a session, add the auth token to the request
    if (session?.access_token) {
      console.log(`[Generated API Client] Auth token found for user: ${session.user?.id}`);
      request.headers.set('Authorization', `Bearer ${session.access_token}`);
    } else {
      console.warn('[Generated API Client] No auth token available. User not authenticated.', error || '');
    }
  } catch (authError) {
    console.error('[Generated API Client] Error getting auth token:', authError);
  }
  
  console.log(`[Generated API Client] 🚀 API Request: ${request.method} ${request.url}`);
  return request;
});

// Add response interceptor for logging
client.interceptors.response.use((response) => {
  if (response.ok) {
    console.log(`[Generated API Client] ✅ Response: ${response.status}`);
  } else {
    console.error(`[Generated API Client] ❌ Response error: ${response.status}`, {
      url: response.url,
    });
  }
  return response;
});

// Export the configured client and all generated types/functions
export { client };
export * from './generated';

// Export a default API object for convenience
export default api; 