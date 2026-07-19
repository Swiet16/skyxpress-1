-- Add request_status to parcels table
ALTER TABLE public.parcels 
ADD COLUMN IF NOT EXISTS request_status TEXT DEFAULT 'pending' CHECK (request_status IN ('pending', 'approved', 'rejected'));

-- Add approved_at timestamp
ALTER TABLE public.parcels 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Add approved_by to track which admin approved
ALTER TABLE public.parcels 
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);

-- Add rejection_reason for rejected requests
ALTER TABLE public.parcels 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add shipping_status for detailed tracking after approval
ALTER TABLE public.parcels 
ADD COLUMN IF NOT EXISTS shipping_status TEXT DEFAULT 'processing' CHECK (shipping_status IN ('processing', 'picked_up', 'in_transit', 'customs', 'out_for_delivery', 'delivered'));

-- Add payment invoice details
ALTER TABLE public.parcels 
ADD COLUMN IF NOT EXISTS payment_invoice_url TEXT;

ALTER TABLE public.parcels 
ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10,2);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_parcels_request_status ON public.parcels(request_status);
CREATE INDEX IF NOT EXISTS idx_parcels_approved_at ON public.parcels(approved_at DESC);
CREATE INDEX IF NOT EXISTS idx_parcels_shipping_status ON public.parcels(shipping_status);

-- Update RLS policies to allow users to view their own requests
DROP POLICY IF EXISTS "Users can view their own parcels" ON public.parcels;
CREATE POLICY "Users can view their own parcels" ON public.parcels
  FOR SELECT USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = ANY(ARRAY['admin', 'staff', 'owner'])
    )
  );

-- Allow users to create parcel requests
DROP POLICY IF EXISTS "Users can create their own parcels" ON public.parcels;
CREATE POLICY "Users can create their own parcels" ON public.parcels
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Only admins can update parcel status
DROP POLICY IF EXISTS "Admins can update parcels" ON public.parcels;
CREATE POLICY "Admins can update parcels" ON public.parcels
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = ANY(ARRAY['admin', 'staff', 'owner'])
    )
  );

-- Function to approve parcel request
CREATE OR REPLACE FUNCTION public.approve_parcel_request(
  parcel_id_param UUID,
  admin_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = admin_user_id 
    AND role = ANY(ARRAY['admin', 'staff', 'owner'])
  ) THEN
    RETURN FALSE;
  END IF;

  -- Update parcel
  UPDATE public.parcels
  SET 
    request_status = 'approved',
    approved_at = NOW(),
    approved_by = admin_user_id,
    shipping_status = 'processing'
  WHERE id = parcel_id_param;

  RETURN FOUND;
END;
$$;

-- Function to reject parcel request
CREATE OR REPLACE FUNCTION public.reject_parcel_request(
  parcel_id_param UUID,
  admin_user_id UUID,
  reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = admin_user_id 
    AND role = ANY(ARRAY['admin', 'staff', 'owner'])
  ) THEN
    RETURN FALSE;
  END IF;

  -- Update parcel
  UPDATE public.parcels
  SET 
    request_status = 'rejected',
    approved_at = NOW(),
    approved_by = admin_user_id,
    rejection_reason = reason
  WHERE id = parcel_id_param;

  RETURN FOUND;
END;
$$;

-- Function to update shipping status
CREATE OR REPLACE FUNCTION public.update_shipping_status(
  parcel_id_param UUID,
  admin_user_id UUID,
  new_status TEXT,
  status_note TEXT DEFAULT ''
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = admin_user_id 
    AND role = ANY(ARRAY['admin', 'staff', 'owner'])
  ) THEN
    RETURN FALSE;
  END IF;

  -- Update parcel shipping status and add to timeline
  UPDATE public.parcels
  SET 
    shipping_status = new_status,
    current_status = new_status,
    status_timeline = COALESCE(status_timeline, '[]'::jsonb) || 
      jsonb_build_object(
        'status', new_status,
        'timestamp', NOW(),
        'note', status_note,
        'updated_by', admin_user_id
      )::jsonb
  WHERE id = parcel_id_param AND request_status = 'approved';

  RETURN FOUND;
END;
$$;