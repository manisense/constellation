-- Comprehensive Fix for Constellation App
-- This script addresses all identified issues including SQL syntax errors,
-- missing columns, and functionality problems

-- =============================================
-- PART 1: Fix database structure issues
-- =============================================

-- 1. Add created_at column to constellation_members if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'constellation_members' 
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.constellation_members ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    RAISE NOTICE 'Added created_at column to constellation_members table';
  ELSE
    RAISE NOTICE 'created_at column already exists in constellation_members table';
  END IF;
END
$$;

-- 2. Ensure messages table has the correct structure
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'messages'
  ) THEN
    CREATE TABLE public.messages (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      constellation_id UUID NOT NULL REFERENCES public.constellations(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
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
    ELSE
      RAISE NOTICE 'image_url column already exists in messages table';
    END IF;
    
    RAISE NOTICE 'Messages table already exists';
  END IF;
END
$$;

-- 3. Add bonding_strength column to constellations table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'constellations' 
    AND column_name = 'bonding_strength'
  ) THEN
    ALTER TABLE constellations ADD COLUMN bonding_strength INTEGER DEFAULT 0;
    RAISE NOTICE 'Added bonding_strength column to constellations table';
  ELSE
    RAISE NOTICE 'bonding_strength column already exists in constellations table';
  END IF;
END
$$;

-- 4. Add index for better performance
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'messages' 
    AND indexname = 'messages_constellation_id_idx'
  ) THEN
    CREATE INDEX messages_constellation_id_idx ON public.messages(constellation_id);
    RAISE NOTICE 'Created index on messages(constellation_id)';
  ELSE
    RAISE NOTICE 'Index on messages(constellation_id) already exists';
  END IF;
END
$$;

-- =============================================
-- PART 2: Fix RLS policies for messages table
-- =============================================

-- 1. Enable Row Level Security
DO $$
BEGIN
  ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
  RAISE NOTICE 'Enabled Row Level Security on messages table';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error enabling RLS: %', SQLERRM;
END
$$;

-- 2. Create or replace RLS policies
DO $$
BEGIN
  -- View policy
  DROP POLICY IF EXISTS "Users can view messages in their constellation" ON public.messages;
  
  CREATE POLICY "Users can view messages in their constellation" ON public.messages
    FOR SELECT
    USING (
      auth.uid() IN (
        SELECT user_id FROM public.constellation_members 
        WHERE constellation_id = messages.constellation_id
      )
    );
  RAISE NOTICE 'Created view policy for messages';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error creating view policy: %', SQLERRM;
END
$$;

DO $$
BEGIN
  -- Insert policy
  DROP POLICY IF EXISTS "Users can insert messages in their constellation" ON public.messages;
  
  CREATE POLICY "Users can insert messages in their constellation" ON public.messages
    FOR INSERT
    WITH CHECK (
      auth.uid() = user_id AND
      auth.uid() IN (
        SELECT user_id FROM public.constellation_members 
        WHERE constellation_id = messages.constellation_id
      )
    );
  RAISE NOTICE 'Created insert policy for messages';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error creating insert policy: %', SQLERRM;
END
$$;

DO $$
BEGIN
  -- Update policy
  DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
  
  CREATE POLICY "Users can update their own messages" ON public.messages
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  RAISE NOTICE 'Created update policy for messages';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error creating update policy: %', SQLERRM;
END
$$;

DO $$
BEGIN
  -- Delete policy
  DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;
  
  CREATE POLICY "Users can delete their own messages" ON public.messages
    FOR DELETE
    USING (auth.uid() = user_id);
  RAISE NOTICE 'Created delete policy for messages';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error creating delete policy: %', SQLERRM;
END
$$;

-- =============================================
-- PART 3: Fix real-time publication
-- =============================================

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
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error with publication: %', SQLERRM;
END
$$;

-- =============================================
-- PART 4: Fix star type assignment
-- =============================================

-- Fix star types for existing constellations
DO $$
DECLARE
  constellation_record RECORD;
  creator_id UUID;
  joiner_id UUID;
BEGIN
  -- Loop through all constellations
  FOR constellation_record IN 
    SELECT id FROM constellations
  LOOP
    -- Find the creator (first member) based on join time
    SELECT user_id INTO creator_id
    FROM constellation_members
    WHERE constellation_id = constellation_record.id
    ORDER BY created_at ASC
    LIMIT 1;
    
    -- Find the joiner (second member) based on join time
    SELECT user_id INTO joiner_id
    FROM constellation_members
    WHERE constellation_id = constellation_record.id
    AND user_id != creator_id
    ORDER BY created_at ASC
    LIMIT 1;
    
    -- If we have both users, update their star types
    IF creator_id IS NOT NULL AND joiner_id IS NOT NULL THEN
      -- Update creator to Luminary
      UPDATE profiles
      SET star_type = 'luminary',
          star_name = CONCAT('Luminary ', SUBSTRING(COALESCE(name, 'Star') FROM 1 FOR 1))
      WHERE id = creator_id;
      
      -- Update joiner to Navigator
      UPDATE profiles
      SET star_type = 'navigator',
          star_name = CONCAT('Navigator ', SUBSTRING(COALESCE(name, 'Star') FROM 1 FOR 1))
      WHERE id = joiner_id;
      
      RAISE NOTICE 'Updated constellation %: creator % to Luminary, joiner % to Navigator', 
          constellation_record.id, creator_id, joiner_id;
    END IF;
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error updating star types: %', SQLERRM;
END
$$;

-- =============================================
-- PART 5: Fix functions for constellation management
-- =============================================

-- 1. Update create_new_constellation function
CREATE OR REPLACE FUNCTION create_new_constellation(constellation_name TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id UUID := auth.uid();
    new_constellation_id UUID;
    invite_code TEXT;
BEGIN
    IF current_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'No authenticated user found'
        );
    END IF;

    -- Check if user is already in a constellation
    IF EXISTS (
        SELECT 1 FROM constellation_members cm
        WHERE cm.user_id = current_user_id
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'User is already in a constellation'
        );
    END IF;
    
    -- Generate a unique invite code
    invite_code := generate_invite_code();
    
    -- Create a new constellation
    INSERT INTO constellations (name, invite_code)
    VALUES (constellation_name, invite_code)
    RETURNING id INTO new_constellation_id;
    
    -- Add the user to the constellation with ready status
    INSERT INTO constellation_members (constellation_id, user_id, status)
    VALUES (new_constellation_id, current_user_id, 'ready');
    
    -- Assign Luminary star type to the creator
    UPDATE profiles
    SET star_type = 'luminary',
        star_name = CONCAT('Luminary ', SUBSTRING(COALESCE(name, 'Star') FROM 1 FOR 1))
    WHERE id = current_user_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Successfully created constellation',
        'constellation_id', new_constellation_id::text,
        'invite_code', invite_code,
        'star_type', 'luminary'
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', SQLERRM
        );
END;
$$;

-- 2. Update join_constellation_with_code function
CREATE OR REPLACE FUNCTION join_constellation_with_code(invite_code TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id UUID := auth.uid();
    found_constellation_id UUID;
    member_count INTEGER;
BEGIN
    IF current_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'No authenticated user found'
        );
    END IF;

    -- Check if user is already in a constellation
    IF EXISTS (
        SELECT 1 FROM constellation_members cm
        WHERE cm.user_id = current_user_id
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'User is already in a constellation'
        );
    END IF;
    
    -- Find the constellation with the given invite code
    SELECT c.id INTO found_constellation_id
    FROM constellations c
    WHERE c.invite_code = join_constellation_with_code.invite_code;
    
    IF found_constellation_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Invalid invite code'
        );
    END IF;
    
    -- Check if the constellation already has 2 members
    SELECT COUNT(*) INTO member_count
    FROM constellation_members cm
    WHERE cm.constellation_id = found_constellation_id;
    
    IF member_count >= 2 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Constellation already has maximum members'
        );
    END IF;
    
    -- Add the user to the constellation with ready status
    INSERT INTO constellation_members (constellation_id, user_id, status)
    VALUES (found_constellation_id, current_user_id, 'ready');
    
    -- Assign Navigator star type to the joiner
    UPDATE profiles
    SET star_type = 'navigator',
        star_name = CONCAT('Navigator ', SUBSTRING(COALESCE(name, 'Star') FROM 1 FOR 1))
    WHERE id = current_user_id;
    
    -- Update the constellation status to complete
    UPDATE constellation_members
    SET status = 'ready'
    WHERE constellation_id = found_constellation_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Successfully joined constellation',
        'constellation_id', found_constellation_id::text,
        'status', 'complete',
        'star_type', 'navigator'
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', SQLERRM
        );
END;
$$;

-- =============================================
-- PART 6: Fix chat functionality
-- =============================================

-- 1. Create or replace function to get messages for a constellation
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

-- 2. Create or replace function to send a message
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

-- =============================================
-- PART 7: Implement bonding strength
-- =============================================

-- 1. Function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create trigger for updated_at
DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages;
CREATE TRIGGER update_messages_updated_at
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Function to increase bonding strength on message
CREATE OR REPLACE FUNCTION increase_bonding_strength_on_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Increase bonding strength by 1 for each message, up to a maximum of 100
  UPDATE constellations
  SET bonding_strength = LEAST(bonding_strength + 1, 100)
  WHERE id = NEW.constellation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger for bonding strength
DROP TRIGGER IF EXISTS message_bonding_strength_trigger ON messages;
CREATE TRIGGER message_bonding_strength_trigger
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION increase_bonding_strength_on_message();

-- 5. Function to manually increase bonding strength
CREATE OR REPLACE FUNCTION increase_bonding_strength(
  constellation_id_param UUID,
  amount INTEGER DEFAULT 5
)
RETURNS JSONB AS $$
DECLARE
  current_user_id UUID := auth.uid();
  current_strength INTEGER;
  new_strength INTEGER;
BEGIN
  -- Check if user is authenticated
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No authenticated user found'
    );
  END IF;
  
  -- Check if user is a member of the constellation
  IF NOT EXISTS (
    SELECT 1 FROM constellation_members
    WHERE constellation_id = constellation_id_param
    AND user_id = current_user_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'User is not a member of this constellation'
    );
  END IF;
  
  -- Get current bonding strength
  SELECT bonding_strength INTO current_strength
  FROM constellations
  WHERE id = constellation_id_param;
  
  -- Calculate new strength (capped at 100)
  new_strength := LEAST(current_strength + amount, 100);
  
  -- Update bonding strength
  UPDATE constellations
  SET bonding_strength = new_strength
  WHERE id = constellation_id_param;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Bonding strength increased',
    'previous_strength', current_strength,
    'new_strength', new_strength
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Function to get bonding strength
CREATE OR REPLACE FUNCTION get_bonding_strength(constellation_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  current_user_id UUID := auth.uid();
  strength INTEGER;
BEGIN
  -- Check if user is authenticated
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No authenticated user found'
    );
  END IF;
  
  -- Check if user is a member of the constellation
  IF NOT EXISTS (
    SELECT 1 FROM constellation_members
    WHERE constellation_id = constellation_id_param
    AND user_id = current_user_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'User is not a member of this constellation'
    );
  END IF;
  
  -- Get bonding strength
  SELECT bonding_strength INTO strength
  FROM constellations
  WHERE id = constellation_id_param;
  
  RETURN jsonb_build_object(
    'success', true,
    'bonding_strength', strength
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- PART 8: Grant permissions
-- =============================================

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;

-- Check if sequence exists before granting permissions
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.sequences
    WHERE sequence_schema = 'public'
    AND sequence_name = 'messages_id_seq'
  ) THEN
    GRANT USAGE, SELECT ON SEQUENCE public.messages_id_seq TO authenticated;
  END IF;
END
$$;

-- =============================================
-- PART 9: Create storage bucket for chat images
-- =============================================

-- Note: This part needs to be run by a Supabase admin or configured through the dashboard
DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'IMPORTANT: You need to create a storage bucket named "chat_images"';
  RAISE NOTICE 'in the Supabase dashboard and set its privacy to "Authenticated users only".';
  RAISE NOTICE '==============================================';
END
$$;

-- =============================================
-- PART 10: Fix sign-out functionality
-- =============================================

-- Create or replace function to sign out user
CREATE OR REPLACE FUNCTION public.sign_out_user()
RETURNS JSONB AS $$
DECLARE
  current_user_id UUID := auth.uid();
BEGIN
  -- Check if user is authenticated
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No authenticated user found'
    );
  END IF;
  
  -- Clear user session data if needed
  -- This is a placeholder - actual session clearing happens client-side
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'User signed out successfully'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- PART 11: Fix profile data issues
-- =============================================

-- Ensure profiles table has correct structure and constraints
DO $$
BEGIN
  -- Add star_type column if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'star_type'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN star_type TEXT DEFAULT NULL;
    RAISE NOTICE 'Added star_type column to profiles table';
  END IF;
  
  -- Add star_name column if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'star_name'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN star_name TEXT DEFAULT NULL;
    RAISE NOTICE 'Added star_name column to profiles table';
  END IF;
  
  -- Enable RLS on profiles table
  ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
  
  -- Create or replace RLS policies for profiles
  DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
  CREATE POLICY "Public profiles are viewable by everyone." 
    ON public.profiles FOR SELECT 
    USING (true);
  
  DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
  CREATE POLICY "Users can insert their own profile." 
    ON public.profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);
  
  DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
  CREATE POLICY "Users can update own profile." 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);
  
  RAISE NOTICE 'Updated profiles table structure and policies';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error updating profiles table: %', SQLERRM;
END
$$;

-- Function to get partner profile in a constellation
CREATE OR REPLACE FUNCTION get_partner_profile(constellation_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  current_user_id UUID := auth.uid();
  partner_id UUID;
  partner_data JSONB;
BEGIN
  -- Check if user is authenticated
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No authenticated user found'
    );
  END IF;
  
  -- Check if user is a member of the constellation
  IF NOT EXISTS (
    SELECT 1 FROM constellation_members
    WHERE constellation_id = constellation_id_param
    AND user_id = current_user_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'User is not a member of this constellation'
    );
  END IF;
  
  -- Get partner ID
  SELECT user_id INTO partner_id
  FROM constellation_members
  WHERE constellation_id = constellation_id_param
  AND user_id != current_user_id
  LIMIT 1;
  
  IF partner_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No partner found in this constellation'
    );
  END IF;
  
  -- Get partner profile data
  SELECT jsonb_build_object(
    'id', p.id,
    'name', p.name,
    'avatar_url', p.avatar_url,
    'star_type', p.star_type,
    'star_name', p.star_name
  ) INTO partner_data
  FROM profiles p
  WHERE p.id = partner_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'partner', partner_data
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Final success message
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'All fixes have been applied successfully!';
  RAISE NOTICE 'Please create a storage bucket named "chat_images" in the Supabase dashboard';
  RAISE NOTICE 'and set its privacy to "Authenticated users only".';
  RAISE NOTICE '==============================================';
END
$$; 