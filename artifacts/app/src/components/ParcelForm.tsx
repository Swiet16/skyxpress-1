import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Package, Plus, Trash2, Search, History } from "lucide-react";

interface ParcelFormProps {
  onSuccess: () => void;
  parcel?: any; // Optional parcel for edit mode
}

interface Country {
  code: string;
  name: string;
  continent?: string;
}

interface FormData {
  reference_id?: string;
  tracking_id: string;
  sender_name: string;
  sender_company: string;
  sender_phone: string;
  sender_email: string;
  sender_cnic: string;
  sender_address: string;
  sender_city: string;
  sender_country: string;
  receiver_name: string;
  receiver_company: string;
  receiver_email: string;
  receiver_phone: string;
  receiver_address: string;
  receiver_city: string;
  receiver_state: string;
  receiver_postal_code: string;
  receiver_country: string;
  parcel_type: string;
  weight: string;
  length: string;
  width: string;
  height: string;
  declared_value: string;
  service_type: string;
  document_type: string;
  from_country: string;
  to_country: string;
  special_instructions: string;
  pieces: number;
  freight_amount_pkr: string;
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    hs_code: string;
    total: number;
  }>;
}

const parcelTypes = [
  { value: "box", label: "Box" },
  { value: "envelope", label: "Envelope" },
  { value: "pallet", label: "Pallet" },
  { value: "other", label: "Other" },
];

const serviceTypes = [
  { value: "standard", label: "Standard" },
  { value: "express", label: "Express" },
  { value: "overnight", label: "Overnight" },
  { value: "economic", label: "Economic" },
  { value: "priority", label: "Priority" },
];

const documentTypes = [
  { value: "document", label: "Document" },
  { value: "non-document", label: "Non-Document" },
];

export const ParcelForm = ({ onSuccess, parcel }: ParcelFormProps) => {
  const [countries, setCountries] = useState<Country[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(true);
  const [formData, setFormData] = useState<FormData>({
    reference_id: parcel?.reference_id || "",
    tracking_id: parcel?.tracking_id || "",
    sender_name: parcel?.sender_name || "",
    sender_company: parcel?.sender_company || "",
    sender_phone: parcel?.sender_phone || "",
    sender_email: parcel?.sender_email || "",
    sender_cnic: parcel?.sender_cnic || "",
    sender_address: parcel?.sender_address || "",
    sender_city: parcel?.sender_city || "",
    sender_country: parcel?.sender_country || "",
    receiver_name: parcel?.receiver_name || "",
    receiver_company: parcel?.receiver_company || "",
    receiver_email: parcel?.receiver_email || "",
    receiver_phone: parcel?.receiver_phone || "",
    receiver_address: parcel?.receiver_address || "",
    receiver_city: parcel?.receiver_city || "",
    receiver_state: parcel?.receiver_state || "",
    receiver_postal_code: parcel?.receiver_postal_code || "",
    receiver_country: parcel?.receiver_country || "",
    parcel_type: parcel?.parcel_type || "box",
    weight: parcel?.weight?.toString() || "",
    length: parcel?.length?.toString() || "",
    width: parcel?.width?.toString() || "",
    height: parcel?.height?.toString() || "",
    declared_value: parcel?.declared_value?.toString() || "",
    service_type: parcel?.service_type || "standard",
    document_type: parcel?.document_type || "document",
    from_country: parcel?.from_country || "",
    to_country: parcel?.to_country || "",
    special_instructions: parcel?.special_instructions || "",
    pieces: parcel?.pieces || 1,
    freight_amount_pkr: parcel?.freight_amount_pkr?.toString() || "",
    items: parcel?.items?.length
      ? parcel.items
      : [
          {
            description: "",
            quantity: 1,
            unit_price: 0,
            hs_code: "",
            total: 0,
          },
        ],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [trackingIdLoading, setTrackingIdLoading] = useState(false);
  const { toast } = useToast();

  // In create mode, pre-generate a suggested tracking ID so the admin can see
  // (and optionally override) it before the parcel is actually saved.
  useEffect(() => {
    if (parcel) return; // edit mode already has a real tracking_id

    const fetchSuggestedTrackingId = async () => {
      setTrackingIdLoading(true);
      // @ts-ignore
      const { data, error } = await supabase.rpc("generate_numeric_tracking");
      if (!error && data) {
        // @ts-ignore
        setFormData((prev) => (prev.tracking_id ? prev : { ...prev, tracking_id: data }));
      }
      setTrackingIdLoading(false);
    };

    fetchSuggestedTrackingId();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Quick-fill: search previous parcels by sender/receiver name or phone
  const [senderSearch, setSenderSearch] = useState("");
  const [senderResults, setSenderResults] = useState<any[]>([]);
  const [senderSearching, setSenderSearching] = useState(false);
  const [showSenderResults, setShowSenderResults] = useState(false);

  const [receiverSearch, setReceiverSearch] = useState("");
  const [receiverResults, setReceiverResults] = useState<any[]>([]);
  const [receiverSearching, setReceiverSearching] = useState(false);
  const [showReceiverResults, setShowReceiverResults] = useState(false);

  // Fetch countries from Supabase 'countries' table on mount
  useEffect(() => {
    const fetchCountries = async () => {
      setCountriesLoading(true);
      const { data, error } = await supabase
        .from("countries")
        .select("code, name, continent")
        .order("name", { ascending: true });

      if (error) {
        console.error("Error fetching countries:", error);
        toast({
          title: "Error",
          description: "Failed to load countries list",
          variant: "destructive",
        });
      } else if (data) {
        setCountries(data as Country[]);
      }
      setCountriesLoading(false);
    };

    fetchCountries();
  }, []);

  // Debounced search for previous senders (from past parcels)
  useEffect(() => {
    if (senderSearch.trim().length < 2) {
      setSenderResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      setSenderSearching(true);
      const { data, error } = await supabase
        .from("parcels")
        .select(
          "sender_name, sender_company, sender_phone, sender_email, sender_cnic, sender_address, sender_city, sender_country"
        )
        .or(`sender_name.ilike.%${senderSearch}%,sender_phone.ilike.%${senderSearch}%`)
        .order("created_at", { ascending: false })
        .limit(8);

      if (!error && data) {
        const seen = new Set<string>();
        const unique = data.filter((row: any) => {
          const key = `${row.sender_name}|${row.sender_phone}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setSenderResults(unique);
      }
      setSenderSearching(false);
    }, 350);

    return () => clearTimeout(handle);
  }, [senderSearch]);

  // Debounced search for previous receivers (from past parcels)
  useEffect(() => {
    if (receiverSearch.trim().length < 2) {
      setReceiverResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      setReceiverSearching(true);
      const { data, error } = await supabase
        .from("parcels")
        .select(
          "receiver_name, receiver_company, receiver_phone, receiver_email, receiver_address, receiver_city, receiver_state, receiver_postal_code, receiver_country"
        )
        .or(`receiver_name.ilike.%${receiverSearch}%,receiver_phone.ilike.%${receiverSearch}%`)
        .order("created_at", { ascending: false })
        .limit(8);

      if (!error && data) {
        const seen = new Set<string>();
        const unique = data.filter((row: any) => {
          const key = `${row.receiver_name}|${row.receiver_phone}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setReceiverResults(unique);
      }
      setReceiverSearching(false);
    }, 350);

    return () => clearTimeout(handle);
  }, [receiverSearch]);

  const selectSenderResult = (row: any) => {
    setFormData((prev) => ({
      ...prev,
      sender_name: row.sender_name || "",
      sender_company: row.sender_company || "",
      sender_phone: row.sender_phone || "",
      sender_email: row.sender_email || "",
      sender_cnic: row.sender_cnic || "",
      sender_address: row.sender_address || "",
      sender_city: row.sender_city || "",
      sender_country: row.sender_country || "",
    }));
    setSenderSearch("");
    setSenderResults([]);
    setShowSenderResults(false);
    toast({ title: "Filled", description: "Sender details filled from a previous parcel" });
  };

  const selectReceiverResult = (row: any) => {
    setFormData((prev) => ({
      ...prev,
      receiver_name: row.receiver_name || "",
      receiver_company: row.receiver_company || "",
      receiver_phone: row.receiver_phone || "",
      receiver_email: row.receiver_email || "",
      receiver_address: row.receiver_address || "",
      receiver_city: row.receiver_city || "",
      receiver_state: row.receiver_state || "",
      receiver_postal_code: row.receiver_postal_code || "",
      receiver_country: row.receiver_country || "",
    }));
    setReceiverSearch("");
    setReceiverResults([]);
    setShowReceiverResults(false);
    toast({ title: "Filled", description: "Receiver details filled from a previous parcel" });
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Auto-calculate total
    if (field === "quantity" || field === "unit_price") {
      newItems[index].total = newItems[index].quantity * newItems[index].unit_price;
    }

    setFormData((prev) => ({ ...prev, items: newItems }));
  };

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { description: "", quantity: 1, unit_price: 0, hs_code: "", total: 0 }],
    }));
  };

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      setFormData((prev) => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index),
      }));
    }
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => sum + item.total, 0);
  };

  const calculatePrice = (weight: number, length: number, width: number, height: number) => {
    // Basic pricing calculation - should be enhanced with actual rate logic
    const volumetricWeight = (length * width * height) / 5000;
    const chargeableWeight = Math.max(weight, volumetricWeight);
    const baseRate = 20; // $20 per kg base rate
    return chargeableWeight * baseRate;
  };

  const describeDuplicateError = (message: string | undefined) => {
    if (!message) return "One of the values you entered is already in use.";
    if (message.includes("tracking_id")) return "That Tracking ID is already in use.";
    if (message.includes("reference_id")) return "That Reference ID is already in use.";
    return "One of the values you entered is already in use.";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (parcel && !formData.tracking_id.trim()) {
      toast({
        title: "Error",
        description: "Tracking ID cannot be empty",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Prepare parcel data
      const weight = parseFloat(formData.weight);
      const length = parseFloat(formData.length);
      const width = parseFloat(formData.width);
      const height = parseFloat(formData.height);
      const declaredValue = parseFloat(formData.declared_value || "0");
      const freightAmountPkr = parseFloat(formData.freight_amount_pkr || "0");

      const totalPrice = calculatePrice(weight, length, width, height);

      const parcelData: Record<string, any> = {
        sender_name: formData.sender_name,
        sender_company: formData.sender_company,
        sender_phone: formData.sender_phone,
        sender_email: formData.sender_email,
        sender_cnic: formData.sender_cnic,
        sender_address: formData.sender_address,
        sender_city: formData.sender_city,
        sender_country: formData.sender_country,
        receiver_name: formData.receiver_name,
        receiver_company: formData.receiver_company,
        receiver_email: formData.receiver_email,
        receiver_phone: formData.receiver_phone,
        receiver_address: formData.receiver_address,
        receiver_city: formData.receiver_city,
        receiver_state: formData.receiver_state,
        receiver_postal_code: formData.receiver_postal_code,
        receiver_country: formData.receiver_country,
        parcel_type: formData.parcel_type,
        weight,
        length,
        width,
        height,
        declared_value: declaredValue,
        service_type: formData.service_type,
        document_type: formData.document_type,
        from_country: formData.from_country,
        to_country: formData.to_country,
        special_instructions: formData.special_instructions,
        total_price: totalPrice,
        items: formData.items,
        pieces: formData.pieces,
        freight_amount_pkr: freightAmountPkr,
      };

      // Only send reference_id if the admin actually typed one; otherwise let the DB default generate it
      const trimmedReferenceId = formData.reference_id?.trim();
      if (trimmedReferenceId) {
        parcelData.reference_id = trimmedReferenceId;
      }

      if (parcel) {
        // UPDATE existing parcel
        parcelData.tracking_id = formData.tracking_id.trim();

        // @ts-ignore
        const { error } = await supabase.from("parcels").update(parcelData).eq("id", parcel.id);

        if (error) throw error;

        toast({
          title: "Success!",
          description: `Parcel ${parcel.tracking_id} updated successfully`,
        });
      } else {
        // CREATE new parcel
        // Use the (possibly admin-edited) suggested tracking ID; if it was
        // somehow left blank, fall back to generating a fresh one now.
        let trackingId = formData.tracking_id.trim();
        if (!trackingId) {
          const { data: trackingData, error: trackingError } = await supabase.rpc(
            // @ts-ignore
            "generate_numeric_tracking"
          );
          if (trackingError) throw trackingError;
          // @ts-ignore
          trackingId = trackingData;
        }

        const { error } = await supabase.from("parcels").insert([
          {
            ...parcelData,
            tracking_id: trackingId,
            // @ts-ignore
            request_status: "pending",
            current_status: "created",
          },
        ]);

        if (error) throw error;

        toast({
          title: "Success!",
          description: `Parcel request submitted with tracking ID: ${trackingId}`,
        });
      }

      onSuccess();
    } catch (error: any) {
      console.error("Error saving parcel:", error);
      const isDuplicate = error?.code === "23505";
      toast({
        title: "Error",
        description: isDuplicate ? describeDuplicateError(error.message) : error.message || "Failed to save parcel",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Tracking ID & Reference ID */}
      <Card>
        <CardHeader>
          <CardTitle>Identifiers</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="tracking_id">Tracking ID {parcel ? "*" : ""}</Label>
            <Input
              id="tracking_id"
              value={formData.tracking_id}
              onChange={(e) => handleInputChange("tracking_id", e.target.value)}
              placeholder={trackingIdLoading ? "Generating..." : "Tracking ID"}
              required={!!parcel}
            />
            {!parcel && (
              <p className="text-xs text-muted-foreground">
                Auto-generated — edit it if you'd like to set a custom one.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="reference_id">Reference ID</Label>
            <Input
              id="reference_id"
              value={formData.reference_id}
              onChange={(e) => handleInputChange("reference_id", e.target.value)}
              placeholder="Leave blank to auto-generate"
            />
          </div>
        </CardContent>
      </Card>

      {/* Sender Information */}
      <Card>
        <CardHeader>
          <CardTitle>Sender Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative space-y-2">
            <Label htmlFor="sender_search" className="flex items-center gap-1.5">
              <History className="h-3.5 w-3.5" />
              Quick-fill from a previous sender
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="sender_search"
                placeholder="Search by name or phone..."
                value={senderSearch}
                onChange={(e) => {
                  setSenderSearch(e.target.value);
                  setShowSenderResults(true);
                }}
                onFocus={() => setShowSenderResults(true)}
                onBlur={() => setTimeout(() => setShowSenderResults(false), 150)}
                className="pl-10"
                autoComplete="off"
              />
            </div>
            {showSenderResults && senderSearch.trim().length >= 2 && (
              <div className="absolute z-20 w-full bg-popover border rounded-md shadow-md mt-1 max-h-60 overflow-y-auto">
                {senderSearching ? (
                  <div className="p-3 text-sm text-muted-foreground">Searching...</div>
                ) : senderResults.length > 0 ? (
                  senderResults.map((row, i) => (
                    <button
                      type="button"
                      key={i}
                      className="w-full text-left p-3 hover:bg-accent border-b last:border-b-0"
                      onMouseDown={() => selectSenderResult(row)}
                    >
                      <div className="font-medium">{row.sender_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {row.sender_phone}
                        {row.sender_city ? ` • ${row.sender_city}` : ""}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-3 text-sm text-muted-foreground">No matches found</div>
                )}
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sender_name">Full Name *</Label>
              <Input
                id="sender_name"
                value={formData.sender_name}
                onChange={(e) => handleInputChange("sender_name", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sender_company">Company Name</Label>
              <Input
                id="sender_company"
                value={formData.sender_company}
                onChange={(e) => handleInputChange("sender_company", e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sender_phone">Phone Number *</Label>
              <Input
                id="sender_phone"
                type="tel"
                value={formData.sender_phone}
                onChange={(e) => handleInputChange("sender_phone", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sender_email">Email Address *</Label>
              <Input
                id="sender_email"
                type="email"
                value={formData.sender_email}
                onChange={(e) => handleInputChange("sender_email", e.target.value)}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sender_cnic">CNIC Number</Label>
              <Input
                id="sender_cnic"
                value={formData.sender_cnic}
                onChange={(e) => handleInputChange("sender_cnic", e.target.value)}
                placeholder="e.g., 1234567890123"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sender_city">City *</Label>
              <Input
                id="sender_city"
                value={formData.sender_city}
                onChange={(e) => handleInputChange("sender_city", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sender_country">Country *</Label>
              <Select
                value={formData.sender_country}
                onValueChange={(value) => handleInputChange("sender_country", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={countriesLoading ? "Loading countries..." : "Select country"} />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sender_address">Full Address *</Label>
            <Textarea
              id="sender_address"
              value={formData.sender_address}
              onChange={(e) => handleInputChange("sender_address", e.target.value)}
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* Receiver Information */}
      <Card>
        <CardHeader>
          <CardTitle>Receiver Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative space-y-2">
            <Label htmlFor="receiver_search" className="flex items-center gap-1.5">
              <History className="h-3.5 w-3.5" />
              Quick-fill from a previous receiver
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="receiver_search"
                placeholder="Search by name or phone..."
                value={receiverSearch}
                onChange={(e) => {
                  setReceiverSearch(e.target.value);
                  setShowReceiverResults(true);
                }}
                onFocus={() => setShowReceiverResults(true)}
                onBlur={() => setTimeout(() => setShowReceiverResults(false), 150)}
                className="pl-10"
                autoComplete="off"
              />
            </div>
            {showReceiverResults && receiverSearch.trim().length >= 2 && (
              <div className="absolute z-20 w-full bg-popover border rounded-md shadow-md mt-1 max-h-60 overflow-y-auto">
                {receiverSearching ? (
                  <div className="p-3 text-sm text-muted-foreground">Searching...</div>
                ) : receiverResults.length > 0 ? (
                  receiverResults.map((row, i) => (
                    <button
                      type="button"
                      key={i}
                      className="w-full text-left p-3 hover:bg-accent border-b last:border-b-0"
                      onMouseDown={() => selectReceiverResult(row)}
                    >
                      <div className="font-medium">{row.receiver_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {row.receiver_phone}
                        {row.receiver_city ? ` • ${row.receiver_city}` : ""}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-3 text-sm text-muted-foreground">No matches found</div>
                )}
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="receiver_name">Full Name *</Label>
              <Input
                id="receiver_name"
                value={formData.receiver_name}
                onChange={(e) => handleInputChange("receiver_name", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="receiver_company">Company Name</Label>
              <Input
                id="receiver_company"
                value={formData.receiver_company}
                onChange={(e) => handleInputChange("receiver_company", e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="receiver_phone">Phone Number *</Label>
              <Input
                id="receiver_phone"
                type="tel"
                value={formData.receiver_phone}
                onChange={(e) => handleInputChange("receiver_phone", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="receiver_email">Email Address</Label>
              <Input
                id="receiver_email"
                type="email"
                value={formData.receiver_email}
                onChange={(e) => handleInputChange("receiver_email", e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="receiver_city">City *</Label>
              <Input
                id="receiver_city"
                value={formData.receiver_city}
                onChange={(e) => handleInputChange("receiver_city", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="receiver_state">State / Province</Label>
              <Input
                id="receiver_state"
                value={formData.receiver_state}
                onChange={(e) => handleInputChange("receiver_state", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="receiver_postal_code">Postal Code</Label>
              <Input
                id="receiver_postal_code"
                value={formData.receiver_postal_code}
                onChange={(e) => handleInputChange("receiver_postal_code", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="receiver_country">Country *</Label>
              <Select
                value={formData.receiver_country}
                onValueChange={(value) => handleInputChange("receiver_country", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={countriesLoading ? "Loading countries..." : "Select country"} />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="receiver_address">Full Address *</Label>
            <Textarea
              id="receiver_address"
              value={formData.receiver_address}
              onChange={(e) => handleInputChange("receiver_address", e.target.value)}
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* Route */}
      <Card>
        <CardHeader>
          <CardTitle>Route</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="from_country">From Country *</Label>
              <Select
                value={formData.from_country}
                onValueChange={(value) => handleInputChange("from_country", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={countriesLoading ? "Loading countries..." : "Select country"} />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="to_country">To Country *</Label>
              <Select
                value={formData.to_country}
                onValueChange={(value) => handleInputChange("to_country", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={countriesLoading ? "Loading countries..." : "Select country"} />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Parcel Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Parcel Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="parcel_type">Parcel Type</Label>
              <Select
                value={formData.parcel_type}
                onValueChange={(value) => handleInputChange("parcel_type", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {parcelTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="document_type">Document Type</Label>
              <Select
                value={formData.document_type}
                onValueChange={(value) => handleInputChange("document_type", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="service_type">Service Type</Label>
              <Select
                value={formData.service_type}
                onValueChange={(value) => handleInputChange("service_type", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {serviceTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (kg) *</Label>
              <Input
                id="weight"
                type="number"
                step="0.01"
                min="0.01"
                value={formData.weight}
                onChange={(e) => handleInputChange("weight", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="length">Length (cm) *</Label>
              <Input
                id="length"
                type="number"
                step="0.01"
                min="1"
                value={formData.length}
                onChange={(e) => handleInputChange("length", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="width">Width (cm) *</Label>
              <Input
                id="width"
                type="number"
                step="0.01"
                min="1"
                value={formData.width}
                onChange={(e) => handleInputChange("width", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="height">Height (cm) *</Label>
              <Input
                id="height"
                type="number"
                step="0.01"
                min="1"
                value={formData.height}
                onChange={(e) => handleInputChange("height", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="declared_value">Declared Value</Label>
              <Input
                id="declared_value"
                type="number"
                step="0.01"
                min="0"
                value={formData.declared_value}
                onChange={(e) => handleInputChange("declared_value", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pieces">Pieces</Label>
              <Input
                id="pieces"
                type="number"
                min="1"
                value={formData.pieces}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, pieces: parseInt(e.target.value, 10) || 1 }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="freight_amount_pkr">Freight Amount (PKR)</Label>
              <Input
                id="freight_amount_pkr"
                type="number"
                step="0.01"
                min="0"
                value={formData.freight_amount_pkr}
                onChange={(e) => handleInputChange("freight_amount_pkr", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="special_instructions">Special Instructions</Label>
            <Textarea
              id="special_instructions"
              value={formData.special_instructions}
              onChange={(e) => handleInputChange("special_instructions", e.target.value)}
              placeholder="Optional"
            />
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Items</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="h-4 w-4 mr-1" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.items.map((item, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end border-b pb-4 last:border-b-0">
              <div className="md:col-span-4 space-y-2">
                <Label>Description</Label>
                <Input
                  value={item.description}
                  onChange={(e) => handleItemChange(index, "description", e.target.value)}
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(index, "quantity", parseInt(e.target.value, 10) || 0)}
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label>Unit Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.unit_price}
                  onChange={(e) => handleItemChange(index, "unit_price", parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label>HS Code</Label>
                <Input
                  value={item.hs_code}
                  onChange={(e) => handleItemChange(index, "hs_code", e.target.value)}
                />
              </div>
              <div className="md:col-span-1 space-y-2">
                <Label>Total</Label>
                <div className="h-10 flex items-center font-medium">{item.total.toFixed(2)}</div>
              </div>
              <div className="md:col-span-1 flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(index)}
                  disabled={formData.items.length === 1}
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            </div>
          ))}
          <div className="flex justify-end pt-2 text-sm font-semibold">
            Items Subtotal: {calculateSubtotal().toFixed(2)}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : parcel ? (
            "Update Parcel"
          ) : (
            "Create Parcel"
          )}
        </Button>
      </div>
    </form>
  );
};
