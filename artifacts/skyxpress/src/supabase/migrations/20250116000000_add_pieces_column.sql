-- Add pieces column to parcels table
ALTER TABLE public.parcels ADD COLUMN IF NOT EXISTS pieces INTEGER DEFAULT 1;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_parcels_pieces ON public.parcels(pieces);