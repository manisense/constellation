-- Instructions for fixing the storage bucket
/*
1. In the Supabase dashboard:
   - Go to Storage in the left sidebar
   - If "chat-images" (with hyphen) exists, delete it or rename it to "chat_images" (with underscore)
   - Create a new bucket named "chat_images" if it doesn't exist
   - Make sure "Public bucket" is UNCHECKED (we want this to be private)
*/

-- 2. Add the necessary policies for the chat_images bucket
-- These policies can be added from the SQL Editor

-- Policy for viewing images in the chat_images bucket
BEGIN;
INSERT INTO storage.policies (name, bucket_id, definition)
SELECT 
  'Users can view images in their constellations',
  id,
  '(storage.foldername(name)::uuid IN (
    SELECT constellation_id FROM public.constellation_members 
    WHERE user_id = auth.uid()
  ))'
FROM storage.buckets
WHERE name = 'chat_images'
ON CONFLICT (bucket_id, name) DO NOTHING;

-- Policy for uploading images to the chat_images bucket
INSERT INTO storage.policies (name, bucket_id, definition, operation)
SELECT 
  'Users can upload images to their constellations',
  id,
  '(storage.foldername(name)::uuid IN (
    SELECT constellation_id FROM public.constellation_members 
    WHERE user_id = auth.uid()
  ))',
  'INSERT'
FROM storage.buckets
WHERE name = 'chat_images'
ON CONFLICT (bucket_id, name, operation) DO NOTHING;
COMMIT;

-- Note: If the above doesn't work due to permission issues, you need to add policies through the Supabase UI:
/*
1. Go to Storage in the Supabase dashboard
2. Select the chat_images bucket
3. Go to the Policies tab
4. Click "Add Policy"
5. Create these two policies manually:

   Policy 1:
   - Name: "Users can view images in their constellations"
   - Allowed operation: SELECT
   - Policy definition: Custom
   - SQL:
     (storage.foldername(name)::uuid IN (
       SELECT constellation_id FROM constellation_members 
       WHERE user_id = auth.uid()
     ))

   Policy 2:
   - Name: "Users can upload images to their constellations"
   - Allowed operation: INSERT
   - Policy definition: Custom
   - SQL:
     (storage.foldername(name)::uuid IN (
       SELECT constellation_id FROM constellation_members 
       WHERE user_id = auth.uid()
     ))
*/

-- Fix Storage Bucket for Chat Images
-- This script ensures the chat_images bucket exists and has the correct policies

-- 1. Create a function to help with bucket creation
CREATE OR REPLACE FUNCTION create_bucket_if_not_exists(
  bucket_name TEXT,
  bucket_description TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE name = bucket_name) THEN
    INSERT INTO storage.buckets (id, name, owner, created_at, updated_at, public, avif_autodetection, file_size_limit, allowed_mime_types)
    VALUES (
      gen_random_uuid(),
      bucket_name,
      (SELECT id FROM auth.users WHERE email = current_setting('request.jwt.claims', true)::json->>'email'),
      NOW(),
      NOW(),
      FALSE,
      FALSE,
      52428800, -- 50MB limit
      '{image/jpeg,image/png,image/gif,image/webp}'
    );
    
    RAISE NOTICE 'Created bucket: %', bucket_name;
  ELSE
    RAISE NOTICE 'Bucket already exists: %', bucket_name;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create a function to help with policy creation
CREATE OR REPLACE FUNCTION create_storage_policy(
  policy_name TEXT,
  bucket_name TEXT,
  policy_definition TEXT,
  operation TEXT DEFAULT 'ALL'
) RETURNS VOID AS $$
BEGIN
  -- Get the bucket ID
  DECLARE
    bucket_id UUID;
  BEGIN
    SELECT id INTO bucket_id FROM storage.buckets WHERE name = bucket_name;
    
    IF bucket_id IS NULL THEN
      RAISE EXCEPTION 'Bucket % does not exist', bucket_name;
    END IF;
    
    -- Delete existing policy with the same name if it exists
    DELETE FROM storage.policies 
    WHERE name = policy_name AND bucket_id = bucket_id;
    
    -- Create the new policy
    INSERT INTO storage.policies (name, bucket_id, definition, operation, owner)
    VALUES (
      policy_name,
      bucket_id,
      policy_definition,
      operation,
      (SELECT id FROM auth.users WHERE email = current_setting('request.jwt.claims', true)::json->>'email')
    );
    
    RAISE NOTICE 'Created policy: % for bucket: %', policy_name, bucket_name;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create a function to rename a bucket if needed
CREATE OR REPLACE FUNCTION rename_bucket_if_exists(
  old_bucket_name TEXT,
  new_bucket_name TEXT
) RETURNS VOID AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE name = old_bucket_name) 
     AND NOT EXISTS (SELECT 1 FROM storage.buckets WHERE name = new_bucket_name) THEN
    
    UPDATE storage.buckets
    SET name = new_bucket_name
    WHERE name = old_bucket_name;
    
    RAISE NOTICE 'Renamed bucket from % to %', old_bucket_name, new_bucket_name;
  ELSIF EXISTS (SELECT 1 FROM storage.buckets WHERE name = old_bucket_name) 
        AND EXISTS (SELECT 1 FROM storage.buckets WHERE name = new_bucket_name) THEN
    RAISE NOTICE 'Both buckets exist. Manual migration of objects required from % to %', old_bucket_name, new_bucket_name;
  ELSIF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE name = old_bucket_name) THEN
    RAISE NOTICE 'Source bucket does not exist: %', old_bucket_name;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Rename chat-images to chat_images if needed
SELECT rename_bucket_if_exists('chat-images', 'chat_images');

-- 5. Create the chat_images bucket if it doesn't exist
SELECT create_bucket_if_not_exists('chat_images', 'Chat images storage');

-- 6. Update bucket settings
UPDATE storage.buckets
SET public = false
WHERE name = 'chat_images';

-- 7. Create policies for the chat_images bucket
-- Policy for viewing images
SELECT create_storage_policy(
  'Chat Images View Policy',
  'chat_images',
  '(auth.uid() IS NOT NULL) AND (
    (storage.foldername(name))[1] IN (
      SELECT constellation_id::text
      FROM constellation_members
      WHERE user_id = auth.uid()
    )
  )',
  'SELECT'
);

-- Policy for uploading images
SELECT create_storage_policy(
  'Chat Images Upload Policy',
  'chat_images',
  '(auth.uid() IS NOT NULL) AND (
    (storage.foldername(name))[1] IN (
      SELECT constellation_id::text
      FROM constellation_members
      WHERE user_id = auth.uid()
    )
  )',
  'INSERT'
);

-- 8. Create a simple test policy if needed for debugging
SELECT create_storage_policy(
  'Chat Images Authenticated Access',
  'chat_images',
  'auth.uid() IS NOT NULL',
  'ALL'
);

-- 9. Verify bucket exists and has policies
DO $$
DECLARE
  bucket_id UUID;
  policy_count INT;
BEGIN
  SELECT id INTO bucket_id FROM storage.buckets WHERE name = 'chat_images';
  
  IF bucket_id IS NULL THEN
    RAISE EXCEPTION 'Failed to create chat_images bucket';
  END IF;
  
  SELECT COUNT(*) INTO policy_count FROM storage.policies WHERE bucket_id = bucket_id;
  
  IF policy_count = 0 THEN
    RAISE WARNING 'No policies found for chat_images bucket';
  ELSE
    RAISE NOTICE 'chat_images bucket has % policies', policy_count;
  END IF;
END $$; 