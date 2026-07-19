-- =====================================================
-- COMPLETE AWB, INVOICE, AND PARCEL SYSTEM MIGRATION
-- Only creates what doesn't exist - safe to run multiple times
-- =====================================================

-- ============ PARCELS TABLE ENHANCEMENTS ============
-- Add missing columns to parcels table
ALTER TABLE public.parcels ADD COLUMN IF NOT EXISTS sender_company VARCHAR(255);
ALTER TABLE public.parcels ADD COLUMN IF NOT EXISTS sender_city VARCHAR(100);
ALTER TABLE public.parcels ADD COLUMN IF NOT EXISTS receiver_city VARCHAR(100);
ALTER TABLE public.parcels ADD COLUMN IF NOT EXISTS receiver_state VARCHAR(100);
ALTER TABLE public.parcels ADD COLUMN IF NOT EXISTS receiver_postal_code VARCHAR(20);
ALTER TABLE public.parcels ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]';
ALTER TABLE public.parcels ADD COLUMN IF NOT EXISTS request_status TEXT DEFAULT 'pending' CHECK (request_status IN ('pending', 'approved', 'rejected'));
ALTER TABLE public.parcels ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.parcels ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);
ALTER TABLE public.parcels ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.parcels ADD COLUMN IF NOT EXISTS shipping_status TEXT DEFAULT 'processing' CHECK (shipping_status IN ('processing', 'picked_up', 'in_transit', 'customs', 'out_for_delivery', 'delivered'));
ALTER TABLE public.parcels ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10,2);
ALTER TABLE public.parcels ADD COLUMN IF NOT EXISTS payment_currency VARCHAR(10) DEFAULT 'USD';
ALTER TABLE public.parcels ADD COLUMN IF NOT EXISTS payment_invoice_url TEXT;
ALTER TABLE public.parcels ADD COLUMN IF NOT EXISTS awb_id UUID;
ALTER TABLE public.parcels ADD COLUMN IF NOT EXISTS invoice_id UUID;
ALTER TABLE public.parcels ADD COLUMN IF NOT EXISTS status_timeline JSONB DEFAULT '[]';

-- ============ AIRWAY BILLS TABLE (if needed) ============
-- This table likely exists, but we'll ensure all columns are present
DO $$ 
BEGIN
  -- Check if airway_bills exists, if not create it
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'airway_bills') THEN
    CREATE TABLE public.airway_bills (
      id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      awb_number VARCHAR(50) UNIQUE NOT NULL,
      
      -- Shipper Information
      shipper_name VARCHAR(255),
      shipper_so_do VARCHAR(255),
      shipper_address TEXT,
      shipper_city VARCHAR(100),
      shipper_country VARCHAR(100),
      shipper_phone VARCHAR(50),
      shipper_cnic_ntn VARCHAR(50),
      shipper_email VARCHAR(255),
      
      -- Consignee Information
      consignee_name VARCHAR(255),
      consignee_address TEXT,
      consignee_city VARCHAR(100),
      consignee_state VARCHAR(100),
      consignee_country VARCHAR(100),
      consignee_postcode VARCHAR(20),
      consignee_phone VARCHAR(50),
      consignee_email VARCHAR(255),
      
      -- Shipment Details
      destination VARCHAR(100),
      service_type VARCHAR(50),
      reference_number VARCHAR(100),
      pieces INTEGER DEFAULT 1,
      weight DECIMAL(10,2),
      
      -- Documents
      document_uploads JSONB DEFAULT '[]',
      
      -- Status
      status VARCHAR(50) DEFAULT 'created',
      created_by UUID REFERENCES auth.users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE INDEX idx_awb_number ON public.airway_bills(awb_number);
    CREATE INDEX idx_awb_created_by ON public.airway_bills(created_by);
    
    ALTER TABLE public.airway_bills ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Add missing columns to airway_bills if they don't exist
ALTER TABLE public.airway_bills ADD COLUMN IF NOT EXISTS shipper_so_do VARCHAR(255);
ALTER TABLE public.airway_bills ADD COLUMN IF NOT EXISTS shipper_cnic_ntn VARCHAR(50);
ALTER TABLE public.airway_bills ADD COLUMN IF NOT EXISTS consignee_state VARCHAR(100);
ALTER TABLE public.airway_bills ADD COLUMN IF NOT EXISTS consignee_postcode VARCHAR(20);
ALTER TABLE public.airway_bills ADD COLUMN IF NOT EXISTS document_uploads JSONB DEFAULT '[]';
ALTER TABLE public.airway_bills ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'created';

-- ============ INVOICES TABLE ============
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'invoices') THEN
    CREATE TABLE public.invoices (
      id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      invoice_number VARCHAR(50) UNIQUE NOT NULL,
      invoice_type VARCHAR(50) DEFAULT 'commercial' CHECK (invoice_type IN ('commercial', 'gift', 'payment', 'proforma')),
      
      -- Linked Records
      parcel_id UUID,
      awb_id UUID,
      
      -- Shipper Information
      shipper_name VARCHAR(255),
      shipper_address TEXT,
      shipper_city VARCHAR(100),
      shipper_country VARCHAR(100),
      shipper_phone VARCHAR(50),
      shipper_cnic_ntn VARCHAR(50),
      
      -- Receiver Information
      receiver_name VARCHAR(255),
      receiver_address TEXT,
      receiver_city VARCHAR(100),
      receiver_state VARCHAR(100),
      receiver_country VARCHAR(100),
      receiver_phone VARCHAR(50),
      receiver_email VARCHAR(255),
      
      -- Invoice Details
      invoice_date DATE DEFAULT CURRENT_DATE,
      payment_terms VARCHAR(50) DEFAULT 'DAP',
      export_type VARCHAR(50),
      
      -- Items (stored as JSONB array)
      items JSONB DEFAULT '[]',
      
      -- Totals
      subtotal DECIMAL(10,2),
      tax DECIMAL(10,2) DEFAULT 0,
      total_amount DECIMAL(10,2),
      currency VARCHAR(10) DEFAULT 'USD',
      
      -- Parcel Details
      total_weight DECIMAL(10,2),
      no_of_pieces INTEGER DEFAULT 1,
      country_of_origin VARCHAR(100),
      
      -- Undertaking/Notes
      undertaking TEXT,
      special_instructions TEXT,
      
      -- Status & Metadata
      status VARCHAR(50) DEFAULT 'draft',
      created_by UUID REFERENCES auth.users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE INDEX idx_invoice_number ON public.invoices(invoice_number);
    CREATE INDEX idx_invoice_parcel_id ON public.invoices(parcel_id);
    CREATE INDEX idx_invoice_awb_id ON public.invoices(awb_id);
    CREATE INDEX idx_invoice_created_by ON public.invoices(created_by);
    
    ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Add missing columns to invoices if they don't exist
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS invoice_type VARCHAR(50) DEFAULT 'commercial';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS shipper_cnic_ntn VARCHAR(50);
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS receiver_state VARCHAR(100);
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(50) DEFAULT 'DAP';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS export_type VARCHAR(50);
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS country_of_origin VARCHAR(100);
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS undertaking TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS special_instructions TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS parcel_id UUID;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS awb_id UUID;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft';

-- ============ PARCEL DOCUMENTS TABLE ============
-- Store all generated documents (AWB, invoices, labels) for each parcel
CREATE TABLE IF NOT EXISTS public.parcel_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parcel_id UUID REFERENCES public.parcels(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('awb', 'invoice', 'label', 'payment_invoice', 'customs_declaration')),
  document_name VARCHAR(255),
  document_url TEXT NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  generated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_parcel_documents_parcel_id ON public.parcel_documents(parcel_id);
CREATE INDEX IF NOT EXISTS idx_parcel_documents_type ON public.parcel_documents(document_type);

-- Enable RLS
ALTER TABLE public.parcel_documents ENABLE ROW LEVEL SECURITY;

-- ============ INDEXES FOR PERFORMANCE ============
CREATE INDEX IF NOT EXISTS idx_parcels_request_status ON public.parcels(request_status);
CREATE INDEX IF NOT EXISTS idx_parcels_approved_at ON public.parcels(approved_at DESC);
CREATE INDEX IF NOT EXISTS idx_parcels_shipping_status ON public.parcels(shipping_status);
CREATE INDEX IF NOT EXISTS idx_parcels_awb_id ON public.parcels(awb_id);
CREATE INDEX IF NOT EXISTS idx_parcels_invoice_id ON public.parcels(invoice_id);

-- ============ ROW LEVEL SECURITY POLICIES ============

-- Parcels RLS
DROP POLICY IF EXISTS "Users can view their own parcels" ON public.parcels;
CREATE POLICY "Users can view their own parcels" ON public.parcels
  FOR SELECT USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Users can create their own parcels" ON public.parcels;
CREATE POLICY "Users can create their own parcels" ON public.parcels
  FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Admins can update parcels" ON public.parcels;
CREATE POLICY "Admins can update parcels" ON public.parcels
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Airway Bills RLS
DROP POLICY IF EXISTS "Users can view their own AWBs" ON public.airway_bills;
CREATE POLICY "Users can view their own AWBs" ON public.airway_bills
  FOR SELECT USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Users can create AWBs" ON public.airway_bills;
CREATE POLICY "Users can create AWBs" ON public.airway_bills
  FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Admins can manage AWBs" ON public.airway_bills;
CREATE POLICY "Admins can manage AWBs" ON public.airway_bills
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Invoices RLS
DROP POLICY IF EXISTS "Users can view their own invoices" ON public.invoices;
CREATE POLICY "Users can view their own invoices" ON public.invoices
  FOR SELECT USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Users can create invoices" ON public.invoices;
CREATE POLICY "Users can create invoices" ON public.invoices
  FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Admins can manage invoices" ON public.invoices;
CREATE POLICY "Admins can manage invoices" ON public.invoices
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Parcel Documents RLS
CREATE POLICY "Users can view documents for their parcels" ON public.parcel_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.parcels 
      WHERE parcels.id = parcel_documents.parcel_id 
      AND parcels.created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can manage all documents" ON public.parcel_documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- ============ HELPER FUNCTIONS ============

-- Function to generate AWB number
CREATE OR REPLACE FUNCTION public.generate_awb_number()
RETURNS TEXT AS $$
DECLARE
  new_awb TEXT;
  awb_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate format: SKY + 12 digits
    new_awb := 'SKY' || LPAD(floor(random() * 1000000000000)::TEXT, 12, '0');
    
    -- Check if exists
    SELECT EXISTS(SELECT 1 FROM public.airway_bills WHERE awb_number = new_awb) INTO awb_exists;
    
    -- If doesn't exist, return it
    IF NOT awb_exists THEN
      RETURN new_awb;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  new_invoice TEXT;
  invoice_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate format: INV + 10 digits
    new_invoice := 'INV' || LPAD(floor(random() * 10000000000)::TEXT, 10, '0');
    
    -- Check if exists
    SELECT EXISTS(SELECT 1 FROM public.invoices WHERE invoice_number = new_invoice) INTO invoice_exists;
    
    -- If doesn't exist, return it
    IF NOT invoice_exists THEN
      RETURN new_invoice;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to approve parcel and generate documents
CREATE OR REPLACE FUNCTION public.approve_parcel_request(
  parcel_id_param UUID,
  admin_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = admin_user_id 
    AND is_admin = true
  ) THEN
    RETURN FALSE;
  END IF;

  -- Update parcel
  UPDATE public.parcels
  SET 
    request_status = 'approved',
    approved_at = NOW(),
    approved_by = admin_user_id,
    shipping_status = 'processing',
    current_status = 'approved'
  WHERE id = parcel_id_param;

  RETURN FOUND;
END;
$$;

-- Function to reject parcel request
CREATE OR REPLACE FUNCTION public.reject_parcel_request(
  parcel_id_param UUID,
  admin_user_id UUID,
  reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = admin_user_id 
    AND is_admin = true
  ) THEN
    RETURN FALSE;
  END IF;

  -- Update parcel
  UPDATE public.parcels
  SET 
    request_status = 'rejected',
    approved_at = NOW(),
    approved_by = admin_user_id,
    rejection_reason = reason,
    current_status = 'rejected'
  WHERE id = parcel_id_param;

  RETURN FOUND;
END;
$$;

-- Function to update shipping status with timeline
CREATE OR REPLACE FUNCTION public.update_shipping_status(
  parcel_id_param UUID,
  admin_user_id UUID,
  new_status TEXT,
  status_note TEXT DEFAULT ''
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = admin_user_id 
    AND is_admin = true
  ) THEN
    RETURN FALSE;
  END IF;

  -- Update parcel shipping status and add to timeline
  UPDATE public.parcels
  SET 
    shipping_status = new_status,
    current_status = new_status,
    status_timeline = COALESCE(status_timeline, '[]'::jsonb) || 
      jsonb_build_object(
        'status', new_status,
        'timestamp', NOW(),
        'note', status_note,
        'updated_by', admin_user_id
      )::jsonb,
    updated_at = NOW()
  WHERE id = parcel_id_param AND request_status = 'approved';

  RETURN FOUND;
END;
$$;

-- ============ TRIGGERS ============

-- Auto-update timestamps for airway_bills
DROP TRIGGER IF EXISTS update_airway_bills_updated_at ON public.airway_bills;
CREATE TRIGGER update_airway_bills_updated_at
  BEFORE UPDATE ON public.airway_bills
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-update timestamps for invoices
DROP TRIGGER IF EXISTS update_invoices_updated_at ON public.invoices;
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================