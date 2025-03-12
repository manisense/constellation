-- Fix star type assignment issues
-- This script ensures that constellation creators get Luminary star type and joiners get Navigator star type

-- First, let's check and fix any constellations where both users have the same star type
DO $$
DECLARE
    constellation_record RECORD;
    creator_id UUID;
    joiner_id UUID;
BEGIN
    -- Loop through all constellations
    FOR constellation_record IN 
        SELECT id, created_at FROM constellations
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
END
$$;

-- Update the create_new_constellation function to ensure it assigns Luminary star type
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

-- Update join_constellation_with_code function to ensure it assigns Navigator star type
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