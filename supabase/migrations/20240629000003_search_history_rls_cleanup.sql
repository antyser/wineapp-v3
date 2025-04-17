-- ==========================================================
-- Add search history RLS policies to the consolidated model
-- ==========================================================

-- Ensure RLS is enabled
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

-- First drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own search history" ON public.search_history;
DROP POLICY IF EXISTS "Users can insert their own search history" ON public.search_history;

-- Create the policies
CREATE POLICY "Users can view their own search history"
ON public.search_history
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own search history"
ON public.search_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- This is an informational migration that documents that search_history RLS
-- policies are already set up in previous migrations:
-- - 20240624000000_create_search_history.sql
-- - 20240626000001_update_search_history_rls.sql
-- - 20240626020000_search_history_rls.sql
-- 
-- In future consolidations, consider adding these policies to the main
-- consolidated RLS file and removing the individual policy files. 