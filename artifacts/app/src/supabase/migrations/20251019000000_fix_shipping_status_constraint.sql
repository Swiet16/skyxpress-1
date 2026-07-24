-- Fix Shipping Status Constraint to Allow All Status Values
-- Migration created: 2025-10-19

-- 1. Drop the old constraints first
ALTER TABLE public.parcels 
DROP CONSTRAINT IF EXISTS parcels_shipping_status_check;

ALTER TABLE public.parcels 
DROP CONSTRAINT IF EXISTS parcels_current_status_check;

-- 2. Fix any existing invalid data before adding new constraints
-- Update any invalid current_status values to 'processing'
UPDATE public.parcels
SET current_status = 'processing'
WHERE current_status IS NOT NULL 
  AND current_status NOT IN (
    'created',
    'processing',
    'picked_up',
    'in_transit',
    'customs',
    'custom_hold',
    'flight_departure',
    'flight_arrived',
    'flight_offload',
    'in_custom_clearance',
    'arrived_hub',
    'out_for_delivery',
    'delivered',
    'cancelled'
  );

-- Update any invalid shipping_status values to 'processing'
UPDATE public.parcels
SET shipping_status = 'processing'
WHERE shipping_status IS NOT NULL 
  AND shipping_status NOT IN (
    'created',
    'processing',
    'picked_up',
    'in_transit',
    'customs',
    'custom_hold',
    'flight_departure',
    'flight_arrived',
    'flight_offload',
    'in_custom_clearance',
    'arrived_hub',
    'out_for_delivery',
    'delivered',
    'cancelled'
  );

-- 3. Now add the new constraints with all 14 status values
ALTER TABLE public.parcels
ADD CONSTRAINT parcels_shipping_status_check 
CHECK (shipping_status IN (
  'created',
  'processing',
  'picked_up',
  'in_transit',
  'customs',
  'custom_hold',
  'flight_departure',
  'flight_arrived',
  'flight_offload',
  'in_custom_clearance',
  'arrived_hub',
  'out_for_delivery',
  'delivered',
  'cancelled'
));

ALTER TABLE public.parcels
ADD CONSTRAINT parcels_current_status_check 
CHECK (current_status IN (
  'created',
  'processing',
  'picked_up',
  'in_transit',
  'customs',
  'custom_hold',
  'flight_departure',
  'flight_arrived',
  'flight_offload',
  'in_custom_clearance',
  'arrived_hub',
  'out_for_delivery',
  'delivered',
  'cancelled'
));

-- 4. Update comment to reflect all available statuses
COMMENT ON COLUMN public.parcels.shipping_status IS 
'Shipping status with 14 possible values: created, processing, picked_up, in_transit, customs, custom_hold, flight_departure, flight_arrived, flight_offload, in_custom_clearance, arrived_hub, out_for_delivery, delivered, cancelled';

COMMENT ON COLUMN public.parcels.current_status IS 
'Current status with 14 possible values: created, processing, picked_up, in_transit, customs, custom_hold, flight_departure, flight_arrived, flight_offload, in_custom_clearance, arrived_hub, out_for_delivery, delivered, cancelled';

-- Migration completed