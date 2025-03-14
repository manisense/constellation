-- SQL Script to add new features (DatePlans and Memories) to Constellation app
-- This script adds the necessary tables, functions, and storage buckets for the new features

-- Check if the date_plans table exists and create it if it doesn't
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'date_plans') THEN
        CREATE TABLE public.date_plans (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            title TEXT NOT NULL,
            description TEXT,
            date TEXT NOT NULL,
            location TEXT,
            status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'completed', 'cancelled')),
            created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            constellation_id UUID NOT NULL REFERENCES public.constellations(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Add RLS policies for date_plans
        ALTER TABLE public.date_plans ENABLE ROW LEVEL SECURITY;

        -- Policy to allow users to select their own date plans
        CREATE POLICY "Users can view date plans for their constellation" 
        ON public.date_plans 
        FOR SELECT 
        USING (
            auth.uid() IN (
                SELECT user_id FROM public.constellation_members 
                WHERE constellation_id = date_plans.constellation_id
            )
        );

        -- Policy to allow users to insert date plans for their constellation
        CREATE POLICY "Users can insert date plans for their constellation" 
        ON public.date_plans 
        FOR INSERT 
        WITH CHECK (
            auth.uid() IN (
                SELECT user_id FROM public.constellation_members 
                WHERE constellation_id = date_plans.constellation_id
            )
        );

        -- Policy to allow users to update date plans for their constellation
        CREATE POLICY "Users can update date plans for their constellation" 
        ON public.date_plans 
        FOR UPDATE 
        USING (
            auth.uid() IN (
                SELECT user_id FROM public.constellation_members 
                WHERE constellation_id = date_plans.constellation_id
            )
        );

        -- Policy to allow users to delete date plans they created
        CREATE POLICY "Users can delete date plans they created" 
        ON public.date_plans 
        FOR DELETE 
        USING (
            auth.uid() = created_by
        );
    END IF;
END
$$;

-- Check if the memories table exists and create it if it doesn't
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'memories') THEN
        CREATE TABLE public.memories (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            title TEXT NOT NULL,
            description TEXT,
            date TEXT NOT NULL,
            image_url TEXT,
            created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            constellation_id UUID NOT NULL REFERENCES public.constellations(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Add RLS policies for memories
        ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;

        -- Policy to allow users to select memories for their constellation
        CREATE POLICY "Users can view memories for their constellation" 
        ON public.memories 
        FOR SELECT 
        USING (
            auth.uid() IN (
                SELECT user_id FROM public.constellation_members 
                WHERE constellation_id = memories.constellation_id
            )
        );

        -- Policy to allow users to insert memories for their constellation
        CREATE POLICY "Users can insert memories for their constellation" 
        ON public.memories 
        FOR INSERT 
        WITH CHECK (
            auth.uid() IN (
                SELECT user_id FROM public.constellation_members 
                WHERE constellation_id = memories.constellation_id
            )
        );

        -- Policy to allow users to update memories they created
        CREATE POLICY "Users can update memories they created" 
        ON public.memories 
        FOR UPDATE 
        USING (
            auth.uid() = created_by
        );

        -- Policy to allow users to delete memories they created
        CREATE POLICY "Users can delete memories they created" 
        ON public.memories 
        FOR DELETE 
        USING (
            auth.uid() = created_by
        );
    END IF;
END
$$;

-- Create or replace function to get date plans for a constellation
CREATE OR REPLACE FUNCTION public.get_date_plans(constellation_id_param UUID)
RETURNS SETOF public.date_plans
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_in_constellation BOOLEAN;
BEGIN
    -- Check if the authenticated user is a member of the constellation
    SELECT EXISTS (
        SELECT 1 FROM public.constellation_members
        WHERE user_id = auth.uid() AND constellation_id = constellation_id_param
    ) INTO user_in_constellation;
    
    IF NOT user_in_constellation THEN
        RAISE EXCEPTION 'User is not a member of this constellation';
    END IF;
    
    RETURN QUERY
    SELECT * FROM public.date_plans
    WHERE constellation_id = constellation_id_param
    ORDER BY date DESC, created_at DESC;
END;
$$;

-- Create or replace function to add a date plan
CREATE OR REPLACE FUNCTION public.add_date_plan(
    title_param TEXT,
    description_param TEXT,
    date_param TEXT,
    location_param TEXT,
    constellation_id_param UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_in_constellation BOOLEAN;
    new_plan_id UUID;
BEGIN
    -- Check if the authenticated user is a member of the constellation
    SELECT EXISTS (
        SELECT 1 FROM public.constellation_members
        WHERE user_id = auth.uid() AND constellation_id = constellation_id_param
    ) INTO user_in_constellation;
    
    IF NOT user_in_constellation THEN
        RAISE EXCEPTION 'User is not a member of this constellation';
    END IF;
    
    -- Insert the new date plan
    INSERT INTO public.date_plans (
        title,
        description,
        date,
        location,
        created_by,
        constellation_id
    ) VALUES (
        title_param,
        description_param,
        date_param,
        location_param,
        auth.uid(),
        constellation_id_param
    )
    RETURNING id INTO new_plan_id;
    
    -- Increase bonding strength
    PERFORM increase_bonding_strength(constellation_id_param);
    
    RETURN new_plan_id;
END;
$$;

-- Create or replace function to update a date plan status
CREATE OR REPLACE FUNCTION public.update_date_plan_status(
    plan_id_param UUID,
    status_param TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    plan_constellation_id UUID;
    user_in_constellation BOOLEAN;
BEGIN
    -- Get the constellation ID for this plan
    SELECT constellation_id INTO plan_constellation_id
    FROM public.date_plans
    WHERE id = plan_id_param;
    
    IF plan_constellation_id IS NULL THEN
        RAISE EXCEPTION 'Date plan not found';
    END IF;
    
    -- Check if the authenticated user is a member of the constellation
    SELECT EXISTS (
        SELECT 1 FROM public.constellation_members
        WHERE user_id = auth.uid() AND constellation_id = plan_constellation_id
    ) INTO user_in_constellation;
    
    IF NOT user_in_constellation THEN
        RAISE EXCEPTION 'User is not a member of this constellation';
    END IF;
    
    -- Update the date plan status
    UPDATE public.date_plans
    SET status = status_param
    WHERE id = plan_id_param;
    
    -- If marking as completed, increase bonding strength
    IF status_param = 'completed' THEN
        PERFORM increase_bonding_strength(plan_constellation_id);
    END IF;
    
    RETURN TRUE;
END;
$$;

-- Create or replace function to get memories for a constellation
CREATE OR REPLACE FUNCTION public.get_memories(constellation_id_param UUID)
RETURNS SETOF public.memories
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_in_constellation BOOLEAN;
BEGIN
    -- Check if the authenticated user is a member of the constellation
    SELECT EXISTS (
        SELECT 1 FROM public.constellation_members
        WHERE user_id = auth.uid() AND constellation_id = constellation_id_param
    ) INTO user_in_constellation;
    
    IF NOT user_in_constellation THEN
        RAISE EXCEPTION 'User is not a member of this constellation';
    END IF;
    
    RETURN QUERY
    SELECT * FROM public.memories
    WHERE constellation_id = constellation_id_param
    ORDER BY date DESC, created_at DESC;
END;
$$;

-- Create or replace function to add a memory
CREATE OR REPLACE FUNCTION public.add_memory(
    title_param TEXT,
    description_param TEXT,
    date_param TEXT,
    image_url_param TEXT,
    constellation_id_param UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_in_constellation BOOLEAN;
    new_memory_id UUID;
BEGIN
    -- Check if the authenticated user is a member of the constellation
    SELECT EXISTS (
        SELECT 1 FROM public.constellation_members
        WHERE user_id = auth.uid() AND constellation_id = constellation_id_param
    ) INTO user_in_constellation;
    
    IF NOT user_in_constellation THEN
        RAISE EXCEPTION 'User is not a member of this constellation';
    END IF;
    
    -- Insert the new memory
    INSERT INTO public.memories (
        title,
        description,
        date,
        image_url,
        created_by,
        constellation_id
    ) VALUES (
        title_param,
        description_param,
        date_param,
        image_url_param,
        auth.uid(),
        constellation_id_param
    )
    RETURNING id INTO new_memory_id;
    
    -- Increase bonding strength
    PERFORM increase_bonding_strength(constellation_id_param);
    
    RETURN new_memory_id;
END;
$$;

-- Create storage bucket for memories if it doesn't exist
DO $$
DECLARE
    bucket_exists BOOLEAN;
BEGIN
    -- Check if the bucket exists
    SELECT EXISTS (
        SELECT 1 FROM storage.buckets WHERE name = 'memories'
    ) INTO bucket_exists;
    
    IF NOT bucket_exists THEN
        -- Create the bucket
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('memories', 'memories', false);
        
        -- Create policy to allow authenticated users to view images from their constellation
        CREATE POLICY "Users can view memory images from their constellation"
        ON storage.objects
        FOR SELECT
        TO authenticated
        USING (
            bucket_id = 'memories' AND
            (storage.foldername(name))[1] IN (
                SELECT constellation_id::text FROM public.constellation_members
                WHERE user_id = auth.uid()
            )
        );
        
        -- Create policy to allow authenticated users to upload images to their constellation
        CREATE POLICY "Users can upload memory images to their constellation"
        ON storage.objects
        FOR INSERT
        TO authenticated
        WITH CHECK (
            bucket_id = 'memories' AND
            (storage.foldername(name))[1] IN (
                SELECT constellation_id::text FROM public.constellation_members
                WHERE user_id = auth.uid()
            )
        );
    END IF;
END
$$; 