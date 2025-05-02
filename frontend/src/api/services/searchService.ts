import { apiClient } from '../index'; // Import the configured apiClient
import { SearchRequest, Wine, SearchHistoryItemResponse } from '../generated/types.gen'; // Import relevant types

/**
 * Calls the backend search endpoint.
 * @param payload - The search request payload (text or image URL).
 * @returns A promise resolving to an array of Wine objects.
 */
export const searchWines = async (payload: SearchRequest): Promise<Wine[]> => {
  try {
    const response = await apiClient.post<Wine[]>('/api/v1/search', payload);
    return response.data; // Return the array of wines
  } catch (error) {
    console.error('[searchService] Error searching wines:', error);
    // Re-throw the error for the caller to handle
    // Or handle it here (e.g., return empty array, throw custom error)
    throw error;
  }
};

/**
 * Fetches the user's search history.
 * @param limit - Maximum number of history items to retrieve.
 * @param offset - Offset for pagination.
 * @returns A promise resolving to an array of search history items.
 */
export const getSearchHistory = async (limit: number = 10, offset: number = 0): Promise<SearchHistoryItemResponse[]> => {
  try {
    const response = await apiClient.get<{ items: SearchHistoryItemResponse[] }>('/api/v1/search/history', {
      params: { limit, offset },
    });
    return response.data.items || []; // Return the items array or empty array
  } catch (error) {
    console.error('[searchService] Error fetching search history:', error);
    throw error;
  }
}; 