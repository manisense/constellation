-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing objects with CASCADE to handle dependencies
DO $$
BEGIN
    -- Drop triggers if they exist
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'enforce_constellation_member_limit') THEN
        DROP TRIGGER IF EXISTS enforce_constellation_member_limit ON constellation_members;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
        DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_profiles_updated_at') THEN
        DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_constellations_updated_at') THEN
        DROP TRIGGER IF EXISTS update_constellations_updated_at ON constellations;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_constellation_invite_code') THEN
        DROP TRIGGER IF EXISTS set_constellation_invite_code ON constellations;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_member_status_on_quiz_completion') THEN
        DROP TRIGGER IF EXISTS trigger_update_member_status_on_quiz_completion ON profiles;
    END IF;
    
    -- Drop functions if they exist
    DROP FUNCTION IF EXISTS check_constellation_member_limit() CASCADE;
    DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
    DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
    DROP FUNCTION IF EXISTS generate_invite_code() CASCADE;
    DROP FUNCTION IF EXISTS set_invite_code() CASCADE;
    DROP FUNCTION IF EXISTS get_user_constellation_status() CASCADE;
    DROP FUNCTION IF EXISTS create_new_constellation(TEXT) CASCADE;
    DROP FUNCTION IF EXISTS join_constellation_with_code(TEXT) CASCADE;
    DROP FUNCTION IF EXISTS update_member_status(TEXT) CASCADE;
    DROP FUNCTION IF EXISTS update_member_status_on_quiz_completion() CASCADE;
    DROP FUNCTION IF EXISTS should_show_home_screen() CASCADE;
    DROP FUNCTION IF EXISTS update_bonding_strength(UUID, INTEGER) CASCADE;
    
    -- Drop policies if they exist
    DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
    DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
    DROP POLICY IF EXISTS "Users can view their constellation partners' profiles" ON profiles;
    DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
    
    DROP POLICY IF EXISTS "Users can view their own constellations" ON constellations;
    DROP POLICY IF EXISTS "Users can create constellations" ON constellations;
    DROP POLICY IF EXISTS "Users can update their own constellations" ON constellations;
    
    DROP POLICY IF EXISTS "Users can view their own memberships" ON constellation_members;
    DROP POLICY IF EXISTS "Users can view constellation partners" ON constellation_members;
    DROP POLICY IF EXISTS "Users can join constellations" ON constellation_members;
    
    DROP POLICY IF EXISTS "Users can view messages in their constellations" ON messages;
    DROP POLICY IF EXISTS "Users can send messages to their constellations" ON messages;
    
    DROP POLICY IF EXISTS "Users can view quiz results in their constellations" ON quiz_results;
    DROP POLICY IF EXISTS "Users can create their own quiz results" ON quiz_results;
    
    DROP POLICY IF EXISTS "Users can view quiz progress in their constellations" ON quiz_progress;
    DROP POLICY IF EXISTS "Users can create their own quiz progress" ON quiz_progress;
    DROP POLICY IF EXISTS "Users can update their own quiz progress" ON quiz_progress;
    
    DROP POLICY IF EXISTS "Users can upload their own profile photos" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update their own profile photos" ON storage.objects;
    DROP POLICY IF EXISTS "Anyone can view profile photos" ON storage.objects;
    
    -- Drop tables with CASCADE to handle dependencies
    DROP TABLE IF EXISTS quiz_progress CASCADE;
    DROP TABLE IF EXISTS quiz_results CASCADE;
    DROP TABLE IF EXISTS messages CASCADE;
    DROP TABLE IF EXISTS constellation_members CASCADE;
    DROP TABLE IF EXISTS constellations CASCADE;
    DROP TABLE IF EXISTS profiles CASCADE;
    
    -- Drop publication if it exists
    DROP PUBLICATION IF EXISTS supabase_realtime;
END
$$;

-- Profiles table (extends the auth.users table)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    name TEXT,
    about TEXT,
    interests TEXT[] DEFAULT '{}',
    star_name TEXT,
    star_type TEXT CHECK (star_type IN ('luminary', 'navigator') OR star_type IS NULL),
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Constellations table
CREATE TABLE constellations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    invite_code TEXT UNIQUE NOT NULL,
    bonding_strength INTEGER DEFAULT 0 CHECK (bonding_strength >= 0 AND bonding_strength <= 100),
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Constellation members (linking users to constellations)
CREATE TABLE constellation_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    constellation_id UUID REFERENCES constellations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'joined' CHECK (status IN ('joined', 'quiz_completed', 'ready')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (constellation_id, user_id)
);

-- Messages table
CREATE TABLE messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    constellation_id UUID REFERENCES constellations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Quiz results table
CREATE TABLE quiz_results (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    quiz_id TEXT NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    constellation_id UUID REFERENCES constellations(id) ON DELETE CASCADE NOT NULL,
    answers JSONB NOT NULL,
    result TEXT CHECK (result IN ('luminary', 'navigator')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Quiz progress table
CREATE TABLE quiz_progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    constellation_id UUID REFERENCES constellations(id) ON DELETE CASCADE NOT NULL,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    completed BOOLEAN DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add constraint to limit constellation members to 2
CREATE OR REPLACE FUNCTION check_constellation_member_limit()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT COUNT(*) FROM constellation_members WHERE constellation_id = NEW.constellation_id) >= 2 THEN
        RAISE EXCEPTION 'Constellation can only have a maximum of 2 members';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_constellation_member_limit
BEFORE INSERT ON constellation_members
FOR EACH ROW
EXECUTE FUNCTION check_constellation_member_limit();

-- Function to handle user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert a new profile with all required fields
    INSERT INTO profiles (
        id, 
        name, 
        about, 
        interests, 
        star_name, 
        star_type, 
        photo_url, 
        created_at, 
        updated_at
    )
    VALUES (
        NEW.id, 
        COALESCE(NEW.raw_user_meta_data->>'name', 'User'), 
        '', 
        '{}', 
        '', 
        NULL, 
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''), 
        NOW(), 
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    
    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        -- If the profile already exists, just return the NEW record
        RETURN NEW;
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in handle_new_user: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create a profile when a new user signs up
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_user();

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to tables
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_constellations_updated_at
BEFORE UPDATE ON constellations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Function to generate a unique invite code
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    result TEXT := '';
    i INTEGER := 0;
    pos INTEGER := 0;
BEGIN
    FOR i IN 1..6 LOOP
        pos := 1 + FLOOR(RANDOM() * LENGTH(chars));
        result := result || SUBSTRING(chars FROM pos FOR 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically generate an invite code for new constellations
CREATE OR REPLACE FUNCTION set_invite_code()
RETURNS TRIGGER AS $$
DECLARE
    code TEXT;
    code_exists BOOLEAN;
BEGIN
    IF NEW.invite_code IS NOT NULL THEN
        RETURN NEW;
    END IF;
    
    LOOP
        code := generate_invite_code();
        SELECT EXISTS(SELECT 1 FROM constellations WHERE invite_code = code) INTO code_exists;
        EXIT WHEN NOT code_exists;
    END LOOP;
    
    NEW.invite_code := code;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to automatically generate invite codes
CREATE TRIGGER set_constellation_invite_code
BEFORE INSERT ON constellations
FOR EACH ROW
EXECUTE FUNCTION set_invite_code();

-- Function to check user's constellation status
CREATE OR REPLACE FUNCTION get_user_constellation_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id UUID := auth.uid();
    result jsonb;
    constellation_data jsonb;
    partner_data jsonb;
    member_count integer;
BEGIN
    -- First check if user is authenticated
    IF current_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'status', 'no_user',
            'message', 'No authenticated user found'
        );
    END IF;

    -- Check if user has a profile
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = current_user_id) THEN
        -- Create a profile if it doesn't exist
        INSERT INTO profiles (
            id, 
            name, 
            about, 
            interests, 
            star_name, 
            star_type, 
            photo_url, 
            created_at, 
            updated_at
        )
        VALUES (
            current_user_id, 
            'User', 
            '', 
            '{}', 
            '', 
            NULL, 
            '', 
            NOW(), 
            NOW()
        )
        ON CONFLICT (id) DO NOTHING;
    END IF;

    -- Check if user is in a constellation
    SELECT 
        jsonb_build_object(
            'constellation_id', c.id,
            'constellation_name', c.name,
            'invite_code', c.invite_code,
            'created_at', c.created_at
        ) INTO constellation_data
    FROM constellation_members cm
    JOIN constellations c ON cm.constellation_id = c.id
    WHERE cm.user_id = current_user_id
    LIMIT 1;
    
    IF constellation_data IS NULL THEN
        -- User is not in any constellation
        RETURN jsonb_build_object(
            'status', 'no_constellation',
            'message', 'User is not in any constellation'
        );
    END IF;
    
    -- Check if the constellation has a partner
    SELECT COUNT(*) INTO member_count
    FROM constellation_members
    WHERE constellation_id = (constellation_data->>'constellation_id')::UUID;
    
    IF member_count < 2 THEN
        -- Constellation exists but waiting for partner
        RETURN jsonb_build_object(
            'status', 'waiting_for_partner',
            'message', 'Waiting for partner to join',
            'constellation', constellation_data
        );
    END IF;
    
    -- Get partner information
    SELECT 
        jsonb_build_object(
            'partner_id', p.id,
            'partner_name', p.name,
            'partner_star_type', p.star_type
        ) INTO partner_data
    FROM constellation_members cm
    JOIN profiles p ON cm.user_id = p.id
    WHERE cm.constellation_id = (constellation_data->>'constellation_id')::UUID
    AND cm.user_id != current_user_id
    LIMIT 1;
    
    -- Check if both users have completed the quiz
    IF (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = current_user_id AND star_type IS NOT NULL
        ) AND
        (partner_data->>'partner_star_type') IS NOT NULL
    ) THEN
        -- Both users have completed the quiz
        RETURN jsonb_build_object(
            'status', 'complete',
            'message', 'Constellation is complete',
            'constellation', constellation_data,
            'partner', partner_data
        );
    ELSE
        -- Constellation has both members but quiz not completed
        RETURN jsonb_build_object(
            'status', 'quiz_needed',
            'message', 'Quiz completion required',
            'constellation', constellation_data,
            'partner', partner_data
        );
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'status', 'error',
            'message', SQLERRM
        );
END;
$$;

-- Function to create a new constellation
CREATE OR REPLACE FUNCTION create_new_constellation(constellation_name TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id UUID := auth.uid();
    new_constellation_id UUID;
    new_invite_code TEXT;
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
    
    -- Create a new constellation
    INSERT INTO constellations (name, created_by)
    VALUES (constellation_name, current_user_id)
    RETURNING id, constellations.invite_code INTO new_constellation_id, new_invite_code;
    
    -- Add the user as a member
    INSERT INTO constellation_members (constellation_id, user_id)
    VALUES (new_constellation_id, current_user_id);
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Constellation created successfully',
        'constellation_id', new_constellation_id,
        'invite_code', new_invite_code
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', SQLERRM
        );
END;
$$;

-- Function to join a constellation with an invite code
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
    
    -- Add the user to the constellation
    INSERT INTO constellation_members (constellation_id, user_id)
    VALUES (found_constellation_id, current_user_id);
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Successfully joined constellation',
        'constellation_id', found_constellation_id
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', SQLERRM
        );
END;
$$;

-- Function to update member status
CREATE OR REPLACE FUNCTION update_member_status(status_value TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id UUID := auth.uid();
BEGIN
    IF current_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'No authenticated user found'
        );
    END IF;

    -- Validate status value
    IF status_value NOT IN ('joined', 'quiz_completed', 'ready') THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Invalid status value'
        );
    END IF;
    
    -- Update the member status
    UPDATE constellation_members cm
    SET status = status_value
    WHERE cm.user_id = current_user_id;
    
    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Status updated successfully'
        );
    ELSE
        RETURN jsonb_build_object(
            'success', false,
            'message', 'User not found in any constellation'
        );
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', SQLERRM
        );
END;
$$;

-- Trigger to update constellation_members status when star_type is set
CREATE OR REPLACE FUNCTION update_member_status_on_quiz_completion()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.star_type IS NOT NULL AND (OLD.star_type IS NULL OR OLD.star_type != NEW.star_type) THEN
        UPDATE constellation_members cm
        SET status = 'quiz_completed'
        WHERE cm.user_id = NEW.id;
    END IF;
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in update_member_status_on_quiz_completion: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_member_status_on_quiz_completion
AFTER UPDATE ON profiles
FOR EACH ROW
WHEN (NEW.star_type IS NOT NULL AND (OLD.star_type IS NULL OR OLD.star_type != NEW.star_type))
EXECUTE FUNCTION update_member_status_on_quiz_completion();

-- Function to determine if user should see home screen
CREATE OR REPLACE FUNCTION should_show_home_screen()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_id UUID := auth.uid();
    constellation_id UUID;
    both_completed BOOLEAN;
BEGIN
    IF user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Get user's constellation
    SELECT cm.constellation_id INTO constellation_id
    FROM constellation_members cm
    WHERE cm.user_id = user_id
    LIMIT 1;
    
    IF constellation_id IS NULL THEN
        -- User is not in any constellation
        RETURN FALSE;
    END IF;
    
    -- Check if both members have completed the quiz
    SELECT COUNT(*) = 2 INTO both_completed
    FROM constellation_members cm
    JOIN profiles p ON cm.user_id = p.id
    WHERE cm.constellation_id = constellation_id
    AND p.star_type IS NOT NULL;
    
    -- Only show home screen if both members have completed the quiz
    RETURN both_completed;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in should_show_home_screen: %', SQLERRM;
        RETURN FALSE;
END;
$$;

-- Function to update bonding strength based on interactions
CREATE OR REPLACE FUNCTION update_bonding_strength(constellation_id UUID, increase_amount INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id UUID := auth.uid();
    current_strength INTEGER;
    new_strength INTEGER;
BEGIN
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'No authenticated user found';
    END IF;

    -- Check if user is a member of the constellation
    IF NOT EXISTS (
        SELECT 1 FROM constellation_members cm
        WHERE cm.user_id = current_user_id
        AND cm.constellation_id = update_bonding_strength.constellation_id
    ) THEN
        RAISE EXCEPTION 'User is not a member of this constellation';
    END IF;

    -- Get current bonding strength
    SELECT bonding_strength INTO current_strength
    FROM constellations
    WHERE id = update_bonding_strength.constellation_id;
    
    IF current_strength IS NULL THEN
        RAISE EXCEPTION 'Constellation not found';
    END IF;
    
    -- Calculate new strength (capped at 100)
    new_strength := LEAST(100, current_strength + increase_amount);
    
    -- Update the constellation
    UPDATE constellations
    SET bonding_strength = new_strength
    WHERE id = update_bonding_strength.constellation_id;
    
    RETURN new_strength;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in update_bonding_strength: %', SQLERRM;
        RETURN -1;
END;
$$;

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE constellations ENABLE ROW LEVEL SECURITY;
ALTER TABLE constellation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_progress ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their constellation partners' profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- Allow users to view their own profile
CREATE POLICY "Users can view their own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- Allow users to view profiles of constellation partners
CREATE POLICY "Users can view their constellation partners' profiles"
ON profiles FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM constellation_members AS cm1
        WHERE cm1.user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM constellation_members AS cm2
            WHERE cm2.constellation_id = cm1.constellation_id
            AND cm2.user_id = profiles.id
        )
    )
);

-- Allow users to insert their own profile
CREATE POLICY "Users can insert their own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Fix the System can insert any profile policy
DROP POLICY IF EXISTS "System can insert any profile" ON profiles;

-- Create a more permissive policy for system functions
CREATE POLICY "System can insert any profile"
ON profiles FOR INSERT
WITH CHECK (true);

-- Make sure the handle_new_user function has the right permissions
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert a new profile with all required fields
    INSERT INTO profiles (
        id, 
        name, 
        about, 
        interests, 
        star_name, 
        star_type, 
        photo_url, 
        created_at, 
        updated_at
    )
    VALUES (
        NEW.id, 
        COALESCE(NEW.raw_user_meta_data->>'name', 'User'), 
        '', 
        '{}', 
        '', 
        NULL, 
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''), 
        NOW(), 
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    
    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        -- If the profile already exists, just return the NEW record
        RETURN NEW;
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in handle_new_user: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Constellations policies
CREATE POLICY "Users can view their own constellations"
ON constellations FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM constellation_members cm
        WHERE cm.user_id = auth.uid()
        AND cm.constellation_id = constellations.id
    )
);

CREATE POLICY "Users can create constellations"
ON constellations FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their own constellations"
ON constellations FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM constellation_members cm
        WHERE cm.user_id = auth.uid()
        AND cm.constellation_id = constellations.id
    )
);

-- Constellation members policies
CREATE POLICY "Users can view their own memberships"
ON constellation_members FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can view constellation partners"
ON constellation_members FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM constellation_members AS cm
        WHERE cm.user_id = auth.uid()
        AND cm.constellation_id = constellation_members.constellation_id
        AND constellation_members.user_id != auth.uid()
    )
);

CREATE POLICY "Users can join constellations"
ON constellation_members FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Messages policies
CREATE POLICY "Users can view messages in their constellations"
ON messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM constellation_members cm
        WHERE cm.user_id = auth.uid()
        AND cm.constellation_id = messages.constellation_id
    )
);

CREATE POLICY "Users can send messages to their constellations"
ON messages FOR INSERT
WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
        SELECT 1 FROM constellation_members cm
        WHERE cm.user_id = auth.uid()
        AND cm.constellation_id = messages.constellation_id
    )
);

-- Quiz results policies
CREATE POLICY "Users can view quiz results in their constellations"
ON quiz_results FOR SELECT
USING (
    user_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM constellation_members cm
        WHERE cm.user_id = auth.uid()
        AND cm.constellation_id = quiz_results.constellation_id
    )
);

CREATE POLICY "Users can create their own quiz results"
ON quiz_results FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Quiz progress policies
CREATE POLICY "Users can view quiz progress in their constellations"
ON quiz_progress FOR SELECT
USING (
    user_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM constellation_members cm
        WHERE cm.user_id = auth.uid()
        AND cm.constellation_id = quiz_progress.constellation_id
    )
);

CREATE POLICY "Users can create their own quiz progress"
ON quiz_progress FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own quiz progress"
ON quiz_progress FOR UPDATE
USING (user_id = auth.uid());

-- Enable realtime for the tables that need it
BEGIN;
  -- Drop the publication if it exists
  DROP PUBLICATION IF EXISTS supabase_realtime;
  
  -- Create a new publication for all tables
  CREATE PUBLICATION supabase_realtime FOR TABLE 
    messages, 
    quiz_progress, 
    constellations, 
    constellation_members;
COMMIT;

-- Create a storage bucket for profile photos if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'profile_photos') THEN
        INSERT INTO storage.buckets (id, name, public) 
        VALUES ('profile_photos', 'profile_photos', true);
    END IF;
END
$$;

-- Create a policy to allow users to upload their own profile photos
CREATE POLICY "Users can upload their own profile photos"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'profile_photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Create a policy to allow users to update their own profile photos
CREATE POLICY "Users can update their own profile photos"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'profile_photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Create a policy to allow users to read profile photos
CREATE POLICY "Anyone can view profile photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile_photos');

-- Create an RPC function to create user profiles
CREATE OR REPLACE FUNCTION create_user_profile(user_id UUID, user_name TEXT, user_photo TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO profiles (
        id, 
        name, 
        about, 
        interests, 
        star_name, 
        star_type, 
        photo_url, 
        created_at, 
        updated_at
    )
    VALUES (
        user_id, 
        COALESCE(user_name, 'User'), 
        '', 
        '{}', 
        '', 
        NULL, 
        COALESCE(user_photo, ''), 
        NOW(), 
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in create_user_profile: %', SQLERRM;
END;
$$; 