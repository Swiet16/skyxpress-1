import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Package, MapPin, Calendar, Clock, Truck, CheckCircle2, AlertCircle, Plane } from "lucide-react";
import { Json } from "@/integrations/supabase/types";

interface TrackingResult {
  tracking_number: string;
  current_status: string;
  origin: string;
  destination: string;
  service_type: string;
  estimated_delivery: string;
  events: Json;
  detailed_status: Json;
}

const PublicTracking = () => {
  const [trackingId, setTrackingId] = useState("");
  const [trackingResult, setTrackingResult] = useState<TrackingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const { toast } = useToast();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!trackingId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a tracking ID or reference ID",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setSearched(true);
    
    try {
      // Search by tracking ID OR reference ID
      const { data, error } = await supabase
        .from('parcels')
        .select('*')
        .or(`tracking_id.eq.${trackingId.trim()},reference_id.eq.${trackingId.trim()}`)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // Map to TrackingResult format
        setTrackingResult({
          tracking_number: data.tracking_id,
          current_status: data.shipping_status || data.current_status,
          origin: data.from_country,
          destination: data.to_country,
          service_type: data.service_type || 'standard',
          estimated_delivery: data.estimated_delivery || '',
          events: data.status_timeline || [],
          detailed_status: data.detailed_status || {}
        });
      } else {
        setTrackingResult(null);
        toast({
          title: "Not Found",
          description: "No shipment found with this tracking ID or reference ID",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setTrackingResult(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-500 text-white';
      case 'in_transit': return 'bg-blue-500 text-white';
      case 'delayed': return 'bg-red-500 text-white';
      case 'out_for_delivery': return 'bg-purple-500 text-white';
      case 'processing': return 'bg-yellow-500 text-white';
      case 'customs': return 'bg-orange-500 text-white';
      case 'custom_hold': return 'bg-red-600 text-white';
      case 'flight_departure': return 'bg-sky-500 text-white';
      case 'flight_arrived': return 'bg-indigo-500 text-white';
      case 'picked_up': return 'bg-teal-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered': return <CheckCircle2 className="h-5 w-5" />;
      case 'in_transit': return <Truck className="h-5 w-5" />;
      case 'out_for_delivery': return <Truck className="h-5 w-5" />;
      case 'customs': return <MapPin className="h-5 w-5" />;
      case 'custom_hold': return <AlertCircle className="h-5 w-5" />;
      case 'flight_departure': return <Plane className="h-5 w-5" />;
      case 'flight_arrived': return <Plane className="h-5 w-5" />;
      case 'picked_up': return <Package className="h-5 w-5" />;
      default: return <Clock className="h-5 w-5" />;
    }
  };

  const getStatusIconBg = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100';
      case 'in_transit': return 'bg-blue-100';
      case 'delayed': return 'bg-red-100';
      case 'out_for_delivery': return 'bg-purple-100';
      case 'processing': return 'bg-yellow-100';
      case 'customs': return 'bg-orange-100';
      case 'custom_hold': return 'bg-red-100';
      case 'flight_departure': return 'bg-sky-100';
      case 'flight_arrived': return 'bg-indigo-100';
      case 'picked_up': return 'bg-teal-100';
      default: return 'bg-gray-100';
    }
  };

  // Group events by date
  const groupEventsByDate = (events: any[]) => {
    const grouped: { [key: string]: any[] } = {};
    events.forEach((event: any) => {
      const date = new Date(event.timestamp).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(event);
    });
    return grouped;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Search Form */}
      <Card className="border-none shadow-lg">
        <CardHeader className="text-center pb-4">
          <CardTitle className="flex items-center justify-center gap-2 text-2xl font-bold text-gray-900">
            <Search className="h-6 w-6 text-blue-600" />
            Track Your Shipment
          </CardTitle>
          <p className="text-gray-600 mt-2 text-sm">
            Enter your Reference ID or Tracking ID to get real-time updates
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-3 max-w-md mx-auto">
            <Input
              type="text"
              placeholder="Enter tracking number"
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value)}
              className="flex-1 h-12 text-base"
            />
            <Button type="submit" disabled={loading} className="h-12 px-8">
              {loading ? "Searching..." : "Track"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Tracking Results */}
      {trackingResult && (
        <div className="space-y-6">
          {/* Shipment Overview */}
          <Card className="border-none shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between flex-wrap gap-3">
                <span className="font-semibold text-lg text-gray-900">
                  Tracking: {trackingResult.tracking_number}
                </span>
                <Badge className={`${getStatusColor(trackingResult.current_status)} px-4 py-1.5 rounded-full text-sm font-semibold`}>
                  {trackingResult.current_status.replace('_', ' ').toUpperCase()}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-50 p-2.5 rounded-lg">
                    <MapPin className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Route</div>
                    <div className="font-semibold text-gray-900">
                      {trackingResult.origin} → {trackingResult.destination}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="bg-purple-50 p-2.5 rounded-lg">
                    <Truck className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Service Type</div>
                    <div className="font-semibold text-gray-900 capitalize">
                      {trackingResult.service_type.replace('_', ' ')}
                    </div>
                  </div>
                </div>
                
                {trackingResult.estimated_delivery && (
                  <div className="flex items-start gap-3">
                    <div className="bg-green-50 p-2.5 rounded-lg">
                      <Calendar className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Est. Delivery</div>
                      <div className="font-semibold text-gray-900">
                        {new Date(trackingResult.estimated_delivery).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Current Location */}
              {trackingResult.detailed_status && typeof trackingResult.detailed_status === 'object' && 
               (trackingResult.detailed_status as any)?.location && (
                <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    <span className="font-semibold text-blue-900">Current Location</span>
                  </div>
                  <div className="text-gray-900">{(trackingResult.detailed_status as any).location}</div>
                  {(trackingResult.detailed_status as any).notes && (
                    <div className="text-sm text-gray-600 mt-1">
                      {(trackingResult.detailed_status as any).notes}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tracking Timeline */}
          {trackingResult.events && Array.isArray(trackingResult.events) && trackingResult.events.length > 0 && (
            <Card className="border-none shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold text-blue-600">
                  Tracking History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Sort by timestamp descending and group by date */}
                  {Object.entries(
                    groupEventsByDate(
                      (trackingResult.events as any[]).sort(
                        (a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                      )
                    )
                  ).map(([date, events]: [string, any], dateIndex: number) => (
                    <div key={dateIndex} className="space-y-4">
                      {/* Date Header */}
                      <div className="text-sm font-semibold text-gray-700 px-1">
                        {date}
                      </div>

                      {/* Events for this date */}
                      {events.map((event: any, eventIndex: number) => {
                        const isFirst = dateIndex === 0 && eventIndex === 0;
                        return (
                          <div key={eventIndex} className="relative flex items-start gap-4 pl-1">
                            {/* Timeline Icon */}
                            <div className="relative flex-shrink-0">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getStatusIconBg(event.status)}`}>
                                <div className={`${getStatusColor(event.status)} rounded-full p-1.5`}>
                                  {getStatusIcon(event.status)}
                                </div>
                              </div>
                              {/* Timeline line */}
                              {eventIndex < events.length - 1 && (
                                <div className="absolute left-6 top-12 w-0.5 h-16 bg-gray-200" />
                              )}
                            </div>
                            
                            <div className="flex-1 pb-4">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="font-bold text-gray-900 text-base">
                                  {event.status.replace('_', ' ').toUpperCase()}
                                </span>
                                {isFirst && (
                                  <Badge className="bg-orange-500 text-white px-3 py-0.5 rounded-full text-xs font-semibold">
                                    Latest
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="text-sm text-gray-500 mb-2">
                                {new Date(event.timestamp).toLocaleString('en-US', {
                                  month: 'numeric',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true
                                })}
                              </div>
                              
                              {event.location && (
                                <div className="text-sm text-gray-700 mb-1 flex items-start gap-1">
                                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                                  <span>{event.location}</span>
                                </div>
                              )}
                              
                              {event.notes && (
                                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg mt-2">
                                  {event.notes}
                                </div>
                              )}
                              
                              {event.admin_comment && (
                                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg mt-2">
                                  {event.admin_comment}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* No results message */}
      {searched && !trackingResult && !loading && (
        <Card className="border-none shadow-lg">
          <CardContent className="text-center py-12">
            <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Shipment Not Found
            </h3>
            <p className="text-gray-600 mb-4">
              We couldn't find a shipment with the ID "{trackingId}"
            </p>
            <p className="text-sm text-gray-500">
              Please check your Reference ID or Tracking ID and try again.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PublicTracking;