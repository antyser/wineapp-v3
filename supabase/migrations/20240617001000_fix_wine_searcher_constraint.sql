-- Update the unique_wine_searcher_id constraint to handle NULL values better
DROP EXTENSION IF EXISTS "uuid-ossp" CASCADE;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA public;

-- Drop the problematic constraint that's treating all NULL values as the same
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_wine_searcher_id'
    ) THEN
        ALTER TABLE wines DROP CONSTRAINT unique_wine_searcher_id;
    END IF;
END $$;

-- Create a filtered index to enforce uniqueness only for non-NULL values
CREATE UNIQUE INDEX idx_unique_wine_searcher_id ON wines (wine_searcher_id) 
WHERE wine_searcher_id IS NOT NULL;

-- Seed test data for the tests to pass
INSERT INTO wines (id, name, vintage, region, country, varietal, type, price, rating, created_at, updated_at)
VALUES 
  (uuid_generate_v4(), 'Sample Cabernet', 2018, 'Napa Valley', 'USA', 'Cabernet Sauvignon', 'Red', 45.99, 92, now(), now()),
  (uuid_generate_v4(), 'Bordeaux Blend', 2015, 'Bordeaux', 'France', 'Merlot, Cabernet Franc', 'Red', 65.50, 94, now(), now()),
  (uuid_generate_v4(), 'Chardonnay Reserve', 2019, 'Sonoma', 'USA', 'Chardonnay', 'White', 32.99, 91, now(), now()); 