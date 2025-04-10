import { apiClient } from './apiClient';
import { Wine } from '../types/wine'; // Import Wine type from central location

// Remove the local Wine interface definition if it duplicates ../types/wine

// Update SearchHistory interface to match backend response
// Renaming to SearchHistoryItemResponse for clarity
export interface SearchHistoryItemResponse {
  id: string;
  user_id: string;
  search_type: 'text' | 'image';
  search_query: string | null;
  result_wine_ids: string[] | null; // Still useful to keep?
  created_at: string;
  wines: Wine[] | null; // Add the wines array
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

export const wineService = {
  // Get all wines with optional filters
  getWines: async (params: SearchParams = {}): Promise<WinesResponse> => {
    const response = await apiClient.get('/api/v1/wines', { params });
    return response.data;
  },

  // Get wine by ID
  getWineById: async (id: string): Promise<Wine> => {
    const response = await apiClient.get(`/api/v1/wines/${id}`);
    // Assuming backend returns { wine: Wine } structure
    // Adjust if the backend returns just Wine directly
    return response.data.wine || response.data; 
  },

  // Search wines by text query - Added function
  searchWines: async (query: string): Promise<Wine[]> => {
    console.log(`Searching for wines with query: ${query}`);
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
    const response = await apiClient.post('/api/v1/search', {
      text_input: null,
      image_url: imageUrl
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    // Assuming backend returns Wine[] directly for image search
    return response.data; 
  },

  // Create a custom wine (when not found in database)
  createWine: async (wineData: Partial<Wine>): Promise<Wine> => {
    const response = await apiClient.post('/api/v1/wines', wineData);
    return response.data.wine || response.data;
  },

  // Update wine details
  updateWine: async (id: string, wineData: Partial<Wine>): Promise<Wine> => {
    const response = await apiClient.patch(`/api/v1/wines/${id}`, wineData);
    return response.data.wine || response.data;
  },

  // Get user's search history
  getSearchHistory: async (limit: number = 10, offset: number = 0): Promise<SearchHistoryItemResponse[]> => {
    try {
      const response = await apiClient.get('/api/v1/search/history', {
        params: { limit, offset }
      });
      // Assuming backend returns { items: SearchHistoryItemResponse[], ... } structure
      return response.data.items; 
    } catch (error) {
      console.error('Error fetching search history:', error);
      // Update mock data function call
      return [];
    }
  }
};




export default wineService;
