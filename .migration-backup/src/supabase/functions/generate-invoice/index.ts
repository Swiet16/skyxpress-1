import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvoiceRequest {
  quote_id: string;
  customer_name: string;
  customer_address?: string;
  currency?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const { quote_id, customer_name, customer_address, currency = 'USD' }: InvoiceRequest = await req.json();

    // Get the quote details
    const { data: quote, error: quoteError } = await supabaseClient
      .from('quotes')
      .select('*')
      .eq('id', quote_id)
      .single();

    if (quoteError || !quote) {
      throw new Error('Quote not found');
    }

    // Get currency rates
    const { data: pricingConfig } = await supabaseClient
      .from('pricing_config')
      .select('currency_rates')
      .single();

    const currencyRates = pricingConfig?.currency_rates || { USD: 1.0, EUR: 0.85, GBP: 0.75, AED: 3.67, PKR: 285.0 };
    const exchangeRate = currencyRates[currency] || 1.0;
    const convertedAmount = Math.round(quote.price_estimate * exchangeRate * 100) / 100;

    // Generate barcode data (simple format: tracking number + quote id)
    // Generate numeric tracking ID
    const { data: trackingNumber, error: trackingError } = await supabaseClient
      .rpc('generate_numeric_tracking');

    if (trackingError) throw trackingError;

    const barcodeData = trackingNumber;

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabaseClient
      .from('invoices')
      .insert({
        quote_id: quote.id,
        user_id: quote.user_id,
        customer_name,
        customer_email: quote.email,
        customer_phone: quote.phone,
        customer_address,
        origin_country: quote.origin_country,
        destination_country: quote.destination_country,
        weight: quote.weight,
        length: quote.length,
        width: quote.width,
        height: quote.height,
        service_type: quote.service_type,
        base_amount: quote.price_estimate,
        currency,
        exchange_rate: exchangeRate,
        total_amount: convertedAmount,
        tax_amount: Math.round(convertedAmount * 0.1 * 100) / 100, // 10% tax
        final_amount: Math.round(convertedAmount * 1.1 * 100) / 100,
        barcode_data: barcodeData,
        tracking_number: trackingNumber
      })
      .select()
      .single();

    if (invoiceError) {
      console.error('Error creating invoice:', invoiceError);
      throw invoiceError;
    }

    // Create invoice items
    const items = [
      {
        invoice_id: invoice.id,
        description: `Shipping from ${quote.origin_country} to ${quote.destination_country}`,
        quantity: quote.weight,
        unit_price: Math.round((quote.price_estimate / quote.weight) * 100) / 100,
        total_price: quote.price_estimate
      }
    ];

    if (quote.length && quote.width && quote.height) {
      items.push({
        invoice_id: invoice.id,
        description: 'Dimensional Weight Calculation',
        quantity: 1,
        unit_price: 0,
        total_price: 0
      });
    }

    const { error: itemsError } = await supabaseClient
      .from('invoice_items')
      .insert(items);

    if (itemsError) {
      console.error('Error creating invoice items:', itemsError);
    }

    // Update quote to mark invoice as generated
    await supabaseClient
      .from('quotes')
      .update({ invoice_generated: true })
      .eq('id', quote_id);

    return new Response(
      JSON.stringify({
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        tracking_number: invoice.tracking_number,
        barcode_data: invoice.barcode_data,
        total_amount: invoice.final_amount,
        currency: invoice.currency,
        message: 'Invoice generated successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in generate-invoice function:', error);
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