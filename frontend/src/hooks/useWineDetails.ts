import { useState, useEffect, useCallback } from 'react';
import { Wine } from '../types/wine';
import { WineSearcherOffer, GetWineForUserResponse } from '../api/generated/types.gen';
import {
  getOneWineApiV1WinesWineIdGet,
  getWineForUserApiV1WinesUserWineIdGet,
} from '../api';

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
        console.log('Using initial wine data from route/props');
        // If initial data is provided, assume offers/interactions need separate fetching
        // Or adjust if initial data might include offers/interactions
        setIsLoading(false);
        return;
    }

    setIsLoading(true);
    setError(null);
    setUserInteractionData(undefined);
    setOffers([]); // Clear previous offers on refetch/retry
    console.log(`Fetching details for wineId: ${wineId}, Retry: ${retryCount}`);

    try {
      // Prioritize fetching user-specific wine data first
      try {
        const userWineResponse = await getWineForUserApiV1WinesUserWineIdGet({
          path: { wine_id: wineId },
        });

        if (userWineResponse.data?.wine) {
          console.log('Successfully retrieved user-specific wine data');
          const mappedWine = mapApiWineToLocalWine(userWineResponse.data.wine);
          setWine(mappedWine);
          setOffers(userWineResponse.data.offers || []);
          setUserInteractionData(userWineResponse.data.interaction);
          setIsLoading(false);
          return; // Success!
        }
      } catch (userError) {
        console.warn('Failed to get user-specific wine data, falling back...', userError);
        // Don't throw here, proceed to public fetch
      }

      // Fallback: Fetch public wine data
      console.log('Fetching public wine data as fallback...');
      const publicWineResponse = await getOneWineApiV1WinesWineIdGet({
        path: { wine_id: wineId },
      });

      if (publicWineResponse.data) {
        const mappedWine = mapApiWineToLocalWine(publicWineResponse.data);
        setWine(mappedWine);
        // Offers and interactions might not be available in public data
        setOffers([]); 
        setUserInteractionData(undefined);
      } else {
        throw new Error('No wine data found.');
      }
    } catch (err) {
      console.error('Error in useWineDetails fetch:', err);
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