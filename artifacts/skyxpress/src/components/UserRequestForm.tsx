// @ts-nocheck
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Package, Send } from "lucide-react";

interface UserRequestFormProps {
  onSuccess: () => void;
}

const countries = [
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "IT", name: "Italy" },
  { code: "ES", name: "Spain" },
  { code: "JP", name: "Japan" },
  { code: "CN", name: "China" },
  { code: "IN", name: "India" },
  { code: "PK", name: "Pakistan" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "SA", name: "Saudi Arabia" },
];

const parcelTypes = [
  { value: "box", label: "Box" },
  { value: "envelope", label: "Envelope" },
  { value: "pallet", label: "Pallet" },
  { value: "other", label: "Other" },
];

const serviceTypes = [
  { value: "standard", label: "Standard" },
  { value: "express", label: "Express" },
  { value: "priority", label: "Priority" },
];

export const UserRequestForm = ({ onSuccess }: UserRequestFormProps) => {
  const [formData, setFormData] = useState({
    sender_name: "",
    sender_phone: "",
    sender_email: "",
    sender_address: "",
    receiver_name: "",
    receiver_phone: "",
    receiver_address: "",
    parcel_type: "box",
    weight: "",
    length: "",
    width: "",
    height: "",
    declared_value: "",
    service_type: "standard",
    from_country: "",
    to_country: "",
    special_instructions: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in to submit a request");

      const { data: trackingData, error: trackingError } = await supabase
        .rpc('generate_numeric_tracking');

      if (trackingError) throw trackingError;

      const weight = parseFloat(formData.weight);
      const length = parseFloat(formData.length);
      const width = parseFloat(formData.width);
      const height = parseFloat(formData.height);
      const declaredValue = parseFloat(formData.declared_value || "0");

      // Basic price calculation
      const volumetricWeight = (length * width * height) / 5000;
      const chargeableWeight = Math.max(weight, volumetricWeight);
      const baseRate = 20;
      const totalPrice = chargeableWeight * baseRate;

      const parcelData = {
        tracking_id: trackingData,
        sender_name: formData.sender_name,
        sender_phone: formData.sender_phone,
        sender_email: formData.sender_email,
        sender_address: formData.sender_address,
        receiver_name: formData.receiver_name,
        receiver_phone: formData.receiver_phone,
        receiver_address: formData.receiver_address,
        parcel_type: formData.parcel_type,
        weight,
        length,
        width,
        height,
        declared_value: declaredValue,
        service_type: formData.service_type,
        from_country: formData.from_country,
        to_country: formData.to_country,
        special_instructions: formData.special_instructions,
        total_price: totalPrice,
        payment_amount: totalPrice,
        currency: 'USD',
        current_status: 'created',
        request_status: 'pending',
        created_by: user.id
      };

      const { error } = await supabase
        .from('parcels')
        .insert([parcelData]);

      if (error) throw error;

      toast({
        title: "Request Submitted!",
        description: `Your shipment request has been submitted. Tracking ID: ${trackingData}`,
      });

      onSuccess();
    } catch (error: any) {
      console.error('Error creating request:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit request",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Sender Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sender_name">Full Name *</Label>
              <Input
                id="sender_name"
                value={formData.sender_name}
                onChange={(e) => handleInputChange('sender_name', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sender_phone">Phone Number *</Label>
              <Input
                id="sender_phone"
                type="tel"
                value={formData.sender_phone}
                onChange={(e) => handleInputChange('sender_phone', e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sender_email">Email Address *</Label>
            <Input
              id="sender_email"
              type="email"
              value={formData.sender_email}
              onChange={(e) => handleInputChange('sender_email', e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sender_address">Full Address *</Label>
            <Textarea
              id="sender_address"
              value={formData.sender_address}
              onChange={(e) => handleInputChange('sender_address', e.target.value)}
              required
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Receiver Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="receiver_name">Full Name *</Label>
              <Input
                id="receiver_name"
                value={formData.receiver_name}
                onChange={(e) => handleInputChange('receiver_name', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="receiver_phone">Phone Number *</Label>
              <Input
                id="receiver_phone"
                type="tel"
                value={formData.receiver_phone}
                onChange={(e) => handleInputChange('receiver_phone', e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="receiver_address">Full Address *</Label>
            <Textarea
              id="receiver_address"
              value={formData.receiver_address}
              onChange={(e) => handleInputChange('receiver_address', e.target.value)}
              required
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Parcel Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Parcel Type *</Label>
              <Select value={formData.parcel_type} onValueChange={(value) => handleInputChange('parcel_type', value)}>
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
              <Label>Service Type *</Label>
              <Select value={formData.service_type} onValueChange={(value) => handleInputChange('service_type', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {serviceTypes.map((service) => (
                    <SelectItem key={service.value} value={service.value}>
                      {service.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (kg) *</Label>
              <Input
                id="weight"
                type="number"
                step="0.01"
                min="0.01"
                value={formData.weight}
                onChange={(e) => handleInputChange('weight', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="length">Length (cm) *</Label>
              <Input
                id="length"
                type="number"
                step="0.1"
                min="1"
                value={formData.length}
                onChange={(e) => handleInputChange('length', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="width">Width (cm) *</Label>
              <Input
                id="width"
                type="number"
                step="0.1"
                min="1"
                value={formData.width}
                onChange={(e) => handleInputChange('width', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="height">Height (cm) *</Label>
              <Input
                id="height"
                type="number"
                step="0.1"
                min="1"
                value={formData.height}
                onChange={(e) => handleInputChange('height', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="declared_value">Declared Value (USD)</Label>
            <Input
              id="declared_value"
              type="number"
              step="0.01"
              min="0"
              value={formData.declared_value}
              onChange={(e) => handleInputChange('declared_value', e.target.value)}
              placeholder="0.00"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Route Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>From Country *</Label>
              <Select value={formData.from_country} onValueChange={(value) => handleInputChange('from_country', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select origin country" />
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
              <Label>To Country *</Label>
              <Select value={formData.to_country} onValueChange={(value) => handleInputChange('to_country', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select destination country" />
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
            <Label htmlFor="special_instructions">Special Instructions</Label>
            <Textarea
              id="special_instructions"
              value={formData.special_instructions}
              onChange={(e) => handleInputChange('special_instructions', e.target.value)}
              placeholder="Any special handling instructions..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Submitting Request...
          </>
        ) : (
          <>
            <Send className="mr-2 h-5 w-5" />
            Submit Shipment Request
          </>
        )}
      </Button>
    </form>
  );
};