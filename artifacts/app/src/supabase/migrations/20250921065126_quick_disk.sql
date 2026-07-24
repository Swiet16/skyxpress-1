/*
  # Fix tracking ID format to numeric only

  1. Updates
    - Update tracking_config to use numeric format
    - Create function to generate numeric tracking IDs
    - Update existing tracking IDs to numeric format

  2. Security
    - Maintain existing RLS policies
*/

-- Update tracking config for numeric format
UPDATE tracking_config 
SET 
  prefix = '',
  current_seed = 567000600,
  padding_length = 13
WHERE id = (SELECT id FROM tracking_config LIMIT 1);

-- Create function to generate numeric tracking IDs
CREATE OR REPLACE FUNCTION generate_numeric_tracking()
RETURNS TEXT AS $$
DECLARE
  next_number BIGINT;
  tracking_id TEXT;
BEGIN
  -- Get and increment the current seed
  UPDATE tracking_config 
  SET current_seed = current_seed + 1
  WHERE id = (SELECT id FROM tracking_config LIMIT 1)
  RETURNING current_seed INTO next_number;
  
  -- Format as 13-digit number with leading zeros
  tracking_id := LPAD(next_number::TEXT, 13, '0');
  
  RETURN tracking_id;
END;
$$ LANGUAGE plpgsql;

-- Update existing parcels to use numeric tracking IDs
DO $$
DECLARE
  parcel_record RECORD;
  new_tracking_id TEXT;
BEGIN
  FOR parcel_record IN SELECT id FROM parcels LOOP
    new_tracking_id := generate_numeric_tracking();
    UPDATE parcels 
    SET tracking_id = new_tracking_id 
    WHERE id = parcel_record.id;
  END LOOP;
END $$;

-- Update existing shipments to use numeric tracking IDs  
DO $$
DECLARE
  shipment_record RECORD;
  new_tracking_id TEXT;
BEGIN
  FOR shipment_record IN SELECT id FROM shipments LOOP
    new_tracking_id := generate_numeric_tracking();
    UPDATE shipments 
    SET tracking_number = new_tracking_id 
    WHERE id = shipment_record.id;
  END LOOP;
END $$;

-- Update existing invoices to use numeric tracking IDs
DO $$
DECLARE
  invoice_record RECORD;
  new_tracking_id TEXT;
BEGIN
  FOR invoice_record IN SELECT id FROM invoices WHERE tracking_number IS NOT NULL LOOP
    new_tracking_id := generate_numeric_tracking();
    UPDATE invoices 
    SET tracking_number = new_tracking_id 
    WHERE id = invoice_record.id;
  END LOOP;
END $$;