-- Add missing AI wine fields to the wines table

-- Add winemaker_notes field
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'wines' AND column_name = 'winemaker_notes'
    ) THEN
        ALTER TABLE wines ADD COLUMN winemaker_notes TEXT;
    END IF;
END $$;

-- Add professional_reviews field
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'wines' AND column_name = 'professional_reviews'
    ) THEN
        ALTER TABLE wines ADD COLUMN professional_reviews TEXT;
    END IF;
END $$;

-- Update the direct_wine_insert function to include the new fields
CREATE OR REPLACE FUNCTION public.direct_wine_insert(wine_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  inserted_row jsonb;
BEGIN
  INSERT INTO public.wines (
    id,
    name,
    vintage,
    region,
    country,
    winery,
    type,
    varietal,
    price,
    rating,
    tasting_notes,
    wine_searcher_url,
    average_price,
    description,
    drinking_window,
    food_pairings,
    abv,
    name_alias,
    image_url,
    wine_searcher_id,
    winemaker_notes,
    professional_reviews,
    created_at,
    updated_at
  )
  VALUES (
    COALESCE((wine_data->>'id')::uuid, uuid_generate_v4()),
    wine_data->>'name',
    (wine_data->>'vintage')::integer,
    wine_data->>'region',
    wine_data->>'country',
    wine_data->>'winery',
    wine_data->>'type',
    wine_data->>'varietal',
    (wine_data->>'price')::numeric,
    (wine_data->>'rating')::integer,
    wine_data->>'tasting_notes',
    wine_data->>'wine_searcher_url',
    (wine_data->>'average_price')::numeric,
    wine_data->>'description',
    wine_data->>'drinking_window',
    wine_data->>'food_pairings',
    wine_data->>'abv',
    (wine_data->'name_alias')::text[],
    wine_data->>'image_url',
    wine_data->>'wine_searcher_id',
    wine_data->>'winemaker_notes',
    wine_data->>'professional_reviews',
    COALESCE((wine_data->>'created_at')::timestamptz, now()),
    COALESCE((wine_data->>'updated_at')::timestamptz, now())
  )
  RETURNING to_jsonb(wines) INTO inserted_row;
  
  RETURN inserted_row;
END;
$$; 