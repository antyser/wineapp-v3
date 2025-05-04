import { useState, useEffect, useCallback } from 'react';
// Remove AsyncStorage import
// import AsyncStorage from '@react-native-async-storage/async-storage';
import { cacheService, CachePrefix } from '../api/services/cacheService'; // Import MMKV cache service
import { 
    Wine, 
    Interaction, 
    Note, 
    // Offer type isn't exported directly, use WineSearcherOffer 
    WineSearcherOffer 
} from '../api/generated/types.gen'; // Adjust path if needed
// Import the correct service function
import { getUserWineDetails } from '../api/services/wineService'; 

// REMOVE the mapping helper function
/*
const mapApiWineToLocalWine = (apiWine: any): Wine => { ... };
*/

// --- Cache Configuration ---
// REMOVE AsyncStorage cache logic and related types/constants
/*
const ASYNC_STORAGE_WINE_CACHE_PREFIX = 'wine_cache_';
const CACHE_DURATION_MS = ...;
export interface CachedWineData { ... }
const getWineCacheKey = ...;
export const saveWineToCache = ...;
export const loadWineFromCache = ...;
*/

// --- Hook Logic ---
// Define return type for clarity
interface UseWineDetailsResult {
    wine: Wine | null;
    offers: WineSearcherOffer[];
    notes: Note[] | null;
    userInteractionData: Interaction | null | undefined;
    isLoading: boolean; // Indicates initial load or fetch after cache miss
    isRefreshing: boolean; // Indicates background fetch after cache hit
    error: string;
    retry: () => void;
}

export const useWineDetails = (wineId: string, initialWineData?: Wine): UseWineDetailsResult => {
    console.log(`[useWineDetails] Hook instantiated for wineId: ${wineId}, initialWineData provided: ${!!initialWineData}`);
    const [wine, setWine] = useState<Wine | null>(initialWineData || null);
    const [offers, setOffers] = useState<WineSearcherOffer[]>([]);
    const [userInteractionData, setUserInteractionData] = useState<Interaction | null | undefined>(undefined);
    const [notes, setNotes] = useState<Note[] | null>(null);
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
                setNotes(cachedNotes || null);
                // Handle potential null value for interaction explicitly
                const interactionToSet = cachedInteraction === null ? null : (cachedInteraction || undefined);
                setUserInteractionData(interactionToSet);
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
            const result = await getUserWineDetails(wineId);
            console.log(`[useWineDetails] API response received for ${wineId}:`, result);


            if (result && result.wine) {
                const fetchedWine = result.wine;
                const fetchedOffers = result.offers || [];
                const fetchedInteraction = result.interaction; // Can be null
                const fetchedNotes = result.notes || null;

                // Update state
                console.log(`[useWineDetails] Updating state with API data for ${wineId}.`);
                setWine(fetchedWine);
                setOffers(fetchedOffers);
                setUserInteractionData(fetchedInteraction);
                setNotes(fetchedNotes);

                // Update cache for each item
                console.log(`[useWineDetails] Updating cache with API data for ${wineId}.`);
                cacheService.set<Wine>(wineKey, fetchedWine);
                cacheService.set<WineSearcherOffer[]>(offersKey, fetchedOffers);
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
                    setUserInteractionData(undefined);
                    setNotes(null);
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
                setUserInteractionData(undefined);
                setNotes(null);
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

    // Expose isRefreshing state
    return {
        wine,
        offers,
        notes,
        userInteractionData,
        isLoading,
        isRefreshing,
        error,
        retry: () => {
            console.log(`[useWineDetails] Manual retry requested for wineId: ${wineId}`);
            fetchData(true); // Pass true to indicate manual retry
        },
    };
}; 