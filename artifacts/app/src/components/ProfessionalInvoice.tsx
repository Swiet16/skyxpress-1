import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Printer, Edit3, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { generateInvoicePDF } from '@/utils/pdfGenerator';
import skyxpressLogo from '@/assets/skyxpress_logo.png';

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  total_price?: number;
  total_amount?: number;
}

interface ProfessionalInvoiceProps {
  invoice: {
    id: string;
    invoice_number: string;
    invoice_date: string;
    due_date: string;
    customer_name: string;
    customer_email: string;
    customer_phone?: string;
    customer_address?: string;
    tracking_number: string;
    origin_country?: string;
    destination_country?: string;
    service_type?: string;
    weight?: number;
    total_amount: number;
    tax_amount: number;
    final_amount: number;
    currency: string;
    payment_status: string;
    exchange_rate?: number;
    notes?: string;
  };
  items: InvoiceItem[];
}

// Extended currency list with 20+ countries
const currencies = [
  { code: 'USD', name: 'US Dollar', symbol: '$', rate: 1.0, country: 'United States' },
  { code: 'EUR', name: 'Euro', symbol: '€', rate: 0.85, country: 'European Union' },
  { code: 'GBP', name: 'British Pound', symbol: '£', rate: 0.75, country: 'United Kingdom' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED', rate: 3.67, country: 'United Arab Emirates' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: 'PKR', rate: 285.0, country: 'Pakistan' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', rate: 83.0, country: 'India' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR', rate: 3.75, country: 'Saudi Arabia' },
  { code: 'QAR', name: 'Qatari Riyal', symbol: 'QAR', rate: 3.64, country: 'Qatar' },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'KWD', rate: 0.31, country: 'Kuwait' },
  { code: 'BHD', name: 'Bahraini Dinar', symbol: 'BHD', rate: 0.38, country: 'Bahrain' },
  { code: 'OMR', name: 'Omani Rial', symbol: 'OMR', rate: 0.38, country: 'Oman' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', rate: 1.35, country: 'Canada' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', rate: 1.55, country: 'Australia' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', rate: 150.0, country: 'Japan' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', rate: 7.25, country: 'China' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', rate: 0.88, country: 'Switzerland' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'SEK', rate: 10.5, country: 'Sweden' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'NOK', rate: 10.8, country: 'Norway' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'DKK', rate: 6.85, country: 'Denmark' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', rate: 1.35, country: 'Singapore' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', rate: 7.8, country: 'Hong Kong' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', rate: 1.65, country: 'New Zealand' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'ZAR', rate: 18.5, country: 'South Africa' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', rate: 30.0, country: 'Turkey' },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$', rate: 17.0, country: 'Mexico' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', rate: 5.0, country: 'Brazil' }
];

export const ProfessionalInvoice = ({ invoice: initialInvoice, items }: ProfessionalInvoiceProps) => {
  const [invoice, setInvoice] = useState(initialInvoice);
  const [isEditing, setIsEditing] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedCurrency, setEditedCurrency] = useState(invoice.currency);
  const { toast } = useToast();

  // Live update invoice data
  useEffect(() => {
    const channel = supabase
      .channel(`invoice_${invoice.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'invoices',
          filter: `id=eq.${invoice.id}`
        },
        (payload) => {
          console.log('Invoice updated:', payload);
          setInvoice(payload.new as any);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [invoice.id]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      await generateInvoicePDF(invoice, items);
      toast({
        title: "PDF Generated",
        description: "Invoice PDF has been downloaded successfully",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleCurrencyChange = async () => {
    if (editedCurrency === invoice.currency) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      const selectedCurrency = currencies.find(c => c.code === editedCurrency);
      if (!selectedCurrency) throw new Error('Invalid currency selected');

      const newExchangeRate = selectedCurrency.rate;
      // Convert current invoice amounts back to USD equivalent using the *current* exchange rate.
      // The initialInvoice amounts are assumed to be in the base currency (USD).
      // Convert these base amounts to the new selected currency using the new exchange rate.
      const newTotalAmount = initialInvoice.total_amount * newExchangeRate;
      const newTaxAmount = initialInvoice.tax_amount * newExchangeRate;
      const newFinalAmount = initialInvoice.final_amount * newExchangeRate;

      const { error } = await supabase
        .from("invoices")
        .update({
          currency: editedCurrency,
          exchange_rate: newExchangeRate,
          total_amount: newTotalAmount,
          tax_amount: newTaxAmount,
          final_amount: newFinalAmount,
        })
        .eq('id', invoice.id);

      if (error) throw error;

      toast({
        title: "Currency Updated",
        description: `Invoice currency changed to ${editedCurrency}`,
      });

      setIsEditing(false);
    } catch (error: any) {
      console.error('Error updating currency:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update currency",
        variant: "destructive",
      });
      setEditedCurrency(invoice.currency);
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getCurrencySymbol = (currencyCode: string) => {
    return currencies.find(c => c.code === currencyCode)?.symbol || currencyCode;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-background">
      {/* Action Buttons - Only show on screen, not print */}
      <div className="flex gap-4 mb-6 print:hidden">
        <Button onClick={handlePrint} variant="outline" className="flex items-center gap-2">
          <Printer className="h-4 w-4" />
          Print Invoice
        </Button>
        <Button 
          onClick={handleDownloadPDF} 
          disabled={isGeneratingPDF}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          {isGeneratingPDF ? 'Generating PDF...' : 'Download PDF'}
        </Button>
        <Button 
          onClick={() => setIsEditing(!isEditing)} 
          variant="outline"
          className="flex items-center gap-2"
        >
          {isEditing ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
          {isEditing ? 'Cancel' : 'Edit Currency'}
        </Button>
      </div>

      {/* Currency Editor */}
      {isEditing && (
        <Card className="mb-6 print:hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Label htmlFor="currency-select">Currency:</Label>
              <Select value={editedCurrency} onValueChange={setEditedCurrency}>
                <SelectTrigger className="w-64">
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
              <Button 
                onClick={handleCurrencyChange} 
                disabled={isSaving}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoice Content */}
      <Card className="border shadow-lg print:shadow-none print:border-0" id="invoice-content">
        <CardContent className="p-8">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-center gap-4">
              <img 
                src={skyxpressLogo} 
                alt="SkyXpress Logo" 
                className="h-16 w-auto object-contain"
              />
              <div>
                <h1 className="text-3xl font-bold">
                  <span className="text-secondary">Sky</span>
                  <span className="text-primary">Xpress</span>
                </h1>
                <p className="text-muted-foreground">International Courier & Cargo</p>
                <div className="text-sm text-muted-foreground mt-1">
                  <p>📧 skyxpress786@gmail.com</p>
                  <p>📞 0326 9422411 • 0321 4710522</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-3xl font-bold text-primary mb-2">INVOICE</h2>
              <p className="text-lg font-mono font-semibold">#{invoice.invoice_number}</p>
            </div>
          </div>

          {/* Company & Customer Details */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            {/* Company Details */}
            <div>
              <h3 className="font-semibold text-lg mb-4 text-primary">From:</h3>
              <div className="space-y-1 text-sm">
                <p className="font-semibold">SkyXpress International</p>
                <p>Courier & Cargo Services</p>
                <p>📧 skyxpress786@gmail.com</p>
                <p>📞 0326 9422411</p>
                <p>📞 0321 4710522</p>
              </div>
            </div>

            {/* Customer Details */}
            <div>
              <h3 className="font-semibold text-lg mb-4 text-primary">Bill To:</h3>
              <div className="space-y-1 text-sm">
                <p className="font-semibold">{invoice.customer_name}</p>
                <p>📧 {invoice.customer_email}</p>
                {invoice.customer_phone && <p>📞 {invoice.customer_phone}</p>}
                {invoice.customer_address && (
                  <p className="text-muted-foreground">{invoice.customer_address}</p>
                )}
              </div>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="grid grid-cols-3 gap-6 mb-8 p-4 bg-muted/30 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Invoice Date</p>
              <p className="font-semibold">{formatDate(invoice.invoice_date)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Due Date</p>
              <p className="font-semibold">{formatDate(invoice.due_date)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tracking Number</p>
              <p className="font-semibold font-mono">{invoice.tracking_number}</p>
            </div>
          </div>

          {/* Shipment Details */}
          {(invoice.origin_country || invoice.destination_country) && (
            <div className="mb-8 p-4 border rounded-lg">
              <h4 className="font-semibold mb-3 text-primary">Shipment Details</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                {invoice.origin_country && (
                  <div>
                    <p className="text-muted-foreground">Origin</p>
                    <p className="font-medium">{invoice.origin_country}</p>
                  </div>
                )}
                {invoice.destination_country && (
                  <div>
                    <p className="text-muted-foreground">Destination</p>
                    <p className="font-medium">{invoice.destination_country}</p>
                  </div>
                )}
                {invoice.service_type && (
                  <div>
                    <p className="text-muted-foreground">Service Type</p>
                    <p className="font-medium capitalize">{invoice.service_type}</p>
                  </div>
                )}
                {invoice.weight && (
                  <div>
                    <p className="text-muted-foreground">Weight</p>
                    <p className="font-medium">{invoice.weight} kg</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Items Table */}
          <div className="mb-8">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-primary/10">
                    <th className="border border-border p-3 text-left">Description</th>
                    <th className="border border-border p-3 text-center">Qty</th>
                    <th className="border border-border p-3 text-right">Unit Price</th>
                    <th className="border border-border p-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index}>
                      <td className="border border-border p-3">{item.description}</td>
                      <td className="border border-border p-3 text-center">{item.quantity}</td>
                      <td className="border border-border p-3 text-right">
                        {getCurrencySymbol(invoice.currency)} {(item.unit_price).toFixed(2)}
                      </td>
                      <td className="border border-border p-3 text-right">
                        {getCurrencySymbol(invoice.currency)} {((item.total_price || item.total_amount || 0)).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-80 space-y-2">
              <div className="flex justify-between py-2">
                <span>Subtotal:</span>
                <span>{getCurrencySymbol(invoice.currency)} {(invoice.total_amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2">
                {/* @ts-ignore */}
                <span>Tax ({(invoice as any).tax_rate}%):</span>
                <span>{getCurrencySymbol(invoice.currency)} {(invoice.tax_amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-3 text-lg font-bold border-t border-border">
                <span>Total:</span>
                <span>{getCurrencySymbol(invoice.currency)} {(invoice.final_amount).toFixed(2)}</span>
              </div>
              {invoice.currency !== 'USD' && invoice.exchange_rate && (
                <div className="text-sm text-muted-foreground">
                  Exchange Rate: 1 USD = {invoice.exchange_rate} {invoice.currency}
                </div>
              )}
            </div>
          </div>

          {/* Notes Section */}
          {invoice.notes && (
            <div className="mb-8 p-4 rounded-lg bg-muted/30">
              <h4 className="font-semibold mb-2 text-primary">Notes:</h4>
              <p className="text-sm">{invoice.notes}</p>
            </div>
          )}

          {/* Barcode Section */}
          <div className="mb-8 text-center p-4 bg-muted/20 rounded-lg">
            <div className="font-mono text-2xl tracking-widest mb-2 text-primary">
              |||||| || |||| | ||| |||| || ||||||
            </div>
            <p className="text-sm text-muted-foreground font-mono">{invoice.tracking_number}</p>
          </div>

          {/* Footer */}
          <div className="text-center text-sm text-muted-foreground border-t border-border pt-6">
            <p className="mb-2 font-semibold">Thank you for choosing SkyXpress International</p>
            <p>For any inquiries, please contact us at skyxpress786@gmail.com</p>
            <p className="mt-2">© 2025 SkyXpress International. All rights reserved.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};