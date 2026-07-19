-- =====================================================
-- ADD MISSING FIELDS FOR BILL GENERATION
-- Ensures parcels table has all fields needed for bills
-- =====================================================

-- Add sender_cnic field if it doesn't exist
ALTER TABLE public.parcels ADD COLUMN IF NOT EXISTS sender_cnic VARCHAR(50);

-- Add created_at if it doesn't exist (for booking date)
ALTER TABLE public.parcels ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add currency field if it doesn't exist
ALTER TABLE public.parcels ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'PKR';

-- Update existing parcels to have 9-digit tracking IDs if they don't
-- This is safe to run - it only updates NULL or invalid tracking IDs
UPDATE public.parcels
SET tracking_id = LPAD(FLOOR(RANDOM() * (999999999 - 537900) + 537900)::TEXT, 9, '0')
WHERE tracking_id IS NULL 
   OR tracking_id = '' 
   OR LENGTH(tracking_id) != 9
   OR tracking_id !~ '^[0-9]{9}$';

-- Ensure all tracking IDs are unique
DO $$ 
DECLARE
  duplicate_count INTEGER;
BEGIN
  -- Check for duplicates
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT tracking_id, COUNT(*) as cnt
    FROM public.parcels
    GROUP BY tracking_id
    HAVING COUNT(*) > 1
  ) duplicates;
  
  -- If duplicates exist, regenerate them
  IF duplicate_count > 0 THEN
    UPDATE public.parcels p1
    SET tracking_id = public.generate_tracking_id()
    WHERE tracking_id IN (
      SELECT tracking_id
      FROM public.parcels
      GROUP BY tracking_id
      HAVING COUNT(*) > 1
    )
    AND id NOT IN (
      SELECT MIN(id)
      FROM public.parcels
      GROUP BY tracking_id
      HAVING COUNT(*) > 1
    );
  END IF;
END $$;

-- Create index on tracking_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_parcels_tracking_id ON public.parcels(tracking_id);

-- Add comment
COMMENT ON COLUMN public.parcels.tracking_id IS '9-digit tracking number (000537900, 000537901, etc.)';
COMMENT ON COLUMN public.parcels.sender_cnic IS 'Sender CNIC/NTN number for Pakistan senders';