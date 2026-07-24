-- 1. Create the app_role enum first
CREATE TYPE public.app_role AS ENUM ('user', 'admin', 'staff', 'owner');

-- 2. Update tracking configuration for 12-digit format
UPDATE public.tracking_config 
SET prefix = '', padding_length = 12, current_seed = 56007890
WHERE id = (SELECT id FROM public.tracking_config ORDER BY created_at DESC LIMIT 1);

-- Insert default config if none exists
INSERT INTO public.tracking_config (prefix, padding_length, current_seed)
SELECT '', 12, 56007890
WHERE NOT EXISTS (SELECT 1 FROM public.tracking_config);

-- 3. Create countries table with 193+ countries
CREATE TABLE IF NOT EXISTS public.countries_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert all 193+ countries
INSERT INTO public.countries_list (name, code) VALUES
('Afghanistan', 'AF'), ('Albania', 'AL'), ('Algeria', 'DZ'), ('Andorra', 'AD'), ('Angola', 'AO'),
('Antigua and Barbuda', 'AG'), ('Argentina', 'AR'), ('Armenia', 'AM'), ('Australia', 'AU'), ('Austria', 'AT'),
('Azerbaijan', 'AZ'), ('Bahamas', 'BS'), ('Bahrain', 'BH'), ('Bangladesh', 'BD'), ('Barbados', 'BB'),
('Belarus', 'BY'), ('Belgium', 'BE'), ('Belize', 'BZ'), ('Benin', 'BJ'), ('Bhutan', 'BT'),
('Bolivia', 'BO'), ('Bosnia and Herzegovina', 'BA'), ('Botswana', 'BW'), ('Brazil', 'BR'), ('Brunei', 'BN'),
('Bulgaria', 'BG'), ('Burkina Faso', 'BF'), ('Burundi', 'BI'), ('Cambodia', 'KH'), ('Cameroon', 'CM'),
('Canada', 'CA'), ('Cape Verde', 'CV'), ('Central African Republic', 'CF'), ('Chad', 'TD'), ('Chile', 'CL'),
('China', 'CN'), ('Colombia', 'CO'), ('Comoros', 'KM'), ('Congo', 'CG'), ('Costa Rica', 'CR'),
('Croatia', 'HR'), ('Cuba', 'CU'), ('Cyprus', 'CY'), ('Czech Republic', 'CZ'), ('Denmark', 'DK'),
('Djibouti', 'DJ'), ('Dominica', 'DM'), ('Dominican Republic', 'DO'), ('Ecuador', 'EC'), ('Egypt', 'EG'),
('El Salvador', 'SV'), ('Equatorial Guinea', 'GQ'), ('Eritrea', 'ER'), ('Estonia', 'EE'), ('Ethiopia', 'ET'),
('Fiji', 'FJ'), ('Finland', 'FI'), ('France', 'FR'), ('Gabon', 'GA'), ('Gambia', 'GM'),
('Georgia', 'GE'), ('Germany', 'DE'), ('Ghana', 'GH'), ('Greece', 'GR'), ('Grenada', 'GD'),
('Guatemala', 'GT'), ('Guinea', 'GN'), ('Guinea-Bissau', 'GW'), ('Guyana', 'GY'), ('Haiti', 'HT'),
('Honduras', 'HN'), ('Hungary', 'HU'), ('Iceland', 'IS'), ('India', 'IN'), ('Indonesia', 'ID'),
('Iran', 'IR'), ('Iraq', 'IQ'), ('Ireland', 'IE'), ('Israel', 'IL'), ('Italy', 'IT'),
('Jamaica', 'JM'), ('Japan', 'JP'), ('Jordan', 'JO'), ('Kazakhstan', 'KZ'), ('Kenya', 'KE'),
('Kiribati', 'KI'), ('Kuwait', 'KW'), ('Kyrgyzstan', 'KG'), ('Laos', 'LA'), ('Latvia', 'LV'),
('Lebanon', 'LB'), ('Lesotho', 'LS'), ('Liberia', 'LR'), ('Libya', 'LY'), ('Liechtenstein', 'LI'),
('Lithuania', 'LT'), ('Luxembourg', 'LU'), ('Madagascar', 'MG'), ('Malawi', 'MW'), ('Malaysia', 'MY'),
('Maldives', 'MV'), ('Mali', 'ML'), ('Malta', 'MT'), ('Marshall Islands', 'MH'), ('Mauritania', 'MR'),
('Mauritius', 'MU'), ('Mexico', 'MX'), ('Micronesia', 'FM'), ('Moldova', 'MD'), ('Monaco', 'MC'),
('Mongolia', 'MN'), ('Montenegro', 'ME'), ('Morocco', 'MA'), ('Mozambique', 'MZ'), ('Myanmar', 'MM'),
('Namibia', 'NA'), ('Nauru', 'NR'), ('Nepal', 'NP'), ('Netherlands', 'NL'), ('New Zealand', 'NZ'),
('Nicaragua', 'NI'), ('Niger', 'NE'), ('Nigeria', 'NG'), ('North Korea', 'KP'), ('North Macedonia', 'MK'),
('Norway', 'NO'), ('Oman', 'OM'), ('Pakistan', 'PK'), ('Palau', 'PW'), ('Palestine', 'PS'),
('Panama', 'PA'), ('Papua New Guinea', 'PG'), ('Paraguay', 'PY'), ('Peru', 'PE'), ('Philippines', 'PH'),
('Poland', 'PL'), ('Portugal', 'PT'), ('Qatar', 'QA'), ('Romania', 'RO'), ('Russia', 'RU'),
('Rwanda', 'RW'), ('Saint Kitts and Nevis', 'KN'), ('Saint Lucia', 'LC'), ('Saint Vincent and the Grenadines', 'VC'),
('Samoa', 'WS'), ('San Marino', 'SM'), ('Sao Tome and Principe', 'ST'), ('Saudi Arabia', 'SA'), ('Senegal', 'SN'),
('Serbia', 'RS'), ('Seychelles', 'SC'), ('Sierra Leone', 'SL'), ('Singapore', 'SG'), ('Slovakia', 'SK'),
('Slovenia', 'SI'), ('Solomon Islands', 'SB'), ('Somalia', 'SO'), ('South Africa', 'ZA'), ('South Korea', 'KR'),
('South Sudan', 'SS'), ('Spain', 'ES'), ('Sri Lanka', 'LK'), ('Sudan', 'SD'), ('Suriname', 'SR'),
('Sweden', 'SE'), ('Switzerland', 'CH'), ('Syria', 'SY'), ('Taiwan', 'TW'), ('Tajikistan', 'TJ'),
('Tanzania', 'TZ'), ('Thailand', 'TH'), ('Timor-Leste', 'TL'), ('Togo', 'TG'), ('Tonga', 'TO'),
('Trinidad and Tobago', 'TT'), ('Tunisia', 'TN'), ('Turkey', 'TR'), ('Turkmenistan', 'TM'), ('Tuvalu', 'TV'),
('Uganda', 'UG'), ('Ukraine', 'UA'), ('United Arab Emirates', 'AE'), ('United Kingdom', 'GB'), ('United States', 'US'),
('Uruguay', 'UY'), ('Uzbekistan', 'UZ'), ('Vanuatu', 'VU'), ('Vatican City', 'VA'), ('Venezuela', 'VE'),
('Vietnam', 'VN'), ('Yemen', 'YE'), ('Zambia', 'ZM'), ('Zimbabwe', 'ZW')
ON CONFLICT (code) DO NOTHING;

-- 4. Update profiles table to use the enum
ALTER TABLE public.profiles ALTER COLUMN role TYPE public.app_role USING role::public.app_role;

-- 5. Set owner role for specific email
UPDATE public.profiles 
SET role = 'owner'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'myne7x@gmail.com');

-- 6. Update tracking ID generation function for 12-digit format
CREATE OR REPLACE FUNCTION public.generate_12_digit_tracking()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  config_rec record;
  next_id text;
BEGIN
  -- Get current config and increment seed atomically
  SELECT * INTO config_rec FROM public.tracking_config ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  
  -- Generate 12-digit ID with zero padding
  next_id := LPAD(config_rec.current_seed::text, 12, '0');
  
  -- Update the seed for next time
  UPDATE public.tracking_config 
  SET current_seed = current_seed + 1, updated_at = now()
  WHERE id = config_rec.id;
  
  RETURN next_id;
END;
$$;

-- 7. Update parcels table to use new tracking ID function
ALTER TABLE public.parcels 
ALTER COLUMN tracking_id SET DEFAULT generate_12_digit_tracking();

-- 8. Add pickup status tracking to prevent multiple pickups
ALTER TABLE public.parcels 
ADD COLUMN IF NOT EXISTS is_picked_up BOOLEAN DEFAULT false;

-- 9. Create invoice metadata table for better invoice management
CREATE TABLE IF NOT EXISTS public.invoice_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  pdf_url TEXT,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  generated_by UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.countries_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_metadata ENABLE ROW LEVEL SECURITY;

-- RLS policies for countries (everyone can read)
CREATE POLICY "Countries are viewable by everyone" ON public.countries_list
  FOR SELECT USING (true);

-- RLS policies for invoice metadata
CREATE POLICY "Users can view their invoice metadata" ON public.invoice_metadata
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.invoices 
      WHERE invoices.id = invoice_metadata.invoice_id 
      AND invoices.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all invoice metadata" ON public.invoice_metadata
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = ANY(ARRAY['admin', 'owner'])
    )
  );