-- Update notes table: remove cellar_wine_id field
ALTER TABLE public.notes DROP CONSTRAINT IF EXISTS fk_notes_cellar_wine;
ALTER TABLE public.notes DROP COLUMN IF EXISTS cellar_wine_id;

-- Create interactions table
CREATE TABLE IF NOT EXISTS public.interactions (
  id             uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid         NOT NULL,
  wine_id        uuid         NOT NULL,
  liked          boolean      DEFAULT false,
  wishlist       boolean      DEFAULT false,
  rating         float,       -- float for ratings between 1-5
  tasted         boolean      DEFAULT false,
  created_at     timestamptz  NOT NULL DEFAULT now(),
  updated_at     timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT fk_interactions_user
    FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT fk_interactions_wine
    FOREIGN KEY (wine_id) REFERENCES public.wines (id) ON DELETE CASCADE,
  CONSTRAINT interactions_unique_pair
    UNIQUE (user_id, wine_id)
);

-- Add index for faster queries
CREATE INDEX idx_interactions_user_id ON public.interactions (user_id);
CREATE INDEX idx_interactions_wine_id ON public.interactions (wine_id); 