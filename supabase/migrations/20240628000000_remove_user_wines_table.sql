-- Drop the user_wines table as it's being replaced by interactions table
DROP TABLE IF EXISTS public.user_wines;

-- If there's any data we want to migrate, we'd do it here
-- (Already handled in seed.sql by adding test interactions) 