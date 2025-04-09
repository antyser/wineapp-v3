-- Add new fields and modify existing ones to match the updated WineBase schema

-- First, make existing columns nullable to match Optional fields in WineBase
ALTER TABLE wines ALTER COLUMN vintage DROP NOT NULL;
ALTER TABLE wines ALTER COLUMN region DROP NOT NULL;
ALTER TABLE wines ALTER COLUMN country DROP NOT NULL;

-- Rename grapes column to varietal and change type (if not already done)
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'wines' AND column_name = 'grapes'
    ) THEN
        ALTER TABLE wines RENAME COLUMN grapes TO varietal;
        ALTER TABLE wines ALTER COLUMN varietal TYPE TEXT USING (array_to_string(varietal, ', '));
        ALTER TABLE wines ALTER COLUMN varietal DROP NOT NULL;
    END IF;
END $$;

-- Rename alcohol_content to abv and change type (if present)
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'wines' AND column_name = 'alcohol_content'
    ) THEN
        ALTER TABLE wines RENAME COLUMN alcohol_content TO abv;
        ALTER TABLE wines ALTER COLUMN abv TYPE TEXT;
        ALTER TABLE wines ALTER COLUMN abv DROP NOT NULL;
    ELSIF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'wines' AND column_name = 'abv'
    ) THEN
        ALTER TABLE wines ADD COLUMN abv TEXT;
    END IF;
END $$;

-- Add missing columns from the latest WineBase
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'wines' AND column_name = 'winery'
    ) THEN
        ALTER TABLE wines ADD COLUMN winery TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'wines' AND column_name = 'type'
    ) THEN
        ALTER TABLE wines ADD COLUMN type TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'wines' AND column_name = 'rating'
    ) THEN
        ALTER TABLE wines ADD COLUMN rating INTEGER;
    END IF;
    
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'wines' AND column_name = 'tasting_notes'
    ) THEN
        ALTER TABLE wines ADD COLUMN tasting_notes TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'wines' AND column_name = 'wine_searcher_url'
    ) THEN
        ALTER TABLE wines ADD COLUMN wine_searcher_url TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'wines' AND column_name = 'average_price'
    ) THEN
        ALTER TABLE wines ADD COLUMN average_price DECIMAL(10, 2);
    END IF;
    
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'wines' AND column_name = 'drinking_window'
    ) THEN
        ALTER TABLE wines ADD COLUMN drinking_window TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'wines' AND column_name = 'food_pairings'
    ) THEN
        ALTER TABLE wines ADD COLUMN food_pairings TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'wines' AND column_name = 'name_alias'
    ) THEN
        ALTER TABLE wines ADD COLUMN name_alias TEXT[];
    END IF;
    
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'wines' AND column_name = 'wine_searcher_id'
    ) THEN
        ALTER TABLE wines ADD COLUMN wine_searcher_id TEXT;
    END IF;
END $$;

-- Add unique constraint for wine_searcher_id (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_wine_searcher_id'
    ) THEN
        ALTER TABLE wines ADD CONSTRAINT unique_wine_searcher_id UNIQUE NULLS NOT DISTINCT (wine_searcher_id);
    END IF;
END $$;

-- Update the direct_wine_insert function to include all the new fields
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
$$; 