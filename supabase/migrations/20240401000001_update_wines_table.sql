-- Rename wine_type to type
ALTER TABLE public.wines RENAME COLUMN wine_type TO type;

-- Add notes column
ALTER TABLE public.wines ADD COLUMN notes text;

-- Add price and rating columns
ALTER TABLE public.wines ADD COLUMN price numeric(10,2);
ALTER TABLE public.wines ADD COLUMN rating integer;

-- Rename producer to winery to match code
ALTER TABLE public.wines RENAME COLUMN producer TO winery;
