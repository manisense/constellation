-- Update star_types.sql
-- This script updates the constellation functions to automatically assign star types
-- based on user roles (creator = Luminary, joiner = Navigator)

-- Update create_new_constellation function to assign Luminary star type to creator
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
    
    -- Log the update for debugging
    RAISE NOTICE 'Updated user % to Luminary star type', current_user_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Successfully created constellation',
        'constellation_id', new_constellation_id::text,
        'invite_code', invite_code,
        'star_type', 'luminary'
    );
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in create_new_constellation: %', SQLERRM;
        RETURN jsonb_build_object(
            'success', false,
            'message', SQLERRM
        );
END;
$$;

-- Update join_constellation_with_code function to assign Navigator star type to joiner
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
    
    -- Log the update for debugging
    RAISE NOTICE 'Updated user % to Navigator star type', current_user_id;
    
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
        RAISE NOTICE 'Error in join_constellation_with_code: %', SQLERRM;
        RETURN jsonb_build_object(
            'success', false,
            'message', SQLERRM
        );
END;
$$;

-- Update get_user_constellation_status function to include star_type and constellation info
CREATE OR REPLACE FUNCTION get_user_constellation_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id UUID := auth.uid();
    user_constellation_id UUID;
    user_status TEXT;
    user_star_type TEXT;
    other_user_id UUID;
    other_user_status TEXT;
    other_user_star_type TEXT;
    constellation_status TEXT := 'incomplete';
    constellation_data jsonb;
BEGIN
    IF current_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'status', 'no_user',
            'message', 'No authenticated user found'
        );
    END IF;

    -- Check if user has a profile
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = current_user_id) THEN
        RETURN jsonb_build_object(
            'status', 'no_profile',
            'message', 'User does not have a profile'
        );
    END IF;

    -- Get user's star type
    SELECT star_type INTO user_star_type
    FROM profiles
    WHERE id = current_user_id;

    -- Check if user is in a constellation
    SELECT cm.constellation_id, cm.status
    INTO user_constellation_id, user_status
    FROM constellation_members cm
    WHERE cm.user_id = current_user_id;

    IF user_constellation_id IS NULL THEN
        RETURN jsonb_build_object(
            'status', 'no_constellation',
            'message', 'User is not in a constellation',
            'star_type', user_star_type
        );
    END IF;
    
    -- Get constellation data
    SELECT jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'invite_code', c.invite_code,
        'created_at', c.created_at
    ) INTO constellation_data
    FROM constellations c
    WHERE c.id = user_constellation_id;

    -- Check if there's another user in the constellation
    SELECT cm.user_id, cm.status, p.star_type
    INTO other_user_id, other_user_status, other_user_star_type
    FROM constellation_members cm
    JOIN profiles p ON cm.user_id = p.id
    WHERE cm.constellation_id = user_constellation_id
    AND cm.user_id != current_user_id;

    -- Determine constellation status
    IF other_user_id IS NULL THEN
        constellation_status := 'waiting_for_partner';
        RETURN jsonb_build_object(
            'status', constellation_status,
            'user_status', user_status,
            'constellation_id', user_constellation_id::text,
            'star_type', user_star_type,
            'constellation', constellation_data
        );
    ELSIF user_status = 'ready' AND other_user_status = 'ready' THEN
        constellation_status := 'complete';
    ELSE
        constellation_status := 'incomplete';
    END IF;

    -- Return the status information
    RETURN jsonb_build_object(
        'status', constellation_status,
        'user_status', user_status,
        'other_user_status', other_user_status,
        'constellation_id', user_constellation_id::text,
        'star_type', user_star_type,
        'other_user_star_type', other_user_star_type,
        'constellation', constellation_data
    );
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in get_user_constellation_status: %', SQLERRM;
        RETURN jsonb_build_object(
            'status', 'error',
            'message', SQLERRM
        );
END;
$$;

-- INSTRUCTIONS FOR EXECUTION:
-- 1. Run this script in your Supabase SQL editor
-- 2. The script will update the following functions:
--    - create_new_constellation: Now assigns 'luminary' star type to the creator
--    - join_constellation_with_code: Now assigns 'navigator' star type to the joiner
--    - get_user_constellation_status: Now includes star type and constellation information in responses
--
-- SUMMARY OF CHANGES:
-- This script implements automatic star type assignment based on user roles:
-- - Constellation creators are assigned the 'luminary' star type
-- - Users who join via invite code are assigned the 'navigator' star type
-- - The get_user_constellation_status function now returns star type and constellation information
-- - The navigation flow has been updated to skip the quiz screen since star types are now auto-assigned
--
-- These changes eliminate the need for the quiz screen and ensure a smoother user experience
-- when creating and joining constellations. 