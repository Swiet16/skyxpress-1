-- Enhanced user profiles with role management
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'user' CHECK (role IN ('admin', 'staff', 'user'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_blocked boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- Create parcels table for comprehensive parcel management
CREATE TABLE IF NOT EXISTS public.parcels (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tracking_id text UNIQUE NOT NULL DEFAULT ('SKYEXPRESS' || LPAD(floor(random() * 1000000000)::text, 10, '0')),
  sender_name text NOT NULL,
  sender_phone text NOT NULL,
  sender_email text NOT NULL,
  sender_address text NOT NULL,
  receiver_name text NOT NULL,
  receiver_phone text NOT NULL,
  receiver_address text NOT NULL,
  parcel_type text NOT NULL DEFAULT 'box',
  weight numeric(10,2) NOT NULL CHECK (weight >= 0.01),
  length numeric(10,2) NOT NULL CHECK (length >= 1),
  width numeric(10,2) NOT NULL CHECK (width >= 1),
  height numeric(10,2) NOT NULL CHECK (height >= 1),
  declared_value numeric(12,2) DEFAULT 0,
  service_type text NOT NULL DEFAULT 'standard',
  from_country text NOT NULL,
  to_country text NOT NULL,
  special_instructions text,
  calculated_weight numeric(10,2), -- volumetric weight
  chargeable_weight numeric(10,2), -- max of actual and volumetric
  base_price numeric(12,2) NOT NULL DEFAULT 0,
  total_price numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  current_status text NOT NULL DEFAULT 'created',
  live_route boolean DEFAULT false,
  route_checkpoints jsonb DEFAULT '[]'::jsonb,
  status_timeline jsonb DEFAULT '[]'::jsonb,
  invoice_id uuid,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create tracking_config table for tracking ID management
CREATE TABLE IF NOT EXISTS public.tracking_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prefix text NOT NULL DEFAULT 'SKYEXPRESS',
  current_seed bigint NOT NULL DEFAULT 70000123,
  padding_length integer NOT NULL DEFAULT 10,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Insert default tracking config
INSERT INTO public.tracking_config (prefix, current_seed, padding_length) 
VALUES ('SKYEXPRESS', 70000123, 10)
ON CONFLICT DO NOTHING;

-- Create audit_logs table for change tracking
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name text NOT NULL,
  action text NOT NULL,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  user_id uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now()
);

-- Create company_settings table
CREATE TABLE IF NOT EXISTS public.company_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  logo_url text,
  company_name text DEFAULT 'Sky Express',
  contact_email text DEFAULT 'info@skyexpress.com',
  contact_phone text DEFAULT '+1 (555) 123-4567',
  address text DEFAULT '123 Logistics Avenue, Global Hub, GH 12345',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Insert default company settings
INSERT INTO public.company_settings (company_name, contact_email, contact_phone, address)
VALUES ('Sky Express', 'info@skyexpress.com', '+1 (555) 123-4567', '123 Logistics Avenue, Global Hub, GH 12345')
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE public.parcels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for parcels
CREATE POLICY "Admins and staff can manage all parcels" ON public.parcels
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND (role = 'admin' OR role = 'staff')
    AND NOT is_blocked
  )
);

CREATE POLICY "Public can view parcels by tracking ID" ON public.parcels
FOR SELECT USING (true);

CREATE POLICY "Users can view their own parcels" ON public.parcels
FOR SELECT TO authenticated
USING (created_by = auth.uid());

-- RLS Policies for tracking_config
CREATE POLICY "Only admins can manage tracking config" ON public.tracking_config
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
    AND NOT is_blocked
  )
);

-- RLS Policies for audit_logs
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
    AND NOT is_blocked
  )
);

-- RLS Policies for company_settings
CREATE POLICY "Everyone can view company settings" ON public.company_settings
FOR SELECT USING (true);

CREATE POLICY "Only admins can manage company settings" ON public.company_settings
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
    AND NOT is_blocked
  )
);

-- Create function to generate next tracking ID
CREATE OR REPLACE FUNCTION public.generate_next_tracking_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  config_rec record;
  next_id text;
BEGIN
  -- Get current config and increment seed atomically
  SELECT * INTO config_rec FROM public.tracking_config ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  
  -- Generate the ID
  next_id := config_rec.prefix || LPAD(config_rec.current_seed::text, config_rec.padding_length, '0');
  
  -- Update the seed for next time
  UPDATE public.tracking_config 
  SET current_seed = current_seed + 1, updated_at = now()
  WHERE id = config_rec.id;
  
  RETURN next_id;
END;
$$;

-- Create function to calculate volumetric weight
CREATE OR REPLACE FUNCTION public.calculate_volumetric_weight(length_cm numeric, width_cm numeric, height_cm numeric)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Standard volumetric weight calculation: (L x W x H) / 5000
  RETURN (length_cm * width_cm * height_cm) / 5000.0;
END;
$$;

-- Create trigger to update parcels timestamps
CREATE OR REPLACE FUNCTION public.update_parcel_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  
  -- Calculate volumetric and chargeable weight
  NEW.calculated_weight = public.calculate_volumetric_weight(NEW.length, NEW.width, NEW.height);
  NEW.chargeable_weight = GREATEST(NEW.weight, NEW.calculated_weight);
  
  -- Add status change to timeline if status changed
  IF TG_OP = 'UPDATE' AND OLD.current_status != NEW.current_status THEN
    NEW.status_timeline = COALESCE(NEW.status_timeline, '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'status', NEW.current_status,
        'timestamp', now(),
        'updated_by', auth.uid()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_parcels_timestamp
BEFORE UPDATE ON public.parcels
FOR EACH ROW
EXECUTE FUNCTION public.update_parcel_timestamp();

-- Update existing tables to use new role system
UPDATE public.profiles SET role = 'admin' WHERE is_admin = true;
UPDATE public.profiles SET role = 'user' WHERE is_admin = false OR is_admin IS NULL;
