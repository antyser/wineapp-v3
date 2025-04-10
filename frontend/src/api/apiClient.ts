import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

// Force development mode for testing
const isDevelopment = true;
const isWeb = Platform.OS === 'web';

// Log environment setup
console.log('[API Client] Environment setup:', {
  isDevelopment,
  platform: Platform.OS,
  isWeb,
  nodeEnv: process.env.NODE_ENV,
  // Use optional chaining to avoid errors if releaseChannel doesn't exist
  expoConfig: Constants.expoConfig ? 'defined' : 'undefined'
});

// Configure baseURL based on environment
let baseURL = 'https://api.wineapp.com';

if (isDevelopment) {
  if (isWeb) {
    // For web in development - use localhost
    baseURL = 'http://localhost:8000';
    console.log('[API Client] Using web development URL:', baseURL);
  } else if (Platform.OS === 'android') {
    // For Android emulator
    baseURL = 'http://10.0.2.2:8000';
    console.log('[API Client] Using Android emulator URL:', baseURL);
  } else {
    // For iOS simulator or other platforms
    baseURL = 'http://localhost:8000';
    console.log('[API Client] Using iOS/other development URL:', baseURL);
  }
} else {
  // Production URL
  console.log('[API Client] Using production URL:', baseURL);
}

// Create Axios instance
export const apiClient = axios.create({
  baseURL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Log the configured axios instance
console.log('[API Client] API client created with baseURL:', apiClient.defaults.baseURL);

// Add request interceptor for authentication and logging
apiClient.interceptors.request.use(
  async (config) => {
    try {
      // Get the current session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      // If there's a session, add the auth token to the request
      if (session?.access_token) {
        // Extract and log key parts of the token (without exposing full token)
        const tokenStart = session.access_token.substring(0, 10);
        
        // Decode the JWT payload (without verification)
        const payload = session.access_token.split('.')[1];
        if (payload) {
          try {
            const decodedPayload = JSON.parse(atob(payload));
            console.log(`[API Client] Token payload:`, {
              iss: decodedPayload.iss,
              sub: decodedPayload.sub,
              exp: decodedPayload.exp,
              validUntil: decodedPayload.exp ? new Date(decodedPayload.exp * 1000).toISOString() : 'unknown',
              currentTime: new Date().toISOString()
            });
          } catch (decodeError) {
            console.error('[API Client] Error decoding JWT payload:', decodeError);
          }
        }
        
        console.log(`[API Client] Auth token found for user: ${session.user?.id}. Adding to request:`, config.url);
        console.log(`[API Client] Token starts with: ${tokenStart}...`);
        config.headers['Authorization'] = `Bearer ${session.access_token}`;
      } else {
        console.warn('[API Client] No auth token available. User not authenticated.', error || '');
      }
    } catch (authError) {
      console.error('[API Client] Error getting auth token:', authError);
    }
    
    console.log(`[API Client] 🚀 API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, {
      params: config.params,
      headers: config.headers,
      fullUrl: `${config.baseURL}${config.url}`
    });
    return config;
  },
  (error) => {
    console.error('[API Client] ❌ Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for logging
apiClient.interceptors.response.use(
  (response) => {
    console.log(`[API Client] ✅ Response: ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`, {
      data: response.data,
      fullUrl: `${response.config.baseURL}${response.config.url}`
    });
    return response;
  },
  (error) => {
    if (error.response) {
      // The request was made and the server responded with a status code outside of 2xx
      console.error(`[API Client] ❌ Response error: ${error.response.status} ${error.config?.method?.toUpperCase() || 'UNKNOWN'} ${error.config?.url || 'UNKNOWN_URL'}`, {
        data: error.response.data,
        headers: error.response.headers,
        fullUrl: error.config ? `${error.config.baseURL}${error.config.url}` : 'UNKNOWN_FULL_URL'
      });
    } else if (error.request) {
      // The request was made but no response was received
      console.error('[API Client] ❌ No response received:', {
        request: error.request,
        config: error.config,
        fullUrl: error.config ? `${error.config.baseURL}${error.config.url}` : 'UNKNOWN_FULL_URL'
      });
    } else {
      // Something happened in setting up the request
      console.error('[API Client] ❌ Request setup error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default apiClient;
