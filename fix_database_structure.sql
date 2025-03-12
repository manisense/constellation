-- Fix Database Structure for Constellation App
-- This script fixes all database issues, including missing columns, ambiguous references, and missing functions

-- 1. Fix profiles table structure
DO $$
BEGIN
    -- Check and add star_name column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'profiles' 
                  AND column_name = 'star_name') THEN
        ALTER TABLE public.profiles ADD COLUMN star_name TEXT;
        RAISE NOTICE 'Added star_name column to profiles table';
    END IF;

    -- Check and add star_type column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'profiles' 
                  AND column_name = 'star_type') THEN
        ALTER TABLE public.profiles ADD COLUMN star_type TEXT;
        RAISE NOTICE 'Added star_type column to profiles table';
    END IF;

    -- Check and add about column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'profiles' 
                  AND column_name = 'about') THEN
        ALTER TABLE public.profiles ADD COLUMN about TEXT;
        RAISE NOTICE 'Added about column to profiles table';
    END IF;

    -- Check and add interests column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'profiles' 
                  AND column_name = 'interests') THEN
        ALTER TABLE public.profiles ADD COLUMN interests TEXT[];
        RAISE NOTICE 'Added interests column to profiles table';
    END IF;

    -- Check and add avatar_url column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'profiles' 
                  AND column_name = 'avatar_url') THEN
        ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
        RAISE NOTICE 'Added avatar_url column to profiles table';
    END IF;

    -- Check and add photo_url column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'profiles' 
                  AND column_name = 'photo_url') THEN
        ALTER TABLE public.profiles ADD COLUMN photo_url TEXT;
        RAISE NOTICE 'Added photo_url column to profiles table';
    END IF;

    -- Migrate data from starName to star_name if needed
    IF EXISTS (SELECT 1 FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = 'profiles' 
              AND column_name = 'starName') THEN
        UPDATE public.profiles 
        SET star_name = "starName"
        WHERE star_name IS NULL AND "starName" IS NOT NULL;
        
        RAISE NOTICE 'Migrated data from starName to star_name';
    END IF;

    -- Ensure consistency between avatar_url and photo_url
    UPDATE public.profiles 
    SET avatar_url = photo_url
    WHERE avatar_url IS NULL AND photo_url IS NOT NULL;

    UPDATE public.profiles 
    SET photo_url = avatar_url
    WHERE photo_url IS NULL AND avatar_url IS NOT NULL;

    RAISE NOTICE 'Ensured consistency between avatar_url and photo_url';
END $$;

-- 2. Create or replace the update_profile function
DROP FUNCTION public.update_profile(text,text,text[],text,text,text);
CREATE OR REPLACE FUNCTION public.update_profile(
    name text DEFAULT NULL,
    about text DEFAULT NULL,
    interests text[] DEFAULT NULL,
    star_name text DEFAULT NULL,
    star_type text DEFAULT NULL,
    avatar_url text DEFAULT NULL
) RETURNS json AS $$
DECLARE
    profile_id uuid;
    result json;
BEGIN
    -- Check if user is authenticated
    IF auth.uid() IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User not authenticated'
        );
    END IF;

    -- Check if profile exists
    SELECT id INTO profile_id FROM public.profiles WHERE id = auth.uid();


    IF profile_id IS NULL THEN
        -- Create new profile
        INSERT INTO public.profiles (
            id,
            user_id,
            name,
            about,
            interests,
            star_name,
            star_type,
            avatar_url,
            photo_url,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            auth.uid(),
            COALESCE(name, ''),
            COALESCE(about, ''),
            COALESCE(interests, ARRAY[]::text[]),
            COALESCE(star_name, ''),
            COALESCE(star_type, ''),
            COALESCE(avatar_url, ''),
            COALESCE(avatar_url, ''), -- Set photo_url same as avatar_url
            NOW(),
            NOW()
        )
        RETURNING id INTO profile_id;

        SELECT json_build_object(
            'success', true,
            'message', 'Profile created successfully',
            'profile_id', profile_id
        ) INTO result;
    ELSE
        -- Update existing profile
        UPDATE public.profiles
        SET
            name = COALESCE(update_profile.name, profiles.name),
            about = COALESCE(update_profile.about, profiles.about),
            interests = COALESCE(update_profile.interests, profiles.interests),
            star_name = COALESCE(update_profile.star_name, profiles.star_name),
            star_type = COALESCE(update_profile.star_type, profiles.star_type),
            avatar_url = COALESCE(update_profile.avatar_url, profiles.avatar_url),
            photo_url = COALESCE(update_profile.avatar_url, profiles.photo_url), -- Update photo_url as well
            updated_at = NOW()
        WHERE user_id = auth.uid();

        SELECT json_build_object(
            'success', true,
            'message', 'Profile updated successfully',
            'profile_id', profile_id
        ) INTO result;
    END IF;

    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create or replace the get_profile function
CREATE OR REPLACE FUNCTION public.get_profile()
RETURNS json AS $$
DECLARE
    user_profile json;
BEGIN
    -- Check if user is authenticated
    IF auth.uid() IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User not authenticated'
        );
    END IF;

    -- Get user profile
    SELECT json_build_object(
        'id', p.id,
        'user_id', p.user_id,
        'name', p.name,
        'about', p.about,
        'interests', p.interests,
        'star_name', p.star_name,
        'star_type', p.star_type,
        'avatar_url', p.avatar_url,
        'photo_url', p.photo_url,
        'created_at', p.created_at,
        'updated_at', p.updated_at
    ) INTO user_profile
    FROM public.profiles p
    WHERE p.user_id = auth.uid();

    IF user_profile IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Profile not found'
        );
    END IF;

    RETURN json_build_object(
        'success', true,
        'profile', user_profile
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create or replace the get_partner_profile function
DROP FUNCTION public.get_partner_profile(uuid);
CREATE OR REPLACE FUNCTION public.get_partner_profile(constellation_id uuid)
RETURNS json AS $$
DECLARE
    partner_profile json;
    partner_id uuid;
BEGIN
    -- Check if user is authenticated
    IF auth.uid() IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User not authenticated'
        );
    END IF;

    -- Check if user is a member of the constellation
    IF NOT EXISTS (
        SELECT 1 FROM constellation_members
        WHERE constellation_id = get_partner_profile.constellation_id
        AND user_id = auth.uid()
    ) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User is not a member of this constellation'
        );
    END IF;

    -- Get partner's user_id
    SELECT cm.user_id INTO partner_id
    FROM constellation_members cm
    WHERE cm.constellation_id = get_partner_profile.constellation_id
    AND cm.user_id != auth.uid()
    LIMIT 1;

    IF partner_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Partner not found in this constellation'
        );
    END IF;

    -- Get partner's profile
    SELECT json_build_object(
        'id', p.id,
        'user_id', p.user_id,
        'name', p.name,
        'about', p.about,
        'interests', p.interests,
        'star_name', p.star_name,
        'star_type', p.star_type,
        'avatar_url', p.avatar_url,
        'photo_url', p.photo_url,
        'created_at', p.created_at,
        'updated_at', p.updated_at
    ) INTO partner_profile
    FROM public.profiles p
    WHERE p.user_id = partner_id;

    IF partner_profile IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Partner profile not found'
        );
    END IF;

    RETURN json_build_object(
        'success', true,
        'profile', partner_profile
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create or replace the get_constellation_messages function with fixed ambiguous column references
DROP FUNCTION public.get_constellation_messages(constellation_id uuid);
CREATE OR REPLACE FUNCTION public.get_constellation_messages(constellation_id uuid)
RETURNS SETOF messages AS $$
BEGIN
    -- Check if user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Check if user is a member of the constellation
    IF NOT EXISTS (
        SELECT 1 FROM constellation_members cm
        WHERE cm.constellation_id = get_constellation_messages.constellation_id
        AND cm.user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'User is not a member of this constellation';
    END IF;

    -- Return messages for the constellation
    RETURN QUERY
    SELECT m.*
    FROM messages m
    WHERE m.constellation_id = get_constellation_messages.constellation_id
    ORDER BY m.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create or replace the send_message function
DROP FUNCTION public.send_message(
    constellation_id uuid,
    content text,
    image_url text
);
CREATE OR REPLACE FUNCTION public.send_message(
    constellation_id uuid,
    content text,
    image_url text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
    message_id uuid;
BEGIN
    -- Check if user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Check if user is a member of the constellation
    IF NOT EXISTS (
        SELECT 1 FROM constellation_members cm
        WHERE cm.constellation_id = send_message.constellation_id
        AND cm.user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'User is not a member of this constellation';
    END IF;

    -- Insert the message
    INSERT INTO messages (
        id,
        constellation_id,
        user_id,
        content,
        image_url,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        send_message.constellation_id,
        auth.uid(),
        send_message.content,
        send_message.image_url,
        NOW(),
        NOW()
    )
    RETURNING id INTO message_id;

    -- Increase bonding strength
    PERFORM increase_bonding_strength(send_message.constellation_id);

    RETURN message_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to send message: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create or replace the increase_bonding_strength function
--DROP FUNCTION public.increase_bonding_strength(constellation_id uuid);
CREATE OR REPLACE FUNCTION public.increase_bonding_strength(constellation_id uuid)
RETURNS void AS $$
BEGIN
    -- Check if user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Check if user is a member of the constellation
    IF NOT EXISTS (
        SELECT 1 FROM constellation_members cm
        WHERE cm.constellation_id = increase_bonding_strength.constellation_id
        AND cm.user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'User is not a member of this constellation';
    END IF;

    -- Increase bonding strength by 1, but cap at 100
    UPDATE constellations
    SET bonding_strength = LEAST(bonding_strength + 1, 100)
    WHERE id = increase_bonding_strength.constellation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Set up Row Level Security (RLS) for the profiles table
-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in their constellation" ON public.profiles;

-- Create policies
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can view profiles in their constellation"
ON public.profiles
FOR SELECT
USING (
    user_id IN (
        SELECT cm.user_id
        FROM constellation_members cm
        WHERE cm.constellation_id IN (
            SELECT constellation_id
            FROM constellation_members
            WHERE user_id = auth.uid()
        )
    )
);

-- 9. Set up real-time publication for messages and profiles
DO $$
BEGIN
    -- Check if the publication exists
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        -- Check if the messages table is already in the publication
        IF NOT EXISTS (
            SELECT 1
            FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime'
            AND schemaname = 'public'
            AND tablename = 'messages'
        ) THEN
            -- Add the messages table to the existing publication
            ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
            RAISE NOTICE 'Added messages table to supabase_realtime publication';
        ELSE
            RAISE NOTICE 'messages table is already in supabase_realtime publication';
        END IF;

        -- Check if the profiles table is already in the publication
        IF NOT EXISTS (
            SELECT 1
            FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime'
            AND schemaname = 'public'
            AND tablename = 'profiles'
        ) THEN
            -- Add the profiles table to the existing publication
            ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
            RAISE NOTICE 'Added profiles table to supabase_realtime publication';
        ELSE
            RAISE NOTICE 'profiles table is already in supabase_realtime publication';
        END IF;
    ELSE
        -- Create the publication and add the tables
        CREATE PUBLICATION supabase_realtime FOR TABLE public.messages, public.profiles;
        RAISE NOTICE 'Created supabase_realtime publication with messages and profiles tables';
    END IF;
END $$; 