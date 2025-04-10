-- Create the search_history table
CREATE TABLE IF NOT EXISTS public.search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  search_type TEXT NOT NULL,
  search_query TEXT,
  result_wine_ids UUID[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT fk_search_history_user_id
    FOREIGN KEY (user_id)
    REFERENCES auth.users (id)
    ON DELETE CASCADE
);

-- Create an index for efficient retrieval of user's search history ordered by time
CREATE INDEX IF NOT EXISTS idx_search_history_user_created
  ON public.search_history (user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

-- Create policy for users to see only their own search history
CREATE POLICY select_own_search_history
  ON public.search_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy for users to insert only their own search history
CREATE POLICY insert_own_search_history
  ON public.search_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id); 