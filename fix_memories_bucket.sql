-- SQL Script to add the memories storage bucket for the Constellation app
-- This script creates the necessary storage bucket for storing memory images

-- Create storage bucket for memories if it doesn't exist
DO $$
DECLARE
    bucket_exists BOOLEAN;
BEGIN
    -- Check if the bucket exists
    SELECT EXISTS (
        SELECT 1 FROM storage.buckets WHERE name = 'memories'
    ) INTO bucket_exists;
    
    IF NOT bucket_exists THEN
        -- Create the bucket
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('memories', 'memories', false);
        
        -- Create policy to allow authenticated users to view images from their constellation
        CREATE POLICY "Users can view memory images from their constellation"
        ON storage.objects
        FOR SELECT
        TO authenticated
        USING (
            bucket_id = 'memories' AND
            (storage.foldername(name))[1] IN (
                SELECT constellation_id::text FROM public.constellation_members
                WHERE user_id = auth.uid()
            )
        );
        
        -- Create policy to allow authenticated users to upload images to their constellation
        CREATE POLICY "Users can upload memory images to their constellation"
        ON storage.objects
        FOR INSERT
        TO authenticated
        WITH CHECK (
            bucket_id = 'memories' AND
            (storage.foldername(name))[1] IN (
                SELECT constellation_id::text FROM public.constellation_members
                WHERE user_id = auth.uid()
            )
        );
        
        -- Create policy to allow users to update their own uploads
        CREATE POLICY "Users can update their own memory images"
        ON storage.objects
        FOR UPDATE
        TO authenticated
        USING (
            bucket_id = 'memories' AND
            auth.uid()::text = (storage.foldername(name))[2]
        );
        
        -- Create policy to allow users to delete their own uploads
        CREATE POLICY "Users can delete their own memory images"
        ON storage.objects
        FOR DELETE
        TO authenticated
        USING (
            bucket_id = 'memories' AND
            auth.uid()::text = (storage.foldername(name))[2]
        );
        
        RAISE NOTICE 'Created memories bucket with policies';
    ELSE
        RAISE NOTICE 'Memories bucket already exists';
    END IF;
END
$$; 