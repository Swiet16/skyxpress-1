-- =====================================================
-- FIX STAFF PERMISSIONS - PROFILES TABLE RLS
-- =====================================================

-- Enable RLS on profiles table if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing profiles policies if any
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- CREATE NEW PROFILES POLICIES
-- 1. SELECT: Users see their own profile, Admins see ALL, Staff see ONLY their own
CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT USING (
    -- User can see their own profile
    auth.uid() = user_id
    OR
    -- Admin can see ALL profiles
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() 
      AND p.role = 'admin'
    )
  );

-- 2. INSERT: Only allow system to create profiles (via trigger on signup)
CREATE POLICY "profiles_insert_policy" ON public.profiles
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
  );

-- 3. UPDATE: Users can update own profile, ONLY ADMINS can change roles
CREATE POLICY "profiles_update_policy" ON public.profiles
  FOR UPDATE USING (
    -- Admin can update ANY profile
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() 
      AND p.role = 'admin'
    )
    OR
    -- Users/Staff can update ONLY their own profile (except role field)
    (
      auth.uid() = user_id
      AND (
        -- Prevent non-admins from changing their own role
        NEW.role = OLD.role OR NEW.role IS NULL
      )
    )
  );

-- 4. DELETE: Only admins can delete profiles
CREATE POLICY "profiles_delete_policy" ON public.profiles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() 
      AND p.role = 'admin'
    )
  );

-- =====================================================
-- FIX PARCELS RLS - ENSURE STAFF ONLY SEE THEIR OWN
-- =====================================================

-- Drop and recreate parcels select policy with clearer logic
DROP POLICY IF EXISTS "parcels_select_policy" ON public.parcels;

CREATE POLICY "parcels_select_policy" ON public.parcels
  FOR SELECT USING (
    -- Admin can see ALL parcels
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() 
      AND p.role = 'admin'
    )
    OR
    -- Users and Staff can ONLY see parcels they created
    (
      auth.uid() = created_by
      AND (
        NOT EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.user_id = auth.uid() 
          AND p.role = 'admin'
        )
      )
    )
  );

-- =====================================================
-- FIX QUOTES RLS - ENSURE STAFF ONLY SEE THEIR OWN
-- =====================================================

DROP POLICY IF EXISTS "quotes_select_policy" ON public.quotes;

CREATE POLICY "quotes_select_policy" ON public.quotes
  FOR SELECT USING (
    -- Admin can see ALL quotes
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() 
      AND p.role = 'admin'
    )
    OR
    -- Users and Staff can ONLY see their own quotes
    (
      (auth.uid() = user_id OR user_id IS NULL)
      AND (
        NOT EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.user_id = auth.uid() 
          AND p.role = 'admin'
        )
      )
    )
  );

-- =====================================================
-- PREVENT STAFF FROM BLOCKING THEMSELVES OR CHANGING OWN ROLE
-- =====================================================

-- Create function to prevent self-blocking and self-role-change
CREATE OR REPLACE FUNCTION public.prevent_self_modification()
RETURNS TRIGGER AS $$
DECLARE
  current_user_role VARCHAR(20);
BEGIN
  -- Get current user's role
  SELECT role INTO current_user_role 
  FROM public.profiles 
  WHERE user_id = auth.uid();
  
  -- If user is staff and trying to modify themselves
  IF current_user_role = 'staff' AND NEW.user_id = auth.uid() THEN
    -- Staff cannot change their own role
    IF NEW.role != OLD.role THEN
      RAISE EXCEPTION 'Staff members cannot change their own role';
    END IF;
    
    -- Staff cannot block themselves
    IF NEW.status != OLD.status THEN
      RAISE EXCEPTION 'Staff members cannot change their own status';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for self-modification prevention
DROP TRIGGER IF EXISTS prevent_staff_self_modification ON public.profiles;
CREATE TRIGGER prevent_staff_self_modification
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_modification();

-- =====================================================
-- ADD AUDIT LOG FOR ROLE CHANGES
-- =====================================================

-- Create audit log table for role changes
CREATE TABLE IF NOT EXISTS public.role_change_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  changed_user_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  changed_by_user_id UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  old_role VARCHAR(20),
  new_role VARCHAR(20),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reason TEXT
);

-- Enable RLS on audit log
ALTER TABLE public.role_change_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "audit_select_policy" ON public.role_change_audit
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() 
      AND p.role = 'admin'
    )
  );

-- Create function to log role changes
CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role != OLD.role THEN
    INSERT INTO public.role_change_audit (
      changed_user_id,
      changed_by_user_id,
      old_role,
      new_role
    ) VALUES (
      NEW.user_id,
      auth.uid(),
      OLD.role,
      NEW.role
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for role change logging
DROP TRIGGER IF EXISTS log_profile_role_change ON public.profiles;
CREATE TRIGGER log_profile_role_change
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION public.log_role_change();

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT ALL ON public.role_change_audit TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;