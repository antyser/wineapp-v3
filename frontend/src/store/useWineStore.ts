import { create } from 'zustand';

// Types for our store
export interface Wine {
  id: string;
  name: string;
  vintage: number;
  region: string;
  country: string;
  description?: string;
  imageUrl?: string;
  grapes?: string[];
  alcoholContent?: number;
  price?: number;
}

interface WineState {
  wines: Wine[];
  wishlist: string[]; // IDs of wines in wishlist
  recentlyViewed: string[]; // IDs of recently viewed wines
  addWine: (wine: Wine) => void;
  addToWishlist: (wineId: string) => void;
  removeFromWishlist: (wineId: string) => void;
  addToRecentlyViewed: (wineId: string) => void;
}

// Create store
const useWineStore = create<WineState>(set => ({
  wines: [],
  wishlist: [],
  recentlyViewed: [],

  addWine: wine =>
    set(state => ({
      wines: [...state.wines, wine],
    })),

  addToWishlist: wineId =>
    set(state => ({
      wishlist: state.wishlist.includes(wineId) ? state.wishlist : [...state.wishlist, wineId],
    })),

  removeFromWishlist: wineId =>
    set(state => ({
      wishlist: state.wishlist.filter(id => id !== wineId),
    })),

  addToRecentlyViewed: wineId =>
    set(state => {
      // Remove wineId if it already exists to avoid duplicates
      const filtered = state.recentlyViewed.filter(id => id !== wineId);
      // Add to the beginning of the array and limit to 10 items
      return {
        recentlyViewed: [wineId, ...filtered].slice(0, 10),
      };
    }),
}));

export default useWineStore;
