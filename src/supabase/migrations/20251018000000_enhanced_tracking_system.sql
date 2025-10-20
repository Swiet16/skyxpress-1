-- Enhanced Tracking System with More Status Options and Admin Comments
-- Migration created: 2025-10-18

-- 1. Add admin_comment column to parcels table for status updates
ALTER TABLE public.parcels 
ADD COLUMN IF NOT EXISTS admin_comment TEXT;

-- 2. Add location tracking column (if not exists)
ALTER TABLE public.parcels 
ADD COLUMN IF NOT EXISTS current_location TEXT;

-- 3. Add status_updated_at for tracking when status was last updated
ALTER TABLE public.parcels 
ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMP WITH TIME ZONE;

-- 4. Update the status_timeline structure to include more details
-- The status_timeline JSONB already exists, we'll enhance it to store:
-- { status, timestamp, location, admin_comment, updated_by, editable_datetime }

-- 5. Create function to update parcel status with enhanced tracking
CREATE OR REPLACE FUNCTION public.update_parcel_status_enhanced(
  parcel_id_param UUID,
  new_status TEXT,
  location_param TEXT DEFAULT '',
  comment_param TEXT DEFAULT '',
  custom_datetime TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Get current user
  admin_user_id := auth.uid();
  
  -- Check if user is admin or staff
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = admin_user_id 
    AND role IN ('admin', 'staff', 'owner')
  ) THEN
    RETURN FALSE;
  END IF;

  -- Update parcel with new status and timeline
  UPDATE public.parcels
  SET 
    current_status = new_status,
    shipping_status = new_status,
    current_location = location_param,
    admin_comment = comment_param,
    status_updated_at = custom_datetime,
    status_timeline = COALESCE(status_timeline, '[]'::jsonb) || 
      jsonb_build_object(
        'status', new_status,
        'timestamp', custom_datetime,
        'location', location_param,
        'admin_comment', comment_param,
        'updated_by', admin_user_id
      )::jsonb,
    updated_at = NOW()
  WHERE id = parcel_id_param;

  RETURN FOUND;
END;
$$;

-- 6. Add index for better performance on status queries
CREATE INDEX IF NOT EXISTS idx_parcels_current_status ON public.parcels(current_status);
CREATE INDEX IF NOT EXISTS idx_parcels_status_updated_at ON public.parcels(status_updated_at DESC);

-- 7. Create view for tracking with all details (descending order)
CREATE OR REPLACE VIEW public.parcel_tracking_view AS
SELECT 
  p.id,
  p.tracking_id,
  p.reference_id,
  p.current_status,
  p.shipping_status,
  p.current_location,
  p.admin_comment,
  p.status_updated_at,
  p.from_country,
  p.to_country,
  p.sender_name,
  p.receiver_name,
  p.status_timeline,
  p.created_at,
  p.updated_at,
  -- Extract latest status update from timeline
  (
    SELECT jsonb_array_elements
    FROM jsonb_array_elements(p.status_timeline)
    ORDER BY (jsonb_array_elements->>'timestamp')::timestamp DESC
    LIMIT 1
  ) as latest_status_event
FROM public.parcels p
ORDER BY p.status_updated_at DESC NULLS LAST, p.updated_at DESC;

-- 8. Grant appropriate permissions
GRANT SELECT ON public.parcel_tracking_view TO authenticated;
GRANT SELECT ON public.parcel_tracking_view TO anon;

-- 9. Add comment to document the new status options available
COMMENT ON COLUMN public.parcels.current_status IS 
'Status options: created, picked_up, in_transit, customs, custom_hold, flight_departure, flight_arrived, flight_offload, in_custom_clearance, arrived_hub, out_for_delivery, delivered, cancelled';

COMMENT ON COLUMN public.parcels.admin_comment IS 
'Admin comment for current status update. Stores the most recent comment.';

-- 10. Update RLS policies for the new view
CREATE POLICY "Public can view tracking view" ON public.parcel_tracking_view
  FOR SELECT USING (true);

-- Migration completed successfully