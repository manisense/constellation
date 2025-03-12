-- Fix the profile functionality and avatar/photo handling

-- 1. Ensure the profiles table has the correct structure
DO $$
BEGIN
  -- Check if photo_url exists but avatar_url doesn't - we'll add it for consistency
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'photo_url'
  ) AND NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'avatar_url'
  ) THEN
    -- Add avatar_url column and copy data from photo_url for backward compatibility
    ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
    UPDATE public.profiles SET avatar_url = photo_url;
    RAISE NOTICE 'Added avatar_url column and copied data from photo_url';
  END IF;

  -- If profile table doesn't have 'about' column, add it (used as 'bio' in the app)
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'about'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN about TEXT;
    RAISE NOTICE 'Added about column to profiles table';
  END IF;

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

  -- Check and add interests column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'profiles' 
                AND column_name = 'interests') THEN
    ALTER TABLE public.profiles ADD COLUMN interests TEXT[];
    RAISE NOTICE 'Added interests column to profiles table';
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
END
$$;

-- 2. Create or replace function to update profile with avatar
CREATE OR REPLACE FUNCTION public.update_profile(
  name_param TEXT DEFAULT NULL,
  about_param TEXT DEFAULT NULL,
  interests_param JSONB DEFAULT NULL,
  star_name_param TEXT DEFAULT NULL,
  star_type_param TEXT DEFAULT NULL,
  avatar_url_param TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  existing_profile RECORD;
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User is not authenticated'
    );
  END IF;
  
  -- Get existing profile
  SELECT * INTO existing_profile FROM public.profiles
  WHERE id = auth.uid();
  
  -- If the profile doesn't exist, create it
  IF existing_profile IS NULL THEN
    INSERT INTO public.profiles (
      id,
      name,
      about,
      interests,
      star_name,
      star_type,
      photo_url,
      avatar_url,
      created_at,
      updated_at
    ) VALUES (
      auth.uid(),
      name_param,
      about_param,
      interests_param,
      star_name_param,
      star_type_param,
      avatar_url_param,
      avatar_url_param,
      NOW(),
      NOW()
    );
    
    RETURN json_build_object(
      'success', true,
      'message', 'Profile created successfully'
    );
  END IF;
  
  -- Update the profile with new values or keep existing ones
  UPDATE public.profiles
  SET 
    name = COALESCE(name_param, name),
    about = COALESCE(about_param, about),
    interests = COALESCE(interests_param, interests),
    star_name = COALESCE(star_name_param, star_name),
    star_type = COALESCE(star_type_param, star_type),
    photo_url = COALESCE(avatar_url_param, photo_url),
    avatar_url = COALESCE(avatar_url_param, avatar_url),
    updated_at = NOW()
  WHERE id = auth.uid();
  
  RETURN json_build_object(
    'success', true,
    'message', 'Profile updated successfully'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Set up RLS for the profiles table
DO $$
BEGIN
  -- Enable RLS
  ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
  
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users can view profiles in their constellation" ON public.profiles;
  
  -- Create policies
  CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);
  
  CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id);
  
  CREATE POLICY "Users can view profiles in their constellation" ON public.profiles
    FOR SELECT
    USING (
      id IN (
        SELECT cm.user_id
        FROM public.constellation_members cm
        WHERE cm.constellation_id IN (
          SELECT constellation_id
          FROM public.constellation_members
          WHERE user_id = auth.uid()
        )
      )
    );
  
  RAISE NOTICE 'Set up RLS policies for profiles table';
END
$$;

-- 4. Add profiles table to real-time publication if needed
DO $$
BEGIN
  -- Check if the publication exists
  IF EXISTS (
    SELECT FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    -- Add profiles table to the publication if it's not already included
    IF NOT EXISTS (
      SELECT FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND tablename = 'profiles'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
      RAISE NOTICE 'Added profiles table to supabase_realtime publication';
    ELSE
      RAISE NOTICE 'Profiles table already in supabase_realtime publication';
    END IF;
  ELSE
    -- Create the publication if it doesn't exist
    CREATE PUBLICATION supabase_realtime FOR TABLE public.profiles;
    RAISE NOTICE 'Created supabase_realtime publication for profiles table';
  END IF;
END
$$;

-- 5. Create function to get user profile
CREATE OR REPLACE FUNCTION public.get_profile()
RETURNS JSON AS $$
DECLARE
  profile_data RECORD;
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User is not authenticated'
    );
  END IF;
  
  -- Get profile data
  SELECT * INTO profile_data FROM public.profiles
  WHERE id = auth.uid();
  
  -- Check if profile was found
  IF profile_data IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Profile not found'
    );
  END IF;
  
  -- Return profile data
  RETURN json_build_object(
    'success', true,
    'profile', json_build_object(
      'id', profile_data.id,
      'name', profile_data.name,
      'about', profile_data.about,
      'interests', profile_data.interests,
      'star_name', profile_data.star_name,
      'star_type', profile_data.star_type,
      'avatar_url', COALESCE(profile_data.avatar_url, profile_data.photo_url),
      'photo_url', COALESCE(profile_data.photo_url, profile_data.avatar_url),
      'created_at', profile_data.created_at,
      'updated_at', profile_data.updated_at
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