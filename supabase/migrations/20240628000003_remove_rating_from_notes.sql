-- Remove rating_5 field from notes table, as ratings are now handled in the interactions table
ALTER TABLE public.notes DROP COLUMN IF EXISTS rating_5; 