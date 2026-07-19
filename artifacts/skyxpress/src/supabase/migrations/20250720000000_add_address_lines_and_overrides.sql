-- =====================================================
-- ADD EXTRA ADDRESS LINES & EDITABLE BILL OVERRIDES
-- Safe to run multiple times (IF NOT EXISTS guards)
-- =====================================================

-- Extra address lines for sender
ALTER TABLE public.parcels ADD COLUMN IF NOT EXISTS sender_address_2 TEXT;
ALTER TABLE public.parcels ADD COLUMN IF NOT EXISTS sender_address_3 TEXT;

-- Extra address lines for receiver
ALTER TABLE public.parcels ADD COLUMN IF NOT EXISTS receiver_address_2 TEXT;
ALTER TABLE public.parcels ADD COLUMN IF NOT EXISTS receiver_address_3 TEXT;

-- Editable dimensional weight override (kg).
-- When NULL: bills calculate automatically using L×W×H/5000.
-- When set: bills use this value directly (formula still shown but overridden).
ALTER TABLE public.parcels ADD COLUMN IF NOT EXISTS dim_weight_override DECIMAL(10,2);

-- Editable freight amount override (PKR).
-- When NULL: bills use freight_amount_pkr.
-- When set: bills use this value on the Sender Copy (AWB with Payment).
ALTER TABLE public.parcels ADD COLUMN IF NOT EXISTS amount_override DECIMAL(10,2);

-- Comments
COMMENT ON COLUMN public.parcels.sender_address_2  IS 'Optional second line of sender address (shown on all bills)';
COMMENT ON COLUMN public.parcels.sender_address_3  IS 'Optional third line of sender address (shown on all bills)';
COMMENT ON COLUMN public.parcels.receiver_address_2 IS 'Optional second line of receiver address (shown on all bills)';
COMMENT ON COLUMN public.parcels.receiver_address_3 IS 'Optional third line of receiver address (shown on all bills)';
COMMENT ON COLUMN public.parcels.dim_weight_override IS 'Override for dimensional weight (kg). NULL = auto-calculate L×W×H/5000';
COMMENT ON COLUMN public.parcels.amount_override IS 'Override for freight amount shown on Sender Copy bill (PKR). NULL = use freight_amount_pkr';
