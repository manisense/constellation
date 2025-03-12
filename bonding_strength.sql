-- Implement bonding strength increase with activity
-- This script adds functions to increase bonding strength when users interact

-- Add bonding_strength column to constellations table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'constellations' 
    AND column_name = 'bonding_strength'
  ) THEN
    ALTER TABLE constellations ADD COLUMN bonding_strength INTEGER DEFAULT 0;
  END IF;
END
$$;

-- Function to increase bonding strength when a message is sent
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

-- Create trigger for message bonding strength increase
DROP TRIGGER IF EXISTS message_bonding_strength_trigger ON messages;
CREATE TRIGGER message_bonding_strength_trigger
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION increase_bonding_strength_on_message();

-- Function to manually increase bonding strength
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

-- Function to get constellation bonding strength
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

-- Initialize bonding strength for existing constellations
UPDATE constellations
SET bonding_strength = 
  CASE 
    WHEN (
      SELECT COUNT(*) FROM messages 
      WHERE constellation_id = constellations.id
    ) > 50 THEN 50
    ELSE (
      SELECT COUNT(*) FROM messages 
      WHERE constellation_id = constellations.id
    )
  END
WHERE bonding_strength = 0 OR bonding_strength IS NULL; 