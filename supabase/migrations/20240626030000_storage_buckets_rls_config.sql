-- Step 1: Check for and potentially drop the existing 'wine-images' bucket
DO $$
DECLARE
  bucket_exists BOOLEAN;
BEGIN
  -- Check if the bucket exists
  SELECT EXISTS (
    SELECT 1 FROM storage.buckets WHERE name = 'wine-images'
  ) INTO bucket_exists;
  
  -- If it exists, try to delete it
  IF bucket_exists THEN
    -- Delete bucket contents first
    DELETE FROM storage.objects WHERE bucket_id = 'wine-images';
    -- Then delete the bucket itself
    DELETE FROM storage.buckets WHERE name = 'wine-images';
    RAISE NOTICE 'Deleted wine-images bucket';
  ELSE
    RAISE NOTICE 'Bucket wine-images does not exist';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error deleting wine-images bucket: %', SQLERRM;
END $$;

-- Step 2: Ensure the 'wines' bucket exists and is public
DO $$
DECLARE
  bucket_exists BOOLEAN;
BEGIN
  -- Check if bucket exists
  SELECT EXISTS (
    SELECT 1 FROM storage.buckets WHERE name = 'wines'
  ) INTO bucket_exists;
  
  IF NOT bucket_exists THEN
    -- Create the bucket if it doesn't exist
    INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
    VALUES ('wines', 'wines', true, false, 10485760, NULL); -- 10MB limit
    RAISE NOTICE 'Created wines bucket';
  ELSE
    -- Update the bucket to be public if it exists
    UPDATE storage.buckets 
    SET public = true
    WHERE name = 'wines';
    RAISE NOTICE 'Updated wines bucket to be public';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error configuring wines bucket: %', SQLERRM;
END $$;

-- Step 3: Configure RLS policies for storage
-- Enable RLS on the storage.objects table if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop any existing policies that might conflict
DROP POLICY IF EXISTS "User can upload files to their own directory in wines bucket" ON storage.objects;
DROP POLICY IF EXISTS "User can update their own files in wines bucket" ON storage.objects;
DROP POLICY IF EXISTS "User can delete their own files in wines bucket" ON storage.objects;
DROP POLICY IF EXISTS "User can view their own files and public files in wines bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public access to view files in wines bucket" ON storage.objects;

-- Step 5: Create RLS policies for the wines bucket

-- 1. Allow users to upload files to their own directory
CREATE POLICY "User can upload files to their own directory in wines bucket" 
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'wines' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 2. Allow users to update their own files
CREATE POLICY "User can update their own files in wines bucket" 
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'wines' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Allow users to delete their own files
CREATE POLICY "User can delete their own files in wines bucket" 
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'wines' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Allow users to view their own files and publicly accessible files
CREATE POLICY "User can view their own files and public files in wines bucket" 
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'wines' AND 
  (
    (storage.foldername(name))[1] = auth.uid()::text OR
    -- Also allow access to public files if needed
    storage.foldername(name) IS NULL
  )
);

-- 5. Allow public access to read files if needed
CREATE POLICY "Public access to view files in wines bucket" 
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'wines'
); 