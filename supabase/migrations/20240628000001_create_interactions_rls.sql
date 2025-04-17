-- Enable RLS on interactions table
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to select only their own interactions
CREATE POLICY "Users can view their own interactions"
ON public.interactions
FOR SELECT
USING (auth.uid() = user_id);

-- Create policy to allow users to insert only interactions for themselves
CREATE POLICY "Users can insert their own interactions"
ON public.interactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update only their own interactions
CREATE POLICY "Users can update their own interactions"
ON public.interactions
FOR UPDATE
USING (auth.uid() = user_id);

-- Create policy to allow users to delete only their own interactions
CREATE POLICY "Users can delete their own interactions"
ON public.interactions
FOR DELETE
USING (auth.uid() = user_id); 