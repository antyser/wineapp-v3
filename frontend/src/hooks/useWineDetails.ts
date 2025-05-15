import { useState, useEffect, useCallback } from 'react';
import { cacheService, CachePrefix } from '../api/services/cacheService';
import { 
    Wine, 
    Interaction, 
    Note, 
    // Offer type isn't exported directly, use WineSearcherOffer 
    WineSearcherOffer 
} from '../api/generated/types.gen'; // Adjust path if needed
// Import the correct service function
import { getUserWineDetails } from '../api/services/wineService'; 

// Define the expected response structure if not explicitly typed elsewhere
interface UserWineDetailsResponseStructure {
    wine?: Wine | null; 
    offers?: WineSearcherOffer[] | null; // Allow offers to be array, null, or undefined
    interaction?: Interaction | null;
    notes?: Note[] | null;
}

export interface UseWineDetailsCallbacks {
    onInteractionUpdate: (updatedInteraction: Interaction | null) => void;
    onNoteChange: (change: { type: 'created' | 'updated' | 'deleted', note?: Note, noteId?: string }) => void;
}

export interface UseWineDetailsResult extends UseWineDetailsCallbacks {
    wine: Wine | null;
    offers: WineSearcherOffer[];
    notesData: Note[] | null;
    interactionData: Interaction | null | undefined;
    isLoading: boolean;
    isRefreshing: boolean;
    error: string;
    retry: () => void;
}

export const useWineDetails = (wineId: string, initialWineData?: Wine): UseWineDetailsResult => {
    console.log(`[useWineDetails] Hook instantiated for wineId: ${wineId}, initialWineData provided: ${!!initialWineData}`);
    const [wine, setWine] = useState<Wine | null>(initialWineData || null);
    const [offers, setOffers] = useState<WineSearcherOffer[]>([]);
    const [interactionData, setInteractionData] = useState<Interaction | null | undefined>(undefined);
    const [notesData, setNotesData] = useState<Note[] | null>(null);
    const [isLoading, setIsLoading] = useState(!initialWineData);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string>('');

    const fetchData = useCallback(async (isRetry = false) => {
        if (!wineId) {
            console.error('[useWineDetails] fetchData called with no wineId.');
            setError('No Wine ID provided');
            setIsLoading(false);
            setIsRefreshing(false);
            return;
        }

        console.log(`[useWineDetails] Initiating fetch sequence for wine: ${wineId}, isRetry: ${isRetry}`);
        setError('');

        // --- Generate Cache Keys ---
        const wineKey = cacheService.generateKey(CachePrefix.WINE_DETAILS, wineId);
        const offersKey = cacheService.generateKey(CachePrefix.WINE_OFFERS, wineId);
        const notesKey = cacheService.generateKey(CachePrefix.WINE_NOTES, wineId);
        const interactionKey = cacheService.generateKey(CachePrefix.WINE_INTERACTIONS, wineId);
        console.log(`[useWineDetails] Cache keys generated: wine=${wineKey}, offers=${offersKey}, notes=${notesKey}, interaction=${interactionKey}`);

        let initialLoadComplete = false;

        // 1. Try loading synchronously from MMKV cache (only if not a manual retry)
        if (!isRetry && !initialWineData) {
            console.log(`[useWineDetails] Attempting synchronous cache read for wine: ${wineId}`);
            const cachedWine = cacheService.get<Wine>(wineKey);
            const cachedOffers = cacheService.get<WineSearcherOffer[]>(offersKey);
            const cachedNotes = cacheService.get<Note[]>(notesKey);
            const cachedInteraction = cacheService.get<Interaction | null>(interactionKey);
            console.log(`[useWineDetails] Cache read results: wine=${!!cachedWine}, offers=${!!cachedOffers}, notes=${!!cachedNotes}, interaction=${cachedInteraction !== undefined}`); // Log presence

            // Use cache if all essential parts are present (adjust as needed)
            if (cachedWine) { // Require at least the wine object itself
                console.log(`[useWineDetails] Cache hit for wine: ${wineId}. Applying cached data and skipping API fetch.`);
                setWine(cachedWine);
                setOffers(cachedOffers || []);
                setNotesData(cachedNotes || null);
                // Handle potential null value for interaction explicitly
                const interactionToSet = cachedInteraction === null ? null : (cachedInteraction || undefined);
                setInteractionData(interactionToSet);
                console.log(`[useWineDetails] State updated from cache. Interaction set to:`, interactionToSet);


                setIsLoading(false); // Cache hit, initial load done
                setIsRefreshing(false); // No background refresh needed
                // initialLoadComplete = true; // Not strictly needed anymore with the return
                return; // <<--- ADDED RETURN TO SKIP API FETCH ON CACHE HIT
            } else {
                 console.log(`[useWineDetails] Cache miss for essential data (wine) for ${wineId}. Proceeding to API fetch.`);
                 setIsLoading(true); // No cache, proceed to load state
            }
        } else if (initialWineData) {
            console.log(`[useWineDetails] Using initialWineData for wine: ${wineId}. Skipping cache read, setting refresh.`);
            setIsLoading(false); // Already have initial data
            //setIsRefreshing(true); // No automatic refresh now, only on manual retry or cache miss
            setIsRefreshing(false);
            initialLoadComplete = true;
            // We have initial data, but per the new logic, we don't fetch unless cache misses or retrying.
            // If we want to refresh even with initial data, we'd need a separate trigger.
            // For now, align with cache-first: if we have data (initial), don't fetch.
            return; // <<--- ADDED RETURN TO SKIP API FETCH IF INITIAL DATA IS PRESENT
        } else { // Manual Retry
            console.log(`[useWineDetails] Manual retry triggered for wine: ${wineId}. Setting loading state.`);
            setIsLoading(true);
        }

        // 2. Fetch from API (Stale-While-Revalidate or initial fetch)
        console.log(`[useWineDetails] Fetching from API for ${wineId} (only occurs on cache miss or retry)...`);
        try {
            const result: UserWineDetailsResponseStructure = await getUserWineDetails(wineId);
            console.log(
                `[useWineDetails] API response received for ${wineId}. ` +
                `Wine: ${!!result?.wine}, Offers: ${!!result?.offers}, ` +
                `Notes: ${!!result?.notes}, Interaction: ${result?.interaction !== undefined}`
            );


            if (result && result.wine) {
                const { wine: fetchedWineData, offers: fetchedOffersData, interaction: fetchedInteraction, notes: fetchedNotes = null } = result;
                const fetchedWine = fetchedWineData as Wine; // Assert type if result.wine guarantees it's Wine here
                const finalOffers = fetchedOffersData || []; // Handle null or undefined for offers

                // Update state
                console.log(`[useWineDetails] Updating state with API data for ${wineId}.`);
                setWine(fetchedWine);
                setOffers(finalOffers);
                setInteractionData(fetchedInteraction);
                setNotesData(fetchedNotes);

                // Update cache for each item
                console.log(`[useWineDetails] Updating cache with API data for ${wineId}.`);
                cacheService.set<Wine>(wineKey, fetchedWine);
                cacheService.set<WineSearcherOffer[]>(offersKey, finalOffers);
                cacheService.set<Note[] | null>(notesKey, fetchedNotes);
                // Explicitly handle undefined case for interaction cache
                const interactionToCache = fetchedInteraction === undefined ? null : fetchedInteraction;
                cacheService.set<Interaction | null>(interactionKey, interactionToCache);
                console.log(`[useWineDetails] Cache update complete. Interaction cached as:`, interactionToCache);


                console.log(`[useWineDetails] API fetch success, state and cache updated for ${wineId}.`);
                setError(''); // Clear previous errors on success
            } else {
                console.warn(`[useWineDetails] API did not return valid wine details for ${wineId}. Response:`, result);
                // Don't clear existing state if API fails but cache was used
                if (!initialLoadComplete) {
                    console.error(`[useWineDetails] API error occurred before initial load completed. Clearing state.`);
                    setError('Wine details not found or invalid response.');
                    setWine(null);
                    setOffers([]);
                    setInteractionData(undefined);
                    setNotesData(null);
                } else {
                     console.warn(`[useWineDetails] API error occurred, but cached data was already loaded. State not cleared.`);
                }
            }
        } catch (err: any) {
            console.error(`[useWineDetails] Error fetching details for wine ${wineId}:`, err);
             // Don't clear existing state if API fails but cache was used
            if (!initialLoadComplete) {
                 console.error(`[useWineDetails] API error occurred before initial load completed. Clearing state.`);
                setError(err.message || 'Failed to fetch wine details.');
                setWine(null);
                setOffers([]);
                setInteractionData(undefined);
                setNotesData(null);
            } else {
                 console.warn(`[useWineDetails] API error occurred, but cached data was already loaded. State not cleared. Error:`, err.message);
                 // Optionally set error state even if cache is shown
                 setError(err.message || 'Failed to refresh wine details.');
            }
        } finally {
            console.log(`[useWineDetails] Fetch sequence finished for ${wineId}. Setting loading/refreshing to false.`);
            setIsLoading(false); // Ensure loading is off
            setIsRefreshing(false); // Ensure refreshing is off
        }
    }, [wineId, initialWineData]);

    useEffect(() => {
        console.log(`[useWineDetails] useEffect triggered for wineId: ${wineId}. Initial data provided: ${!!initialWineData}`);
        // Fetch only if no initial data is provided OR if initial data was provided (stale-while-revalidate)
        // The logic inside fetchData handles whether to read cache or just refresh.
        fetchData();
        // Dependency array: only run when wineId changes or initialWineData reference changes
        // fetchData is wrapped in useCallback with wineId/initialWineData dependency
    }, [wineId, initialWineData, fetchData]);

    // Callback to update interaction data
    const handleInteractionUpdate = useCallback((updatedInteraction: Interaction | null) => {
        console.log(`[useWineDetails] handleInteractionUpdate called for wineId ${wineId}. Has interaction: ${!!updatedInteraction}`);
        setInteractionData(updatedInteraction);
        const interactionKey = cacheService.generateKey(CachePrefix.WINE_INTERACTIONS, wineId);
        cacheService.set<Interaction | null>(interactionKey, updatedInteraction);
        console.log(`[useWineDetails] Updated interactionData state and cache for ${wineId}.`);
    }, [wineId]);

    // Callback to update notes data
    const handleNoteChange = useCallback((change: { type: 'created' | 'updated' | 'deleted', note?: Note, noteId?: string }) => {
        console.log(`[useWineDetails] handleNoteChange called for wineId ${wineId}. Type: ${change.type}, Note ID: ${change.note?.id || change.noteId}`);
        setNotesData(prevNotesData => {
            let newNotesData: Note[] = prevNotesData ? [...prevNotesData] : [];
            if (change.type === 'created' && change.note) {
                newNotesData.push(change.note);
            } else if (change.type === 'updated' && change.note) {
                const index = newNotesData.findIndex(n => n.id === change.note!.id);
                if (index > -1) {
                    newNotesData[index] = change.note;
                } else {
                    newNotesData.push(change.note); // If update for non-existing, add it
                }
            } else if (change.type === 'deleted' && change.noteId) {
                newNotesData = newNotesData.filter(n => n.id !== change.noteId);
            }
            const notesKey = cacheService.generateKey(CachePrefix.WINE_NOTES, wineId);
            cacheService.set<Note[] | null>(notesKey, newNotesData.length > 0 ? newNotesData : null);
            console.log(`[useWineDetails] Updated notesData state and cache for ${wineId}. New count: ${newNotesData.length}`);
            return newNotesData.length > 0 ? newNotesData : null;
        });
    }, [wineId]);

    // Expose isRefreshing state
    return {
        wine,
        offers,
        notesData,
        interactionData,
        isLoading,
        isRefreshing,
        error,
        retry: () => {
            console.log(`[useWineDetails] Manual retry requested for wineId: ${wineId}`);
            fetchData(true); // Pass true to indicate manual retry
        },
        onInteractionUpdate: handleInteractionUpdate,
        onNoteChange: handleNoteChange,
    };
}; 