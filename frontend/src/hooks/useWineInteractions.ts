import { useState, useEffect, useCallback, useRef } from 'react';
import { Note, UserWineResponse, Interaction, InteractionUpdate } from '../api'; // Import relevant types
import { saveInteraction } from '../api/services/interactionService'; // Import the new service
import { cacheService, CachePrefix } from '../api/services/cacheService'; 


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

// Helper to update only the interaction part of the cache using cacheService
const updateInteractionInCache = (wineId: string, newInteractionState: PreviousInteractionState) => {
    console.log(`[useWineInteractions] Attempting to update interaction cache for wine ${wineId} using cacheService:`, newInteractionState);
    try {
        const interactionKey = cacheService.generateKey(CachePrefix.WINE_INTERACTIONS, wineId);
        
        // Cache an object matching the core fields, compatible with Interaction | null read type
        const interactionToCache: Partial<Interaction> & PreviousInteractionState = {
            liked: newInteractionState.liked,
            wishlist: newInteractionState.wishlist,
            rating: newInteractionState.rating,
            // Other Interaction fields (like id, user_id, wine_id, timestamps) are omitted
            // as they aren't strictly needed for the optimistic *cache* update and might not 
            // be available or accurate yet. useWineDetails will overwrite this with full
            // data when it fetches.
        };

        // Store this partial+known state object. useWineDetails reads <Interaction | null>,
        // so this partial object will be treated as such on read.
        cacheService.set<Interaction | null>(interactionKey, interactionToCache as Interaction | null);
        console.log(`[useWineInteractions] Successfully updated interaction cache for key ${interactionKey}`);

    } catch (error) {
        console.error(`[useWineInteractions] Error during interaction cache update for ${wineId} using cacheService:`, error);
    }
};

// Accept initial interaction data AND initial notes
export const useWineInteractions = (
    wineId: string,
    initialInteractionData: Interaction | null | undefined,
    initialNotes: Note[] | null | undefined
) => {
  console.log(`[useWineInteractions] Hook instantiated for wineId: ${wineId}. Initial interaction:`, initialInteractionData, `Initial notes count: ${initialNotes?.length ?? 0}`);
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
    console.log(`[useWineInteractions] useEffect[initialInteractionData] triggered for ${wineId}. New data:`, initialInteractionData);
    setIsInWishlist(initialInteractionData?.wishlist ?? false);
    setIsLiked(initialInteractionData?.liked ?? false);
    setUserRating(initialInteractionData?.rating ?? null);
  }, [initialInteractionData]);

  // Effect to process notes passed from props
  useEffect(() => {
    console.log(`[useWineInteractions] useEffect[initialNotes] triggered for ${wineId}. Notes count: ${initialNotes?.length ?? 0}`);
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
    console.log(`[useWineInteractions] Component mounted for ${wineId}`);
    isMounted.current = true;
    return () => {
      console.log(`[useWineInteractions] Component unmounting for ${wineId}. Clearing debounce timer.`);
      isMounted.current = false;
      // Clear debounce timer on unmount
      if (debouncedSave.current) {
          clearTimeout(debouncedSave.current);
      }
    };
  }, [wineId]); // Added wineId dependency for clarity, though technically only runs on mount/unmount

  // Combined function to trigger backend save and handle cache/UI rollback
  const triggerSave = useCallback(( 
      updatedInteractionPayload: InteractionUpdate, 
      optimisticUpdateFn: () => void,
      newStateForCache: PreviousInteractionState // Accept the calculated new state
  ) => {
    console.log(`[useWineInteractions] triggerSave called for ${wineId}. Payload:`, updatedInteractionPayload, `New state for cache:`, newStateForCache);
    if (debouncedSave.current) {
      console.log(`[useWineInteractions] Clearing existing debounce timer.`);
      clearTimeout(debouncedSave.current);
    }

    // Store current UI state BEFORE optimistic update
    previousStateRef.current = {
      wishlist: isInWishlist,
      liked: isLiked,
      rating: userRating,
    };
    console.log(`[useWineInteractions] Stored previous UI state:`, previousStateRef.current);

    // Apply the optimistic UI update
    console.log(`[useWineInteractions] Applying optimistic UI update...`);
    optimisticUpdateFn(); 

    // Use the directly passed newStateForCache for the optimistic cache update
    console.log(`[useWineInteractions] Triggering optimistic cache update...`);
    // Call the synchronous helper directly, error handling is inside it
    updateInteractionInCache(wineId, newStateForCache); 

    setIsSaving(true);
    setInteractionError('');

    // The rest of the setTimeout logic for backend save and rollback remains the same
    console.log(`[useWineInteractions] Setting debounce timer for backend save (1000ms)...`);
    debouncedSave.current = setTimeout(async () => {
      console.log(`[useWineInteractions] Debounced save executing for ${wineId}...`);
      if (!wineId) {
        console.warn('[useWineInteractions] Debounced save aborted: no wineId.');
        // Check mount status before setting state
        if (isMounted.current) setIsSaving(false);
        return;
      }
      if (!isMounted.current) {
          console.warn('[useWineInteractions] Debounced save aborted: component unmounted.');
          return; // Abort if component unmounted while waiting
      }
      try {
        console.log('[useWineInteractions] Saving interaction to backend...', updatedInteractionPayload);
        const savedData = await saveInteraction(wineId, updatedInteractionPayload);
        // Check mount status *after* await
        if (!isMounted.current) {
            console.warn('[useWineInteractions] Backend save successful, but component unmounted before state update.');
            return;
        }
        console.log('[useWineInteractions] Interaction saved successfully to backend', savedData);
        // Backend success, cache should already reflect optimistic state
        previousStateRef.current = null; // Clear previous state on successful backend save
      } catch (error: any) {
        console.error('[useWineInteractions] Error saving interaction to backend:', error);
         // Check mount status before setting state
         if (!isMounted.current) {
            console.warn('[useWineInteractions] Backend save failed, and component unmounted before error handling.');
            return; // Exit if unmounted during await
         }

        setInteractionError(error.response?.data?.detail || 'Failed to save interaction.');

        // Rollback UI state
        if (previousStateRef.current) {
          console.log('[useWineInteractions] Rolling back UI state...', previousStateRef.current);
          setIsInWishlist(previousStateRef.current.wishlist);
          setIsLiked(previousStateRef.current.liked);
          setUserRating(previousStateRef.current.rating);

           // Rollback cache state too
           console.log('[useWineInteractions] Rolling back cache state...', previousStateRef.current);
           // Call the synchronous helper directly for rollback
           updateInteractionInCache(wineId, previousStateRef.current); 
          
          previousStateRef.current = null; // Clear after rollback
        } else {
            console.warn('[useWineInteractions] Backend save failed, but no previous state found for rollback.');
        }
      } finally {
        console.log(`[useWineInteractions] Debounced save finished for ${wineId}. Setting saving state.`);
        // Use the isMounted ref here
         if (isMounted.current) { 
             setIsSaving(false);
         } else {
             console.warn('[useWineInteractions] Debounced save finished, but component unmounted before setting saving state to false.');
         }
      }
    }, 1000); 
  }, [wineId, isInWishlist, isLiked, userRating]);

  const toggleWishlist = useCallback(() => {
    console.log(`[useWineInteractions] toggleWishlist called for ${wineId}. Current value: ${isInWishlist}`);
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
  }, [isInWishlist, isLiked, userRating, triggerSave, wineId]); // Added wineId

  const toggleLike = useCallback(() => {
    console.log(`[useWineInteractions] toggleLike called for ${wineId}. Current value: ${isLiked}`);
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
  }, [isLiked, isInWishlist, userRating, triggerSave, wineId]); // Added wineId

  const rateWine = useCallback((newRating: number | null) => {
    console.log(`[useWineInteractions] rateWine called for ${wineId}. Current rating: ${userRating}, New rating: ${newRating}`);
    if (newRating === userRating) {
        console.log(`[useWineInteractions] rateWine skipped: new rating is the same as current.`);
        return;
    }
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
  }, [userRating, isInWishlist, isLiked, triggerSave, wineId]); // Added wineId

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
