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
} 