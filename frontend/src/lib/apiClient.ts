import { Platform } from 'react-native';
import { supabase } from './supabase'; // Assuming supabase is initialized here

// Define a type for API error responses if known, otherwise use a generic structure
interface ApiErrorResponse {
  detail?: string | { msg: string; type: string }[]; // Example structure, adjust as needed
}

interface ApiFetchOptions extends RequestInit {
  // No additional options needed for now, but could add custom ones later
}

// Determine the base API URL based on environment
// Export this function for external use
export const getBaseUrl = (): string => {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const isWeb = Platform.OS === 'web';
  let baseURL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'; // Default fallback

  if (isDevelopment) {
    if (isWeb) {
      // Use localhost for web development
      baseURL = 'http://localhost:8000';
    } else if (Platform.OS === 'android') {
      // Use emulator-specific IP for Android development
      baseURL = 'http://10.0.2.2:8000';
    } else {
      // Use localhost for iOS simulator / other native dev
      baseURL = 'http://localhost:8000';
    }
  } else {
    // Use the production URL defined in environment variables
    // Ensure EXPO_PUBLIC_API_URL is set correctly for production builds
     baseURL = process.env.EXPO_PUBLIC_API_URL || 'https://your-production-api.com'; 
     console.warn("Production API URL:", baseURL);
  }
  console.log(`[apiClient] Using base URL: ${baseURL}`);
  return baseURL;
};

// Export the constant as well if needed elsewhere
export const BASE_URL = getBaseUrl();

/**
 * Helper function to get headers including Authorization token.
 */
export const getAuthHeaders = async (baseHeaders: Record<string, string> = {}): Promise<Headers> => {
  const headers = new Headers(baseHeaders);
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('[apiClient] Error getting Supabase session for headers:', sessionError);
    } else if (session?.access_token) {
      headers.set('Authorization', `Bearer ${session.access_token}`);
      console.log(`[apiClient] Added auth token to headers.`);
    } else {
      console.log(`[apiClient] No active session found for headers.`);
    }
  } catch (authError) {
     console.error('[apiClient] Exception while getting auth token for headers:', authError);
  }
  return headers;
}

/**
 * Performs an authenticated fetch request to the API.
 * Automatically adds the Authorization header if the user is logged in.
 * Handles basic JSON parsing and error throwing for non-ok responses.
 *
 * @param endpoint The API endpoint path (e.g., '/api/v1/wines').
 * @param options Standard fetch options (method, body, headers, etc.).
 * @returns Promise<T> The parsed JSON response.
 * @throws {Error} Throws an error for network issues or non-OK HTTP responses.
 */
export const apiFetch = async <T = any>(endpoint: string, options: ApiFetchOptions = {}): Promise<T> => {
  const url = `${BASE_URL}${endpoint}`;
  
  // Combine base headers from options with auth header
  const baseHeaders: Record<string, string> = {};
  if (options.headers) {
      // Convert existing Headers object or Record to Record<string, string>
      if (options.headers instanceof Headers) {
          options.headers.forEach((value, key) => {
              baseHeaders[key] = value;
          });
      } else if (typeof options.headers === 'object') {
           Object.assign(baseHeaders, options.headers);
      }
  }

  // Ensure Content-Type is set for POST/PUT/PATCH with body if not already present
  if (options.body && !baseHeaders['Content-Type'] && !baseHeaders['content-type']) {
    baseHeaders['Content-Type'] = 'application/json';
  }

  // Get the final headers including Authorization
  const headers = await getAuthHeaders(baseHeaders);

  const fetchOptions: RequestInit = {
    ...options,
    headers,
  };

  console.log(`