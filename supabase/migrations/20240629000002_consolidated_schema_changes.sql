-- ==========================================================
-- Consolidated schema changes
-- ==========================================================

-- ------------------------------------------------------------
-- Update notes table: remove cellar_wine_id field and rating_5
-- ------------------------------------------------------------
ALTER TABLE public.notes DROP CONSTRAINT IF EXISTS fk_notes_cellar_wine;
ALTER TABLE public.notes DROP COLUMN IF EXISTS cellar_wine_id;
ALTER TABLE public.notes DROP COLUMN IF EXISTS rating_5;

-- ------------------------------------------------------------
-- Drop the user_wines table as it's replaced by interactions table
-- ------------------------------------------------------------
DROP TABLE IF EXISTS public.user_wines;

-- ------------------------------------------------------------
-- Drop the user_activities table
-- ------------------------------------------------------------
DROP TABLE IF EXISTS public.user_activities;

-- ------------------------------------------------------------
-- Create interactions table for user interactions with wines
-- First create table with minimal structure, then add constraints
-- ------------------------------------------------------------
DO $$
BEGIN
    -- Create the table if it doesn't exist
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'interactions') THEN
        CREATE TABLE public.interactions (
            id             uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id        uuid         NOT NULL,
            wine_id        uuid         NOT NULL,
            liked          boolean      DEFAULT false,
            wishlist       boolean      DEFAULT false,
            rating         float,       -- float for ratings between 1-5
            tasted         boolean      DEFAULT false,
            created_at     timestamptz  NOT NULL DEFAULT now(),
            updated_at     timestamptz  NOT NULL DEFAULT now()
        );
        
        -- Add constraints
        ALTER TABLE public.interactions ADD CONSTRAINT fk_interactions_user
            FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;
            
        ALTER TABLE public.interactions ADD CONSTRAINT fk_interactions_wine
            FOREIGN KEY (wine_id) REFERENCES public.wines (id) ON DELETE CASCADE;
            
        ALTER TABLE public.interactions ADD CONSTRAINT interactions_unique_pair
            UNIQUE (user_id, wine_id);
    END IF;
END
$$;

-- Add indexes for faster queries (these are safe with IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_interactions_user_id ON public.interactions (user_id);
CREATE INDEX IF NOT EXISTS idx_interactions_wine_id ON public.interactions (wine_id); 