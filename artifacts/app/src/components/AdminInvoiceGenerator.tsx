import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Download, Printer, DollarSign } from "lucide-react";

interface AdminInvoiceGeneratorProps {
  parcel: any;
  onInvoiceGenerated?: () => void;
}

interface InvoiceData {
  invoiceNumber: string;
  currency: string;
  serviceCharge: number;
  insuranceCharge: number;
  customsCharge: number;
  additionalCharges: number;
  discount: number;
  taxRate: number;
}

export const AdminInvoiceGenerator = ({ parcel, onInvoiceGenerated }: AdminInvoiceGeneratorProps) => {
  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    invoiceNumber: `INV-${Date.now()}`,
    currency: parcel.currency || 'USD',
    serviceCharge: parcel.total_price || 0,
    insuranceCharge: 0,
    customsCharge: 0,
    additionalCharges: 0,
    discount: 0,
    taxRate: 10
  });
  
  const [generating, setGenerating] = useState(false);
  const [generatedInvoice, setGeneratedInvoice] = useState<any>(null);
  const { toast } = useToast();

  const calculateTotals = () => {
    const subtotal = invoiceData.serviceCharge + invoiceData.insuranceCharge + 
                    invoiceData.customsCharge + invoiceData.additionalCharges - invoiceData.discount;
    const taxAmount = (subtotal * invoiceData.taxRate) / 100;
    const total = subtotal + taxAmount;
    
    return { subtotal, taxAmount, total };
  };

  const generateInvoice = async () => {
    setGenerating(true);
    try {
      const { subtotal, taxAmount, total } = calculateTotals();
      
      // Create invoice record in database
      const { data: invoice, error } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceData.invoiceNumber,
          tracking_number: parcel.tracking_id,
          // @ts-ignore
          sender_name: parcel.sender_name,
          receiver_name: parcel.receiver_name,
          service_charge: invoiceData.serviceCharge,
          insurance_charge: invoiceData.insuranceCharge,
          customs_charge: invoiceData.customsCharge,
          additional_charges: invoiceData.additionalCharges,
          discount: invoiceData.discount,
          tax_rate: invoiceData.taxRate,
          tax_amount: taxAmount,
          subtotal: subtotal,
          final_amount: total,
          currency: invoiceData.currency,
          parcel_details: {
            weight: parcel.weight,
            dimensions: `${parcel.length}×${parcel.width}×${parcel.height}`,
            type: parcel.parcel_type,
            service: parcel.service_type,
            from_country: parcel.from_country,
            to_country: parcel.to_country,
            declared_value: parcel.declared_value
          }
        })
        .select()
        .single();

      if (error) throw error;

      setGeneratedInvoice(invoice);
      
      toast({
        title: "Success!",
        description: "Invoice generated successfully",
      });

      if (onInvoiceGenerated) {
        onInvoiceGenerated();
      }
    } catch (error: any) {
      console.error('Error generating invoice:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate invoice",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const printInvoice = () => {
    if (!generatedInvoice) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const { subtotal, taxAmount, total } = calculateTotals();
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${generatedInvoice.invoice_number}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 20px; 
              color: #333;
              line-height: 1.6;
            }
            .invoice-header { 
              display: flex; 
              justify-content: space-between; 
              align-items: center; 
              margin-bottom: 30px;
              border-bottom: 2px solid #2563eb;
              padding-bottom: 20px;
            }
            .logo { 
              font-size: 28px; 
              font-weight: bold; 
              color: #2563eb;
              display: flex;
              align-items: center;
              gap: 10px;
            }
            .logo::before {
              content: "✈️";
              font-size: 32px;
            }
            .invoice-info { 
              text-align: right; 
            }
            .invoice-info h2 {
              margin: 0;
              color: #2563eb;
              font-size: 24px;
            }
            .invoice-info p {
              margin: 5px 0;
              color: #666;
            }
            .details-section { 
              display: grid; 
              grid-template-columns: 1fr 1fr; 
              gap: 30px; 
              margin-bottom: 30px;
            }
            .detail-card {
              background: #f8fafc;
              padding: 20px;
              border-radius: 8px;
              border-left: 4px solid #2563eb;
            }
            .detail-card h3 {
              margin: 0 0 15px 0;
              color: #2563eb;
              font-size: 16px;
              font-weight: 600;
            }
            .detail-card p {
              margin: 5px 0;
              font-size: 14px;
            }
            .charges-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 20px;
              background: white;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .charges-table th, .charges-table td { 
              padding: 12px; 
              text-align: left; 
              border-bottom: 1px solid #e2e8f0;
            }
            .charges-table th { 
              background: #f1f5f9; 
              font-weight: 600;
              color: #475569;
            }
            .charges-table .amount {
              text-align: right;
              font-weight: 500;
            }
            .total-row { 
              background: #2563eb; 
              color: white; 
              font-weight: bold;
            }
            .total-row td {
              border-bottom: none;
            }
            .parcel-info {
              background: #f8fafc;
              padding: 20px;
              border-radius: 8px;
              margin-bottom: 20px;
            }
            .parcel-info h3 {
              margin: 0 0 15px 0;
              color: #2563eb;
            }
            .parcel-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 15px;
            }
            .parcel-item {
              font-size: 14px;
            }
            .parcel-item strong {
              color: #475569;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e2e8f0;
              text-align: center;
              color: #666;
              font-size: 12px;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="invoice-header">
            <div class="logo">SkyXpress</div>
            <div class="invoice-info">
              <h2>INVOICE</h2>
              <p><strong>Invoice #:</strong> ${generatedInvoice.invoice_number}</p>
              <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
              <p><strong>Tracking ID:</strong> ${parcel.tracking_id}</p>
            </div>
          </div>

          <div class="details-section">
            <div class="detail-card">
              <h3>Sender Information</h3>
              <p><strong>Name:</strong> ${parcel.sender_name}</p>
              <p><strong>Phone:</strong> ${parcel.sender_phone}</p>
              <p><strong>Email:</strong> ${parcel.sender_email || 'N/A'}</p>
              <p><strong>Address:</strong> ${parcel.sender_address || 'N/A'}</p>
            </div>
            <div class="detail-card">
              <h3>Receiver Information</h3>
              <p><strong>Name:</strong> ${parcel.receiver_name}</p>
              <p><strong>Phone:</strong> ${parcel.receiver_phone}</p>
              <p><strong>Address:</strong> ${parcel.receiver_address || 'N/A'}</p>
            </div>
          </div>

          <div class="parcel-info">
            <h3>Parcel Details</h3>
            <div class="parcel-grid">
              <div class="parcel-item"><strong>Type:</strong> ${parcel.parcel_type}</div>
              <div class="parcel-item"><strong>Service:</strong> ${parcel.service_type}</div>
              <div class="parcel-item"><strong>Weight:</strong> ${parcel.weight} kg</div>
              <div class="parcel-item"><strong>Dimensions:</strong> ${parcel.length}×${parcel.width}×${parcel.height} cm</div>
              <div class="parcel-item"><strong>Route:</strong> ${parcel.from_country} → ${parcel.to_country}</div>
              <div class="parcel-item"><strong>Declared Value:</strong> USD ${(parcel.declared_value || 0).toFixed(2)}</div>
            </div>
          </div>

          <table class="charges-table">
            <thead>
              <tr>
                <th>Description</th>
                <th class="amount">Amount (${invoiceData.currency})</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Service Charge</td>
                <td class="amount">${invoiceData.serviceCharge.toFixed(2)}</td>
              </tr>
              ${invoiceData.insuranceCharge > 0 ? `
              <tr>
                <td>Insurance Charge</td>
                <td class="amount">${invoiceData.insuranceCharge.toFixed(2)}</td>
              </tr>` : ''}
              ${invoiceData.customsCharge > 0 ? `
              <tr>
                <td>Customs Charge</td>
                <td class="amount">${invoiceData.customsCharge.toFixed(2)}</td>
              </tr>` : ''}
              ${invoiceData.additionalCharges > 0 ? `
              <tr>
                <td>Additional Charges</td>
                <td class="amount">${invoiceData.additionalCharges.toFixed(2)}</td>
              </tr>` : ''}
              ${invoiceData.discount > 0 ? `
              <tr>
                <td>Discount</td>
                <td class="amount">-${invoiceData.discount.toFixed(2)}</td>
              </tr>` : ''}
              <tr>
                <td><strong>Subtotal</strong></td>
                <td class="amount"><strong>${subtotal.toFixed(2)}</strong></td>
              </tr>
              <tr>
                <td>Tax (${invoiceData.taxRate}%)</td>
                <td class="amount">${taxAmount.toFixed(2)}</td>
              </tr>
              <tr class="total-row">
                <td><strong>TOTAL AMOUNT</strong></td>
                <td class="amount"><strong>${total.toFixed(2)}</strong></td>
              </tr>
            </tbody>
          </table>

          <div class="footer">
            <p>Thank you for choosing SkyXpress for your shipping needs!</p>
            <p>For any queries, please contact us at support@skyxpress.com</p>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
  };

  const { subtotal, taxAmount, total } = calculateTotals();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Invoice
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="invoiceNumber">Invoice Number</Label>
              <Input
                id="invoiceNumber"
                value={invoiceData.invoiceNumber}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={invoiceData.currency}
                onValueChange={(value) => setInvoiceData(prev => ({ ...prev, currency: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="GBP">GBP - British Pound</SelectItem>
                  <SelectItem value="AED">AED - UAE Dirham</SelectItem>
                  <SelectItem value="PKR">PKR - Pakistani Rupee</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="serviceCharge">Service Charge</Label>
              <Input
                id="serviceCharge"
                type="number"
                step="0.01"
                value={invoiceData.serviceCharge}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, serviceCharge: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label htmlFor="insuranceCharge">Insurance Charge</Label>
              <Input
                id="insuranceCharge"
                type="number"
                step="0.01"
                value={invoiceData.insuranceCharge}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, insuranceCharge: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customsCharge">Customs Charge</Label>
              <Input
                id="customsCharge"
                type="number"
                step="0.01"
                value={invoiceData.customsCharge}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, customsCharge: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label htmlFor="additionalCharges">Additional Charges</Label>
              <Input
                id="additionalCharges"
                type="number"
                step="0.01"
                value={invoiceData.additionalCharges}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, additionalCharges: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="discount">Discount</Label>
              <Input
                id="discount"
                type="number"
                step="0.01"
                value={invoiceData.discount}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, discount: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label htmlFor="taxRate">Tax Rate (%)</Label>
              <Input
                id="taxRate"
                type="number"
                step="0.1"
                value={invoiceData.taxRate}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, taxRate: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>

          {/* Invoice Summary */}
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Invoice Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-medium">{invoiceData.currency} {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax ({invoiceData.taxRate}%):</span>
                  <span className="font-medium">{invoiceData.currency} {taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span className="text-primary">{invoiceData.currency} {total.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button 
              onClick={generateInvoice} 
              disabled={generating}
              className="flex-1"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Invoice
                </>
              )}
            </Button>
            
            {generatedInvoice && (
              <Button 
                onClick={printInvoice}
                variant="outline"
              >
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
