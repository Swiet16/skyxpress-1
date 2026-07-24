import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download } from "lucide-react";
import { generateInvoicePDF } from "@/utils/pdfGenerator";
import { useToast } from "@/hooks/use-toast";

interface ParcelData {
  id: string;
  tracking_id: string;
  sender_name: string;
  sender_email: string;
  sender_phone: string;
  sender_address: string;
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
  from_country: string;
  to_country: string;
  service_type: string;
  weight: number;
  payment_amount: number;
  currency: string;
  created_at: string;
  parcel_type: string;
}

interface UserPaymentInvoiceProps {
  parcel: ParcelData;
}

export const UserPaymentInvoice = ({ parcel }: UserPaymentInvoiceProps) => {
  const { toast } = useToast();

  const handleDownload = async () => {
    try {
      const invoiceData = {
        id: parcel.id,
        invoice_number: `PAY-${parcel.tracking_id}`,
        invoice_date: parcel.created_at,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        customer_name: parcel.sender_name,
        customer_email: parcel.sender_email,
        customer_phone: parcel.sender_phone,
        customer_address: parcel.sender_address,
        tracking_number: parcel.tracking_id,
        origin_country: parcel.from_country,
        destination_country: parcel.to_country,
        service_type: parcel.service_type,
        weight: parcel.weight,
        total_amount: parcel.payment_amount,
        tax_amount: parcel.payment_amount * 0.1,
        final_amount: parcel.payment_amount * 1.1,
        currency: parcel.currency || 'USD',
        payment_status: 'pending',
        notes: 'Please make payment within 7 days to process your shipment.',
      };

      const items = [
        {
          description: `${parcel.service_type.toUpperCase()} Shipping Service from ${parcel.from_country} to ${parcel.to_country} (${parcel.parcel_type})`,
          quantity: 1,
          unit_price: parcel.payment_amount,
          total_amount: parcel.payment_amount,
        }
      ];

      await generateInvoicePDF(invoiceData, items);

      toast({
        title: "Invoice Downloaded",
        description: `Payment invoice for ${parcel.tracking_id} has been downloaded`,
      });
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast({
        title: "Error",
        description: "Failed to download invoice. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Button size="sm" variant="outline" onClick={handleDownload}>
      <Download className="h-4 w-4 mr-2" />
      Download Payment Invoice
    </Button>
  );
};