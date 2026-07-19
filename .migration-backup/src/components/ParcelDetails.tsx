import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Package, User, MapPin, Clock, Truck, CheckCircle, Plane, AlertCircle, Pencil, Save, X } from "lucide-react";
import { BillDownloader } from "./BillDownloader";

interface ParcelDetailsProps {
  parcel: any;
  onUpdate: () => void;
  onClose: () => void;
}

const statusOptions = [
  { value: 'created', label: 'Created', icon: Clock },
  { value: 'picked_up', label: 'Picked Up', icon: Package },
  { value: 'in_transit', label: 'In Transit', icon: Truck },
  { value: 'custom_hold', label: 'Custom Hold', icon: AlertCircle },
  { value: 'flight_departure', label: 'Flight Departure', icon: Plane },
  { value: 'flight_arrived', label: 'Flight Arrived', icon: Plane },
  { value: 'flight_offload', label: 'Flight Offload', icon: Package },
  { value: 'in_custom_clearance', label: 'In Custom Clearance', icon: AlertCircle },
  { value: 'arrived_hub', label: 'Arrived Hub', icon: MapPin },
  { value: 'customs', label: 'In Customs', icon: MapPin },
  { value: 'out_for_delivery', label: 'Out for Delivery', icon: Truck },
  { value: 'delivered', label: 'Delivered', icon: CheckCircle },
  { value: 'cancelled', label: 'Cancelled', icon: Clock },
];

const statusColors = {
  created: "bg-yellow-100 text-yellow-800",
  picked_up: "bg-blue-100 text-blue-800",
  in_transit: "bg-purple-100 text-purple-800",
  custom_hold: "bg-red-100 text-red-800",
  flight_departure: "bg-indigo-100 text-indigo-800",
  flight_arrived: "bg-green-100 text-green-800",
  flight_offload: "bg-orange-100 text-orange-800",
  in_custom_clearance: "bg-yellow-100 text-yellow-800",
  arrived_hub: "bg-blue-100 text-blue-800",
  customs: "bg-orange-100 text-orange-800",
  out_for_delivery: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const parcelTypeOptions = [
  { value: "box", label: "Box" },
  { value: "envelope", label: "Envelope" },
  { value: "pallet", label: "Pallet" },
  { value: "other", label: "Other" },
];

const serviceTypeOptions = [
  { value: "standard", label: "Standard" },
  { value: "express", label: "Express" },
  { value: "overnight", label: "Overnight" },
  { value: "economic", label: "Economic" },
  { value: "priority", label: "Priority" },
];

const documentTypeOptions = [
  { value: "document", label: "Document" },
  { value: "non-document", label: "Non-Document" },
];

interface InfoForm {
  parcel_type: string;
  service_type: string;
  document_type: string;
  weight: string;
  length: string;
  width: string;
  height: string;
  declared_value: string;
  total_price: string;
  currency: string;
  special_instructions: string;
}

export const ParcelDetails = ({ parcel, onUpdate, onClose }: ParcelDetailsProps) => {
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(parcel.current_status);
  const [statusLocation, setStatusLocation] = useState(parcel.current_location || "");
  const [adminComment, setAdminComment] = useState(parcel.admin_comment || "");
  const [statusDateTime, setStatusDateTime] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const { toast } = useToast();

  // Local overrides so edits made here show immediately without waiting on the
  // parent list refetch (the parent doesn't re-pass a fresh `parcel` prop into
  // this already-open modal).
  const [localOverrides, setLocalOverrides] = useState<Record<string, any>>({});
  const displayParcel = { ...parcel, ...localOverrides };

  // Inline "Parcel Information" editing
  const [editingInfo, setEditingInfo] = useState(false);
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoForm, setInfoForm] = useState<InfoForm>({
    parcel_type: displayParcel.parcel_type || "box",
    service_type: displayParcel.service_type || "standard",
    document_type: displayParcel.document_type || "document",
    weight: displayParcel.weight?.toString() || "",
    length: displayParcel.length?.toString() || "",
    width: displayParcel.width?.toString() || "",
    height: displayParcel.height?.toString() || "",
    declared_value: displayParcel.declared_value?.toString() || "",
    total_price: displayParcel.total_price?.toString() || "",
    currency: displayParcel.currency || "USD",
    special_instructions: displayParcel.special_instructions || "",
  });

  const startEditingInfo = () => {
    setInfoForm({
      parcel_type: displayParcel.parcel_type || "box",
      service_type: displayParcel.service_type || "standard",
      document_type: displayParcel.document_type || "document",
      weight: displayParcel.weight?.toString() || "",
      length: displayParcel.length?.toString() || "",
      width: displayParcel.width?.toString() || "",
      height: displayParcel.height?.toString() || "",
      declared_value: displayParcel.declared_value?.toString() || "",
      total_price: displayParcel.total_price?.toString() || "",
      currency: displayParcel.currency || "USD",
      special_instructions: displayParcel.special_instructions || "",
    });
    setEditingInfo(true);
  };

  const cancelEditingInfo = () => {
    setEditingInfo(false);
  };

  const handleInfoFieldChange = (field: keyof InfoForm, value: string) => {
    setInfoForm((prev) => ({ ...prev, [field]: value }));
  };

  const saveInfo = async () => {
    const weight = parseFloat(infoForm.weight);
    const length = parseFloat(infoForm.length);
    const width = parseFloat(infoForm.width);
    const height = parseFloat(infoForm.height);

    if ([weight, length, width, height].some((n) => isNaN(n) || n <= 0)) {
      toast({
        title: "Error",
        description: "Weight and dimensions must be positive numbers",
        variant: "destructive",
      });
      return;
    }

    setSavingInfo(true);
    try {
      const payload = {
        parcel_type: infoForm.parcel_type,
        service_type: infoForm.service_type,
        document_type: infoForm.document_type,
        weight,
        length,
        width,
        height,
        declared_value: parseFloat(infoForm.declared_value || "0") || 0,
        total_price: parseFloat(infoForm.total_price || "0") || 0,
        currency: infoForm.currency || "USD",
        special_instructions: infoForm.special_instructions,
      };

      const { error } = await supabase.from("parcels").update(payload).eq("id", parcel.id);

      if (error) throw error;

      setLocalOverrides((prev) => ({ ...prev, ...payload }));
      toast({
        title: "Saved",
        description: "Parcel information updated",
      });
      setEditingInfo(false);
      onUpdate();
    } catch (error: any) {
      console.error("Error updating parcel information:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update parcel information",
        variant: "destructive",
      });
    } finally {
      setSavingInfo(false);
    }
  };

  const updateParcelStatus = async () => {
    if (!selectedStatus) {
      toast({
        title: "Error",
        description: "Please select a status",
        variant: "destructive",
      });
      return;
    }

    setUpdatingStatus(true);
    try {
      // Use the enhanced status update function
      const { data, error } = await supabase.rpc('update_parcel_status_enhanced', {
        parcel_id_param: parcel.id,
        new_status: selectedStatus,
        location_param: statusLocation,
        comment_param: adminComment,
        custom_datetime: new Date(statusDateTime).toISOString()
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Parcel status updated to ${selectedStatus.replace('_', ' ').toUpperCase()}`,
      });

      // Reset form
      setStatusLocation("");
      setAdminComment("");
      setStatusDateTime(new Date().toISOString().slice(0, 16));
      
      onUpdate();
    } catch (error: any) {
      console.error('Error updating parcel status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update parcel status",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const StatusIcon = statusOptions.find(s => s.value === parcel.current_status)?.icon || Clock;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{parcel.tracking_id}</h2>
          <p className="text-muted-foreground">{parcel.from_country} → {parcel.to_country}</p>
        </div>
        <Badge className={statusColors[parcel.current_status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"}>
          <StatusIcon className="w-4 h-4 mr-2" />
          {parcel.current_status.replace('_', ' ').toUpperCase()}
        </Badge>
      </div>

      {/* Sender & Receiver Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Sender
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="font-semibold">{parcel.sender_name}</p>
              {parcel.sender_company && (
                <p className="text-sm text-muted-foreground">{parcel.sender_company}</p>
              )}
              <p className="text-sm text-muted-foreground">{parcel.sender_phone}</p>
              <p className="text-sm text-muted-foreground">{parcel.sender_email}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Address:</p>
              <p className="text-sm text-muted-foreground">{parcel.sender_address}</p>
              <p className="text-sm text-muted-foreground">{parcel.sender_city}, {parcel.sender_country}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Receiver
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="font-semibold">{parcel.receiver_name}</p>
              <p className="text-sm text-muted-foreground">{parcel.receiver_phone}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Address:</p>
              <p className="text-sm text-muted-foreground">{parcel.receiver_address}</p>
              <p className="text-sm text-muted-foreground">
                {parcel.receiver_city}, {parcel.receiver_state}
              </p>
              <p className="text-sm text-muted-foreground">
                {parcel.receiver_country} - {parcel.receiver_postal_code}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Parcel Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Parcel Information
            </CardTitle>
            {editingInfo ? (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={cancelEditingInfo} disabled={savingInfo}>
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button size="sm" onClick={saveInfo} disabled={savingInfo}>
                  <Save className="h-4 w-4 mr-1" />
                  {savingInfo ? "Saving..." : "Save"}
                </Button>
              </div>
            ) : (
              <Button variant="ghost" size="sm" onClick={startEditingInfo}>
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editingInfo ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_parcel_type">Type</Label>
                  <Select
                    value={infoForm.parcel_type}
                    onValueChange={(value) => handleInfoFieldChange("parcel_type", value)}
                  >
                    <SelectTrigger id="edit_parcel_type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {parcelTypeOptions.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_service_type">Service</Label>
                  <Select
                    value={infoForm.service_type}
                    onValueChange={(value) => handleInfoFieldChange("service_type", value)}
                  >
                    <SelectTrigger id="edit_service_type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceTypeOptions.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_document_type">Document Type</Label>
                  <Select
                    value={infoForm.document_type}
                    onValueChange={(value) => handleInfoFieldChange("document_type", value)}
                  >
                    <SelectTrigger id="edit_document_type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {documentTypeOptions.map((type) => (
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
                  <Label htmlFor="edit_weight">Weight (kg)</Label>
                  <Input
                    id="edit_weight"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={infoForm.weight}
                    onChange={(e) => handleInfoFieldChange("weight", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_length">Length (cm)</Label>
                  <Input
                    id="edit_length"
                    type="number"
                    step="0.01"
                    min="1"
                    value={infoForm.length}
                    onChange={(e) => handleInfoFieldChange("length", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_width">Width (cm)</Label>
                  <Input
                    id="edit_width"
                    type="number"
                    step="0.01"
                    min="1"
                    value={infoForm.width}
                    onChange={(e) => handleInfoFieldChange("width", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_height">Height (cm)</Label>
                  <Input
                    id="edit_height"
                    type="number"
                    step="0.01"
                    min="1"
                    value={infoForm.height}
                    onChange={(e) => handleInfoFieldChange("height", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_declared_value">Declared Value (USD)</Label>
                  <Input
                    id="edit_declared_value"
                    type="number"
                    step="0.01"
                    min="0"
                    value={infoForm.declared_value}
                    onChange={(e) => handleInfoFieldChange("declared_value", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_total_price">Price</Label>
                  <Input
                    id="edit_total_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={infoForm.total_price}
                    onChange={(e) => handleInfoFieldChange("total_price", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_currency">Currency</Label>
                  <Input
                    id="edit_currency"
                    value={infoForm.currency}
                    onChange={(e) => handleInfoFieldChange("currency", e.target.value.toUpperCase())}
                    maxLength={3}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_special_instructions">Special Instructions</Label>
                <Textarea
                  id="edit_special_instructions"
                  value={infoForm.special_instructions}
                  onChange={(e) => handleInfoFieldChange("special_instructions", e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium">Type:</p>
                  <p className="text-sm text-muted-foreground capitalize">{displayParcel.parcel_type}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Service:</p>
                  <p className="text-sm text-muted-foreground capitalize">{displayParcel.service_type}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Document Type:</p>
                  <p className="text-sm text-muted-foreground capitalize">{displayParcel.document_type || 'Document'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Weight:</p>
                  <p className="text-sm text-muted-foreground">{displayParcel.weight} kg</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Dimensions:</p>
                  <p className="text-sm text-muted-foreground">
                    {displayParcel.length}×{displayParcel.width}×{displayParcel.height} cm
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Chargeable Weight:</p>
                  <p className="text-sm text-muted-foreground">
                    {displayParcel.chargeable_weight || displayParcel.weight} kg
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Price:</p>
                  <p className="text-sm font-semibold text-primary">
                    {displayParcel.currency} {displayParcel.total_price?.toFixed(2)}
                  </p>
                </div>
              </div>

              {displayParcel.declared_value > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium">Declared Value:</p>
                  <p className="text-sm text-muted-foreground">
                    USD {displayParcel.declared_value.toFixed(2)}
                  </p>
                </div>
              )}

              {displayParcel.special_instructions && (
                <div className="mt-4">
                  <p className="text-sm font-medium">Special Instructions:</p>
                  <p className="text-sm text-muted-foreground">{displayParcel.special_instructions}</p>
                </div>
              )}
            </>
          )}

          {parcel.items && parcel.items.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Items:</p>
              <div className="space-y-2">
                {parcel.items.map((item: any, index: number) => (
                  <div key={index} className="text-sm bg-muted/50 p-2 rounded">
                    <p className="font-medium">{item.description}</p>
                    <p className="text-muted-foreground">
                      Qty: {item.quantity} • Price: ${item.unit_price} • Total: ${item.total}
                      {item.hs_code && ` • HS Code: ${item.hs_code}`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Download Bills - Admin View */}
      <BillDownloader parcel={parcel} showAll={true} />

      {/* Enhanced Status Update */}
      <Card>
        <CardHeader>
          <CardTitle>Update Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => {
                    const Icon = status.icon;
                    return (
                      <SelectItem key={status.value} value={status.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          {status.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="datetime">Date & Time *</Label>
              <Input
                id="datetime"
                type="datetime-local"
                value={statusDateTime}
                onChange={(e) => setStatusDateTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="e.g., Dubai, United Arab Emirates"
              value={statusLocation}
              onChange={(e) => setStatusLocation(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Admin Comment</Label>
            <Textarea
              id="comment"
              placeholder="Add notes or comments about this status update..."
              value={adminComment}
              onChange={(e) => setAdminComment(e.target.value)}
              rows={3}
            />
          </div>

          <Button 
            onClick={updateParcelStatus} 
            disabled={updatingStatus}
            className="w-full"
          >
            {updatingStatus ? "Updating..." : "Update Status"}
          </Button>
        </CardContent>
      </Card>

      {/* Status Timeline */}
      {parcel.status_timeline && parcel.status_timeline.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Status History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Sort by timestamp descending (most recent first) */}
              {[...parcel.status_timeline]
                .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .map((event: any, index: number) => {
                const EventIcon = statusOptions.find(s => s.value === event.status)?.icon || Clock;
                return (
                  <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <EventIcon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{event.status.replace('_', ' ').toUpperCase()}</p>
                        {index === 0 && (
                          <Badge variant="secondary" className="text-xs">Latest</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(event.timestamp).toLocaleString()}
                      </p>
                      {event.location && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" />
                          {event.location}
                        </p>
                      )}
                      {event.admin_comment && (
                        <p className="text-sm text-foreground mt-2 p-2 bg-muted/50 rounded">
                          {event.admin_comment}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end pt-4">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
};
