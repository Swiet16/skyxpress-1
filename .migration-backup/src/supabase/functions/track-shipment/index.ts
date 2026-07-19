import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TrackingRequest {
  tracking_number: string;
  email: string;
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

    const { tracking_number, email }: TrackingRequest = await req.json();

    console.log('Tracking request for:', tracking_number);

    // First try to find the shipment in database
    const { data: shipment, error: shipmentError } = await supabaseClient
      .from('shipments')
      .select('*')
      .eq('tracking_number', tracking_number)
      .single();

    if (shipmentError && shipmentError.code !== 'PGRST116') {
      console.error('Database error:', shipmentError);
      throw shipmentError;
    }

    let shipmentData;

    if (shipment) {
      // Return actual shipment data
      shipmentData = {
        tracking_number: shipment.tracking_number,
        origin: shipment.origin,
        destination: shipment.destination,
        current_status: shipment.current_status,
        estimated_delivery: shipment.estimated_delivery,
        events: shipment.events || []
      };
    } else {
      // Generate simulated tracking data for demo purposes
      console.log('Generating simulated tracking data for:', tracking_number);
      
      const currentDate = new Date();
      const deliveryDate = new Date(currentDate);
      deliveryDate.setDate(currentDate.getDate() + 3);

      // Generate realistic tracking events
      const events = [
        {
          timestamp: new Date(currentDate.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'Order Processed',
          location: 'Distribution Center - New York',
          description: 'Shipment information received and order processed'
        },
        {
          timestamp: new Date(currentDate.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'In Transit',
          location: 'Sorting Facility - Chicago',
          description: 'Package has left the origin facility and is in transit'
        },
        {
          timestamp: new Date(currentDate.getTime() - 12 * 60 * 60 * 1000).toISOString(),
          status: 'In Transit',
          location: 'Distribution Center - Los Angeles',
          description: 'Package has arrived at the destination facility'
        },
        {
          timestamp: new Date().toISOString(),
          status: 'Out for Delivery',
          location: 'Local Delivery Hub - Los Angeles',
          description: 'Package is out for delivery and will be delivered today'
        }
      ];

      shipmentData = {
        tracking_number,
        origin: 'New York, NY, USA',
        destination: 'Los Angeles, CA, USA',
        current_status: 'Out for Delivery',
        estimated_delivery: deliveryDate.toISOString().split('T')[0],
        events
      };

      // Optionally save the simulated shipment to database for future reference
      try {
        await supabaseClient
          .from('shipments')
          .insert({
            tracking_number,
            origin: shipmentData.origin,
            destination: shipmentData.destination,
            service_type: 'Standard',
            current_status: shipmentData.current_status,
            estimated_delivery: shipmentData.estimated_delivery,
            events: shipmentData.events
          });
      } catch (error) {
        console.log('Note: Could not save simulated shipment (this is fine for demo)');
      }
    }

    console.log('Returning tracking data for:', tracking_number);

    return new Response(
      JSON.stringify(shipmentData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in track-shipment function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        message: 'Failed to track shipment. Please verify your tracking number and try again.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
};

serve(handler);