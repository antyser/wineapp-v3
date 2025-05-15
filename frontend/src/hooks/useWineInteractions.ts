import { useState, useEffect, useCallback, useRef } from 'react';
import { Note, Interaction, InteractionUpdate } from '../api'; // Removed UserWineResponse as it's not directly used here
import { saveInteraction } from '../api/services/interactionService'; 
// Removed cacheService and CachePrefix as direct cache updates are removed from this hook

interface UseWineInteractionsResult {
  isInWishlist: boolean;
  isLiked: boolean;
  userRating: number | null;
  // Removed notes-related state as it's managed by useWineDetails now
  interactionError: string;
  isSaving: boolean;
  toggleWishlist: () => void;
  toggleLike: () => void;
  rateWine: (rating: number | null) => void;
}

interface PreviousInteractionState {
  wishlist: boolean;
  liked: boolean;
  rating: number | null;
}

export const useWineInteractions = (
    wineId: string,
    initialInteractionData: Interaction | null | undefined,
    onInteractionUpdate: (updatedInteraction: Interaction | null) => void // Callback from useWineDetails
): UseWineInteractionsResult => {
  console.log(`[useWineInteractions] Hook instantiated for wineId: ${wineId}. Initial interaction:`, initialInteractionData);
  const [isInWishlist, setIsInWishlist] = useState(initialInteractionData?.wishlist ?? false);
  const [isLiked, setIsLiked] = useState(initialInteractionData?.liked ?? false);
  const [userRating, setUserRating] = useState(initialInteractionData?.rating ?? null);
  const [interactionError, setInteractionError] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const previousStateRef = useRef<PreviousInteractionState | null>(null);
  const debouncedSave = useRef<NodeJS.Timeout | undefined>(undefined);
  const isMounted = useRef(true);

  useEffect(() => {
    console.log(`[useWineInteractions] useEffect[initialInteractionData] triggered for ${wineId}. New data:`, initialInteractionData);
    setIsInWishlist(initialInteractionData?.wishlist ?? false);
    setIsLiked(initialInteractionData?.liked ?? false);
    setUserRating(initialInteractionData?.rating ?? null);
  }, [initialInteractionData]);

  useEffect(() => {
    console.log(`[useWineInteractions] Component mounted for ${wineId}`);
    isMounted.current = true;
    return () => {
      console.log(`[useWineInteractions] Component unmounting for ${wineId}. Clearing debounce timer.`);
      isMounted.current = false;
      if (debouncedSave.current) {
          clearTimeout(debouncedSave.current);
      }
    };
  }, [wineId]);

  const triggerSave = useCallback(( 
      updatedInteractionPayload: InteractionUpdate, 
      optimisticUpdateFn: () => void
      // Removed newStateForCache as direct cache update is removed
  ) => {
    console.log(`[useWineInteractions] triggerSave called for ${wineId}. Payload:`, updatedInteractionPayload);
    if (debouncedSave.current) {
      clearTimeout(debouncedSave.current);
    }

    previousStateRef.current = {
      wishlist: isInWishlist,
      liked: isLiked,
      rating: userRating,
    };
    optimisticUpdateFn(); 

    // Direct cache update removed - onInteractionUpdate callback will trigger cache update in useWineDetails

    setIsSaving(true);
    setInteractionError('');

    debouncedSave.current = setTimeout(async () => {
      if (!wineId || !isMounted.current) {
        if (isMounted.current) setIsSaving(false);
        return;
      }
      try {
        console.log('[useWineInteractions] Saving interaction to backend...', updatedInteractionPayload);
        const savedData = await saveInteraction(wineId, updatedInteractionPayload);
        if (!isMounted.current) return;
        console.log('[useWineInteractions] Interaction saved successfully to backend', savedData);
        
        // Call the callback to inform useWineDetails
        onInteractionUpdate(savedData); 

        previousStateRef.current = null; 
      } catch (error: any) {
        if (!isMounted.current) return;

        setInteractionError(error.response?.data?.detail || 'Failed to save interaction.');
        if (previousStateRef.current) {
          setIsInWishlist(previousStateRef.current.wishlist);
          setIsLiked(previousStateRef.current.liked);
          setUserRating(previousStateRef.current.rating);
          // No direct cache rollback here, rely on useWineDetails to potentially refetch or manage its cache if error is severe
          previousStateRef.current = null;
        }
      } finally {
         if (isMounted.current) { 
             setIsSaving(false);
         }
      }
    }, 1000); 
  }, [wineId, isInWishlist, isLiked, userRating, onInteractionUpdate]); // Added onInteractionUpdate dependency

  const toggleWishlist = useCallback(() => {
    const newValue = !isInWishlist;
    triggerSave(
      { wishlist: newValue }, 
      () => setIsInWishlist(newValue)
    );
  }, [isInWishlist, triggerSave]);

  const toggleLike = useCallback(() => {
    const newValue = !isLiked;
    triggerSave(
      { liked: newValue }, 
      () => setIsLiked(newValue)
    );
  }, [isLiked, triggerSave]);

  const rateWine = useCallback((newRating: number | null) => {
    if (newRating === userRating) return;
    triggerSave(
      { rating: newRating }, 
      () => setUserRating(newRating)
    );
  }, [userRating, triggerSave]);

  return {
    isInWishlist,
    isLiked,
    userRating,
    // Removed hasExistingNotes and latestNoteId from return
    interactionError,
    isSaving,
    toggleWishlist,
    toggleLike,
    rateWine,
  };
};
