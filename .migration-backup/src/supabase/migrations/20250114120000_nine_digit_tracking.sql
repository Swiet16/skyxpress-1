-- =====================================================
-- 9-DIGIT TRACKING ID SYSTEM
-- Format: 000537900, 000537901, 000537902, etc.
-- =====================================================

-- Drop existing tracking ID sequence if exists
DROP SEQUENCE IF EXISTS public.tracking_id_sequence CASCADE;

-- Create new sequence starting from 537900
CREATE SEQUENCE public.tracking_id_sequence
  START WITH 537900
  INCREMENT BY 1
  MINVALUE 537900
  MAXVALUE 999999999
  NO CYCLE;

-- Update or create the tracking ID generation function
CREATE OR REPLACE FUNCTION public.generate_tracking_id()
RETURNS TEXT AS $$
DECLARE
  next_number BIGINT;
  tracking_id TEXT;
BEGIN
  -- Get next sequence number
  next_number := nextval('public.tracking_id_sequence');
  
  -- Format as 9-digit string with leading zeros
  tracking_id := LPAD(next_number::text, 9, '0');
  
  RETURN tracking_id;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function for auto-generating tracking ID (MUST BE BEFORE TRIGGER)
CREATE OR REPLACE FUNCTION public.generate_tracking_id_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NEW.tracking_id := public.generate_tracking_id();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Now create the trigger (function exists now)
DO $$ 
BEGIN
  -- Drop trigger if exists
  DROP TRIGGER IF EXISTS set_tracking_id_on_insert ON public.parcels;
  
  -- Create trigger to auto-generate tracking ID on insert if not provided
  CREATE TRIGGER set_tracking_id_on_insert
    BEFORE INSERT ON public.parcels
    FOR EACH ROW
    WHEN (NEW.tracking_id IS NULL OR NEW.tracking_id = '')
    EXECUTE FUNCTION public.generate_tracking_id_trigger();
END $$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.generate_tracking_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_tracking_id_trigger() TO authenticated;
GRANT USAGE ON SEQUENCE public.tracking_id_sequence TO authenticated;

-- Comment for reference
COMMENT ON FUNCTION public.generate_tracking_id() IS 'Generates 9-digit tracking ID starting from 000537900';
COMMENT ON SEQUENCE public.tracking_id_sequence IS 'Sequence for 9-digit tracking IDs (000537900, 000537901, etc.)';