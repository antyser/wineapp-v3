import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
// Remove Constants import if no longer needed elsewhere in this file
// import Constants from 'expo-constants'; 

// Fetch Supabase URL and Anon Key directly from process.env
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Keep the console logs for checking
console.log('supabaseUrl', supabaseUrl);
console.log('supabaseAnonKey', supabaseAnonKey);

// Basic check to ensure the environment variables are loaded
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is missing. Check your .env file and ensure variables start with EXPO_PUBLIC_');
  // Optionally throw an error or handle this case appropriately
  // throw new Error('Supabase URL or Anon Key is missing.');
}

// Create and export the Supabase client
// Use default values ('') only as a fallback if the check above doesn't throw
export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  auth: {
    storage: AsyncStorage, // Use AsyncStorage for session persistence in React Native
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Explicitly disable URL session detection for mobile
  },
}); 