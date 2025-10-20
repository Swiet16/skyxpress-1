-- Fix RLS policies and add SKYNET tracking system

-- Drop existing policies on quotes to recreate them properly
DROP POLICY IF EXISTS "Enable insert for anonymous and authenticated users" ON public.quotes;
DROP POLICY IF EXISTS "Users can view their own quotes or anonymous quotes" ON public.quotes;
DROP POLICY IF EXISTS "Admins can view all quotes" ON public.quotes;

-- Create proper RLS policies for quotes
CREATE POLICY "Allow anonymous and authenticated quote creation" 
ON public.quotes FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can view their own quotes or anonymous quotes" 
ON public.quotes FOR SELECT 
USING (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR 
  (user_id IS NULL) OR
  (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true))
);

CREATE POLICY "Admins can manage all quotes" 
ON public.quotes FOR ALL 
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true));

-- Update tracking number generation function for SKYNET format
CREATE OR REPLACE FUNCTION public.generate_skynet_tracking()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  next_number bigint;
  tracking_id text;
BEGIN
  -- Get the next sequential number (starting from 065600067)
  SELECT COALESCE(
    (SELECT MAX(CAST(SUBSTRING(tracking_number FROM 7) AS bigint)) + 1 
     FROM shipments 
     WHERE tracking_number ~ '^SKYNET[0-9]+$'),
    65600067
  ) INTO next_number;
  
  -- Format as SKYNET followed by 15-digit number
  tracking_id := 'SKYNET' || LPAD(next_number::text, 15, '0');
  
  RETURN tracking_id;
END;
$$;

-- Update shipments table tracking number default
ALTER TABLE public.shipments ALTER COLUMN tracking_number SET DEFAULT generate_skynet_tracking();

-- Update invoices tracking number default  
ALTER TABLE public.invoices ALTER COLUMN tracking_number SET DEFAULT generate_skynet_tracking();

-- Add status management for shipments with more detailed tracking
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS detailed_status jsonb DEFAULT '{"status": "processing", "location": "", "updated_by": null, "notes": ""}'::jsonb;

-- Create function to update shipment status (admin only)
CREATE OR REPLACE FUNCTION public.update_shipment_status(
  shipment_tracking text,
  new_status text,
  location text DEFAULT '',
  notes text DEFAULT ''
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Check if current user is admin
  SELECT user_id INTO admin_user_id 
  FROM profiles 
  WHERE user_id = auth.uid() AND is_admin = true;
  
  IF admin_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Update shipment status
  UPDATE public.shipments 
  SET 
    current_status = new_status,
    detailed_status = jsonb_build_object(
      'status', new_status,
      'location', location,
      'updated_by', admin_user_id,
      'updated_at', now(),
      'notes', notes
    ),
    events = COALESCE(events, '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'status', new_status,
        'location', location,
        'timestamp', now(),
        'updated_by', admin_user_id,
        'notes', notes
      )
    ),
    updated_at = now()
  WHERE tracking_number = shipment_tracking;
  
  RETURN FOUND;
END;
$$;

-- Add search function for public tracking
CREATE OR REPLACE FUNCTION public.search_tracking(tracking_id text)
RETURNS TABLE (
  tracking_number text,
  current_status text,
  origin text,
  destination text,
  service_type text,
  estimated_delivery date,
  events jsonb,
  detailed_status jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.tracking_number,
    s.current_status,
    s.origin,
    s.destination,
    s.service_type,
    s.estimated_delivery,
    s.events,
    s.detailed_status
  FROM public.shipments s
  WHERE s.tracking_number = tracking_id;
END;
$$;