import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

// Log environment setup
console.log('[API Client] Environment setup:', {
  platform: Platform.OS,
  isWeb: Platform.OS === 'web',
  nodeEnv: process.env.NODE_ENV,
  // expoReleaseChannel: Constants.expoConfig?.releaseChannel, // Property might not exist
});

// Import the configured apiClient from apiClient.ts
import apiClientInstance from './apiClient';

// Re-export the apiClient instance
export const apiClient = apiClientInstance;

// === USE AXIOS CLIENT DIRECTLY WITH GENERATED TYPES ===

// Export only the types from the generated files
export * from './generated/types.gen';

// The generated client/sdk exports are removed.
// Use the `apiClient` (Axios instance) defined above for requests.

// REMOVED: export { api, client } from './generated/client.gen';
// REMOVED: export * from './generated/sdk.gen';

// === DEPRECATED/REMOVED SERVICES ===
// The wineService has been removed. Please use the apiClient (Axios) directly.

// REMOVED: Re-export of legacy apiClient to avoid redeclaration
// REMOVED: export { default as apiClient } from './apiClient';

/**
 * API Access Guide:
 * 
 * Use the `apiClient` (Axios instance) defined in this file 
 * along with the exported types from `./generated/types.gen`.
 * 
 * Example: Search for wines
 * ```typescript
 * import { apiClient, WineSearchResult, SearchWinesRequest } from 'src/api';
 * 
 * const searchPayload: SearchWinesRequest = {
 *   text_input: 'cabernet',
 *   image_url: null
 * };
 * 
 * try {
 *   const response = await apiClient.post<WineSearchResult[]>('/search', searchPayload); 
 *   const wines = response.data; 
 *   // Handle wines data
 * } catch (error) {
 *   // Handle error
 * }
 * ```
 * 
 * Example: Get all cellars
 * ```typescript
 * import { apiClient, Cellar } from 'src/api'; // Assuming Cellar type exists
 * 
 * try {
 *   const response = await apiClient.get<{ items: Cellar[] }>('/cellars'); 
 *   const cellars = response.data.items;
 *   // Handle cellars data
 * } catch (error) {
 *   // Handle error
 * }
 * ```
 * 
 * Example: Get cellar by ID
 * ```typescript
 * import { apiClient, Cellar } from 'src/api'; // Assuming Cellar type exists
 * 
 * const cellarId = 'your-cellar-id';
 * try {
 *   const response = await apiClient.get<Cellar>(`/cellars/${cellarId}`);
 *   const cellar = response.data;
 *   // Handle cellar data
 * } catch (error) {
 *   // Handle error
 * }
 * ```
 */
