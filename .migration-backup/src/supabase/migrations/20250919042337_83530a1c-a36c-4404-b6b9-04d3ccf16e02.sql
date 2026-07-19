-- Fix security warnings by updating functions with proper search_path
CREATE OR REPLACE FUNCTION public.update_parcel_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.calculate_volumetric_weight(length_cm numeric, width_cm numeric, height_cm numeric)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Standard volumetric weight calculation: (L x W x H) / 5000
  RETURN (length_cm * width_cm * height_cm) / 5000.0;
END;
$$;

-- Create helper functions for role checking to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE user_id = user_uuid;
$$;

CREATE OR REPLACE FUNCTION public.is_user_blocked(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(is_blocked, false) FROM public.profiles WHERE user_id = user_uuid;
$$;

-- Update RLS policies to use helper functions
DROP POLICY IF EXISTS "Admins and staff can manage all parcels" ON public.parcels;
CREATE POLICY "Admins and staff can manage all parcels" ON public.parcels
FOR ALL TO authenticated
USING (
  public.get_user_role(auth.uid()) IN ('admin', 'staff') 
  AND NOT public.is_user_blocked(auth.uid())
);

DROP POLICY IF EXISTS "Only admins can manage tracking config" ON public.tracking_config;
CREATE POLICY "Only admins can manage tracking config" ON public.tracking_config
FOR ALL TO authenticated
USING (
  public.get_user_role(auth.uid()) = 'admin'
  AND NOT public.is_user_blocked(auth.uid())
);

DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs
FOR SELECT TO authenticated
USING (
  public.get_user_role(auth.uid()) = 'admin'
  AND NOT public.is_user_blocked(auth.uid())
);

DROP POLICY IF EXISTS "Only admins can manage company settings" ON public.company_settings;
CREATE POLICY "Only admins can manage company settings" ON public.company_settings
FOR ALL TO authenticated
USING (
  public.get_user_role(auth.uid()) = 'admin'
  AND NOT public.is_user_blocked(auth.uid())
);