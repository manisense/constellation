-- Fix issues with messages table and real-time functionality

-- 1. Ensure messages table has the correct structure
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
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;
END
$$;

-- 2. Add index for better performance
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'messages' 
    AND indexname = 'messages_constellation_id_idx'
  ) THEN
    CREATE INDEX messages_constellation_id_idx ON public.messages(constellation_id);
  END IF;
END
$$;

-- 3. Enable Row Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 4. Create or replace RLS policies
DROP POLICY IF EXISTS "Users can view messages in their constellation" ON public.messages;
CREATE POLICY "Users can view messages in their constellation" ON public.messages
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.constellation_members 
      WHERE constellation_id = messages.constellation_id
    )
  );

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

DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
CREATE POLICY "Users can update their own messages" ON public.messages
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;
CREATE POLICY "Users can delete their own messages" ON public.messages
  FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Ensure the messages table is included in the real-time publication
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
    END IF;
  ELSE
    -- Create the publication if it doesn't exist
    CREATE PUBLICATION supabase_realtime FOR TABLE public.messages;
  END IF;
END
$$;

-- 6. Create or replace function to get messages for a constellation
CREATE OR REPLACE FUNCTION public.get_constellation_messages(constellation_id_param UUID)
RETURNS TABLE (
  id UUID,
  constellation_id UUID,
  user_id UUID,
  content TEXT,
  created_at TIMESTAMPTZ,
  sender_name TEXT
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
    p.name AS sender_name
  FROM 
    public.messages m
    JOIN public.profiles p ON m.user_id = p.id
  WHERE 
    m.constellation_id = constellation_id_param
  ORDER BY 
    m.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create or replace function to send a message
CREATE OR REPLACE FUNCTION public.send_message(
  constellation_id_param UUID,
  content_param TEXT
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
    content
  ) VALUES (
    constellation_id_param,
    auth.uid(),
    content_param
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

-- 8. Create a trigger to update the updated_at field
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages;

-- Create the trigger
CREATE TRIGGER update_messages_updated_at
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.messages_id_seq TO authenticated; 