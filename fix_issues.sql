-- Constellation App Database Fixes
-- This script addresses various issues with the database structure, RLS policies,
-- real-time publication, and performance optimizations.

-- 1. Ensure messages table has the correct structure
DO $$
BEGIN
    -- Check if messages table exists
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages') THEN
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
        RAISE NOTICE 'Messages table already exists';
    END IF;
    
    -- Ensure all required columns exist
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'image_url') THEN
        ALTER TABLE public.messages ADD COLUMN image_url TEXT;
        RAISE NOTICE 'Added image_url column to messages table';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'updated_at') THEN
        ALTER TABLE public.messages ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column to messages table';
    END IF;
END $$;

-- 2. Fix Row Level Security (RLS) policies for messages table
DO $$
BEGIN
    -- Enable RLS on messages table
    ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view messages in their constellations" ON public.messages;
    DROP POLICY IF EXISTS "Users can insert messages in their constellations" ON public.messages;
    DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
    DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;
    
    -- Create new policies
    CREATE POLICY "Users can view messages in their constellations" 
    ON public.messages FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.constellation_members cm 
            WHERE cm.constellation_id = messages.constellation_id 
            AND cm.user_id = auth.uid()
        )
    );
    
    CREATE POLICY "Users can insert messages in their constellations" 
    ON public.messages FOR INSERT 
    WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.constellation_members cm 
            WHERE cm.constellation_id = messages.constellation_id 
            AND cm.user_id = auth.uid()
        )
    );
    
    CREATE POLICY "Users can update their own messages" 
    ON public.messages FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
    
    CREATE POLICY "Users can delete their own messages" 
    ON public.messages FOR DELETE 
    USING (auth.uid() = user_id);
    
    RAISE NOTICE 'RLS policies for messages table have been updated';
END $$;

-- 3. Add messages table to real-time publication
DO $$
BEGIN
    -- Check if the realtime publication exists
    IF NOT EXISTS (SELECT FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
        RAISE NOTICE 'Created supabase_realtime publication';
    END IF;
    
    -- Add messages table to the publication if not already added
    IF NOT EXISTS (
        SELECT FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
        RAISE NOTICE 'Added messages table to supabase_realtime publication';
    ELSE
        RAISE NOTICE 'Messages table already in supabase_realtime publication';
    END IF;
END $$;

-- 4. Create indexes for better performance
DO $$
BEGIN
    -- Create index on constellation_id for faster message retrieval
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'messages' 
        AND indexname = 'idx_messages_constellation_id'
    ) THEN
        CREATE INDEX idx_messages_constellation_id ON public.messages(constellation_id);
        RAISE NOTICE 'Created index on messages.constellation_id';
    END IF;
    
    -- Create index on user_id for faster user message retrieval
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'messages' 
        AND indexname = 'idx_messages_user_id'
    ) THEN
        CREATE INDEX idx_messages_user_id ON public.messages(user_id);
        RAISE NOTICE 'Created index on messages.user_id';
    END IF;
    
    -- Create index on created_at for faster chronological retrieval
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'messages' 
        AND indexname = 'idx_messages_created_at'
    ) THEN
        CREATE INDEX idx_messages_created_at ON public.messages(created_at);
        RAISE NOTICE 'Created index on messages.created_at';
    END IF;
END $$;

-- 5. Create function to get partner profile in a constellation
CREATE OR REPLACE FUNCTION public.get_partner_profile(constellation_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    partner_profile JSONB;
BEGIN
    SELECT 
        jsonb_build_object(
            'id', p.id,
            'user_id', p.user_id,
            'name', p.name,
            'bio', p.bio,
            'avatar_url', p.avatar_url,
            'star_type', cm.star_type
        ) INTO partner_profile
    FROM 
        constellation_members cm
    JOIN 
        profiles p ON cm.user_id = p.user_id
    WHERE 
        cm.constellation_id = constellation_id_param
        AND cm.user_id != auth.uid();
    
    RETURN partner_profile;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error getting partner profile: %', SQLERRM;
END;
$$;

-- 6. Create function to increase bonding strength
CREATE OR REPLACE FUNCTION public.increase_bonding_strength(constellation_id_param UUID, amount INT DEFAULT 1)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_strength INT;
BEGIN
    -- Get current bonding strength
    SELECT bonding_strength INTO current_strength
    FROM constellations
    WHERE id = constellation_id_param;
    
    -- Update bonding strength, ensuring it doesn't exceed 100
    UPDATE constellations
    SET bonding_strength = LEAST(100, current_strength + amount)
    WHERE id = constellation_id_param;
    
    RETURN FOUND;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error increasing bonding strength: %', SQLERRM;
        RETURN FALSE;
END;
$$;

-- 7. Ensure constellation_members table has star_type column
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_schema = 'public' AND table_name = 'constellation_members' AND column_name = 'star_type') THEN
        ALTER TABLE public.constellation_members ADD COLUMN star_type TEXT;
        RAISE NOTICE 'Added star_type column to constellation_members table';
        
        -- Update existing records to set star_type based on join order
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
        WHERE cm.constellation_id = cc.constellation_id;
        
        RAISE NOTICE 'Updated star_type values for existing constellation members';
    END IF;
END $$;

-- 8. Ensure profiles table has all required columns
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'bio') THEN
        ALTER TABLE public.profiles ADD COLUMN bio TEXT;
        RAISE NOTICE 'Added bio column to profiles table';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'avatar_url') THEN
        ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
        RAISE NOTICE 'Added avatar_url column to profiles table';
    END IF;
END $$;

-- 9. Create storage bucket for chat images if it doesn't exist
-- Note: This requires manual action in the Supabase dashboard
-- Please create a storage bucket named 'chat_images' with appropriate permissions

RAISE NOTICE 'Database fixes completed successfully';
RAISE NOTICE 'Please manually create a storage bucket named "chat_images" in the Supabase dashboard if it does not exist'; 