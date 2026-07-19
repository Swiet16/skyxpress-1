-- =====================================================
-- ADD AUTO-INCREMENTING REFERENCE ID
-- Starts from 2119901 and increments by 1
-- =====================================================

-- 1. Add reference_id column to parcels table
ALTER TABLE public.parcels 
ADD COLUMN IF NOT EXISTS reference_id TEXT UNIQUE;

-- 2. Create reference_id config table to track the current number
CREATE TABLE IF NOT EXISTS public.reference_id_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  current_number BIGINT NOT NULL DEFAULT 2119901,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert initial config if doesn't exist
INSERT INTO public.reference_id_config (current_number)
SELECT 2119901
WHERE NOT EXISTS (SELECT 1 FROM public.reference_id_config);

-- 3. Create function to generate next reference ID
CREATE OR REPLACE FUNCTION public.generate_reference_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  config_rec RECORD;
  next_ref_id TEXT;
BEGIN
  -- Get current config and increment atomically (with row lock)
  SELECT * INTO config_rec 
  FROM public.reference_id_config 
  ORDER BY created_at DESC 
  LIMIT 1 
  FOR UPDATE;
  
  -- Generate the reference ID (just the number as text)
  next_ref_id := config_rec.current_number::TEXT;
  
  -- Update the number for next time
  UPDATE public.reference_id_config 
  SET 
    current_number = current_number + 1,
    updated_at = now()
  WHERE id = config_rec.id;
  
  RETURN next_ref_id;
END;
$$;

-- 4. Set default for new parcels to auto-generate reference_id
ALTER TABLE public.parcels 
ALTER COLUMN reference_id SET DEFAULT generate_reference_id();

-- 5. Generate reference IDs for existing parcels (oldest first to maintain order)
DO $$
DECLARE
  parcel_record RECORD;
  new_ref_id TEXT;
BEGIN
  FOR parcel_record IN 
    SELECT id 
    FROM public.parcels 
    WHERE reference_id IS NULL
    ORDER BY created_at ASC
  LOOP
    new_ref_id := public.generate_reference_id();
    
    UPDATE public.parcels 
    SET reference_id = new_ref_id 
    WHERE id = parcel_record.id;
  END LOOP;
END $$;

-- 6. Create index on reference_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_parcels_reference_id ON public.parcels(reference_id);

-- 7. Add comment
COMMENT ON COLUMN public.parcels.reference_id IS 'Auto-incrementing reference ID starting from 2119901';

-- 8. Enable RLS on reference_id_config
ALTER TABLE public.reference_id_config ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policy - Only admins can view/manage reference config
CREATE POLICY "Only admins can view reference config" ON public.reference_id_config
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Only admins can update reference config" ON public.reference_id_config
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role IN ('admin', 'owner')
    )
  );