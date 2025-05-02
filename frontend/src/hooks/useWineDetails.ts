import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
const ASYNC_STORAGE_WINE_CACHE_PREFIX = 'wine_cache_';
const CACHE_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// --- Cached Data Structure ---
// Export the interface
export interface CachedWineData {
    data: Wine;
    expiresAt: number;
    offers?: WineSearcherOffer[];
    interaction?: Interaction | null;
    notes?: Note[];
}

// --- AsyncStorage Helpers ---
const getWineCacheKey = (wineId: string) => `${ASYNC_STORAGE_WINE_CACHE_PREFIX}${wineId}`;

// Export the helper
export const saveWineToCache = async (wineId: string, cacheData: {
    data: Wine;
    offers?: WineSearcherOffer[] | null;
    interaction?: Interaction | null;
    notes?: Note[] | null;
}) => {
    const key = getWineCacheKey(wineId);
    const dataToStore: CachedWineData = {
        data: cacheData.data,
        offers: cacheData.offers || undefined,
        interaction: cacheData.interaction === undefined ? undefined : cacheData.interaction,
        notes: cacheData.notes || undefined,
        expiresAt: Date.now() + CACHE_DURATION_MS,
    };
    try {
        await AsyncStorage.setItem(key, JSON.stringify(dataToStore));
        console.log(`[useWineDetails] Saved wine ${wineId} to cache. Expires at: ${new Date(dataToStore.expiresAt).toISOString()}`);
    } catch (error) {
        console.error(`[useWineDetails] Error saving wine ${wineId} to cache:`, error);
    }
};

// Export the helper
export const loadWineFromCache = async (wineId: string): Promise<CachedWineData | null> => {
    const key = getWineCacheKey(wineId);
    try {
        const dataString = await AsyncStorage.getItem(key);
        if (!dataString) {
            console.log(`[useWineDetails] Cache miss for wine ${wineId}.`);
            return null;
        }

        const cachedData = JSON.parse(dataString) as CachedWineData;

        if (!cachedData || !cachedData.data || typeof cachedData.expiresAt !== 'number') {
             console.warn(`[useWineDetails] Invalid cache data format for wine ${wineId}. Removing.`);
             await AsyncStorage.removeItem(key).catch(e => console.error("Failed to remove invalid cache item:", e));
             return null;
        }

        if (Date.now() >= cachedData.expiresAt) {
            console.log(`[useWineDetails] Cache expired for wine ${wineId}. Removing.`);
            await AsyncStorage.removeItem(key).catch(e => console.error("Failed to remove expired cache item:", e)); 
            return null;
        }

        console.log(`[useWineDetails] Cache hit for wine ${wineId}. Using cached data.`);
        return {
           ...cachedData,
           interaction: cachedData.interaction === undefined ? undefined : cachedData.interaction
        };
    } catch (error) {
        console.error(`[useWineDetails] Error loading wine ${wineId} from cache:`, error);
         await AsyncStorage.removeItem(key).catch(e => console.error("Failed to remove corrupted cache item:", e));
        return null;
    }
};

// --- Hook Logic ---
// Define return type for clarity
interface UseWineDetailsResult {
    wine: Wine | null;
    offers: WineSearcherOffer[];
    notes: Note[] | null;
    userInteractionData: Interaction | null | undefined;
    isLoading: boolean;
    error: string;
    retry: () => void;
}

export const useWineDetails = (wineId: string, initialWineData?: Wine): UseWineDetailsResult => {
    const [wine, setWine] = useState<Wine | null>(initialWineData || null);
    const [offers, setOffers] = useState<WineSearcherOffer[]>([]); 
    const [userInteractionData, setUserInteractionData] = useState<Interaction | null | undefined>(undefined);
    const [notes, setNotes] = useState<Note[] | null>(null);
    const [isLoading, setIsLoading] = useState(!initialWineData); 
    const [error, setError] = useState<string>('');

    const fetchData = useCallback(async () => {
        if (!wineId) {
            setError('No Wine ID provided');
            setIsLoading(false);
            return;
        }

        console.log(`[useWineDetails] Initiating fetch sequence for wine: ${wineId}`);
        setIsLoading(true);
        setError('');

        // 1. Try loading from cache
        const cachedData = await loadWineFromCache(wineId);

        if (cachedData) {
            setWine(cachedData.data);
            setOffers(cachedData.offers || []); 
            setUserInteractionData(cachedData.interaction); 
            setNotes(cachedData.notes || null);
            setIsLoading(false);
            console.log(`[useWineDetails] Applied cached data for wine: ${wineId}`);
            return; 
        }

        // 2. If cache miss or expired, fetch from API
        console.log(`[useWineDetails] Cache miss/expired for ${wineId}. Fetching from API...`);
        try {
            // Use the correct service function: getUserWineDetails
            const result = await getUserWineDetails(wineId);
            
            // The result is UserWineResponse which contains the fields
            if (result && result.wine) { 
                const fetchedWine = result.wine;
                const fetchedOffers = result.offers || [];
                const fetchedInteraction = result.interaction; 
                const fetchedNotes = result.notes || null; 

                setWine(fetchedWine);
                setOffers(fetchedOffers);
                setUserInteractionData(fetchedInteraction);
                setNotes(fetchedNotes);

                await saveWineToCache(wineId, {
                    data: fetchedWine,
                    offers: fetchedOffers,
                    interaction: fetchedInteraction,
                    notes: fetchedNotes,
                });
            } else {
                console.warn(`[useWineDetails] API did not return valid wine details for ${wineId}.`);
                setError('Wine details not found or invalid response from server.');
                setWine(null);
                setOffers([]);
                setUserInteractionData(undefined);
                setNotes(null);
            }
        } catch (err: any) {
            console.error(`[useWineDetails] Error fetching details for wine ${wineId}:`, err);
            setError(err.message || 'Failed to fetch wine details.');
            setWine(null);
            setOffers([]);
            setUserInteractionData(undefined);
            setNotes(null);
        } finally {
            setIsLoading(false);
        }
    }, [wineId]);

    useEffect(() => {
        if (!initialWineData) {
           fetchData();
        } else {
           console.log("[useWineDetails] Using initialWineData, skipping initial fetch.")
        }
    }, [fetchData, initialWineData]);

    return {
        wine,
        offers,
        notes,
        userInteractionData,
        isLoading,
        error,
        retry: fetchData,
    };
}; 