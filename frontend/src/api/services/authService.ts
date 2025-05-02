import { apiClient } from '../index';

/**
 * Deletes the currently authenticated user's account.
 * DELETE /api/v1/auth/me
 */
export const deleteCurrentUser = async (): Promise<void> => {
  try {
    // Assuming 204 No Content or similar success response
    await apiClient.delete<void>('/api/v1/auth/me');
  } catch (error) {
    console.error(`[authService] Error deleting current user:`, error);
    throw error; // Re-throw for the caller to handle UI
  }
}; 