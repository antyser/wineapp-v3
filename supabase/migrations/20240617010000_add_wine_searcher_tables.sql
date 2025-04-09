-- Create the wine_searcher_wines table to store external wine data from Wine-Searcher.com
CREATE TABLE IF NOT EXISTS public.wine_searcher_wines (
    id TEXT PRIMARY KEY,
    wine_searcher_id INTEGER,
    vintage INTEGER NOT NULL DEFAULT 1,
    name TEXT,
    url TEXT,
    description TEXT,
    region TEXT,
    region_image TEXT,
    origin TEXT,
    grape_variety TEXT,
    image TEXT,
    producer TEXT,
    average_price FLOAT,
    min_price FLOAT,
    wine_type TEXT,
    wine_style TEXT,
    offers_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create an index on wine_searcher_id for lookups
CREATE INDEX IF NOT EXISTS idx_wine_searcher_id ON public.wine_searcher_wines(wine_searcher_id);

-- Create an index on name for text-based lookups
CREATE INDEX IF NOT EXISTS idx_wine_searcher_name ON public.wine_searcher_wines(name);

-- Create the offers table to store wine offer data
CREATE TABLE IF NOT EXISTS public.offers (
    id BIGSERIAL PRIMARY KEY,
    wine_id TEXT NOT NULL REFERENCES public.wine_searcher_wines(id) ON DELETE CASCADE,
    price FLOAT,
    unit_price FLOAT,
    description TEXT,
    seller_name TEXT,
    url TEXT,
    seller_address_region TEXT,
    seller_address_country TEXT,
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create an index on wine_id for faster lookups of offers by wine
CREATE INDEX IF NOT EXISTS idx_offers_wine_id ON public.offers(wine_id);

-- Disable Row Level Security for these tables
ALTER TABLE public.wine_searcher_wines DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers DISABLE ROW LEVEL SECURITY;

-- Update the direct_wine_insert function to include the wine_searcher_id
DO $do_block$ 
BEGIN
  -- Check if direct_wine_insert function exists
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'direct_wine_insert' 
    AND pg_function_is_visible(oid)
  ) THEN
    -- Update the function to include wine_searcher_id
    CREATE OR REPLACE FUNCTION public.direct_wine_insert(wine_data jsonb)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $function_body$
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
        COALESCE((wine_data->>'created_at')::timestamptz, now()),
        COALESCE((wine_data->>'updated_at')::timestamptz, now())
      )
      RETURNING to_jsonb(wines) INTO inserted_row;
      
      RETURN inserted_row;
    END;
    $function_body$;
  END IF;
END $do_block$;

-- Trigger for updated_at timestamp on wine_searcher_wines
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_wine_searcher
BEFORE UPDATE ON public.wine_searcher_wines
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_offers
BEFORE UPDATE ON public.offers
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp(); 