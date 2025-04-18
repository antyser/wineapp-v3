import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Force development mode for testing
const isDevelopment = true;
const isWeb = Platform.OS === 'web';

// Log environment setup
console.log('[API Client] Environment setup:', {
  isDevelopment,
  platform: Platform.OS,
  isWeb,
  nodeEnv: process.env.NODE_ENV,
  expoReleaseChannel: Constants.expoConfig?.releaseChannel,
});

// Configure baseURL based on environment
let baseURL = 'https://api.wineapp.com';

if (isDevelopment) {
  if (isWeb) {
    // For web in development - use localhost
    baseURL = 'http://localhost:8000/api/v1';
    console.log('[API Client] Using web development URL:', baseURL);
  } else if (Platform.OS === 'android') {
    // For Android emulator
    baseURL = 'http://10.0.2.2:8000/api/v1';
    console.log('[API Client] Using Android emulator URL:', baseURL);
  } else {
    // For iOS simulator or other platforms
    baseURL = 'http://localhost:8000/api/v1';
    console.log('[API Client] Using iOS/other development URL:', baseURL);
  }
} else {
  // Production URL
  console.log('[API Client] Using production URL:', baseURL);
}

// Create Axios instance
export const apiClient = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Log the configured axios instance
console.log('[API Client] API client created with baseURL:', apiClient.defaults.baseURL);

// Add request interceptor for logging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`[API Client] 🚀 API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, {
      params: config.params,
      data: config.data,
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

// === GENERATED API CLIENT (PREFERRED) ===
// Export the generated API client and its configuration
export { 
  default as api,
  client 
} from './generatedClient';

// Export all functions from the generated SDK
export * from './generated/sdk.gen';

// Export all types from the generated client
export * from './generated/types.gen';

// === DEPRECATED/REMOVED SERVICES ===
// The wineService has been removed. Please use the functions from the generated SDK instead.
// For example, use searchWinesEndpointApiV1SearchPost instead of wineService.searchWines

// Re-export the legacy API client for backward compatibility
export { default as apiClient } from './apiClient';

/**
 * API Access Guide:
 * 
 * Preferred approach (using generated client):
 * ```
 * import { searchWinesEndpointApiV1SearchPost } from 'src/api';
 * 
 * // Example: Search for wines
 * const { data: wines } = await searchWinesEndpointApiV1SearchPost({
 *   body: {
 *     text_input: 'cabernet',
 *     image_url: null
 *   }
 * });
 * ```
 * 
 * Cellar operations:
 * ```
 * import { listCellarsApiV1CellarsGet, getCellarApiV1CellarsCellarIdGet } from 'src/api';
 * 
 * // Example: Get all cellars
 * const { data } = await listCellarsApiV1CellarsGet();
 * const cellars = data.items;
 * 
 * // Example: Get cellar by ID
 * const { data: cellar } = await getCellarApiV1CellarsCellarIdGet({
 *   path: { cellar_id: 'your-cellar-id' }
 * });
 * ```
 */
