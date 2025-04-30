import { useState, useEffect, useCallback } from 'react';
import {
  getWineForUserApiV1WinesUserWineIdGet,
  toggleInteractionApiV1InteractionsWineWineIdToggleActionPost,
  rateWineApiV1InteractionsWineWineIdRatePost,
  getNotesByWineApiV1NotesWineWineIdGet,
} from '../api';
import { GetWineForUserResponse } from '../api/generated/types.gen';

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
      const notesResponse = await getNotesByWineApiV1NotesWineWineIdGet({ path: { wine_id: wineId } });
      setHasExistingNotes(!!(notesResponse.data && notesResponse.data.length > 0));
    } catch (error) {
      console.error('Error checking for existing notes:', error);
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
      const response = await toggleInteractionApiV1InteractionsWineWineIdToggleActionPost({
        path: { wine_id: wineId, action },
      });
      console.log(`${action} toggled:`, response.data);
      // Optional: Update state from response if it differs from optimistic update
      // For boolean toggles, it's usually safe to rely on the optimistic update.
    } catch (error) {
      console.error(`Error toggling ${action}:`, error);
      stateUpdater(currentState); // Revert on error
      setInteractionError(`Failed to update ${action}. Please try again.`);
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
      const response = await rateWineApiV1InteractionsWineWineIdRatePost({
        path: { wine_id: wineId },
        query: { rating },
      });
      console.log('Wine rated:', response.data);
      // Update from response if needed, though optimistic should be fine
      if (response.data && typeof response.data.rating === 'number') {
        setUserRating(response.data.rating);
      }
    } catch (error) {
      console.error('Error rating wine:', error);
      setUserRating(previousRating); // Revert on error
      setInteractionError('Failed to rate wine. Please try again.');
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