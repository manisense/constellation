-- Fix ambiguous column references and missing functions

-- 1. Fix the get_constellation_messages function with proper table aliases
CREATE OR REPLACE FUNCTION public.get_constellation_messages(constellation_id_param UUID)
RETURNS SETOF public.messages AS $$
BEGIN
  -- Check if the user is a member of the constellation
  IF NOT EXISTS (
    SELECT 1 FROM public.constellation_members cm
    WHERE cm.constellation_id = constellation_id_param 
    AND cm.user_id = auth.uid()
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

-- 2. Create or replace the send_message function with proper column aliasing
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
    SELECT 1 FROM public.constellation_members cm
    WHERE cm.constellation_id = constellation_id_param 
    AND cm.user_id = auth.uid()
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
  
  -- Increase bonding strength if the function exists
  BEGIN
    PERFORM increase_bonding_strength(constellation_id_param, 1);
  EXCEPTION WHEN OTHERS THEN
    -- Function might not exist, just continue
    NULL;
  END;

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

-- 3. Create or replace the missing get_partner_profile function
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
    SELECT 1 FROM public.constellation_members cm
    WHERE cm.constellation_id = constellation_id_param 
    AND cm.user_id = auth.uid()
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User is not a member of this constellation'
    );
  END IF;
  
  -- Get partner data with properly aliased columns
  SELECT 
    p.id,
    p.name,
    p.photo_url,
    p.about AS bio,
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
      'avatar_url', partner_data.photo_url,
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

-- 4. Create the increase_bonding_strength function if it doesn't exist
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
    RAISE WARNING 'Error increasing bonding strength: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Add messages table to real-time publication if needed
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