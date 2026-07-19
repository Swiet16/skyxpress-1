import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Package, Truck, FileText, X, Edit, Check, ChevronsUpDown, Layers } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ApprovedParcel {
  id: string;
  tracking_id: string;
  sender_name: string;
  receiver_name: string;
  from_country: string;
  to_country: string;
  shipping_status: string;
  approved_at: string;
  total_price: number;
}

const statusColors = {
  created: "bg-gray-100 text-gray-800",
  processing: "bg-yellow-100 text-yellow-800",
  picked_up: "bg-blue-100 text-blue-800",
  in_transit: "bg-purple-100 text-purple-800",
  customs: "bg-orange-100 text-orange-800",
  custom_hold: "bg-red-100 text-red-800",
  flight_departure: "bg-sky-100 text-sky-800",
  flight_arrived: "bg-cyan-100 text-cyan-800",
  flight_offload: "bg-teal-100 text-teal-800",
  in_custom_clearance: "bg-amber-100 text-amber-800",
  arrived_hub: "bg-violet-100 text-violet-800",
  out_for_delivery: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-slate-100 text-slate-800",
};

// Comprehensive list of 190+ countries
const WORLD_COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", 
  "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", 
  "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", 
  "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia", "Cameroon", "Canada", 
  "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", 
  "Croatia", "Cuba", "Cyprus", "Czech Republic", "Democratic Republic of the Congo", "Denmark", "Djibouti", 
  "Dominica", "Dominican Republic", "East Timor", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", 
  "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", 
  "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", 
  "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", 
  "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kosovo", "Kuwait", "Kyrgyzstan", "Laos", 
  "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", 
  "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", 
  "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", 
  "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", 
  "Norway", "Oman", "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", 
  "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", 
  "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", 
  "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", 
  "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", 
  "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Togo", "Tonga", "Trinidad and Tobago", 
  "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", 
  "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

export const ApprovedParcelsSection = () => {
  const [parcels, setParcels] = useState<ApprovedParcel[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [countries, setCountries] = useState<string[]>([]);
  const [countrySearchOpen, setCountrySearchOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedParcel, setSelectedParcel] = useState<ApprovedParcel | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [statusLocation, setStatusLocation] = useState("");
  const [locationSearchOpen, setLocationSearchOpen] = useState(false);
  const [adminComment, setAdminComment] = useState("");
  const [statusDateTime, setStatusDateTime] = useState(new Date().toISOString().slice(0, 16));
  const { toast } = useToast();

  // Multi-select for bulk status updates
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);

  useEffect(() => {
    fetchApprovedParcels();

    // Real-time subscription
    const channel = supabase
      .channel('approved_parcels_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'parcels',
          filter: 'request_status=eq.approved'
        },
        () => {
          fetchApprovedParcels();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchApprovedParcels = async () => {
    try {
      // @ts-ignore -- request_status/approved_at are runtime columns not in generated types
      const { data, error } = await (supabase as any)
        .from('parcels')
        .select('*')
        .eq('request_status', 'approved')
        .order('approved_at', { ascending: false });

      if (error) throw error;
      setParcels((data as any) || []);
      
      // Extract unique countries from parcels
      const uniqueCountries = new Set<string>();
      (data as any[])?.forEach((parcel: any) => {
        if (parcel.from_country) uniqueCountries.add(parcel.from_country);
        if (parcel.to_country) uniqueCountries.add(parcel.to_country);
      });
      setCountries(Array.from(uniqueCountries).sort());

      // Drop any selections for parcels that no longer exist / are no longer approved
      setSelectedIds((prev) => {
        const validIds = new Set(((data as any[]) || []).map((p: any) => p.id));
        const next = new Set<string>();
        prev.forEach((id) => {
          if (validIds.has(id)) next.add(id);
        });
        return next;
      });
    } catch (error: any) {
      console.error('Error fetching approved parcels:', error);
      toast({
        title: "Error",
        description: "Failed to load approved parcels",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openStatusDialog = (parcel: ApprovedParcel) => {
    setIsBulkMode(false);
    setSelectedParcel(parcel);
    setNewStatus(parcel.shipping_status);
    setStatusLocation("");
    setAdminComment("");
    setStatusDateTime(new Date().toISOString().slice(0, 16));
    setStatusDialogOpen(true);
  };

  const openBulkStatusDialog = () => {
    if (selectedIds.size === 0) return;
    setIsBulkMode(true);
    setSelectedParcel(null);
    setNewStatus("");
    setStatusLocation("");
    setAdminComment("");
    setStatusDateTime(new Date().toISOString().slice(0, 16));
    setStatusDialogOpen(true);
  };

  const toggleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleSelectAllFiltered = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        filteredParcels.forEach((p) => next.add(p.id));
      } else {
        filteredParcels.forEach((p) => next.delete(p.id));
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleStatusUpdate = async () => {
    if (!newStatus) {
      toast({
        title: "Error",
        description: "Please choose a status",
        variant: "destructive",
      });
      return;
    }

    if (isBulkMode) {
      const ids = Array.from(selectedIds);
      if (ids.length === 0) return;

      setBulkUpdating(true);
      try {
        const results = await Promise.allSettled(
          ids.map((id) =>
            // @ts-ignore -- runtime RPC not in generated types
            (supabase as any).rpc('update_parcel_status_enhanced', {
              parcel_id_param: id,
              new_status: newStatus,
              location_param: statusLocation,
              comment_param: adminComment,
              custom_datetime: statusDateTime,
            })
          )
        );

        const failedCount = results.filter(
          (r) => r.status === "rejected" || (r.status === "fulfilled" && (r.value as any)?.error)
        ).length;
        const successCount = ids.length - failedCount;

        toast({
          title: failedCount === 0 ? "Status Updated" : "Partially Updated",
          description:
            failedCount === 0
              ? `${successCount} parcel${successCount === 1 ? "" : "s"} updated to ${newStatus.replace('_', ' ')}`
              : `${successCount} updated, ${failedCount} failed. Check console for details.`,
          variant: failedCount === 0 ? undefined : "destructive",
        });

        setStatusDialogOpen(false);
        clearSelection();
        setIsBulkMode(false);
        fetchApprovedParcels();
      } finally {
        setBulkUpdating(false);
      }
      return;
    }

    if (!selectedParcel) return;

    setUpdatingStatus(selectedParcel.id);
    try {
      // @ts-ignore -- runtime RPC not in generated types
      const { error } = await (supabase as any).rpc('update_parcel_status_enhanced', {
        parcel_id_param: selectedParcel.id,
        new_status: newStatus,
        location_param: statusLocation,
        comment_param: adminComment,
        custom_datetime: statusDateTime
      });

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Shipping status updated to ${newStatus.replace('_', ' ')}`,
      });

      setStatusDialogOpen(false);
      fetchApprovedParcels();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const filteredParcels = parcels.filter(parcel => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = (
      parcel.tracking_id.toLowerCase().includes(query) ||
      parcel.sender_name.toLowerCase().includes(query) ||
      parcel.receiver_name.toLowerCase().includes(query)
    );
    
    const matchesCountry = !countryFilter || 
      parcel.from_country === countryFilter || 
      parcel.to_country === countryFilter;
    
    return matchesSearch && matchesCountry;
  });

  const allFilteredSelected =
    filteredParcels.length > 0 && filteredParcels.every((p) => selectedIds.has(p.id));
  const someFilteredSelected = filteredParcels.some((p) => selectedIds.has(p.id));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-green-600" />
            Approved Parcels ({filteredParcels.length})
          </CardTitle>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search approved parcels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Popover open={countrySearchOpen} onOpenChange={setCountrySearchOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={countrySearchOpen}
                className="w-full sm:w-[250px] justify-between"
              >
                {countryFilter || "Filter by country..."}
                {countryFilter ? (
                  <X
                    className="ml-2 h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCountryFilter("");
                    }}
                  />
                ) : (
                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[250px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search country..." />
                <CommandEmpty>No country found.</CommandEmpty>
                <CommandGroup className="max-h-[300px] overflow-auto">
                  {countries.map((country) => (
                    <CommandItem
                      key={country}
                      value={country}
                      onSelect={(currentValue) => {
                        setCountryFilter(currentValue === countryFilter ? "" : currentValue);
                        setCountrySearchOpen(false);
                      }}
                    >
                      {country}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Bulk action bar - shown once at least one parcel is selected */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between gap-3 mt-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="text-sm font-medium">
              {selectedIds.size} parcel{selectedIds.size === 1 ? "" : "s"} selected
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                Clear
              </Button>
              <Button size="sm" onClick={openBulkStatusDialog}>
                <Layers className="h-4 w-4 mr-1" />
                Update Status for Selected
              </Button>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allFilteredSelected ? true : someFilteredSelected ? "indeterminate" : false}
                    onCheckedChange={(checked) => toggleSelectAllFiltered(checked === true)}
                    aria-label="Select all filtered parcels"
                  />
                </TableHead>
                <TableHead>Tracking ID</TableHead>
                <TableHead>Sender</TableHead>
                <TableHead>Receiver</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Shipping Status</TableHead>
                <TableHead>Approved</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredParcels.map((parcel) => (
                <TableRow key={parcel.id} data-state={selectedIds.has(parcel.id) ? "selected" : undefined}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(parcel.id)}
                      onCheckedChange={(checked) => toggleSelectOne(parcel.id, checked === true)}
                      aria-label={`Select parcel ${parcel.tracking_id}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="font-mono font-semibold text-primary">
                      {parcel.tracking_id}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{parcel.sender_name}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{parcel.receiver_name}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{parcel.from_country} → {parcel.to_country}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold">${parcel.total_price?.toFixed(2)}</div>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[parcel.shipping_status as keyof typeof statusColors]}>
                      {parcel.shipping_status?.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{new Date(parcel.approved_at).toLocaleDateString()}</div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openStatusDialog(parcel)}
                      disabled={updatingStatus === parcel.id}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Update Status
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredParcels.length === 0 && (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No approved parcels yet</p>
            </div>
          )}
        </div>
      </CardContent>

      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isBulkMode ? "Update Status for Selected Parcels" : "Update Parcel Status"}
            </DialogTitle>
            <DialogDescription>
              {isBulkMode
                ? `This will update shipping status for ${selectedIds.size} selected parcel${selectedIds.size === 1 ? "" : "s"}.`
                : `Update status for tracking ID: ${selectedParcel?.tracking_id}`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created">Created</SelectItem>
                  <SelectItem value="picked_up">Picked Up</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="customs">Customs</SelectItem>
                  <SelectItem value="custom_hold">Custom Hold</SelectItem>
                  <SelectItem value="flight_departure">Flight Departure</SelectItem>
                  <SelectItem value="flight_arrived">Flight Arrived</SelectItem>
                  <SelectItem value="flight_offload">Flight Offload</SelectItem>
                  <SelectItem value="in_custom_clearance">In Custom Clearance</SelectItem>
                  <SelectItem value="arrived_hub">Arrived Hub</SelectItem>
                  <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Location (Optional)</label>
              <Popover open={locationSearchOpen} onOpenChange={setLocationSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={locationSearchOpen}
                    className="w-full justify-between font-normal"
                  >
                    {statusLocation || "Select country..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search country..." />
                    <CommandEmpty>No country found.</CommandEmpty>
                    <CommandGroup className="max-h-[300px] overflow-auto">
                      {WORLD_COUNTRIES.map((country) => (
                        <CommandItem
                          key={country}
                          value={country}
                          onSelect={(currentValue) => {
                            setStatusLocation(currentValue);
                            setLocationSearchOpen(false);
                          }}
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${
                              statusLocation.toLowerCase() === country.toLowerCase()
                                ? "opacity-100"
                                : "opacity-0"
                            }`}
                          />
                          {country}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Admin Note (Optional)</label>
              <Textarea
                placeholder="Add a note about this status update..."
                value={adminComment}
                onChange={(e) => setAdminComment(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Date & Time</label>
              <Input
                type="datetime-local"
                value={statusDateTime}
                onChange={(e) => setStatusDateTime(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStatusDialogOpen(false)}
              disabled={bulkUpdating || !!updatingStatus}
            >
              Cancel
            </Button>
            <Button
              onClick={handleStatusUpdate}
              disabled={isBulkMode ? bulkUpdating || !newStatus : !!updatingStatus}
            >
              {isBulkMode
                ? bulkUpdating
                  ? `Updating ${selectedIds.size}...`
                  : `Update ${selectedIds.size} Parcel${selectedIds.size === 1 ? "" : "s"}`
                : updatingStatus
                ? "Updating..."
                : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
