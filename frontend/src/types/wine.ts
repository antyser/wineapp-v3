export interface Wine {
  id: string;
  name: string;
  region?: string;
  country?: string;
  winery?: string;
  vintage?: string | number;
  type?: string;
  varietal?: string;
  image_url?: string;
  average_price?: number;
  description?: string;
  wine_searcher_id?: string;
  wine_searcher_url?: string;
  name_alias?: string[];
  created_at?: string;
  updated_at?: string;
  
  // AI-generated fields
  drinking_window?: string;
  food_pairings?: string;
  abv?: string;
  tasting_notes?: string;
  winemaker_notes?: string;
  professional_reviews?: string;
} 