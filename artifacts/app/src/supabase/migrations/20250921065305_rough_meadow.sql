/*
  # Update pricing configuration with PKR currency

  1. Updates
    - Add PKR currency to pricing config
    - Update currency rates with current PKR rate

  2. Security
    - Maintain existing RLS policies
*/

-- Update pricing config to include PKR currency
UPDATE pricing_config 
SET currency_rates = jsonb_set(
  currency_rates,
  '{PKR}',
  '285.0'::jsonb
)
WHERE id = (SELECT id FROM pricing_config LIMIT 1);

-- If no pricing config exists, create one
INSERT INTO pricing_config (
  base_rate_per_kg,
  currency_rates,
  service_multipliers,
  region_multipliers
) 
SELECT 
  20.00,
  '{"USD": 1.0, "EUR": 0.85, "GBP": 0.75, "AED": 3.67, "PKR": 285.0}'::jsonb,
  '{"economy": 1.0, "priority": 1.5, "express": 1.8, "airfreight": 2.0}'::jsonb,
  '{"domestic": 1.0, "international": 1.5, "remote": 2.0}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM pricing_config);