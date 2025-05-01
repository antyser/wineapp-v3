import { useState, useEffect, useCallback } from 'react';
import { GetWineForUserResponse, NoteResponse } from '../api/generated/types.gen';
import { apiFetch } from '../lib/apiClient'; // Import the new fetch utility

interface UseWineInteractionsResult {
  isInWishlist: boolean;
  isLiked: boolean;
  userRating: number;
  hasExistingNotes: boolean;
  interactionError: string | null;
  toggleWishlist: () => Promise<void>;
  toggleLike: () => Promise<void>;
  rateWine: (rating: number) => Promise<void>;
  clearInteractionError: () => void;
}

export const useWineInteractions = (wineId: string, initialInteractionData?: GetWineForUserResponse['interaction']): UseWineInteractionsResult => {
  const [isInWishlist, setIsInWishlist] = useState(initialInteractionData?.wishlist || false);
  const [isLiked, setIsLiked] = useState(initialInteractionData?.liked || false);
  const [userRating, setUserRating] = useState(initialInteractionData?.rating || 0);
  const [hasExistingNotes, setHasExistingNotes] = useState(false);
  const [interactionError, setInteractionError] = useState<string | null>(null);

  // Reset state if initial data changes (e.g., navigating to a new wine)
  useEffect(() => {
    setIsInWishlist(initialInteractionData?.wishlist || false);
    setIsLiked(initialInteractionData?.liked || false);
    setUserRating(initialInteractionData?.rating || 0);
    setInteractionError(null); // Clear errors on new wine/data
    // Re-check notes when initial data is available or wineId changes
    if (wineId) {
      checkNotes();
    }
  }, [wineId, initialInteractionData]);

  // Function to check for existing notes
  const checkNotes = useCallback(async () => {
    if (!wineId) return;
    try {
      // Use apiFetch to get notes
      const notesResponse = await apiFetch<NoteResponse[]>(`/api/v1/notes/wine/${wineId}`);
      // apiFetch returns null for 204/non-JSON, check for array with length
      setHasExistingNotes(Array.isArray(notesResponse) && notesResponse.length > 0);
    } catch (error) {
      console.error('[useWineInteractions] Error checking for existing notes:', error);
      setHasExistingNotes(false); // Assume no notes on error
    }
  }, [wineId]);

  // Generic toggle function
  const toggleInteraction = useCallback(async (action: 'wishlist' | 'liked') => {
    if (!wineId) return;
    setInteractionError(null);

    // Determine current state and updater
    let currentState: boolean;
    let stateUpdater: React.Dispatch<React.SetStateAction<boolean>>;
    switch (action) {
      case 'wishlist': currentState = isInWishlist; stateUpdater = setIsInWishlist; break;
      case 'liked': currentState = isLiked; stateUpdater = setIsLiked; break;
      default: return; // Should not happen
    }

    const optimisticState = !currentState;
    stateUpdater(optimisticState); // Optimistic update

    try {
      // Use apiFetch to toggle interaction
      const response = await apiFetch<{ status: string, action: string, value: boolean }>( // Adjust expected response type if needed
        `/api/v1/interactions/wine/${wineId}/toggle/${action}`,
        { method: 'POST' }
      );
      console.log(`[useWineInteractions] ${action} toggled:`, response);
      // Optional: Update state from response if it differs from optimistic update
      if (response && typeof response.value === 'boolean' && response.value !== optimisticState) {
         console.warn(`[useWineInteractions] Optimistic update for ${action} mismatch. Reverting to server state.`);
         stateUpdater(response.value);
      }
    } catch (error: any) {
      console.error(`[useWineInteractions] Error toggling ${action}:`, error);
      stateUpdater(currentState); // Revert on error
      setInteractionError(error.message || `Failed to update ${action}. Please try again.`);
    }
  }, [wineId, isInWishlist, isLiked]);

  const toggleWishlist = useCallback(() => toggleInteraction('wishlist'), [toggleInteraction]);
  const toggleLike = useCallback(() => toggleInteraction('liked'), [toggleInteraction]);

  // Function to rate the wine
  const rateWine = useCallback(async (rating: number) => {
    if (!wineId) return;
    setInteractionError(null);
    const previousRating = userRating;
    setUserRating(rating); // Optimistic update

    try {
       // Use apiFetch to rate wine - note query parameters need to be added to URL
      const response = await apiFetch<{ status: string, rating: number }>( // Adjust expected response type if needed
          `/api/v1/interactions/wine/${wineId}/rate?rating=${encodeURIComponent(rating)}`,
          { method: 'POST' }
      );
      console.log('[useWineInteractions] Wine rated:', response);
      // Update from response if needed, though optimistic should be fine
      if (response && typeof response.rating === 'number' && response.rating !== rating) {
         console.warn('[useWineInteractions] Optimistic rating update mismatch. Reverting to server state.');
        setUserRating(response.rating);
      }
    } catch (error: any) {
      console.error('[useWineInteractions] Error rating wine:', error);
      setUserRating(previousRating); // Revert on error
      setInteractionError(error.message || 'Failed to rate wine. Please try again.');
    }
  }, [wineId, userRating]);

  // Function to clear the interaction error
  const clearInteractionError = useCallback(() => {
    setInteractionError(null);
  }, []);

  return {
    isInWishlist,
    isLiked,
    userRating,
    hasExistingNotes,
    interactionError,
    toggleWishlist,
    toggleLike,
    rateWine,
    clearInteractionError,
  };
};
