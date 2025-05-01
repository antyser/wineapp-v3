import { useState, useEffect, useCallback } from 'react';
import { Wine } from '../types/wine';
import { WineSearcherOffer, GetWineForUserResponse } from '../api/generated/types.gen';
// Remove imports for generated service functions
// import {
//   getOneWineApiV1WinesWineIdGet,
//   getWineForUserApiV1WinesUserWineIdGet,
// } from '../api';
import { apiFetch } from '../lib/apiClient'; // Import the new fetch utility

// Helper function (can be moved to utils/types later)
const mapApiWineToLocalWine = (apiWine: any): Wine => {
  return {
    id: apiWine.id,
    name: apiWine.name,
    vintage: apiWine.vintage || undefined,
    region: apiWine.region || undefined,
    country: apiWine.country || undefined,
    winery: apiWine.producer || apiWine.winery || undefined,
    type: apiWine.wine_type || apiWine.type || undefined,
    varietal: apiWine.grape_variety || apiWine.varietal || undefined,
    image_url: apiWine.image_url || undefined,
    average_price: apiWine.average_price || undefined,
    description: apiWine.description || undefined,
    wine_searcher_id: apiWine.wine_searcher_id || undefined,
    // Add AI fields if available
    drinking_window: apiWine.drinking_window || undefined,
    food_pairings: apiWine.food_pairings || undefined,
    abv: apiWine.abv || undefined,
    winemaker_notes: apiWine.winemaker_notes || undefined,
    professional_reviews: apiWine.professional_reviews || undefined,
    tasting_notes: apiWine.tasting_notes || undefined,
  };
};

interface UseWineDetailsResult {
  wine: Wine | null;
  offers: WineSearcherOffer[];
  isLoading: boolean;
  error: string | null;
  retry: () => void;
  userInteractionData?: GetWineForUserResponse['interaction']; // Pass interaction data if fetched here
}

export const useWineDetails = (wineId: string, initialWineData?: Wine): UseWineDetailsResult => {
  const [wine, setWine] = useState<Wine | null>(initialWineData || null);
  const [offers, setOffers] = useState<WineSearcherOffer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(!initialWineData);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  // Store interaction data fetched along with user-specific wine data
  const [userInteractionData, setUserInteractionData] = useState<GetWineForUserResponse['interaction'] | undefined>(undefined);

  const fetchDetails = useCallback(async () => {
    if (!wineId) return;

    // Skip fetch if we have initial data (but allow retry)
    if (initialWineData && retryCount === 0) {
        console.log('[useWineDetails] Using initial wine data from route/props');
        // If initial data is provided, assume offers/interactions need separate fetching
        // Or adjust if initial data might include offers/interactions
        setIsLoading(false);
        return;
    }

    setIsLoading(true);
    setError(null);
    setUserInteractionData(undefined);
    setOffers([]); // Clear previous offers on refetch/retry
    console.log(`[useWineDetails] Fetching details for wineId: ${wineId}, Retry: ${retryCount}`);

    try {
      // Prioritize fetching user-specific wine data first
      try {
        // Use apiFetch for user-specific data
        const userWineResponse = await apiFetch<GetWineForUserResponse>(`/api/v1/wines/user/${wineId}`);

        if (userWineResponse?.wine) { // apiFetch returns null for 204/non-JSON
          console.log('[useWineDetails] Successfully retrieved user-specific wine data');
          const mappedWine = mapApiWineToLocalWine(userWineResponse.wine);
          setWine(mappedWine);
          setOffers(userWineResponse.offers || []);
          setUserInteractionData(userWineResponse.interaction);
          setIsLoading(false);
          return; // Success!
        } else {
           // If user-specific data returned null or lacked wine, log and proceed to public
           console.log('[useWineDetails] No user-specific wine data found or response was empty, falling back...');
        }
      } catch (userError: any) {
         // If the user-specific endpoint returns 404 or other error, fall back to public
        if (userError.message?.includes('404')) {
            console.warn('[useWineDetails] User-specific endpoint returned 404, falling back to public.');
        } else {
            console.warn('[useWineDetails] Failed to get user-specific wine data, falling back...', userError?.message || userError);
        }
        // Don't throw here, proceed to public fetch
      }

      // Fallback: Fetch public wine data
      console.log('[useWineDetails] Fetching public wine data as fallback...');
      // Use apiFetch for public data
      // Assuming the public endpoint returns data directly matching the Wine type structure (adjust if not)
      const publicWineResponse = await apiFetch<Wine>(`/api/v1/wines/${wineId}`);

      if (publicWineResponse) { // apiFetch returns null for 204/non-JSON
        const mappedWine = mapApiWineToLocalWine(publicWineResponse);
        setWine(mappedWine);
        // Offers and interactions might not be available in public data
        setOffers([]);
        setUserInteractionData(undefined);
      } else {
        throw new Error('No public wine data found or response was empty.');
      }
    } catch (err: any) {
      console.error('[useWineDetails] Error fetching details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load wine details.');
      setWine(null); // Clear wine data on error
    } finally {
      setIsLoading(false);
    }
  }, [wineId, initialWineData, retryCount]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]); // Rerun when wineId or retryCount changes

  const retry = useCallback(() => {
    setRetryCount(count => count + 1);
  }, []);

  return { wine, offers, isLoading, error, retry, userInteractionData };
}; 