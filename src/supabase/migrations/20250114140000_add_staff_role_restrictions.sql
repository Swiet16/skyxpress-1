-- =====================================================
-- ADD STAFF ROLE WITH RESTRICTED DATA ACCESS
-- =====================================================

-- 1. Add role column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' 
CHECK (role IN ('user', 'staff', 'admin'));

-- 2. Migrate existing is_admin users to admin role
UPDATE public.profiles 
SET role = 'admin' 
WHERE is_admin = true;

-- 3. Create helper function to check if user is staff or admin
CREATE OR REPLACE FUNCTION public.is_staff_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('staff', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create helper function to check if user is admin only
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- UPDATE RLS POLICIES FOR PARCELS TABLE
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own parcels" ON public.parcels;
DROP POLICY IF EXISTS "Users can create their own parcels" ON public.parcels;
DROP POLICY IF EXISTS "Users can update their own parcels" ON public.parcels;
DROP POLICY IF EXISTS "Admins can manage all parcels" ON public.parcels;

-- Create new policies with staff restrictions
CREATE POLICY "parcels_select_policy" ON public.parcels
  FOR SELECT USING (
    -- User can see their own parcels
    auth.uid() = created_by 
    OR
    -- Admin can see ALL parcels
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
    OR
    -- Staff can ONLY see their own created parcels
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'staff'
      AND auth.uid() = public.parcels.created_by
    )
  );

CREATE POLICY "parcels_insert_policy" ON public.parcels
  FOR INSERT WITH CHECK (
    -- Users, staff, and admins can create parcels
    auth.uid() = created_by
  );

CREATE POLICY "parcels_update_policy" ON public.parcels
  FOR UPDATE USING (
    -- User can update their own
    auth.uid() = created_by 
    OR
    -- Admin can update ALL
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
    OR
    -- Staff can update ONLY their own
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'staff'
      AND auth.uid() = public.parcels.created_by
    )
  );

CREATE POLICY "parcels_delete_policy" ON public.parcels
  FOR DELETE USING (
    -- Only admin can delete
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- UPDATE RLS POLICIES FOR QUOTES TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can create quotes" ON public.quotes;
DROP POLICY IF EXISTS "Admins can view all quotes" ON public.quotes;

CREATE POLICY "quotes_select_policy" ON public.quotes
  FOR SELECT USING (
    -- User can see their own
    auth.uid() = user_id 
    OR user_id IS NULL
    OR
    -- Admin can see ALL
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
    OR
    -- Staff can ONLY see their own
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'staff'
      AND auth.uid() = public.quotes.user_id
    )
  );

CREATE POLICY "quotes_insert_policy" ON public.quotes
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR user_id IS NULL
  );

CREATE POLICY "quotes_update_policy" ON public.quotes
  FOR UPDATE USING (
    -- User can update their own
    auth.uid() = user_id 
    OR
    -- Admin can update ALL
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
    OR
    -- Staff can update ONLY their own
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'staff'
      AND auth.uid() = public.quotes.user_id
    )
  );

-- =====================================================
-- UPDATE RLS POLICIES FOR SHIPMENTS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Shipments trackable by tracking number" ON public.shipments;
DROP POLICY IF EXISTS "Users can view their own shipments" ON public.shipments;
DROP POLICY IF EXISTS "Admins can manage all shipments" ON public.shipments;

CREATE POLICY "shipments_select_policy" ON public.shipments
  FOR SELECT USING (
    -- Anyone can track by tracking number (public tracking)
    true
  );

CREATE POLICY "shipments_insert_policy" ON public.shipments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR user_id IS NULL
  );

CREATE POLICY "shipments_update_policy" ON public.shipments
  FOR UPDATE USING (
    -- User can update their own
    auth.uid() = user_id 
    OR
    -- Admin can update ALL
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
    OR
    -- Staff can update ONLY their own
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'staff'
      AND auth.uid() = public.shipments.user_id
    )
  );

CREATE POLICY "shipments_delete_policy" ON public.shipments
  FOR DELETE USING (
    -- Only admin can delete
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- ADD CREATED_BY TRACKING FOR APPROVAL ACTIONS
-- =====================================================

-- Add approved_by_role column to track who approved (for audit purposes)
ALTER TABLE public.parcels 
ADD COLUMN IF NOT EXISTS approved_by_role VARCHAR(20);

-- Create function to track approver role
CREATE OR REPLACE FUNCTION public.track_approval_role()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.approved_by IS NOT NULL AND NEW.approved_by != OLD.approved_by THEN
    SELECT role INTO NEW.approved_by_role 
    FROM public.profiles 
    WHERE user_id = NEW.approved_by;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for approval tracking
DROP TRIGGER IF EXISTS track_parcel_approval_role ON public.parcels;
CREATE TRIGGER track_parcel_approval_role
  BEFORE UPDATE ON public.parcels
  FOR EACH ROW
  EXECUTE FUNCTION public.track_approval_role();

-- =====================================================
-- CREATE ADMIN DASHBOARD VIEW (ADMIN ONLY)
-- =====================================================

-- View for admins to see all data with creator info
CREATE OR REPLACE VIEW public.admin_parcels_view AS
SELECT 
  p.*,
  creator.role as creator_role,
  creator.full_name as creator_name,
  approver.role as approver_role,
  approver.full_name as approver_name
FROM public.parcels p
LEFT JOIN public.profiles creator ON p.created_by = creator.user_id
LEFT JOIN public.profiles approver ON p.approved_by = approver.user_id;

-- Grant access to admin view
GRANT SELECT ON public.admin_parcels_view TO authenticated;

-- RLS for admin view
ALTER VIEW public.admin_parcels_view SET (security_invoker = true);

-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_parcels_created_by_role ON public.parcels(created_by, request_status);
CREATE INDEX IF NOT EXISTS idx_quotes_user_role ON public.quotes(user_id, status);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;