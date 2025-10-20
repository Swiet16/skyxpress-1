import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Plus, FileText, Download, Trash2, Calculator, Edit3, Save } from "lucide-react";
import { ProfessionalInvoice } from "./ProfessionalInvoice";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Parcel {
  id: string;
  tracking_id: string;
  sender_name: string;
  sender_email: string;
  receiver_name: string;
  receiver_address: string;
  from_country: string;
  to_country: string;
  weight: number;
  total_price: number;
  currency: string;
  current_status: string;
  created_at: string;
}

interface InvoiceItem {
  id: string;
  parcel_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface InvoiceData {
  customer_name: string;
  customer_email: string;
  customer_address: string;
  invoice_date: string;
  due_date: string;
  notes: string;
  tax_rate: number;
  currency: string;
  exchange_rate: number;
  items: InvoiceItem[];
}

// Extended currency list with 20+ countries - rates will be loaded from pricing config
const currencyInfo = [
  { code: 'USD', name: 'US Dollar', symbol: '$', country: 'United States' },
  { code: 'EUR', name: 'Euro', symbol: '€', country: 'European Union' },
  { code: 'GBP', name: 'British Pound', symbol: '£', country: 'United Kingdom' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED', country: 'United Arab Emirates' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: 'PKR', country: 'Pakistan' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', country: 'India' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR', country: 'Saudi Arabia' },
  { code: 'QAR', name: 'Qatari Riyal', symbol: 'QAR', country: 'Qatar' },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'KWD', country: 'Kuwait' },
  { code: 'BHD', name: 'Bahraini Dinar', symbol: 'BHD', country: 'Bahrain' },
  { code: 'OMR', name: 'Omani Rial', symbol: 'OMR', country: 'Oman' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', country: 'Canada' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', country: 'Australia' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', country: 'Japan' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', country: 'China' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', country: 'Switzerland' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'SEK', country: 'Sweden' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'NOK', country: 'Norway' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'DKK', country: 'Denmark' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', country: 'Singapore' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', country: 'Hong Kong' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', country: 'New Zealand' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'ZAR', country: 'South Africa' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', country: 'Turkey' },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$', country: 'Mexico' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', country: 'Brazil' }
];

export const InvoiceCreator = () => {
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [pricingConfig, setPricingConfig] = useState<any>(null);
  const [currencyRates, setCurrencyRates] = useState<{[key: string]: number}>({
    USD: 1.0, EUR: 0.85, GBP: 0.75, AED: 3.67, PKR: 285.0
  });
  const [selectedParcels, setSelectedParcels] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<any>(null);
  const [editingItems, setEditingItems] = useState<{[key: string]: boolean}>({});
  const [editedItems, setEditedItems] = useState<{[key: string]: InvoiceItem}>({});
  const [customItems, setCustomItems] = useState<InvoiceItem[]>([]);
  const [showAddCustomItem, setShowAddCustomItem] = useState(false);
  const [newCustomItem, setNewCustomItem] = useState<Partial<InvoiceItem>>({
    description: '',
    quantity: 1,
    unit_price: 0,
    total: 0
  });
  const { toast } = useToast();

  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    customer_name: "",
    customer_email: "",
    customer_address: "",
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: "",
    tax_rate: 10,
    currency: 'USD',
    exchange_rate: 1.0,
    items: []
  });

  useEffect(() => {
    fetchParcels();
    fetchPricingConfig();
  }, []);

  useEffect(() => {
    // Auto-populate customer info from first selected parcel
    if (selectedParcels.length > 0) {
      const firstParcel = parcels.find(p => p.id === selectedParcels[0]);
      if (firstParcel && !invoiceData.customer_name) {
        setInvoiceData(prev => ({
          ...prev,
          customer_name: firstParcel.sender_name,
          customer_email: firstParcel.sender_email,
        }));
      }
    }
  }, [selectedParcels, parcels]);

  const fetchPricingConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('pricing_config')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching pricing config:', error);
        return;
      }

      if (data) {
        setPricingConfig(data);
        if (data.currency_rates) {
          setCurrencyRates(data.currency_rates);
        }
        // Update tax rate from config
        if (data.tax_rate) {
          setInvoiceData(prev => ({
            ...prev,
            tax_rate: data.tax_rate * 100 // Convert decimal to percentage
          }));
        }
      }
    } catch (error: any) {
      console.error('Error fetching pricing config:', error);
    }
  };

  const fetchParcels = async () => {
    try {
      const { data, error } = await supabase
        .from('parcels')
        .select('*')
        .is('invoice_id', null) // Only parcels without invoices
        .order('created_at', { ascending: false });

      if (error) throw error;

      setParcels(data || []);
    } catch (error: any) {
      console.error('Error fetching parcels:', error);
      toast({
        title: "Error",
        description: "Failed to load parcels",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleParcelSelection = (parcelId: string, selected: boolean) => {
    if (selected) {
      setSelectedParcels(prev => [...prev, parcelId]);
    } else {
      setSelectedParcels(prev => prev.filter(id => id !== parcelId));
      // Remove from edited items if deselected
      setEditedItems(prev => {
        const newItems = { ...prev };
        delete newItems[parcelId];
        return newItems;
      });
      setEditingItems(prev => {
        const newItems = { ...prev };
        delete newItems[parcelId];
        return newItems;
      });
    }
  };

  const handleCurrencyChange = (newCurrency: string) => {
    const rate = currencyRates[newCurrency] || 1.0;
    setInvoiceData(prev => ({
      ...prev,
      currency: newCurrency,
      exchange_rate: rate
    }));
  };

  const generateInvoiceItems = (): InvoiceItem[] => {
    const parcelItems = selectedParcels.map(parcelId => {
      const parcel = parcels.find(p => p.id === parcelId);
      if (!parcel) return null;

      // Use edited item if available, otherwise use parcel data
      const editedItem = editedItems[parcelId];
      if (editedItem) {
        return editedItem;
      }

      return {
        id: parcel.id,
        parcel_id: parcel.id,
        description: `Shipping service from ${parcel.from_country} to ${parcel.to_country} (${parcel.tracking_id})`,
        quantity: 1,
        unit_price: parcel.total_price,
        total: parcel.total_price
      };
    }).filter(Boolean) as InvoiceItem[];

    // Add custom items
    return [...parcelItems, ...customItems];
  };

  const calculateTotals = () => {
    const items = generateInvoiceItems();
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = subtotal * (invoiceData.tax_rate / 100);
    const total = subtotal + taxAmount;

    // Apply exchange rate to final totals for display and PDF generation
    return { subtotal, taxAmount, total };


  };

  const startEditingItem = (parcelId: string) => {
    const parcel = parcels.find(p => p.id === parcelId);
    if (!parcel) return;

    const existingEdit = editedItems[parcelId];
    if (!existingEdit) {
      setEditedItems(prev => ({
        ...prev,
        [parcelId]: {
          id: parcel.id,
          parcel_id: parcel.id,
          description: `Shipping service from ${parcel.from_country} to ${parcel.to_country} (${parcel.tracking_id})`,
          quantity: 1,
          unit_price: parcel.total_price,
          total: parcel.total_price
        }
      }));
    }

    setEditingItems(prev => ({ ...prev, [parcelId]: true }));
  };

  const saveEditedItem = (parcelId: string) => {
    const editedItem = editedItems[parcelId];
    if (editedItem) {
      // Recalculate total
      const newTotal = editedItem.quantity * editedItem.unit_price;
      setEditedItems(prev => ({
        ...prev,
        [parcelId]: {
          ...editedItem,
          total: newTotal
        }
      }));
    }
    setEditingItems(prev => ({ ...prev, [parcelId]: false }));
  };

  const updateEditedItem = (parcelId: string, field: string, value: any) => {
    setEditedItems(prev => ({
      ...prev,
      [parcelId]: {
        ...prev[parcelId],
        [field]: value
      }
    }));
  };

  const addCustomItem = () => {
    if (!newCustomItem.description || newCustomItem.unit_price === undefined) {
      toast({
        title: "Error",
        description: "Please fill in description and unit price",
        variant: "destructive",
      });
      return;
    }

    const customItem: InvoiceItem = {
      id: `custom-${Date.now()}`,
      parcel_id: '',
      description: newCustomItem.description || '',
      quantity: newCustomItem.quantity || 1,
      unit_price: (newCustomItem.unit_price || 0),
      total: (newCustomItem.quantity || 1) * (newCustomItem.unit_price || 0)
    };

    setCustomItems(prev => [...prev, customItem]);
    setNewCustomItem({
      description: '',
      quantity: 1,
      unit_price: 0,
      total: 0
    });
    setShowAddCustomItem(false);

    toast({
      title: "Success",
      description: "Custom item added to invoice",
    });
  };

  const removeCustomItem = (itemId: string) => {
    setCustomItems(prev => prev.filter(item => item.id !== itemId));
  };

  const updateCustomItem = (itemId: string, field: string, value: any) => {
    setCustomItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unit_price') {
          updatedItem.total = updatedItem.quantity * updatedItem.unit_price;
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const createInvoice = async () => {
    const items = generateInvoiceItems();
    if (items.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one parcel or add a custom item",
        variant: "destructive",
      });
      return;
    }

    if (!invoiceData.customer_name || !invoiceData.customer_email) {
      toast({
        title: "Error",
        description: "Please fill in customer information",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);

    try {
      const items = generateInvoiceItems();
      const { subtotal, taxAmount, total } = calculateTotals();

      // Generate invoice number
      const invoiceNumber = `INV-${Date.now()}`;

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber,
          customer_name: invoiceData.customer_name,
          customer_email: invoiceData.customer_email,
          customer_address: invoiceData.customer_address,
          total_amount: subtotal,
          tax_amount: taxAmount,
          final_amount: total,
          currency: invoiceData.currency,
          exchange_rate: invoiceData.exchange_rate,
          payment_status: 'pending',
          status: 'sent',
          invoice_date: invoiceData.invoice_date,
          due_date: invoiceData.due_date,
          notes: invoiceData.notes,
          tracking_number: selectedParcels.map(id => 
            parcels.find(p => p.id === id)?.tracking_id
          ).join(', ')
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice items
      const invoiceItems = items.map(item => ({
        invoice_id: invoice.id,
        parcel_id: item.parcel_id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_amount: item.total
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItems);

      if (itemsError) throw itemsError;

      // Update parcels with invoice_id
      const { error: updateError } = await supabase
        .from('parcels')
        .update({ invoice_id: invoice.id })
        .in('id', selectedParcels);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: `Invoice ${invoiceNumber} created successfully`,
      });

      // Reset form
      setSelectedParcels([]);
      setEditedItems({});
      setEditingItems({});
      setCustomItems([]);
      setInvoiceData({
        customer_name: "",
        customer_email: "",
        customer_address: "",
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: "",
        tax_rate: 10,
        currency: 'USD',
        exchange_rate: 1.0,
        items: []
      });

      // Refresh parcels
      fetchParcels();

    } catch (error: any) {
      console.error('Error creating invoice:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create invoice",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const previewInvoiceData = () => {
    const items = generateInvoiceItems();
    const { subtotal, taxAmount, total } = calculateTotals();

    const preview = {
      invoice_number: `INV-PREVIEW-${Date.now()}`,
      customer_name: invoiceData.customer_name,
      customer_email: invoiceData.customer_email,
      customer_address: invoiceData.customer_address,
      total_amount: subtotal,
      tax_amount: taxAmount,
      final_amount: total,
      currency: invoiceData.currency,
      exchange_rate: invoiceData.exchange_rate,
      payment_status: 'pending',
      status: 'draft',
      invoice_date: invoiceData.invoice_date,
      due_date: invoiceData.due_date,
      notes: invoiceData.notes,
      tax_rate: invoiceData.tax_rate,
      tracking_number: selectedParcels.map(id => 
        parcels.find(p => p.id === id)?.tracking_id
      ).join(", ")
    };

    setPreviewInvoice({ invoice: preview, items });
    setShowPreview(true);
  };

  const filteredParcels = parcels.filter(parcel => {
    const query = searchQuery.toLowerCase();
    return (
      parcel.tracking_id.toLowerCase().includes(query) ||
      parcel.sender_name.toLowerCase().includes(query) ||
      parcel.receiver_name.toLowerCase().includes(query) ||
      parcel.from_country.toLowerCase().includes(query) ||
      parcel.to_country.toLowerCase().includes(query)
    );
  });

  const { subtotal, taxAmount, total } = calculateTotals();
  const selectedCurrency = currencyInfo.find(c => c.code === invoiceData.currency);

  // Create currencies array with live rates
  const currencies = currencyInfo.map(info => ({
    ...info,
    rate: currencyRates[info.code] || 1.0
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New Invoice
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Customer Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer_name">Customer Name</Label>
              <Input
                id="customer_name"
                value={invoiceData.customer_name}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, customer_name: e.target.value }))}
                placeholder="Enter customer name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer_email">Customer Email</Label>
              <Input
                id="customer_email"
                type="email"
                value={invoiceData.customer_email}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, customer_email: e.target.value }))}
                placeholder="Enter customer email"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="customer_address">Customer Address</Label>
              <Textarea
                id="customer_address"
                value={invoiceData.customer_address}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, customer_address: e.target.value }))}
                placeholder="Enter customer address"
                rows={3}
              />
            </div>
          </div>

          {/* Invoice Details */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoice_date">Invoice Date</Label>
              <Input
                id="invoice_date"
                type="date"
                value={invoiceData.invoice_date}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, invoice_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                value={invoiceData.due_date}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, due_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax_rate">Tax Rate (%)</Label>
              <Input
                id="tax_rate"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={invoiceData.tax_rate}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, tax_rate: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select value={invoiceData.currency} onValueChange={handleCurrencyChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((curr) => (
                    <SelectItem key={curr.code} value={curr.code}>
                      {curr.symbol} {curr.name} ({curr.country})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={invoiceData.notes}
              onChange={(e) => setInvoiceData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes or terms"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Parcel Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Select Parcels for Invoice
          </CardTitle>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search parcels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="secondary">
              {selectedParcels.length} selected
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Select</TableHead>
                  <TableHead>Tracking ID</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParcels.map((parcel) => {
                  const isSelected = selectedParcels.includes(parcel.id);
                  const isEditing = editingItems[parcel.id];
                  const editedItem = editedItems[parcel.id];
                  const displayItem = editedItem || {
                    description: `Shipping service from ${parcel.from_country} to ${parcel.to_country} (${parcel.tracking_id})`,
                    quantity: 1,
                    unit_price: parcel.total_price,
                    total: parcel.total_price
                  };

                  return (
                    <TableRow key={parcel.id} className={isSelected ? "bg-muted/50" : ""}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleParcelSelection(parcel.id, e.target.checked)}
                          className="rounded border-gray-300"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-mono font-semibold text-primary">
                          {parcel.tracking_id}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={displayItem.description}
                            onChange={(e) => updateEditedItem(parcel.id, 'description', e.target.value)}
                            className="min-w-[200px]"
                          />
                        ) : (
                          <div className="max-w-[200px] truncate">{displayItem.description}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="number"
                            min="1"
                            value={displayItem.quantity}
                            onChange={(e) => updateEditedItem(parcel.id, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-20"
                          />
                        ) : (
                          displayItem.quantity
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={displayItem.unit_price}
                            onChange={(e) => updateEditedItem(parcel.id, 'unit_price', parseFloat(e.target.value) || 0)}
                            className="w-24"
                          />
                        ) : (
                          <div className="font-semibold">
                            {selectedCurrency?.symbol} {(displayItem.unit_price).toFixed(2)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold">
                          {selectedCurrency?.symbol} {((displayItem.quantity * displayItem.unit_price)).toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isSelected && (
                          <div className="flex gap-2">
                            {isEditing ? (
                              <Button
                                size="sm"
                                onClick={() => saveEditedItem(parcel.id)}
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startEditingItem(parcel.id)}
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {filteredParcels.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No available parcels found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Custom Items Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Custom Line Items
            </CardTitle>
            <Button
              onClick={() => setShowAddCustomItem(true)}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Custom Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {customItems.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Input
                          value={item.description}
                          onChange={(e) => updateCustomItem(item.id, 'description', e.target.value)}
                          className="min-w-[200px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateCustomItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => updateCustomItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold">
                          {selectedCurrency?.symbol} {(item.total).toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => removeCustomItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No custom items added</p>
            </div>
          )}

          {/* Add Custom Item Form */}
          {showAddCustomItem && (
            <div className="mt-6 p-4 border rounded-lg bg-muted/50">
              <h4 className="font-semibold mb-4">Add Custom Item</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="custom-description">Description</Label>
                  <Input
                    id="custom-description"
                    value={newCustomItem.description}
                    onChange={(e) => setNewCustomItem(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter item description"
                  />
                </div>
                <div>
                  <Label htmlFor="custom-quantity">Quantity</Label>
                  <Input
                    id="custom-quantity"
                    type="number"
                    min="1"
                    value={newCustomItem.quantity}
                    onChange={(e) => setNewCustomItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                  />
                </div>
                <div>
                  <Label htmlFor="custom-price">Unit Price (USD)</Label>
                  <Input
                    id="custom-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={newCustomItem.unit_price}
                    onChange={(e) => setNewCustomItem(prev => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={addCustomItem}>
                  Add Item
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowAddCustomItem(false);
                    setNewCustomItem({
                      description: '',
                      quantity: 1,
                      unit_price: 0,
                      total: 0
                    });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Summary */}
      {(selectedParcels.length > 0 || customItems.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Invoice Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Currency:</span>
                <span className="font-semibold">{selectedCurrency?.name} ({selectedCurrency?.symbol})</span>
              </div>
              <div className="flex justify-between">
                <span>Exchange Rate:</span>
                <span className="font-semibold">1 USD = {invoiceData.exchange_rate} {invoiceData.currency}</span>
              </div>
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-semibold">{selectedCurrency?.symbol} {(subtotal * invoiceData.exchange_rate).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax ({invoiceData.tax_rate}%):</span>
                <span className="font-semibold">{selectedCurrency?.symbol} {(taxAmount * invoiceData.exchange_rate).toFixed(2)}</span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>{selectedCurrency?.symbol} {(total * invoiceData.exchange_rate).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <Button
                onClick={previewInvoiceData}
                variant="outline"
                disabled={selectedParcels.length === 0 && customItems.length === 0}
              >
                <FileText className="h-4 w-4 mr-2" />
                Preview Invoice
              </Button>
              <Button
                onClick={createInvoice}
                disabled={creating || (selectedParcels.length === 0 && customItems.length === 0)}
              >
                {creating ? "Creating..." : "Create Invoice"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Preview</DialogTitle>
          </DialogHeader>
          {previewInvoice && (
            <ProfessionalInvoice 
              invoice={previewInvoice.invoice} 
              items={previewInvoice.items}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
