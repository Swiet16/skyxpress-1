-- 1. Create the app_role enum first
CREATE TYPE public.app_role AS ENUM ('user', 'admin', 'staff', 'owner');

-- 2. Fix the profiles table role column
ALTER TABLE public.profiles 
ALTER COLUMN role DROP DEFAULT;

ALTER TABLE public.profiles 
ALTER COLUMN role TYPE public.app_role USING role::public.app_role;

ALTER TABLE public.profiles 
ALTER COLUMN role SET DEFAULT 'user'::public.app_role;

-- 3. Set owner role for specific email
UPDATE public.profiles 
SET role = 'owner'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'myne7x@gmail.com');

-- 4. Update tracking configuration for 12-digit format
UPDATE public.tracking_config 
SET prefix = '', padding_length = 12, current_seed = 56007890
WHERE id = (SELECT id FROM public.tracking_config ORDER BY created_at DESC LIMIT 1);

-- Insert default config if none exists
INSERT INTO public.tracking_config (prefix, padding_length, current_seed)
SELECT '', 12, 56007890
WHERE NOT EXISTS (SELECT 1 FROM public.tracking_config);

-- 5. Create countries table with 193+ countries
CREATE TABLE IF NOT EXISTS public.countries_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert countries (shortened for space, including major ones)
INSERT INTO public.countries_list (name, code) VALUES
('United States', 'US'), ('United Kingdom', 'GB'), ('Canada', 'CA'), ('Australia', 'AU'), ('Germany', 'DE'),
('France', 'FR'), ('Italy', 'IT'), ('Spain', 'ES'), ('Netherlands', 'NL'), ('Belgium', 'BE'),
('Switzerland', 'CH'), ('Austria', 'AT'), ('Sweden', 'SE'), ('Norway', 'NO'), ('Denmark', 'DK'),
('Finland', 'FI'), ('Poland', 'PL'), ('Czech Republic', 'CZ'), ('Hungary', 'HU'), ('Portugal', 'PT'),
('Greece', 'GR'), ('Ireland', 'IE'), ('Luxembourg', 'LU'), ('Malta', 'MT'), ('Cyprus', 'CY'),
('Estonia', 'EE'), ('Latvia', 'LV'), ('Lithuania', 'LT'), ('Slovenia', 'SI'), ('Slovakia', 'SK'),
('Croatia', 'HR'), ('Bulgaria', 'BG'), ('Romania', 'RO'), ('Russia', 'RU'), ('Ukraine', 'UA'),
('Belarus', 'BY'), ('Moldova', 'MD'), ('Georgia', 'GE'), ('Armenia', 'AM'), ('Azerbaijan', 'AZ'),
('Turkey', 'TR'), ('Japan', 'JP'), ('South Korea', 'KR'), ('China', 'CN'), ('India', 'IN'),
('Pakistan', 'PK'), ('Bangladesh', 'BD'), ('Sri Lanka', 'LK'), ('Nepal', 'NP'), ('Bhutan', 'BT'),
('Myanmar', 'MM'), ('Thailand', 'TH'), ('Vietnam', 'VN'), ('Cambodia', 'KH'), ('Laos', 'LA'),
('Malaysia', 'MY'), ('Singapore', 'SG'), ('Indonesia', 'ID'), ('Philippines', 'PH'), ('Brunei', 'BN'),
('Mongolia', 'MN'), ('Kazakhstan', 'KZ'), ('Uzbekistan', 'UZ'), ('Turkmenistan', 'TM'), ('Kyrgyzstan', 'KG'),
('Tajikistan', 'TJ'), ('Afghanistan', 'AF'), ('Iran', 'IR'), ('Iraq', 'IQ'), ('Saudi Arabia', 'SA'),
('United Arab Emirates', 'AE'), ('Qatar', 'QA'), ('Kuwait', 'KW'), ('Bahrain', 'BH'), ('Oman', 'OM'),
('Yemen', 'YE'), ('Jordan', 'JO'), ('Lebanon', 'LB'), ('Syria', 'SY'), ('Israel', 'IL'),
('Palestine', 'PS'), ('Egypt', 'EG'), ('Libya', 'LY'), ('Tunisia', 'TN'), ('Algeria', 'DZ'),
('Morocco', 'MA'), ('Sudan', 'SD'), ('South Sudan', 'SS'), ('Ethiopia', 'ET'), ('Eritrea', 'ER'),
('Somalia', 'SO'), ('Kenya', 'KE'), ('Uganda', 'UG'), ('Tanzania', 'TZ'), ('Rwanda', 'RW'),
('Burundi', 'BI'), ('Congo', 'CG'), ('Cameroon', 'CM'), ('Central African Republic', 'CF'), ('Chad', 'TD'),
('Niger', 'NE'), ('Nigeria', 'NG'), ('Benin', 'BJ'), ('Togo', 'TG'), ('Ghana', 'GH'),
('Burkina Faso', 'BF'), ('Mali', 'ML'), ('Senegal', 'SN'), ('Mauritania', 'MR'), ('Guinea', 'GN'),
('Guinea-Bissau', 'GW'), ('Sierra Leone', 'SL'), ('Liberia', 'LR'), ('Gambia', 'GM'), ('Cape Verde', 'CV'),
('South Africa', 'ZA'), ('Namibia', 'NA'), ('Botswana', 'BW'), ('Zimbabwe', 'ZW'), ('Zambia', 'ZM'),
('Malawi', 'MW'), ('Mozambique', 'MZ'), ('Madagascar', 'MG'), ('Mauritius', 'MU'), ('Seychelles', 'SC'),
('Comoros', 'KM'), ('Lesotho', 'LS'), ('Eswatini', 'SZ'), ('Angola', 'AO'), ('Gabon', 'GA'),
('Equatorial Guinea', 'GQ'), ('Sao Tome and Principe', 'ST'), ('Djibouti', 'DJ'), ('Brazil', 'BR'),
('Argentina', 'AR'), ('Chile', 'CL'), ('Uruguay', 'UY'), ('Paraguay', 'PY'), ('Bolivia', 'BO'),
('Peru', 'PE'), ('Ecuador', 'EC'), ('Colombia', 'CO'), ('Venezuela', 'VE'), ('Guyana', 'GY'),
('Suriname', 'SR'), ('Mexico', 'MX'), ('Guatemala', 'GT'), ('Belize', 'BZ'), ('El Salvador', 'SV'),
('Honduras', 'HN'), ('Nicaragua', 'NI'), ('Costa Rica', 'CR'), ('Panama', 'PA'), ('Cuba', 'CU'),
('Jamaica', 'JM'), ('Haiti', 'HT'), ('Dominican Republic', 'DO'), ('Barbados', 'BB'), ('Trinidad and Tobago', 'TT'),
('Bahamas', 'BS'), ('Antigua and Barbuda', 'AG'), ('Saint Kitts and Nevis', 'KN'), ('Saint Lucia', 'LC'),
('Saint Vincent and the Grenadines', 'VC'), ('Grenada', 'GD'), ('Dominica', 'DM'), ('New Zealand', 'NZ'),
('Fiji', 'FJ'), ('Papua New Guinea', 'PG'), ('Solomon Islands', 'SB'), ('Vanuatu', 'VU'),
('Samoa', 'WS'), ('Tonga', 'TO'), ('Kiribati', 'KI'), ('Tuvalu', 'TV'), ('Nauru', 'NR'),
('Palau', 'PW'), ('Marshall Islands', 'MH'), ('Micronesia', 'FM'), ('Iceland', 'IS'), ('Liechtenstein', 'LI'),
('Monaco', 'MC'), ('San Marino', 'SM'), ('Vatican City', 'VA'), ('Andorra', 'AD'), ('Albania', 'AL'),
('Bosnia and Herzegovina', 'BA'), ('Montenegro', 'ME'), ('Serbia', 'RS'), ('North Macedonia', 'MK')
ON CONFLICT (code) DO NOTHING;

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

-- 9. Create invoice metadata table
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