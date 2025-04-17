-- Enable RLS on cellar_wines table
ALTER TABLE public.cellar_wines ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to select only wines from their own cellars
CREATE POLICY "Users can view their own cellar wines"
ON public.cellar_wines
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.cellars c
    WHERE c.id = cellar_id AND c.user_id = auth.uid()
  )
);

-- Create policy to allow users to insert only wines into their own cellars
CREATE POLICY "Users can insert wines into their own cellars"
ON public.cellar_wines
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.cellars c
    WHERE c.id = cellar_id AND c.user_id = auth.uid()
  )
);

-- Create policy to allow users to update only wines in their own cellars
CREATE POLICY "Users can update their own cellar wines"
ON public.cellar_wines
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.cellars c
    WHERE c.id = cellar_id AND c.user_id = auth.uid()
  )
);

-- Create policy to allow users to delete only wines from their own cellars
CREATE POLICY "Users can delete their own cellar wines"
ON public.cellar_wines
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.cellars c
    WHERE c.id = cellar_id AND c.user_id = auth.uid()
  )
); 