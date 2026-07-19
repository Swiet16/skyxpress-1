import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Package, Plus, Trash2 } from "lucide-react";

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
  reference_id?: string; // Add reference_id field
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
    freight_amount_pkr: parcel?.freight_amount_pkr || "",
    items: parcel?.items || [
      {
        description: "",
        quantity: 1,
        unit_price: 0,
        hs_code: "",
        total: 0
      }
    ],
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Fetch countries from Supabase 'countries' table on mount
  useEffect(() => {
    const fetchCountries = async () => {
      setCountriesLoading(true);
      const { data, error } = await supabase
        .from('countries')
        .select('code, name, continent')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching countries:', error);
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

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Auto-calculate total
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].total = newItems[index].quantity * newItems[index].unit_price;
    }
    
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { description: "", quantity: 1, unit_price: 0, hs_code: "", total: 0 }]
    }));
  };

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      const parcelData = {
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

      if (parcel) {
        // UPDATE existing parcel
        const { error } = await supabase
          .from('parcels')
          .update(parcelData)
          .eq('id', parcel.id);

        if (error) throw error;

        toast({
          title: "Success!",
          description: `Parcel ${parcel.tracking_id} updated successfully`,
        });
      } else {
        // CREATE new parcel
        // Generate tracking ID
        const { data: trackingData, error: trackingError } = await supabase
          .rpc('generate_numeric_tracking');

        if (trackingError) throw trackingError;

        const { error } = await supabase
          .from('parcels')
          .insert([{
            ...parcelData,
            tracking_id: trackingData,
            request_status: 'pending',
            current_status: 'created'
          }]);

        if (error) throw error;

        toast({
          title: "Success!",
          description: `Parcel request submitted with tracking ID: ${trackingData}`,
        });
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error saving parcel:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save parcel",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Sender Information */}
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
              <Label htmlFor="sender_company">Company Name</Label>
              <Input
                id="sender_company"
                value={formData.sender_company}
                onChange={(e) => handleInputChange('sender_company', e.target.value)}
                placeholder="Optional"
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
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sender_cnic">CNIC Number</Label>
              <Input
                id="sender_cnic"
                value={formData.sender_cnic}
                onChange={(e) => handleInputChange('sender_cnic', e.target.value)}
                placeholder="e.g., 1234567890123"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sender_city">City *</Label>
              <Input
                id="sender_city"
                value={formData.sender_city}
                onChange={(e) => handleInputChange('sender_city', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sender_country">Country *</Label>
              <Select value={formData.sender_country} onValueChange={(value) => handleInputChange('sender_country', value)}>
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
              onChange={(e) => handleInputChange('sender_address', e.target.value)}
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
              <Label htmlFor="receiver_company">Company Name</Label>
              <Input
                id="receiver_company"
                value={formData.receiver_company}
                onChange={(e) => handleInputChange('receiver_company', e.target.value)}
                placeholder="Optional"
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
            <div className="space-y-2">
              <Label htmlFor="receiver_email">Email Address *</Label>
              <Input
                id="receiver_email"
                type="email"
                value={formData.receiver_email}
                onChange={(e) => handleInputChange('receiver_email', e.target.value)}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="receiver_country">Country *</Label>
              <Select value={formData.receiver_country} onValueChange={(value) => handleInputChange('receiver_country', value)}>
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
              <Label htmlFor="receiver_city">City *</Label>
              <Input
                id="receiver_city"
                value={formData.receiver_city}
                onChange={(e) => handleInputChange('receiver_city', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="receiver_state">State/Province *</Label>
              <Input
                id="receiver_state"
                value={formData.receiver_state}
                onChange={(e) => handleInputChange('receiver_state', e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="receiver_postal_code">Postal Code *</Label>
            <Input
              id="receiver_postal_code"
              value={formData.receiver_postal_code}
              onChange={(e) => handleInputChange('receiver_postal_code', e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="receiver_address">Full Address *</Label>
            <Textarea
              id="receiver_address"
              value={formData.receiver_address}
              onChange={(e) => handleInputChange('receiver_address', e.target.value)}
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* Description Tab - Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Item Description</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.items.map((item, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Item {index + 1}</h4>
                {formData.items.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(index)}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label>Item Description *</Label>
                  <Input
                    value={item.description}
                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                    placeholder="e.g., Electronics, Clothing, etc."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quantity *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unit Price (USD) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.unit_price}
                    onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>HS Code</Label>
                  <Input
                    value={item.hs_code}
                    onChange={(e) => handleItemChange(index, 'hs_code', e.target.value)}
                    placeholder="e.g., 8471.30.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total</Label>
                  <Input
                    value={`$${item.total.toFixed(2)}`}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>
            </div>
          ))}
          <div className="p-4 bg-primary/5 rounded-lg">
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Subtotal:</span>
              <span>${calculateSubtotal().toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Parcel Details */}
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
                  <SelectValue placeholder="Select parcel type" />
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
                  <SelectValue placeholder="Select service type" />
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
            <div className="space-y-2">
              <Label>Document Type *</Label>
              <Select value={formData.document_type} onValueChange={(value) => handleInputChange('document_type', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map((docType) => (
                    <SelectItem key={docType.value} value={docType.value}>
                      {docType.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="weight">Weight (KG) *</Label>
              <Input
                id="weight"
                type="number"
                step="0.01"
                required
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="pieces">Number of Pieces/Boxes *</Label>
              <Input
                id="pieces"
                type="number"
                min="1"
                required
                value={formData.pieces || 1}
                onChange={(e) => setFormData({ ...formData, pieces: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="freight_amount_pkr">Freight Amount (PKR)</Label>
              <Input
                id="freight_amount_pkr"
                type="number"
                step="0.01"
                min="0"
                value={formData.freight_amount_pkr}
                onChange={(e) => handleInputChange('freight_amount_pkr', e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="length">Length (CM)</Label>
              <Input
                id="length"
                type="number"
                step="0.01"
                value={formData.length}
                onChange={(e) => setFormData({ ...formData, length: e.target.value })}
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

      {/* Route Information */}
      <Card>
        <CardHeader>
          <CardTitle>Route Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>From Country</Label>
              <Select value={formData.from_country} onValueChange={(value) => handleInputChange('from_country', value)}>
                <SelectTrigger>
                  <SelectValue placeholder={countriesLoading ? "Loading countries..." : "Select origin country"} />
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
              <Label>To Country</Label>
              <Select value={formData.to_country} onValueChange={(value) => handleInputChange('to_country', value)}>
                <SelectTrigger>
                  <SelectValue placeholder={countriesLoading ? "Loading countries..." : "Select destination country"} />
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
            />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            {parcel ? 'Updating...' : 'Submitting Request...'}
          </>
        ) : (
          <>
            <Package className="mr-2 h-5 w-5" />
            {parcel ? 'Update Parcel' : 'Submit Parcel Request'}
          </>
        )}
      </Button>
    </form>
  );
};
