import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Determine if we're running in Expo Go or a standalone app
const isExpoGo = Constants.appOwnership === 'expo';
const isDevelopment = process.env.NODE_ENV === 'development';
const isWeb = Platform.OS === 'web';

// Choose appropriate base URL
let baseURL = 'https://api.wineapp.com/api/v1';

// For development, use the local server
if (isDevelopment) {
  if (isWeb) {
    // For web, we need to use the host IP address or hostname
    // that's accessible from the browser
    baseURL = 'http://127.0.0.1:8000/api/v1';

    // If you're running on a different machine or need to access from mobile,
    // you might need to use your machine's local network IP
    // baseURL = 'http://192.168.86.25:8000/api/v1';
  } else {
    // For mobile in development
    baseURL = 'http://10.0.2.2:8000/api/v1'; // For Android emulator

    // Check if running on iOS
    if (Platform.OS === 'ios') {
      baseURL = 'http://localhost:8000/api/v1'; // For iOS simulator
    }
  }

  console.log(`API base URL set to: ${baseURL}`);
}

// Create and configure axios instance
export const apiClient = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Add request interceptor for auth token and logging
apiClient.interceptors.request.use(
  async (config) => {
    // Add auth token to request headers if available
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (isDevelopment) {
      console.log(`Making API request to: ${config.baseURL}${config.url}`, config.params);
    }
    return config;
  },
  (error) => {
    if (isDevelopment) {
      console.error('API Request Error:', error);
    }
    return Promise.reject(error);
  }
);

// Add response interceptor for better error handling
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (isDevelopment) {
      console.error('API Error:', error.message);

      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      } else if (error.request) {
        console.error('No response received:', error.request);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
