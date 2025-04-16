import api, { client } from './generatedClient';

/**
 * This file demonstrates how to use the generated API client.
 * You can import this file in your components to make API calls.
 */

// Example: How to use the client to search for wines
export const searchWines = async (query: string) => {
  try {
    // Access endpoints based on your OpenAPI spec
    // This is just an example - actual endpoints will depend on your API
    const response = await api.searchWines({
      text_input: query,
      image_url: null
    });
    
    return response.data;
  } catch (error) {
    console.error('Error searching wines:', error);
    throw error;
  }
};

// Example: How to get wine details
export const getWineById = async (id: string) => {
  try {
    const response = await api.getWineById({
      path: { wine_id: id }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error getting wine details:', error);
    throw error;
  }
};

// Example: How to add a wine to the cellar
export const addWineToCellar = async (cellarId: string, wineData: any) => {
  try {
    const response = await api.addWineToCellar({
      path: { cellar_id: cellarId },
      body: wineData
    });
    
    return response.data;
  } catch (error) {
    console.error('Error adding wine to cellar:', error);
    throw error;
  }
};

// Example: How to get user's search history
export const getSearchHistory = async (limit: number = 10, offset: number = 0) => {
  try {
    const response = await api.getSearchHistory({
      query: { limit, offset }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error fetching search history:', error);
    throw error;
  }
};

// Export a function to update the client's base URL if needed 
// (useful for testing or when environment changes)
export const updateBaseURL = (newBaseURL: string) => {
  client.setConfig({
    baseUrl: newBaseURL
  });
  console.log(`[Generated API Client] Base URL updated to: ${newBaseURL}`);
}; 