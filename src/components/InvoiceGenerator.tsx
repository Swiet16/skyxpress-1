import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Download, Printer, DollarSign, Building2 } from "lucide-react";

interface InvoiceGeneratorProps {
  trackingId: string;
  senderName: string;
  receiverName: string;
  fromCountry: string;
  toCountry: string;
}

const InvoiceGenerator = ({ trackingId, senderName, receiverName, fromCountry, toCountry }: InvoiceGeneratorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState({
    customerName: receiverName || "",
    customerEmail: "",
    customerPhone: "",
    customerAddress: "",
    currency: "PKR",
    weight: "",
    length: "",
    width: "",
    height: "",
    serviceType: "standard",
    description: `Shipping from ${fromCountry} to ${toCountry}`
  });
  const [generatedInvoice, setGeneratedInvoice] = useState<any>(null);
  const { toast } = useToast();

  const currencies = [
    { value: "PKR", label: "PKR - Pakistani Rupee", symbol: "₨" },
    { value: "USD", label: "USD - US Dollar", symbol: "$" },
    { value: "EUR", label: "EUR - Euro", symbol: "€" },
    { value: "GBP", label: "GBP - British Pound", symbol: "£" },
    { value: "AED", label: "AED - UAE Dirham", symbol: "د.إ" }
  ];

  const serviceTypes = [
    { value: "standard", label: "Standard Delivery (5-7 days)" },
    { value: "express", label: "Express Delivery (2-3 days)" },
    { value: "overnight", label: "Overnight Delivery (1 day)" }
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const calculateEstimate = () => {
    const weight = parseFloat(formData.weight) || 1;
    const baseRates = {
      standard: 15,
      express: 25,
      overnight: 45
    };
    
    const baseRate = baseRates[formData.serviceType as keyof typeof baseRates];
    const estimate = weight * baseRate;
    
    // Currency conversion rates (approximate)
    const rates = {
      PKR: 285,
      USD: 1,
      EUR: 0.85,
      GBP: 0.75,
      AED: 3.67
    };
    
    return estimate * (rates[formData.currency as keyof typeof rates] || 1);
  };

  const generateInvoice = async () => {
    if (!formData.customerName || !formData.weight) {
      toast({
        title: "Missing Information",
        description: "Please fill in customer name and package weight.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      // First create a quote
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .insert({
          email: formData.customerEmail,
          phone: formData.customerPhone,
          origin_country: fromCountry,
          destination_country: toCountry,
          weight: parseFloat(formData.weight),
          length: parseFloat(formData.length) || null,
          width: parseFloat(formData.width) || null,
          height: parseFloat(formData.height) || null,
          service_type: formData.serviceType,
          price_estimate: calculateEstimate(),
          tracking_id: trackingId
        })
        .select()
        .single();

      if (quoteError) throw quoteError;

      // Generate invoice using the edge function
      const { data: invoiceData, error: invoiceError } = await supabase.functions.invoke('generate-invoice', {
        body: {
          quote_id: quote.id,
          customer_name: formData.customerName,
          customer_address: formData.customerAddress,
          currency: formData.currency
        }
      });

      if (invoiceError) throw invoiceError;

      setGeneratedInvoice({
        ...invoiceData,
        customerName: formData.customerName,
        customerAddress: formData.customerAddress,
        description: formData.description,
        weight: formData.weight,
        serviceType: formData.serviceType,
        currencySymbol: currencies.find(c => c.value === formData.currency)?.symbol || "$"
      });

      toast({
        title: "Invoice Generated Successfully!",
        description: `Invoice #${invoiceData.invoice_number} has been created.`,
      });

    } catch (error: any) {
      console.error('Invoice generation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate invoice. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadInvoice = () => {
    if (!generatedInvoice) return;

    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Invoice #${generatedInvoice.invoice_number}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
          .invoice { max-width: 800px; margin: 0 auto; background: white; padding: 20px 40px 40px 40px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 3px solid #3b82f6; padding-bottom: 20px; padding-top: 0; margin-top: 0; }
          .logo { font-size: 28px; font-weight: bold; color: #3b82f6; line-height: 1; }
          .invoice-details { text-align: right; }
          .invoice-number { font-size: 24px; font-weight: bold; color: #1f2937; }
          .tracking-id { font-size: 14px; color: #6b7280; margin-top: 5px; }
          .billing-info { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
          .info-section h3 { color: #3b82f6; margin-bottom: 10px; font-size: 16px; }
          .info-section p { margin: 5px 0; color: #4b5563; }
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          .items-table th, .items-table td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
          .items-table th { background: #f9fafb; color: #374151; font-weight: 600; }
          .total-section { text-align: right; margin-top: 30px; }
          .total-row { display: flex; justify-content: space-between; margin: 8px 0; }
          .total-final { font-size: 20px; font-weight: bold; color: #3b82f6; border-top: 2px solid #3b82f6; padding-top: 10px; margin-top: 15px; }
          .barcode { text-align: center; margin: 30px 0; }
          .barcode-number { font-family: monospace; font-size: 18px; letter-spacing: 2px; margin-top: 10px; }
          .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="invoice">
          <div class="header">
            <div class="logo">SkyXpress</div>
            <div class="invoice-details">
              <div class="invoice-number">Invoice #${generatedInvoice.invoice_number}</div>
              <div class="tracking-id">Tracking: ${generatedInvoice.tracking_number}</div>
              <div style="margin-top: 10px; color: #6b7280;">${new Date().toLocaleDateString()}</div>
            </div>
          </div>
          
          <div class="billing-info">
            <div class="info-section">
              <h3>Bill To:</h3>
              <p><strong>${generatedInvoice.customerName}</strong></p>
              ${generatedInvoice.customerAddress ? `<p>${generatedInvoice.customerAddress}</p>` : ''}
            </div>
            <div class="info-section">
              <h3>Shipment Details:</h3>
              <p><strong>From:</strong> ${fromCountry}</p>
              <p><strong>To:</strong> ${toCountry}</p>
              <p><strong>Service:</strong> ${formData.serviceType.charAt(0).toUpperCase() + formData.serviceType.slice(1)}</p>
              <p><strong>Weight:</strong> ${generatedInvoice.weight} kg</p>
            </div>
          </div>
          
          <table class="items-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Weight</th>
                <th>Rate</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${generatedInvoice.description}</td>
                <td>${generatedInvoice.weight} kg</td>
                <td>${generatedInvoice.currencySymbol}${(generatedInvoice.total_amount / parseFloat(generatedInvoice.weight)).toFixed(2)}</td>
                <td>${generatedInvoice.currencySymbol}${generatedInvoice.total_amount}</td>
              </tr>
            </tbody>
          </table>
          
          <div class="total-section">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>${generatedInvoice.currencySymbol}${generatedInvoice.total_amount}</span>
            </div>
            <div class="total-row">
              <span>Tax (10%):</span>
              <span>${generatedInvoice.currencySymbol}${(generatedInvoice.total_amount * 0.1).toFixed(2)}</span>
            </div>
            <div class="total-row total-final">
              <span>Total Amount:</span>
              <span>${generatedInvoice.currencySymbol}${(generatedInvoice.total_amount * 1.1).toFixed(2)}</span>
            </div>
          </div>
          
          <div class="barcode">
            <div style="font-weight: bold; margin-bottom: 10px;">Tracking Barcode</div>
            <div style="font-size: 30px; font-family: 'Courier New', monospace; background: #000; color: white; padding: 10px; display: inline-block;">||||| |||| |||||</div>
            <div class="barcode-number">${generatedInvoice.tracking_number}</div>
          </div>
          
          <div class="footer">
            <p><strong>SkyXpress Global Logistics</strong></p>
            <p>Thank you for choosing SkyXpress for your shipping needs!</p>
            <p>For support, contact us at support@skyxpress.com</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([invoiceHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SkyXpress_Invoice_${generatedInvoice.invoice_number}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const printInvoice = () => {
    if (!generatedInvoice) return;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invoice #${generatedInvoice.invoice_number}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .invoice { max-width: 800px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px; }
            .logo { font-size: 24px; font-weight: bold; }
            .invoice-details { text-align: right; }
            .billing-info { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .items-table th, .items-table td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
            .items-table th { background: #f5f5f5; }
            .total-section { text-align: right; margin-top: 20px; }
            .total-row { display: flex; justify-content: space-between; margin: 5px 0; }
            .total-final { font-size: 18px; font-weight: bold; border-top: 2px solid #333; padding-top: 10px; margin-top: 10px; }
            .barcode { text-align: center; margin: 20px 0; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="invoice">
            <div class="header">
              <div class="logo">SkyXpress</div>
              <div class="invoice-details">
                <div style="font-size: 20px; font-weight: bold;">Invoice #${generatedInvoice.invoice_number}</div>
                <div>Tracking: ${generatedInvoice.tracking_number}</div>
                <div>${new Date().toLocaleDateString()}</div>
              </div>
            </div>
            
            <div class="billing-info">
              <div>
                <h3>Bill To:</h3>
                <p><strong>${generatedInvoice.customerName}</strong></p>
                ${generatedInvoice.customerAddress ? `<p>${generatedInvoice.customerAddress}</p>` : ''}
              </div>
              <div>
                <h3>Shipment Details:</h3>
                <p><strong>From:</strong> ${fromCountry}</p>
                <p><strong>To:</strong> ${toCountry}</p>
                <p><strong>Service:</strong> ${formData.serviceType}</p>
                <p><strong>Weight:</strong> ${generatedInvoice.weight} kg</p>
              </div>
            </div>
            
            <table class="items-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Weight</th>
                  <th>Rate</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>${generatedInvoice.description}</td>
                  <td>${generatedInvoice.weight} kg</td>
                  <td>${generatedInvoice.currencySymbol}${(generatedInvoice.total_amount / parseFloat(generatedInvoice.weight)).toFixed(2)}</td>
                  <td>${generatedInvoice.currencySymbol}${generatedInvoice.total_amount}</td>
                </tr>
              </tbody>
            </table>
            
            <div class="total-section">
              <div class="total-row">
                <span>Subtotal:</span>
                <span>${generatedInvoice.currencySymbol}${generatedInvoice.total_amount}</span>
              </div>
              <div class="total-row">
                <span>Tax (10%):</span>
                <span>${generatedInvoice.currencySymbol}${(generatedInvoice.total_amount * 0.1).toFixed(2)}</span>
              </div>
              <div class="total-row total-final">
                <span>Total Amount:</span>
                <span>${generatedInvoice.currencySymbol}${(generatedInvoice.total_amount * 1.1).toFixed(2)}</span>
              </div>
            </div>
            
            <div class="barcode">
              <div style="font-weight: bold;">Tracking: ${generatedInvoice.tracking_number}</div>
            </div>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  if (!isOpen) {
    return (
      <Button 
        onClick={() => setIsOpen(true)}
        className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
      >
        <FileText className="mr-2 h-5 w-5" />
        Generate Invoice
      </Button>
    );
  }

  return (
    <Card className="mt-6 shadow-xl border-0 bg-gradient-to-br from-card/95 to-card/90 backdrop-blur-sm">
      <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-lg border-b">
        <CardTitle className="text-2xl font-bold text-green-800 flex items-center">
          <Building2 className="mr-3 h-6 w-6" />
          Generate Professional Invoice
        </CardTitle>
        <p className="text-green-600 mt-2">Create a detailed invoice for tracking ID: {trackingId}</p>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {!generatedInvoice ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="customerName" className="text-sm font-semibold text-gray-700">Customer Name *</Label>
                  <Input
                    id="customerName"
                    value={formData.customerName}
                    onChange={(e) => handleInputChange('customerName', e.target.value)}
                    placeholder="Enter customer name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="customerEmail" className="text-sm font-semibold text-gray-700">Email</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={formData.customerEmail}
                    onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                    placeholder="customer@email.com"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="customerPhone" className="text-sm font-semibold text-gray-700">Phone</Label>
                  <Input
                    id="customerPhone"
                    value={formData.customerPhone}
                    onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                    placeholder="+92 300 1234567"
                    className="mt-1"
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="weight" className="text-sm font-semibold text-gray-700">Weight (kg) *</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    value={formData.weight}
                    onChange={(e) => handleInputChange('weight', e.target.value)}
                    placeholder="1.5"
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label htmlFor="length" className="text-sm font-semibold text-gray-700">Length (cm)</Label>
                    <Input
                      id="length"
                      type="number"
                      value={formData.length}
                      onChange={(e) => handleInputChange('length', e.target.value)}
                      placeholder="30"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="width" className="text-sm font-semibold text-gray-700">Width (cm)</Label>
                    <Input
                      id="width"
                      type="number"
                      value={formData.width}
                      onChange={(e) => handleInputChange('width', e.target.value)}
                      placeholder="20"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="height" className="text-sm font-semibold text-gray-700">Height (cm)</Label>
                    <Input
                      id="height"
                      type="number"
                      value={formData.height}
                      onChange={(e) => handleInputChange('height', e.target.value)}
                      placeholder="10"
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="currency" className="text-sm font-semibold text-gray-700">Currency</Label>
                  <Select value={formData.currency} onValueChange={(value) => handleInputChange('currency', value)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((currency) => (
                        <SelectItem key={currency.value} value={currency.value}>
                          {currency.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="serviceType" className="text-sm font-semibold text-gray-700">Service Type</Label>
                <Select value={formData.serviceType} onValueChange={(value) => handleInputChange('serviceType', value)}>
                  <SelectTrigger className="mt-1">
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
              <div>
                <Label htmlFor="customerAddress" className="text-sm font-semibold text-gray-700">Customer Address</Label>
                <Textarea
                  id="customerAddress"
                  value={formData.customerAddress}
                  onChange={(e) => handleInputChange('customerAddress', e.target.value)}
                  placeholder="Enter full address..."
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>

            {formData.weight && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <span className="text-blue-800 font-semibold">Estimated Cost:</span>
                  <span className="text-2xl font-bold text-blue-900">
                    {currencies.find(c => c.value === formData.currency)?.symbol}{calculateEstimate().toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <Button 
                onClick={generateInvoice}
                disabled={isGenerating}
                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <DollarSign className="mr-2 h-5 w-5" />
                    Generate Invoice
                  </>
                )}
              </Button>
              <Button 
                onClick={() => setIsOpen(false)}
                variant="outline"
                className="px-6 py-3 rounded-xl border-2 hover:bg-gray-50"
              >
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
              <h3 className="text-xl font-bold text-green-800 mb-4">Invoice Generated Successfully!</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-green-600">Invoice Number:</span>
                  <span className="font-semibold ml-2">{generatedInvoice.invoice_number}</span>
                </div>
                <div>
                  <span className="text-green-600">Tracking Number:</span>
                  <span className="font-mono font-semibold ml-2">{generatedInvoice.tracking_number}</span>
                </div>
                <div>
                  <span className="text-green-600">Total Amount:</span>
                  <span className="font-bold ml-2 text-lg">{generatedInvoice.currencySymbol}{(generatedInvoice.total_amount * 1.1).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-green-600">Currency:</span>
                  <span className="font-semibold ml-2">{formData.currency}</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-4">
              <Button 
                onClick={downloadInvoice}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Download className="mr-2 h-5 w-5" />
                Download Invoice
              </Button>
              <Button 
                onClick={printInvoice}
                className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Printer className="mr-2 h-5 w-5" />
                Print Invoice
              </Button>
            </div>
            
            <Button 
              onClick={() => {
                setIsOpen(false);
                setGeneratedInvoice(null);
                setFormData({
                  customerName: receiverName || "",
                  customerEmail: "",
                  customerPhone: "",
                  customerAddress: "",
                  currency: "PKR",
                  weight: "",
                  length: "",
                  width: "",
                  height: "",
                  serviceType: "standard",
                  description: `Shipping from ${fromCountry} to ${toCountry}`
                });
              }}
              variant="outline"
              className="w-full py-3 rounded-xl border-2 hover:bg-gray-50"
            >
              Close
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InvoiceGenerator;