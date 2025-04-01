import { apiClient } from './apiClient';

export interface Wine {
  id: string;
  name: string;
  vintage: string;
  region?: string;
  country?: string;
  producer?: string;
  wine_type?: string;
  grape_variety?: string;
  image_url?: string;
  average_price?: number;
  description?: string;
  wine_searcher_id?: string;
  created_at?: string;
  updated_at?: string;
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
    const response = await apiClient.get('/wines', { params });
    return response.data;
  },

  // Get wine by ID
  getWineById: async (id: string): Promise<Wine> => {
    const response = await apiClient.get(`/wines/${id}`);
    return response.data.wine;
  },

  // Search wines by text query
  searchWines: async (query: string, params: Omit<SearchParams, 'query'> = {}): Promise<WinesResponse> => {
    const response = await apiClient.get('/wines/search', {
      params: { query, ...params }
    });
    return response.data;
  },

  // Get recently viewed wines
  getRecentlyViewed: async (limit: number = 5): Promise<Wine[]> => {
    const response = await apiClient.get('/wines/recently-viewed', {
      params: { limit }
    });
    return response.data.wines;
  },

  // Get recommended wines
  getRecommended: async (limit: number = 5): Promise<Wine[]> => {
    const response = await apiClient.get('/wines/recommended', {
      params: { limit }
    });
    return response.data.wines;
  },

  // Submit a wine label image for recognition
  submitWineLabel: async (imageUri: string): Promise<{ wines: Wine[], recognized: boolean }> => {
    // Create form data for image upload
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      name: 'wine_label.jpg',
      type: 'image/jpeg',
    } as any);

    const response = await apiClient.post('/wines/recognize-label', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  // Create a custom wine (when not found in database)
  createWine: async (wineData: Partial<Wine>): Promise<Wine> => {
    const response = await apiClient.post('/wines', wineData);
    return response.data.wine;
  },

  // Update wine details
  updateWine: async (id: string, wineData: Partial<Wine>): Promise<Wine> => {
    const response = await apiClient.patch(`/wines/${id}`, wineData);
    return response.data.wine;
  },
};

export default wineService;
