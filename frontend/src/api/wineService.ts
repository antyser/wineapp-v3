/**
 * @deprecated This wineService is maintained only for backward compatibility.
 * It will be removed in a future update.
 * 
 * Please migrate your code to use the generated API client:
 * 
 * Example migration:
 * 
 * 1. Instead of:
 *    ```
 *    import { wineService } from '../api';
 *    const wines = await wineService.searchWines('cabernet');
 *    ```
 * 
 * 2. Use the helper functions (recommended):
 *    ```
 *    import { searchWines } from '../api';
 *    const wines = await searchWines('cabernet');
 *    ```
 * 
 * 3. Or use the generated API directly:
 *    ```
 *    import { api } from '../api';
 *    const response = await api.searchWinesEndpointApiV1SearchPost({
 *      body: {
 *        text_input: 'cabernet',
 *        image_url: null
 *      }
 *    });
 *    const wines = response.data;
 *    ```
 */

import { Wine } from '../types/wine';
import { apiClient } from './apiClient';

// Export interfaces for backward compatibility
export interface SearchHistoryItemResponse {
  id: string;
  user_id: string;
  search_type: 'text' | 'image';
  search_query: string | null;
  result_wine_ids: string[] | null;
  created_at: string;
  wines: Wine[] | null;
}

interface WineResponse {
  wine: Wine;
}

interface WinesResponse {
  wines: Wine[];
  total: number;
  page: number;
  limit: number;
}

interface SearchParams {
  query?: string;
  page?: number;
  limit?: number;
  wine_type?: string;
  region?: string;
  vintage?: string;
}

// Create a wrapper around the generated client that matches the old wineService interface
export const wineService = {
  // Get all wines with optional filters
  getWines: async (params: SearchParams = {}): Promise<WinesResponse> => {
    console.warn('[DEPRECATED] wineService.getWines is deprecated. Use the generated API client instead.');
    const response = await apiClient.get('/api/v1/wines', { params });
    return response.data;
  },

  // Get wine by ID
  getWineById: async (id: string): Promise<Wine> => {
    console.warn('[DEPRECATED] wineService.getWineById is deprecated. Use the generated API client instead.');
    const response = await apiClient.get(`/api/v1/wines/${id}`);
    return response.data.wine || response.data; 
  },

  // Search wines by text query
  searchWines: async (query: string): Promise<Wine[]> => {
    console.warn('[DEPRECATED] wineService.searchWines is deprecated. Use the generated API client instead.');
    const response = await apiClient.post('/api/v1/search', {
      text_input: query,
      image_url: null
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  },

  // Search wines using an image URL
  searchByImageUrl: async (imageUrl: string): Promise<Wine[]> => {
    console.warn('[DEPRECATED] wineService.searchByImageUrl is deprecated. Use the generated API client instead.');
    const response = await apiClient.post('/api/v1/search', {
      text_input: null,
      image_url: imageUrl
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.data; 
  },

  // Create a custom wine (when not found in database)
  createWine: async (wineData: Partial<Wine>): Promise<Wine> => {
    console.warn('[DEPRECATED] wineService.createWine is deprecated. Use the generated API client instead.');
    const response = await apiClient.post('/api/v1/wines', wineData);
    return response.data.wine || response.data;
  },

  // Update wine details
  updateWine: async (id: string, wineData: Partial<Wine>): Promise<Wine> => {
    console.warn('[DEPRECATED] wineService.updateWine is deprecated. Use the generated API client instead.');
    const response = await apiClient.patch(`/api/v1/wines/${id}`, wineData);
    return response.data.wine || response.data;
  },

  // Get user's search history
  getSearchHistory: async (limit: number = 10, offset: number = 0): Promise<SearchHistoryItemResponse[]> => {
    console.warn('[DEPRECATED] wineService.getSearchHistory is deprecated. Use the generated API client instead.');
    try {
      const response = await apiClient.get('/api/v1/search/history', {
        params: { limit, offset }
      });
      return response.data.items; 
    } catch (error) {
      console.error('Error fetching search history:', error);
      return [];
    }
  }
};

export default wineService;
