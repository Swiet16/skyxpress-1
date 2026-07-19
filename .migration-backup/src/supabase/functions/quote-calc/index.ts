import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QuoteRequest {
  origin_country: string;
  destination_country: string;
  weight: number;
  length?: number;
  width?: number;
  height?: number;
  service_type: string;
  email: string;
  phone?: string;
  user_id?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const {
      origin_country,
      destination_country,
      weight,
      length,
      width,
      height,
      service_type,
      email,
      phone,
      user_id
    }: QuoteRequest = await req.json();

    console.log('Processing quote request:', { origin_country, destination_country, weight, service_type });

    // Fetch current pricing configuration
    const { data: pricingConfig, error: pricingError } = await supabaseClient
      .from('pricing_config')
      .select('*')
      .single();

    if (pricingError) {
      console.error('Error fetching pricing config:', pricingError);
      // Fallback to default pricing if config not available
    }

    const baseRatePerKg = pricingConfig?.base_rate_per_kg || 20.00;
    const serviceMultipliers = pricingConfig?.service_multipliers || {
      'economy': 1.0,
      'priority': 1.5,
      'express': 1.8,
      'airfreight': 2.0
    };
    const regionMultipliers = pricingConfig?.region_multipliers || {
      'domestic': 1.0,
      'international': 1.5,
      'remote': 2.0
    };

    // Get service multiplier
    const serviceMultiplier = serviceMultipliers[service_type.toLowerCase()] || 1.2;

    // Calculate region multiplier
    const continentGroups = {
      'US': 'north_america',
      'CA': 'north_america', 
      'MX': 'north_america',
      'GB': 'europe',
      'DE': 'europe',
      'FR': 'europe',
      'ES': 'europe',
      'IT': 'europe',
      'JP': 'asia',
      'CN': 'asia',
      'IN': 'asia',
      'SG': 'asia',
      'TH': 'asia',
      'AU': 'oceania',
      'NZ': 'oceania'
    };

    const originRegion = continentGroups[origin_country as keyof typeof continentGroups] || 'other';
    const destRegion = continentGroups[destination_country as keyof typeof continentGroups] || 'other';
    
    let regionMultiplier = regionMultipliers['domestic'] || 1.0;
    if (originRegion !== destRegion) {
      regionMultiplier = regionMultipliers['international'] || 1.5;
    }

    // Calculate volumetric weight if dimensions provided
    let volumetricWeight = weight;
    if (length && width && height) {
      const volumetric = (length * width * height) / 5000; // Volumetric divisor
      volumetricWeight = Math.max(weight, volumetric);
    }

    const finalPrice = Math.round(
      (baseRatePerKg * volumetricWeight) * serviceMultiplier * regionMultiplier
    );

    // Save quote to database
    const { data: quoteData, error: quoteError } = await supabaseClient
      .from('quotes')
      .insert({
        user_id: user_id || null,
        origin_country,
        destination_country,
        weight,
        length,
        width,
        height,
        service_type,
        email,
        phone,
        price_estimate: finalPrice,
        status: 'pending'
      })
      .select()
      .single();

    if (quoteError) {
      console.error('Error saving quote:', quoteError);
      throw quoteError;
    }

    console.log('Quote saved successfully:', quoteData);

    return new Response(
      JSON.stringify({
        quote_id: quoteData.id,
        price_estimate: finalPrice,
        currency: 'USD',
        service_type,
        estimated_days: service_type === 'express' ? '1-2' : service_type === 'priority' ? '2-4' : '5-7',
        message: 'Quote calculated successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in quote-calc function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
};

serve(handler);