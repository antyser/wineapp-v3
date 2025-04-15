# Supabase Configuration

This directory contains configuration files and migration scripts for the Supabase project.

### What the Storage Policies Do

The storage policies:

1. Create a 'storage' bucket if it doesn't exist
2. Enable Row Level Security on the storage.objects table
3. Create policies that allow:
   - Authenticated users to upload files to the 'wine-uploads' folder
   - Anyone to read files from the 'wine-uploads' folder (public access)
   - Authenticated users to update and delete their own files
4. Create a placeholder file to ensure the 'wine-uploads' folder exists

## Troubleshooting

If you're seeing errors like `new row violates row-level security policy` when uploading images:

1. Ensure you have applied the storage policies.
2. Verify that you are authenticated (the app should be using email/password authentication).
3. Check the Supabase logs for any error messages.

## Environment Variables

Make sure your `frontend/.env` file includes proper Supabase credentials:

```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
``` 