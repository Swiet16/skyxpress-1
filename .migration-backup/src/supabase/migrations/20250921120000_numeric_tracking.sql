/*
  # Add 12-digit numeric tracking ID generation

  1. New Functions
    - generate_numeric_tracking: Creates 12-digit numeric tracking IDs
    - update_tracking_format: Updates existing tracking IDs to numeric format

  2. Updates
    - Replace alphanumeric tracking IDs with 12-digit numeric format
    - Ensure uniqueness and proper formatting

  3. Security
    - Maintain existing RLS policies
*/

-- Create function to generate 12-digit numeric tracking IDs
CREATE OR REPLACE FUNCTION public.generate_numeric_tracking()
RETURNS TEXT 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tracking_id TEXT;
  exists_check INTEGER;
BEGIN
  LOOP
    -- Generate 12-digit number (starting with non-zero to ensure 12 digits)
    tracking_id := LPAD((1 + floor(random() * 899999999999))::text, 12, '0');
    
    -- Check if this tracking ID already exists in parcels table
    SELECT COUNT(*) INTO exists_check 
    FROM parcels 
    WHERE tracking_id = tracking_id;
    
    -- If unique, exit loop
    IF exists_check = 0 THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN tracking_id;
END;
$$;

-- Update existing parcels to use 12-digit numeric tracking IDs
DO $$
DECLARE
  parcel_record RECORD;
  new_tracking_id TEXT;
BEGIN
  FOR parcel_record IN 
    SELECT id, tracking_id 
    FROM parcels 
    WHERE tracking_id ~ '[A-Za-z]' OR LENGTH(tracking_id) != 12
  LOOP
    new_tracking_id := public.generate_numeric_tracking();
    
    UPDATE parcels 
    SET tracking_id = new_tracking_id 
    WHERE id = parcel_record.id;
  END LOOP;
END;
$$;

-- Update existing invoices to use 12-digit numeric tracking numbers
DO $$
DECLARE
  invoice_record RECORD;
  new_tracking_number TEXT;
BEGIN
  FOR invoice_record IN 
    SELECT id, tracking_number 
    FROM invoices 
    WHERE tracking_number IS NOT NULL 
    AND (tracking_number ~ '[A-Za-z]' OR LENGTH(tracking_number) != 12)
  LOOP
    new_tracking_number := public.generate_numeric_tracking();
    
    UPDATE invoices 
    SET tracking_number = new_tracking_number 
    WHERE id = invoice_record.id;
  END LOOP;
END;
$$;

-- Update the default tracking number generation for new parcels
ALTER TABLE parcels 
ALTER COLUMN tracking_id SET DEFAULT generate_numeric_tracking();

-- Add constraint to ensure tracking IDs are exactly 12 digits
ALTER TABLE parcels 
ADD CONSTRAINT tracking_id_format 
CHECK (tracking_id ~ '^[0-9]{12}$');

-- Add constraint to ensure invoice tracking numbers are exactly 12 digits (if not null)
ALTER TABLE invoices 
ADD CONSTRAINT tracking_number_format 
CHECK (tracking_number IS NULL OR tracking_number ~ '^[0-9]{12}$');

-- Update any existing quotes with tracking IDs
DO $$
DECLARE
  quote_record RECORD;
  new_tracking_id TEXT;
BEGIN
  FOR quote_record IN 
    SELECT id, tracking_id 
    FROM quotes 
    WHERE tracking_id IS NOT NULL 
    AND (tracking_id ~ '[A-Za-z]' OR LENGTH(tracking_id) != 12)
  LOOP
    new_tracking_id := public.generate_numeric_tracking();
    
    UPDATE quotes 
    SET tracking_id = new_tracking_id 
    WHERE id = quote_record.id;
  END LOOP;
END;
$$;
