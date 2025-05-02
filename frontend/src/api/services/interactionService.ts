import { apiClient, Interaction, InteractionUpdate } from '../index'; // Adjust path as needed
import { UUID } from '../generated/types.gen'; // Assuming UUID is exported or use string

/**
 * Saves (upserts) user interaction data for a specific wine.
 * 
 * @param wineId - The ID of the wine.
 * @param payload - An object containing the interaction fields to update (liked, wishlist, rating).
 * @returns The updated interaction object.
 */
export const saveInteraction = async (
  wineId: UUID | string, 
  payload: InteractionUpdate
): Promise<Interaction> => {
  try {
    console.log(`[InteractionService] Saving interaction for wine ${wineId}`, payload);
    const response = await apiClient.post<Interaction>(
        `/api/v1/interactions/user/${wineId}`,
        payload
    );
    console.log(`[InteractionService] Save successful for wine ${wineId}`, response.data);
    return response.data;
  } catch (error: any) { // Use 'any' or a more specific error type
    console.error(`[InteractionService] Error saving interaction for wine ${wineId}:`, error.response?.data || error.message);
    // Rethrow or handle the error as appropriate for the calling hook
    throw error; 
  }
};

// Add other interaction-specific service functions here if needed in the future 