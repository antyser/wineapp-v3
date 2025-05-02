import { useState, useEffect, useCallback, useRef } from 'react';
import { Note, UserWineResponse, Interaction, InteractionUpdate } from '../api'; // Import relevant types
import { saveInteraction } from '../api/services/interactionService'; // Import the new service
// Import cache helpers (assuming they are exported from useWineDetails or a util file)
// Adjust the import path as necessary
import { loadWineFromCache, saveWineToCache, CachedWineData } from './useWineDetails'; 

interface UseWineInteractionsResult {
  isInWishlist: boolean;
  isLiked: boolean;
  userRating: number | null;
  hasExistingNotes: boolean;
  latestNoteId: string | null;
  interactionError: string;
  isSaving: boolean;
  toggleWishlist: () => void;
  toggleLike: () => void;
  rateWine: (rating: number | null) => void;
}

// Store the previous state before optimistic update
interface PreviousInteractionState {
  wishlist: boolean;
  liked: boolean;
  rating: number | null;
}

// Helper to update only the interaction part of the cache
const updateInteractionInCache = async (wineId: string, newInteraction: PreviousInteractionState) => {
    const cachedData = await loadWineFromCache(wineId);
    if (cachedData) {
        const updatedCacheData = {
            data: cachedData.data,
            offers: cachedData.offers,
            notes: cachedData.notes,
            interaction: { 
                 // Ensure we have a base object even if cachedData.interaction is null/undefined
                ...(cachedData.interaction || { wishlist: false, liked: false, rating: null }), 
                wishlist: newInteraction.wishlist,
                liked: newInteraction.liked,
                rating: newInteraction.rating,
            } as Interaction, // Assuming Interaction structure matches PreviousInteractionState fields
        };
        await saveWineToCache(wineId, updatedCacheData);
         console.log(`[useWineInteractions] Updated interaction in cache for ${wineId}`);
    } else {
         console.log(`[useWineInteractions] Cache not found for ${wineId}, cannot update interaction in cache.`);
    }
};

// Accept initial interaction data AND initial notes
export const useWineInteractions = (
    wineId: string,
    initialInteractionData: Interaction | null | undefined,
    initialNotes: Note[] | null | undefined
) => {
  // Initialize state based on initialInteractionData
  const [isInWishlist, setIsInWishlist] = useState(initialInteractionData?.wishlist ?? false);
  const [isLiked, setIsLiked] = useState(initialInteractionData?.liked ?? false);
  const [userRating, setUserRating] = useState(initialInteractionData?.rating ?? null);
  const [hasExistingNotes, setHasExistingNotes] = useState(false);
  const [latestNoteId, setLatestNoteId] = useState<string | null>(null);
  const [interactionError, setInteractionError] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false); // Add saving state

  // Ref to store the state before the optimistic update for potential rollback
  const previousStateRef = useRef<PreviousInteractionState | null>(null);
  const debouncedSave = useRef<NodeJS.Timeout | undefined>(undefined);
  const isMounted = useRef(true); // Add isMounted ref

  // Update local state if initialInteractionData changes
  useEffect(() => {
    setIsInWishlist(initialInteractionData?.wishlist ?? false);
    setIsLiked(initialInteractionData?.liked ?? false);
    setUserRating(initialInteractionData?.rating ?? null);
  }, [initialInteractionData]);

  // Effect to process notes passed from props
  useEffect(() => {
    if (initialNotes && initialNotes.length > 0) {
      // Still assume first note is the one to use, as sorting is unreliable without timestamps
      const latestNote = initialNotes[0];
      console.log(`[useWineInteractions] Processing ${initialNotes.length} notes provided. Latest note ID: ${latestNote.id}`);
      setHasExistingNotes(true);
      setLatestNoteId(latestNote.id);
    } else {
      console.log(`[useWineInteractions] No initial notes provided or notes array is empty for wine ${wineId}`);
      setHasExistingNotes(false);
      setLatestNoteId(null);
    }
  }, [initialNotes, wineId]); // Rerun if the notes array or wineId changes

  // Add effect for mount/unmount tracking
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      // Clear debounce timer on unmount
      if (debouncedSave.current) {
          clearTimeout(debouncedSave.current);
      }
    };
  }, []);

  // Combined function to trigger backend save and handle cache/UI rollback
  const triggerSave = useCallback(( 
      updatedInteractionPayload: InteractionUpdate, 
      optimisticUpdateFn: () => void,
      newStateForCache: PreviousInteractionState // Accept the calculated new state
  ) => {
    if (debouncedSave.current) {
      clearTimeout(debouncedSave.current);
    }

    // Store current UI state BEFORE optimistic update
    previousStateRef.current = {
      wishlist: isInWishlist,
      liked: isLiked,
      rating: userRating,
    };

    // Apply the optimistic UI update
    optimisticUpdateFn(); 

    // Use the directly passed newStateForCache for the optimistic cache update
    updateInteractionInCache(wineId, newStateForCache).catch(e => 
        console.error("[useWineInteractions] Failed optimistic cache update:", e)
    ); 

    setIsSaving(true);
    setInteractionError('');

    // The rest of the setTimeout logic for backend save and rollback remains the same
    debouncedSave.current = setTimeout(async () => {
      if (!wineId) {
        // Check mount status before setting state
        if (isMounted.current) setIsSaving(false);
        return;
      }
      try {
        console.log('[useWineInteractions] Saving interaction to backend...', updatedInteractionPayload);
        const savedData = await saveInteraction(wineId, updatedInteractionPayload);
        console.log('[useWineInteractions] Interaction saved successfully to backend', savedData);
        // Backend success, cache should already reflect optimistic state
        previousStateRef.current = null; // Clear previous state on successful backend save
      } catch (error: any) {
        console.error('[useWineInteractions] Error saving interaction to backend:', error);
         // Check mount status before setting state
         if (!isMounted.current) return; // Exit if unmounted during await

        setInteractionError(error.response?.data?.detail || 'Failed to save interaction.');

        // Rollback UI state
        if (previousStateRef.current) {
          console.log('[useWineInteractions] Rolling back UI state...');
          setIsInWishlist(previousStateRef.current.wishlist);
          setIsLiked(previousStateRef.current.liked);
          setUserRating(previousStateRef.current.rating);

           // Rollback cache state too
           console.log('[useWineInteractions] Rolling back cache state...');
           updateInteractionInCache(wineId, previousStateRef.current).catch(e => 
               console.error("[useWineInteractions] Failed cache rollback:", e)
           ); 
          
          previousStateRef.current = null; // Clear after rollback
        }
      } finally {
        // Use the isMounted ref here
         if (isMounted.current) { 
             setIsSaving(false);
         }
      }
    }, 1000); 
  }, [wineId, isInWishlist, isLiked, userRating]);

  const toggleWishlist = useCallback(() => {
    const newValue = !isInWishlist;
    // Calculate the full new state representation
    const newState: PreviousInteractionState = {
        wishlist: newValue,
        liked: isLiked, // Keep current liked state
        rating: userRating // Keep current rating state
    };
    triggerSave(
      { wishlist: newValue }, // Payload for backend (only changed field)
      () => setIsInWishlist(newValue), // Optimistic UI update
      newState // Pass the calculated new state for cache update
    );
  }, [isInWishlist, isLiked, userRating, triggerSave]);

  const toggleLike = useCallback(() => {
    const newValue = !isLiked;
    // Calculate the full new state representation
    const newState: PreviousInteractionState = {
        wishlist: isInWishlist, // Keep current wishlist state
        liked: newValue,
        rating: userRating // Keep current rating state
    };
    triggerSave(
      { liked: newValue }, // Payload for backend
      () => setIsLiked(newValue), // Optimistic UI update
      newState // Pass the calculated new state for cache update
    );
  }, [isLiked, isInWishlist, userRating, triggerSave]);

  const rateWine = useCallback((newRating: number | null) => {
    if (newRating === userRating) return;
    // Calculate the full new state representation
    const newState: PreviousInteractionState = {
        wishlist: isInWishlist, // Keep current wishlist state
        liked: isLiked, // Keep current liked state
        rating: newRating
    };
    triggerSave(
      { rating: newRating }, // Payload for backend
      () => setUserRating(newRating), // Optimistic UI update
      newState // Pass the calculated new state for cache update
    );
  }, [userRating, isInWishlist, isLiked, triggerSave]);

  return {
    isInWishlist,
    isLiked,
    userRating,
    hasExistingNotes,
    latestNoteId,
    interactionError,
    isSaving,
    toggleWishlist,
    toggleLike,
    rateWine,
  };
};
