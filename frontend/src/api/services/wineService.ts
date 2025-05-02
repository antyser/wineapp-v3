import { apiClient } from '../index';
// Import relevant request/response types from generated types
import { Wine, Note, UserWineResponse /* Interaction/Rating types */ } from '../generated/types.gen';

// Placeholder types if specific ones aren't generated
interface WineInteractionUpdatePayload {
  wishlist?: boolean;
  liked?: boolean;
  // Add other interaction fields if applicable
}

interface WineRatingUpdatePayload {
  rating_5?: number | null;
}

/**
 * Updates user-specific interaction data for a wine (wishlist, like, etc.).
 * Uses PATCH on the /wines/{wine_id} endpoint implicitly via interaction/rating update.
 * NOTE: This assumes the backend merges interaction fields in a single PATCH or 
 * requires separate dedicated endpoints not shown in basic spec.
 * For now, we combine rating and interaction updates for simplicity.
 */
export const updateWineDetails = async (wineId: string, payload: WineInteractionUpdatePayload & WineRatingUpdatePayload): Promise<Wine> => {
  try {
    // Adjust payload structure if backend expects separate interaction/rating keys
    const response = await apiClient.patch<Wine>(`/api/v1/wines/${wineId}`, payload);
    return response.data;
  } catch (error) {
    console.error(`[wineService] Error updating wine ${wineId} details:`, error);
    throw error;
  }
};

// Add function for public wine details
/**
 * Fetches public details for a specific wine.
 * GET /api/v1/wines/{wine_id}
 */
export const getPublicWineDetails = async (wineId: string): Promise<Wine> => {
  try {
    const response = await apiClient.get<Wine>(`/api/v1/wines/${wineId}`);
    return response.data;
  } catch (error) {
    console.error(`[wineService] Error fetching public details for wine ${wineId}:`, error);
    throw error;
  }
};

/**
 * Fetches comprehensive details for a specific wine for the logged-in user.
 * GET /api/v1/wines/user/{wine_id}
 */
export const getUserWineDetails = async (wineId: string): Promise<UserWineResponse> => {
    try {
        const response = await apiClient.get<UserWineResponse>(`/api/v1/wines/user/${wineId}`);
        return response.data;
    } catch (error) {
        console.error(`[wineService] Error fetching user details for wine ${wineId}:`, error);
        throw error;
    }
};

// Add other wine-related service functions here (e.g., getWineDetails if not using hook) 