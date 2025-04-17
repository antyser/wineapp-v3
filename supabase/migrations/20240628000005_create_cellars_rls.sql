-- Enable RLS on cellars table
ALTER TABLE public.cellars ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to select only their own cellars
CREATE POLICY "Users can view their own cellars"
ON public.cellars
FOR SELECT
USING (auth.uid() = user_id);

-- Create policy to allow users to insert only cellars for themselves
CREATE POLICY "Users can insert their own cellars"
ON public.cellars
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update only their own cellars
CREATE POLICY "Users can update their own cellars"
ON public.cellars
FOR UPDATE
USING (auth.uid() = user_id);

-- Create policy to allow users to delete only their own cellars
CREATE POLICY "Users can delete their own cellars"
ON public.cellars
FOR DELETE
USING (auth.uid() = user_id); 