-- Add image support to messages table
-- This script adds an image_url column to the messages table and creates a storage bucket for chat images

-- Add image_url column to messages table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'messages' 
    AND column_name = 'image_url'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN image_url TEXT;
  END IF;
END
$$;

-- Create storage bucket for chat images if it doesn't exist
-- Note: This needs to be run by a Supabase admin in the SQL editor
-- or configured through the Supabase dashboard

-- Set up storage bucket policies to allow authenticated users to upload and view images
-- Using dynamic SQL to handle potential missing tables
DO $$
DECLARE
  bucket_id UUID;
  policy_exists BOOLEAN;
BEGIN
  -- Check if storage schema exists
  IF EXISTS (
    SELECT FROM information_schema.schemata
    WHERE schema_name = 'storage'
  ) THEN
    -- Check if buckets table exists
    IF EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'storage'
      AND table_name = 'buckets'
    ) THEN
      -- Get bucket ID if it exists
      SELECT id INTO bucket_id
      FROM storage.buckets
      WHERE name = 'chat_images';
      
      IF bucket_id IS NOT NULL THEN
        -- Check if policies table exists
        IF EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'storage'
          AND table_name = 'policies'
        ) THEN
          -- Try to create upload policy
          BEGIN
            -- Check if policy already exists
            SELECT EXISTS (
              SELECT 1 FROM storage.policies 
              WHERE name = 'Allow authenticated users to upload images'
              AND bucket_id = bucket_id
            ) INTO policy_exists;
            
            IF NOT policy_exists THEN
              EXECUTE format('
                INSERT INTO storage.policies (name, definition, bucket_id)
                VALUES (%L, %L, %L)',
                'Allow authenticated users to upload images',
                '(auth.role() = ''authenticated'')',
                bucket_id
              );
              RAISE NOTICE 'Created upload policy for chat_images bucket';
            END IF;
            
            -- Check if view policy already exists
            SELECT EXISTS (
              SELECT 1 FROM storage.policies 
              WHERE name = 'Allow authenticated users to view images'
              AND bucket_id = bucket_id
            ) INTO policy_exists;
            
            IF NOT policy_exists THEN
              EXECUTE format('
                INSERT INTO storage.policies (name, definition, bucket_id)
                VALUES (%L, %L, %L)',
                'Allow authenticated users to view images',
                '(auth.role() = ''authenticated'')',
                bucket_id
              );
              RAISE NOTICE 'Created view policy for chat_images bucket';
            END IF;
          EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not create storage policies: %', SQLERRM;
            RAISE NOTICE 'You may need to create these policies manually in the Supabase dashboard';
          END;
        ELSE
          RAISE NOTICE 'storage.policies table does not exist. You may need to create policies manually in the Supabase dashboard';
        END IF;
      ELSE
        RAISE NOTICE 'chat_images bucket does not exist. Please create it in the Supabase dashboard';
      END IF;
    ELSE
      RAISE NOTICE 'storage.buckets table does not exist. Please create the chat_images bucket in the Supabase dashboard';
    END IF;
  ELSE
    RAISE NOTICE 'storage schema does not exist. Please create the chat_images bucket in the Supabase dashboard';
  END IF;
END
$$;

-- Update the RLS policies for the messages table to include the image_url column
DO $$
BEGIN
  -- Drop existing policy if it exists
  BEGIN
    DROP POLICY IF EXISTS "Users can insert messages in their constellation" ON public.messages;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error dropping policy: %', SQLERRM;
  END;
  
  -- Create new policy
  BEGIN
    CREATE POLICY "Users can insert messages in their constellation" ON public.messages
      FOR INSERT
      WITH CHECK (
        auth.uid() = user_id AND
        auth.uid() IN (
          SELECT user_id FROM public.constellation_members 
          WHERE constellation_id = messages.constellation_id
        )
      );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating policy: %', SQLERRM;
  END;
END
$$;

-- Update the get_constellation_messages function to include image_url
CREATE OR REPLACE FUNCTION public.get_constellation_messages(constellation_id_param UUID)
RETURNS TABLE (
  id UUID,
  constellation_id UUID,
  user_id UUID,
  content TEXT,
  created_at TIMESTAMPTZ,
  sender_name TEXT,
  image_url TEXT
) AS $$
BEGIN
  -- Check if the user is a member of the constellation
  IF NOT EXISTS (
    SELECT 1 FROM public.constellation_members 
    WHERE constellation_id = constellation_id_param 
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'User is not a member of this constellation';
  END IF;

  RETURN QUERY
  SELECT 
    m.id,
    m.constellation_id,
    m.user_id,
    m.content,
    m.created_at,
    p.name AS sender_name,
    m.image_url
  FROM 
    public.messages m
    JOIN public.profiles p ON m.user_id = p.id
  WHERE 
    m.constellation_id = constellation_id_param
  ORDER BY 
    m.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the send_message function to include image_url
CREATE OR REPLACE FUNCTION public.send_message(
  constellation_id_param UUID,
  content_param TEXT,
  image_url_param TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  new_message_id UUID;
BEGIN
  -- Check if the user is authenticated
  IF auth.uid() IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User is not authenticated'
    );
  END IF;

  -- Check if the user is a member of the constellation
  IF NOT EXISTS (
    SELECT 1 FROM public.constellation_members 
    WHERE constellation_id = constellation_id_param 
    AND user_id = auth.uid()
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User is not a member of this constellation'
    );
  END IF;

  -- Insert the message
  INSERT INTO public.messages (
    constellation_id,
    user_id,
    content,
    image_url
  ) VALUES (
    constellation_id_param,
    auth.uid(),
    content_param,
    image_url_param
  )
  RETURNING id INTO new_message_id;

  -- Return success
  RETURN json_build_object(
    'success', true,
    'message_id', new_message_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 