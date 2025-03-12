-- Comprehensive Fix for Constellation App Database Issues
-- This script addresses all identified issues in the logs

-- =============================================
-- PART 1: Fix profiles table structure
-- =============================================

-- 1. Ensure profiles table has consistent column names
DO $$
BEGIN
  -- Check if photo_url exists but avatar_url doesn't
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'photo_url'
  ) AND NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'avatar_url'
  ) THEN
    -- Add avatar_url column and copy data from photo_url
    ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
    UPDATE public.profiles SET avatar_url = photo_url;
    RAISE NOTICE 'Added avatar_url column and copied data from photo_url';
  ELSIF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'avatar_url'
  ) THEN
    -- Just add avatar_url if neither exists
    ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
    RAISE NOTICE 'Added avatar_url column to profiles table';
  ELSE
    RAISE NOTICE 'avatar_url column already exists in profiles table';
  END IF;
  
  -- Ensure other required columns exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'bio'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN bio TEXT;
    RAISE NOTICE 'Added bio column to profiles table';
  END IF;
END
$$;

-- =============================================
-- PART 2: Fix message sending functionality
-- =============================================

-- 1. Create or replace the send_message function with image support
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
  
  -- Increase bonding strength
  PERFORM increase_bonding_strength(constellation_id_param, 1);

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

-- 2. Create or replace the get_constellation_messages function
CREATE OR REPLACE FUNCTION public.get_constellation_messages(constellation_id_param UUID)
RETURNS SETOF public.messages AS $$
BEGIN
  -- Check if the user is a member of the constellation
  IF NOT EXISTS (
    SELECT 1 FROM public.constellation_members 
    WHERE constellation_id = constellation_id_param 
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'User is not a member of this constellation';
  END IF;
  
  -- Return messages
  RETURN QUERY
  SELECT m.*
  FROM public.messages m
  WHERE m.constellation_id = constellation_id_param
  ORDER BY m.created_at DESC
  LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- PART 3: Fix partner profile functionality
-- =============================================

-- 1. Create or replace the get_partner_profile function
CREATE OR REPLACE FUNCTION public.get_partner_profile(constellation_id_param UUID)
RETURNS JSON AS $$
DECLARE
  partner_data RECORD;
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
  
  -- Get partner data
  SELECT 
    p.id,
    p.name,
    p.avatar_url,
    COALESCE(p.photo_url, p.avatar_url) as photo_url,
    p.bio,
    cm.star_type
  INTO partner_data
  FROM public.constellation_members cm
  JOIN public.profiles p ON cm.user_id = p.id
  WHERE cm.constellation_id = constellation_id_param
  AND cm.user_id != auth.uid()
  LIMIT 1;
  
  -- Check if partner was found
  IF partner_data IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'No partner found in this constellation'
    );
  END IF;
  
  -- Return partner data
  RETURN json_build_object(
    'success', true,
    'partner', json_build_object(
      'id', partner_data.id,
      'name', partner_data.name,
      'avatar_url', COALESCE(partner_data.avatar_url, partner_data.photo_url),
      'bio', partner_data.bio,
      'star_type', partner_data.star_type
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- PART 4: Fix bonding strength functionality
-- =============================================

-- 1. Create or replace the increase_bonding_strength function
CREATE OR REPLACE FUNCTION public.increase_bonding_strength(
  constellation_id_param UUID,
  amount INT DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
  current_strength INT;
BEGIN
  -- Get current bonding strength
  SELECT COALESCE(bonding_strength, 0) INTO current_strength
  FROM public.constellations
  WHERE id = constellation_id_param;
  
  -- Update bonding strength, ensuring it doesn't exceed 100
  UPDATE public.constellations
  SET bonding_strength = LEAST(100, current_strength + amount)
  WHERE id = constellation_id_param;
  
  RETURN FOUND;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error increasing bonding strength: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- PART 5: Fix messages table structure and RLS
-- =============================================

-- 1. Ensure messages table has the correct structure
DO $$
BEGIN
  -- Check if messages table exists
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'messages'
  ) THEN
    CREATE TABLE public.messages (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      constellation_id UUID NOT NULL REFERENCES public.constellations(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      content TEXT,
      image_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    RAISE NOTICE 'Created messages table';
  ELSE
    -- Add image_url column if it doesn't exist
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'messages' 
      AND column_name = 'image_url'
    ) THEN
      ALTER TABLE public.messages ADD COLUMN image_url TEXT;
      RAISE NOTICE 'Added image_url column to messages table';
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'messages' 
      AND column_name = 'updated_at'
    ) THEN
      ALTER TABLE public.messages ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
      RAISE NOTICE 'Added updated_at column to messages table';
    END IF;
  END IF;
END
$$;

-- 2. Set up RLS for messages table
DO $$
BEGIN
  -- Enable RLS
  ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
  
  -- Drop existing policies
  DROP POLICY IF EXISTS "Users can view messages in their constellation" ON public.messages;
  DROP POLICY IF EXISTS "Users can insert messages in their constellation" ON public.messages;
  DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
  DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;
  
  -- Create new policies
  CREATE POLICY "Users can view messages in their constellation" ON public.messages
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.constellation_members 
        WHERE constellation_id = messages.constellation_id 
        AND user_id = auth.uid()
      )
    );
  
  CREATE POLICY "Users can insert messages in their constellation" ON public.messages
    FOR INSERT
    WITH CHECK (
      auth.uid() = user_id AND
      EXISTS (
        SELECT 1 FROM public.constellation_members 
        WHERE constellation_id = messages.constellation_id 
        AND user_id = auth.uid()
      )
    );
  
  CREATE POLICY "Users can update their own messages" ON public.messages
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  
  CREATE POLICY "Users can delete their own messages" ON public.messages
    FOR DELETE
    USING (auth.uid() = user_id);
  
  RAISE NOTICE 'Set up RLS policies for messages table';
END
$$;

-- 3. Add messages table to real-time publication
DO $$
BEGIN
  -- Check if the publication exists
  IF EXISTS (
    SELECT FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    -- Add messages table to the publication if it's not already included
    IF NOT EXISTS (
      SELECT FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND tablename = 'messages'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
      RAISE NOTICE 'Added messages table to supabase_realtime publication';
    ELSE
      RAISE NOTICE 'Messages table already in supabase_realtime publication';
    END IF;
  ELSE
    -- Create the publication if it doesn't exist
    CREATE PUBLICATION supabase_realtime FOR TABLE public.messages;
    RAISE NOTICE 'Created supabase_realtime publication for messages table';
  END IF;
END
$$;

-- =============================================
-- PART 6: Create storage bucket for chat images
-- =============================================

-- Note: This requires manual action in the Supabase dashboard
-- Please create a storage bucket named 'chat_images' with appropriate permissions

-- =============================================
-- PART 7: Fix star type assignment
-- =============================================

-- 1. Ensure constellation_members table has star_type column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'constellation_members' 
    AND column_name = 'star_type'
  ) THEN
    ALTER TABLE public.constellation_members ADD COLUMN star_type TEXT;
    RAISE NOTICE 'Added star_type column to constellation_members table';
  END IF;
  
  -- Update star_type for existing members based on join order
  WITH constellation_creators AS (
    SELECT DISTINCT ON (constellation_id) 
      constellation_id, 
      user_id,
      created_at
    FROM 
      constellation_members
    ORDER BY 
      constellation_id, created_at ASC
  )
  UPDATE constellation_members cm
  SET star_type = CASE 
                    WHEN cc.user_id = cm.user_id THEN 'luminary'
                    ELSE 'navigator'
                  END
  FROM constellation_creators cc
  WHERE cm.constellation_id = cc.constellation_id
  AND cm.star_type IS NULL;
  
  RAISE NOTICE 'Updated star_type values for constellation members';
END
$$;

-- =============================================
-- PART 8: Create indexes for better performance
-- =============================================

DO $$
BEGIN
  -- Create index on constellation_id for faster message retrieval
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'messages' 
    AND indexname = 'idx_messages_constellation_id'
  ) THEN
    CREATE INDEX idx_messages_constellation_id ON public.messages(constellation_id);
    RAISE NOTICE 'Created index on messages(constellation_id)';
  END IF;
  
  -- Create index on user_id for faster user message retrieval
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'messages' 
    AND indexname = 'idx_messages_user_id'
  ) THEN
    CREATE INDEX idx_messages_user_id ON public.messages(user_id);
    RAISE NOTICE 'Created index on messages(user_id)';
  END IF;
  
  -- Create index on created_at for faster chronological retrieval
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'messages' 
    AND indexname = 'idx_messages_created_at'
  ) THEN
    CREATE INDEX idx_messages_created_at ON public.messages(created_at);
    RAISE NOTICE 'Created index on messages(created_at)';
  END IF;
END
$$;

-- Final notice
RAISE NOTICE 'Database fixes completed successfully';
RAISE NOTICE 'Please manually create a storage bucket named "chat_images" in the Supabase dashboard if it does not exist'; 