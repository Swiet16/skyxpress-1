import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Search,
  Package,
  PackageCheck,
  Truck,
  Send,
  CheckCircle2,
  Clock,
  MapPin,
  Plane,
  XCircle,
  MessageSquareText,
} from "lucide-react";

interface TrackingResult {
  tracking_id: string;
  sender_name: string;
  receiver_name: string;
  current_status: string;
  from_country: string;
  to_country: string;
  status_timeline: any[];
  live_route: boolean;
  route_checkpoints: any[];
}

// Helper function to group events by date
const groupEventsByDate = (timeline: any[]) => {
  const grouped: { [key: string]: any[] } = {};

  [...timeline]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .forEach((event) => {
      const date = new Date(event.timestamp);
      const dateKey = date.toLocaleDateString("en-US", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });

  return grouped;
};

// ---- Brand tokens -----------------------------------------------------
// Navy: deep sky at night · Orange: SkyXpress mark · Blue: daytime sky
const TOKENS = {
  navy: "#0B2545",
  navyDeep: "#071A33",
  blue: "#2E86FF",
  orange: "#FF6A1A",
  cloud: "#F5F8FC",
  mist: "#E9F0FA",
  slate: "#5B6B82",
  green: "#17A673",
  red: "#E5484D",
};

// ---- Journey stages (the signature "flight path") ----------------------
const STAGES = [
  { key: "placed", label: "Order Placed", icon: Clock },
  { key: "picked_up", label: "Picked Up", icon: PackageCheck },
  { key: "in_transit", label: "In Transit", icon: Truck },
  { key: "out_for_delivery", label: "Out for Delivery", icon: Send },
  { key: "delivered", label: "Delivered", icon: CheckCircle2 },
] as const;

// Maps every possible raw status onto one of the 5 journey stages above.
const STATUS_TO_STAGE: Record<string, number> = {
  created: 0,
  pending: 0,
  approved: 0,
  picked_up: 1,
  processing: 1,
  in_transit: 2,
  customs: 2,
  custom_hold: 2,
  flight_departure: 2,
  flight_arrived: 2,
  flight_offload: 2,
  in_custom_clearance: 2,
  arrived_hub: 2,
  out_for_delivery: 3,
  delivered: 4,
};

const getStageIndex = (status: string) => STATUS_TO_STAGE[status] ?? 0;

const formatStatusLabel = (status: string) =>
  status
    .replace(/_/g, " ")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

export const TrackingSection = () => {
  const [trackingQuery, setTrackingQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [trackingResult, setTrackingResult] = useState<TrackingResult | null>(null);
  const [countryMap, setCountryMap] = useState<Record<string, string>>({});
  const { toast } = useToast();

  // Country code -> full name lookup, so routes read "Pakistan → United Kingdom"
  // instead of raw codes like "PK → GB"
  useEffect(() => {
    const fetchCountries = async () => {
      const { data, error } = await supabase.from("countries").select("code, name");
      if (error) {
        console.error("Error fetching countries:", error);
        return;
      }
      const map: Record<string, string> = {};
      (data || []).forEach((c: { code: string; name: string }) => {
        map[c.code] = c.name;
      });
      setCountryMap(map);
    };
    fetchCountries();
  }, []);

  const getCountryName = (code: string) => {
    if (!code) return "—";
    return countryMap[code] || code;
  };

  const handleTrackParcel = async () => {
    if (!trackingQuery.trim()) {
      toast({
        title: "Please enter tracking ID",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Search by tracking ID OR reference ID
      const { data: parcelData } = await supabase
        .from("parcels")
        .select("*")
        .or(`tracking_id.eq.${trackingQuery.trim()},reference_id.eq.${trackingQuery.trim()}`)
        .single();

      if (parcelData) {
        // Check if request is approved before showing tracking
        if (parcelData.request_status !== "approved") {
          toast({
            title: "Request Pending",
            description: "This shipment request is still pending approval from admin.",
            variant: "default",
          });
          setTrackingResult(null);
        } else {
          setTrackingResult({
            tracking_id: parcelData.tracking_id,
            sender_name: parcelData.sender_name,
            receiver_name: parcelData.receiver_name,
            current_status: parcelData.shipping_status || parcelData.current_status,
            from_country: parcelData.from_country,
            to_country: parcelData.to_country,
            status_timeline: parcelData.status_timeline || [],
            live_route: parcelData.live_route || false,
            route_checkpoints: parcelData.route_checkpoints || [],
          });

          toast({
            title: "Parcel found!",
            description: `Status: ${parcelData.shipping_status || parcelData.current_status}`,
          });
        }
      } else {
        toast({
          title: "Parcel not found",
          description: "Please check your tracking ID and try again.",
          variant: "destructive",
        });
        setTrackingResult(null);
      }
    } catch (error) {
      console.error("Tracking error:", error);
      toast({
        title: "Error",
        description: "Unable to track parcel. Please try again.",
        variant: "destructive",
      });
      setTrackingResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const isCancelled = trackingResult?.current_status === "cancelled";
  const stageIndex = trackingResult && !isCancelled ? getStageIndex(trackingResult.current_status) : 0;
  const progressPercent = STAGES.length > 1 ? (stageIndex / (STAGES.length - 1)) * 100 : 0;

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#F5F8FC] via-white to-[#E9F0FA] py-20">
      {/* Ambient background decoration: faint dashed flight paths */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.35]">
        <svg className="h-full w-full" preserveAspectRatio="none">
          <path
            d="M -50 120 Q 400 40, 900 160 T 1600 100"
            fill="none"
            stroke={TOKENS.blue}
            strokeWidth="2"
            strokeDasharray="2 10"
            strokeLinecap="round"
          />
          <path
            d="M -50 520 Q 500 620, 1000 480 T 1700 560"
            fill="none"
            stroke={TOKENS.orange}
            strokeWidth="2"
            strokeDasharray="2 10"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div className="absolute -top-24 right-0 h-96 w-96 rounded-full bg-[#2E86FF]/10 blur-3xl" />
      <div className="absolute -bottom-24 left-0 h-96 w-96 rounded-full bg-[#FF6A1A]/10 blur-3xl" />

      <div className="container relative mx-auto px-4">
        <div className="mx-auto max-w-4xl">
          {/* Tracking Input */}
          <Card className="mb-8 overflow-hidden border-0 bg-white/90 shadow-xl backdrop-blur-sm">
            <div className="h-1.5 w-full bg-gradient-to-r from-[#2E86FF] via-[#0B2545] to-[#FF6A1A]" />
            <CardHeader className="pb-8 text-center">
              <div className="mb-6 flex justify-center">
                <div className="relative rounded-2xl bg-gradient-to-br from-[#0B2545] to-[#2E86FF] p-5 shadow-lg">
                  <Search className="h-10 w-10 text-white" />
                  <span className="absolute -right-1 -top-1 flex h-4 w-4">
                    <span className="tracking-ping absolute inline-flex h-full w-full rounded-full bg-[#FF6A1A] opacity-75" />
                    <span className="relative inline-flex h-4 w-4 rounded-full bg-[#FF6A1A]" />
                  </span>
                </div>
              </div>
              <CardTitle className="text-4xl font-extrabold tracking-tight text-[#0B2545]">
                Track Your Parcel <span aria-hidden>📦</span>
              </CardTitle>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-[#5B6B82]">
                Enter your Reference ID or Tracking ID to follow your shipment's journey, step by step
              </p>
            </CardHeader>
            <CardContent className="pb-8 pt-0">
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="relative flex-1">
                  <Input
                    placeholder="Enter Reference ID (e.g., 2119901) or Tracking ID..."
                    value={trackingQuery}
                    onChange={(e) => setTrackingQuery(e.target.value)}
                    className="h-16 rounded-2xl border-2 border-[#0B2545]/10 bg-white pl-6 pr-14 text-lg shadow-sm transition-all duration-200 placeholder:text-[#5B6B82]/60 focus:border-[#2E86FF] focus:ring-[#2E86FF]/20"
                    onKeyPress={(e) => e.key === "Enter" && handleTrackParcel()}
                  />
                  <Search className="absolute right-5 top-1/2 h-6 w-6 -translate-y-1/2 transform text-[#5B6B82]/50" />
                </div>
                <Button
                  onClick={handleTrackParcel}
                  disabled={isLoading}
                  size="lg"
                  className="h-16 transform rounded-2xl bg-gradient-to-r from-[#FF6A1A] to-[#2E86FF] px-12 text-lg font-semibold text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl disabled:hover:translate-y-0"
                >
                  {isLoading ? (
                    <>
                      <div className="mr-3 h-6 w-6 animate-spin rounded-full border-[3px] border-white border-t-transparent" />
                      Tracking...
                    </>
                  ) : (
                    <>
                      <Search className="mr-3 h-5 w-5" />
                      Track Parcel
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tracking Results */}
          {trackingResult && (
            <Card className="overflow-hidden border-0 bg-white shadow-2xl">
              <CardHeader className="bg-gradient-to-r from-[#0B2545] to-[#123A6B] pb-8">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl font-bold text-white">Parcel Details</CardTitle>
                  <Badge
                    className="rounded-full px-4 py-2 text-sm font-semibold text-white"
                    style={{
                      backgroundColor: isCancelled ? TOKENS.red : TOKENS.orange,
                    }}
                  >
                    {formatStatusLabel(trackingResult.current_status)}
                  </Badge>
                </div>
                <div className="mt-2 flex items-center gap-2 text-sm text-white/70">
                  <span className="font-mono">{trackingResult.tracking_id}</span>
                  <span>•</span>
                  <span>
                    {getCountryName(trackingResult.from_country)} → {getCountryName(trackingResult.to_country)}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="space-y-8 pt-8">
                {/* Parcel Info */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-[#5B6B82]">Tracking ID</p>
                    <p className="font-mono font-semibold text-[#0B2545]">{trackingResult.tracking_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#5B6B82]">Route</p>
                    <p className="font-semibold text-[#0B2545]">
                      {getCountryName(trackingResult.from_country)} → {getCountryName(trackingResult.to_country)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#5B6B82]">Sender</p>
                    <p className="font-semibold text-[#0B2545]">{trackingResult.sender_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#5B6B82]">Receiver</p>
                    <p className="font-semibold text-[#0B2545]">{trackingResult.receiver_name}</p>
                  </div>
                </div>

                {/* Signature element: animated flight-path parcel tracker */}
                {isCancelled ? (
                  <div className="flex items-center gap-4 rounded-2xl border border-[#E5484D]/20 bg-[#E5484D]/5 p-6">
                    <XCircle className="h-10 w-10 flex-shrink-0 text-[#E5484D]" />
                    <div>
                      <p className="font-semibold text-[#E5484D]">This shipment was cancelled</p>
                      <p className="text-sm text-[#5B6B82]">
                        Contact support if you believe this is a mistake.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-[#0B2545]/5 bg-gradient-to-b from-white to-[#F5F8FC] p-6 pt-10 sm:p-8 sm:pt-12">
                    <div className="mb-8 flex items-center justify-between gap-3 text-xs font-medium uppercase tracking-wide text-[#5B6B82]">
                      <span className="flex min-w-0 max-w-[45%] items-center gap-1.5">
                        <Plane className="h-3.5 w-3.5 flex-shrink-0 -rotate-45 text-[#2E86FF]" />
                        <span className="truncate">{getCountryName(trackingResult.from_country)}</span>
                      </span>
                      <span className="flex min-w-0 max-w-[45%] items-center justify-end gap-1.5">
                        <span className="truncate">{getCountryName(trackingResult.to_country)}</span>
                        <Plane className="h-3.5 w-3.5 flex-shrink-0 rotate-45 text-[#FF6A1A]" />
                      </span>
                    </div>

                    <div className="relative">
                      {/* Track base line */}
                      <div className="absolute left-0 right-0 top-5 h-1 rounded-full bg-[#0B2545]/10 sm:top-6" />
                      {/* Filled progress line */}
                      <div
                        className="absolute left-0 top-5 h-1 rounded-full bg-gradient-to-r from-[#2E86FF] to-[#FF6A1A] transition-all duration-700 ease-out sm:top-6"
                        style={{ width: `${progressPercent}%` }}
                      />
                      {/* Traveling parcel marker */}
                      <div
                        className="parcel-marker absolute -top-1 flex -translate-x-1/2 flex-col items-center transition-all duration-700 ease-out"
                        style={{ left: `${progressPercent}%` }}
                        aria-hidden
                      >
                        <span className="parcel-bounce flex h-9 w-9 items-center justify-center rounded-full bg-white text-xl shadow-[0_4px_14px_rgba(11,37,69,0.25)] ring-2 ring-[#FF6A1A]">
                          📦
                        </span>
                        <span className="parcel-pulse mt-[-2px] h-2 w-2 rounded-full bg-[#FF6A1A]" />
                      </div>

                      {/* Stage nodes */}
                      <div className="relative flex justify-between pt-14 sm:pt-16">
                        {STAGES.map((stage, index) => {
                          const StageIcon = stage.icon;
                          const isDone = index < stageIndex;
                          const isCurrent = index === stageIndex;
                          const isUpcoming = index > stageIndex;

                          return (
                            <div key={stage.key} className="flex w-0 flex-1 flex-col items-center text-center">
                              <div
                                className={[
                                  "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm transition-colors duration-500",
                                  isDone
                                    ? "border-[#17A673] bg-[#17A673] text-white"
                                    : isCurrent
                                    ? "border-[#FF6A1A] bg-white text-[#FF6A1A] shadow-[0_0_0_6px_rgba(255,106,26,0.12)]"
                                    : "border-[#0B2545]/15 bg-white text-[#0B2545]/25",
                                ].join(" ")}
                              >
                                {isDone ? (
                                  <CheckCircle2 className="h-5 w-5" />
                                ) : (
                                  <StageIcon className="h-4.5 w-4.5" />
                                )}
                              </div>
                              <p
                                className={[
                                  "mt-2 max-w-[5.5rem] text-[11px] font-semibold leading-tight sm:text-xs",
                                  isUpcoming ? "text-[#5B6B82]/60" : "text-[#0B2545]",
                                ].join(" ")}
                              >
                                {stage.label}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Status Timeline - detailed history */}
                {trackingResult.status_timeline.length > 0 && (
                  <div className="rounded-2xl bg-[#F5F8FC] p-6">
                    <h3 className="mb-6 text-xl font-bold text-[#0B2545]">Tracking History</h3>
                    <div className="space-y-8">
                      {Object.entries(groupEventsByDate(trackingResult.status_timeline)).map(
                        ([date, events], dateIndex) => (
                          <div key={dateIndex}>
                            {/* Date Header */}
                            <h4 className="mb-4 text-lg font-bold text-[#0B2545]/80">{date}</h4>

                            {/* Events for this date */}
                            <div className="space-y-0">
                              {events.map((event, eventIndex) => (
                                <div key={eventIndex} className="relative flex items-start gap-4">
                                  {/* Time on the left */}
                                  <div className="w-24 flex-shrink-0 text-right">
                                    <p className="text-base font-medium text-[#5B6B82]">
                                      {new Date(event.timestamp).toLocaleString("en-US", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        hour12: true,
                                      })}
                                    </p>
                                  </div>

                                  {/* Dot with vertical line */}
                                  <div className="relative flex flex-shrink-0 flex-col items-center">
                                    {eventIndex !== 0 && (
                                      <div className="absolute bottom-1/2 mb-2 h-6 w-0.5 bg-[#2E86FF]/30" />
                                    )}
                                    <div className="z-10 h-4 w-4 rounded-full border-2 border-[#2E86FF] bg-[#2E86FF]" />
                                    {eventIndex !== events.length - 1 && (
                                      <div className="absolute top-1/2 mt-2 h-full w-0.5 bg-[#2E86FF]/30" />
                                    )}
                                  </div>

                                  {/* Status info */}
                                  <div className="flex-1 pb-6">
                                    <p className="mb-1 text-base font-semibold text-[#0B2545]">
                                      {formatStatusLabel(event.status)}
                                    </p>
                                    {event.location && (
                                      <p className="flex items-center gap-1.5 text-sm text-[#5B6B82]">
                                        <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-[#2E86FF]" />
                                        {event.location}
                                      </p>
                                    )}
                                    {event.admin_comment && (
                                      <div className="mt-2 flex items-start gap-2 rounded-lg border border-[#FF6A1A]/20 bg-[#FF6A1A]/5 p-3">
                                        <MessageSquareText className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#FF6A1A]" />
                                        <div>
                                          <p className="text-xs font-semibold uppercase tracking-wide text-[#FF6A1A]">
                                            Admin Note
                                          </p>
                                          <p className="mt-0.5 text-sm text-[#0B2545]/80">
                                            {event.admin_comment}
                                          </p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Live Route Map Placeholder */}
                {trackingResult.live_route && trackingResult.route_checkpoints.length > 0 && (
                  <div className="rounded-2xl border border-[#2E86FF]/10 bg-gradient-to-br from-[#2E86FF]/5 to-[#FF6A1A]/5 p-6">
                    <h3 className="mb-4 font-semibold text-[#0B2545]">Live Route</h3>
                    <div className="rounded-lg border border-[#2E86FF]/10 bg-white/70 p-6 text-center">
                      <div className="mx-auto mb-4 w-fit rounded-full bg-gradient-to-br from-[#2E86FF]/20 to-[#FF6A1A]/20 p-4">
                        <MapPin className="h-12 w-12 text-[#2E86FF]" />
                      </div>
                      <p className="text-[#5B6B82]">
                        Live route map with {trackingResult.route_checkpoints.length} checkpoints
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Scoped animations for the parcel tracker */}
      <style>{`
        @keyframes parcelBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes parcelPulseDot {
          0% { transform: scale(0.9); opacity: 0.9; }
          70% { transform: scale(2.4); opacity: 0; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        @keyframes trackingPing {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        .parcel-bounce {
          animation: parcelBounce 1.6s ease-in-out infinite;
        }
        .parcel-pulse {
          position: relative;
        }
        .parcel-pulse::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: 9999px;
          background: ${TOKENS.orange};
          animation: parcelPulseDot 1.8s ease-out infinite;
        }
        .tracking-ping {
          animation: trackingPing 1.6s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .parcel-bounce,
          .parcel-pulse::after,
          .tracking-ping {
            animation: none !important;
          }
        }
      `}</style>
    </section>
  );
};
