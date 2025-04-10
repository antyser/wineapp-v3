-- First disable RLS on the buckets table to allow bucket creation
ALTER TABLE storage.buckets DISABLE ROW LEVEL SECURITY;

-- Create the storage bucket if it doesn't exist already
INSERT INTO storage.buckets (id, name)
VALUES ('storage', 'storage')
ON CONFLICT (id) DO NOTHING;


-- Make the storage bucket public (allow anonymous access)
UPDATE storage.buckets SET public = true WHERE id = 'storage';
SELECT id, name, public FROM storage.buckets WHERE id = 'storage';

-- Re-enable RLS on the buckets table
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- Enable RLS on the storage.objects table
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to upload files to their own user folder
DROP POLICY IF EXISTS storage_objects_upload ON storage.objects;
CREATE POLICY storage_objects_upload ON storage.objects
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    bucket_id = 'storage' AND 
    -- Ensure first folder matches user's auth.uid()
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Create policy to allow public read access to files
DROP POLICY IF EXISTS storage_objects_select ON storage.objects;
CREATE POLICY storage_objects_select ON storage.objects
  FOR SELECT 
  TO public
  USING (
    bucket_id = 'storage'
    -- No path restrictions for read access - allows public access to all files
  );

-- Create policy to allow authenticated users to update only their own files
DROP POLICY IF EXISTS storage_objects_update ON storage.objects;
CREATE POLICY storage_objects_update ON storage.objects
  FOR UPDATE 
  TO authenticated 
  USING (
    bucket_id = 'storage' AND
    -- Ensure first folder matches user's auth.uid()
    (storage.foldername(name))[1] = auth.uid()::text AND
    owner = auth.uid()
  );

-- Create policy to allow authenticated users to delete only their own files
DROP POLICY IF EXISTS storage_objects_delete ON storage.objects;
CREATE POLICY storage_objects_delete ON storage.objects
  FOR DELETE 
  TO authenticated 
  USING (
    bucket_id = 'storage' AND
    -- Ensure first folder matches user's auth.uid()
    (storage.foldername(name))[1] = auth.uid()::text AND
    owner = auth.uid()
  ); 


-- Make the storage bucket public (allow anonymous access)
UPDATE storage.buckets SET public = true WHERE id = 'storage';
SELECT id, name, public FROM storage.buckets WHERE id = 'storage';
