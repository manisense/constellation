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
    INSERT INTO constellation_members (constellation_id, user_id, status)
    VALUES (new_constellation_id, current_user_id, 'ready');
    
    -- Assign Luminary star type to the creator
    UPDATE profiles
    SET star_type = 'luminary',
        star_name = 'Luminary ' || SUBSTRING(name FROM 1 FOR 1)
    WHERE id = current_user_id;
    
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
        star_name = 'Navigator ' || SUBSTRING(name FROM 1 FOR 1)
    WHERE id = current_user_id;
    
    -- Update the constellation status to complete
    UPDATE constellation_members
    SET status = 'ready'
    WHERE constellation_id = found_constellation_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Successfully joined constellation',
        'constellation_id', found_constellation_id::text,
        'status', 'complete'
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', SQLERRM
        );
END;
$$;

-- Update get_user_constellation_status function to skip quiz check
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
    user_status text;
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
        RETURN jsonb_build_object(
            'status', 'no_profile',
            'message', 'User profile not found'
        );
    END IF;

    -- Check if user is in a constellation
    IF NOT EXISTS (SELECT 1 FROM constellation_members WHERE user_id = current_user_id) THEN
        RETURN jsonb_build_object(
            'status', 'no_constellation',
            'message', 'User is not in any constellation'
        );
    END IF;

    -- Get user's constellation data
    SELECT 
        jsonb_build_object(
            'id', c.id,
            'name', c.name,
            'invite_code', c.invite_code,
            'bonding_strength', c.bonding_strength,
            'created_at', c.created_at
        ) INTO constellation_data
    FROM constellation_members cm
    JOIN constellations c ON cm.constellation_id = c.id
    WHERE cm.user_id = current_user_id;

    -- Count members in the constellation
    SELECT COUNT(*) INTO member_count
    FROM constellation_members cm2
    JOIN constellation_members cm1 ON cm1.constellation_id = cm2.constellation_id
    WHERE cm1.user_id = current_user_id;

    -- If only one member, user is waiting for partner
    IF member_count = 1 THEN
        RETURN jsonb_build_object(
            'status', 'waiting_for_partner',
            'message', 'Waiting for partner to join',
            'constellation', constellation_data
        );
    END IF;

    -- Skip quiz check - if we have 2 members, constellation is complete
    RETURN jsonb_build_object(
        'status', 'complete',
        'message', 'Constellation is complete',
        'constellation', constellation_data
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'status', 'error',
            'message', SQLERRM
        );
END;
$$; 