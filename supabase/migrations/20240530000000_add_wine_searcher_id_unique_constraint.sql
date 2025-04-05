-- Add unique constraint for wine_searcher_id column if it doesn't already exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_wine_searcher_id'
    ) THEN
        ALTER TABLE public.wines ADD CONSTRAINT unique_wine_searcher_id UNIQUE NULLS NOT DISTINCT (wine_searcher_id);
    END IF;
END
$$; 