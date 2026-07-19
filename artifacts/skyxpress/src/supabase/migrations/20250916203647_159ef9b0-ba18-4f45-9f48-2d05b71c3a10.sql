-- Create pricing configuration table for admins to set rates
CREATE TABLE public.pricing_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  base_rate_per_kg DECIMAL(10,2) NOT NULL DEFAULT 20.00,
  currency_rates JSONB NOT NULL DEFAULT '{"USD": 1.0, "EUR": 0.85, "GBP": 0.75, "AED": 3.67, "PKR": 285.0}'::jsonb,
  service_multipliers JSONB NOT NULL DEFAULT '{"economy": 1.0, "priority": 1.5, "express": 1.8, "airfreight": 2.0}'::jsonb,
  region_multipliers JSONB NOT NULL DEFAULT '{"domestic": 1.0, "international": 1.5, "remote": 2.0}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default pricing configuration
INSERT INTO public.pricing_config (base_rate_per_kg) VALUES (20.00);

-- Enable RLS on pricing config
ALTER TABLE public.pricing_config ENABLE ROW LEVEL SECURITY;

-- Create policies for pricing config
CREATE POLICY "Anyone can view pricing config" 
ON public.pricing_config 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can update pricing config" 
ON public.pricing_config 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true
));

-- Create invoices table
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE DEFAULT 'INV-' || LPAD(floor(random() * 1000000)::text, 6, '0'),
  quote_id UUID REFERENCES quotes(id),
  user_id UUID,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  customer_address TEXT,
  origin_country TEXT NOT NULL,
  destination_country TEXT NOT NULL,
  weight DECIMAL(10,2) NOT NULL,
  length DECIMAL(10,2),
  width DECIMAL(10,2),
  height DECIMAL(10,2),
  service_type TEXT NOT NULL,
  base_amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  exchange_rate DECIMAL(10,4) NOT NULL DEFAULT 1.0000,
  total_amount DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) DEFAULT 0.00,
  final_amount DECIMAL(10,2) NOT NULL,
  tracking_number TEXT UNIQUE DEFAULT generate_tracking_number(),
  barcode_data TEXT,
  status TEXT DEFAULT 'pending',
  payment_status TEXT DEFAULT 'unpaid',
  invoice_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  due_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Create policies for invoices
CREATE POLICY "Users can view their own invoices" 
ON public.invoices 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all invoices" 
ON public.invoices 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true
));

CREATE POLICY "Anyone can view invoices by tracking number" 
ON public.invoices 
FOR SELECT 
USING (true);

-- Create invoice items table for detailed billing
CREATE TABLE public.invoice_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1.00,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on invoice items
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invoice items for their invoices" 
ON public.invoice_items 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM invoices 
  WHERE invoices.id = invoice_items.invoice_id 
  AND invoices.user_id = auth.uid()
));

CREATE POLICY "Admins can manage all invoice items" 
ON public.invoice_items 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true
));

-- Update existing quotes table to add invoice_generated flag
ALTER TABLE public.quotes ADD COLUMN invoice_generated BOOLEAN DEFAULT FALSE;

-- Create updated_at trigger for pricing_config
CREATE TRIGGER update_pricing_config_updated_at
BEFORE UPDATE ON public.pricing_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for invoices
CREATE TRIGGER update_invoices_updated_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Fix quotes RLS policies to allow anonymous insertion
DROP POLICY IF EXISTS "Anyone can create quotes" ON public.quotes;
CREATE POLICY "Enable insert for anonymous and authenticated users" 
ON public.quotes 
FOR INSERT 
WITH CHECK (true);

-- Update shipments to include invoice reference
ALTER TABLE public.shipments ADD COLUMN invoice_id UUID REFERENCES invoices(id);