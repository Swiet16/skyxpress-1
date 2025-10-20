import { Button } from "@/components/ui/button";
import { Download, FileText, Plane, Eye, Printer } from "lucide-react";
import { generatePaymentInvoice, generateAirwayBillVerification, generateAirwayBillWithPayment, generateAllBills } from "@/utils/billGenerator";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";

interface BillDownloaderProps {
  parcel: any;
  showAll?: boolean;
}

export const BillDownloader = ({ parcel, showAll = false }: BillDownloaderProps) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownloadPaymentInvoice = async () => {
    setIsGenerating(true);
    try {
      await generatePaymentInvoice(parcel, 'download');
      toast({
        title: "Success",
        description: "Payment invoice downloaded successfully",
      });
    } catch (error) {
      console.error('Error generating payment invoice:', error);
      toast({
        title: "Error",
        description: "Failed to generate payment invoice",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreviewPaymentInvoice = async () => {
    setIsGenerating(true);
    try {
      await generatePaymentInvoice(parcel, 'preview');
    } catch (error) {
      console.error('Error previewing payment invoice:', error);
      toast({
        title: "Error",
        description: "Failed to preview payment invoice",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrintPaymentInvoice = async () => {
    setIsGenerating(true);
    try {
      await generatePaymentInvoice(parcel, 'print');
    } catch (error) {
      console.error('Error printing payment invoice:', error);
      toast({
        title: "Error",
        description: "Failed to print payment invoice",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadAWBVerification = async () => {
    setIsGenerating(true);
    try {
      await generateAirwayBillVerification(parcel, 'download');
      toast({
        title: "Success",
        description: "Airway Bill (Verification) downloaded successfully",
      });
    } catch (error) {
      console.error('Error generating AWB verification:', error);
      toast({
        title: "Error",
        description: "Failed to generate AWB verification",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreviewAWBVerification = async () => {
    setIsGenerating(true);
    try {
      await generateAirwayBillVerification(parcel, 'preview');
    } catch (error) {
      console.error('Error previewing AWB verification:', error);
      toast({
        title: "Error",
        description: "Failed to preview AWB verification",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrintAWBVerification = async () => {
    setIsGenerating(true);
    try {
      await generateAirwayBillVerification(parcel, 'print');
    } catch (error) {
      console.error('Error printing AWB verification:', error);
      toast({
        title: "Error",
        description: "Failed to print AWB verification",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadAWBWithPayment = async () => {
    setIsGenerating(true);
    try {
      await generateAirwayBillWithPayment(parcel, 'download');
      toast({
        title: "Success",
        description: "Airway Bill (With Payment) downloaded successfully",
      });
    } catch (error) {
      console.error('Error generating AWB with payment:', error);
      toast({
        title: "Error",
        description: "Failed to generate AWB with payment",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreviewAWBWithPayment = async () => {
    setIsGenerating(true);
    try {
      await generateAirwayBillWithPayment(parcel, 'preview');
    } catch (error) {
      console.error('Error previewing AWB with payment:', error);
      toast({
        title: "Error",
        description: "Failed to preview AWB with payment",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrintAWBWithPayment = async () => {
    setIsGenerating(true);
    try {
      await generateAirwayBillWithPayment(parcel, 'print');
    } catch (error) {
      console.error('Error printing AWB with payment:', error);
      toast({
        title: "Error",
        description: "Failed to print AWB with payment",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadAll = async () => {
    setIsGenerating(true);
    try {
      await generateAllBills(parcel);
      toast({
        title: "Success",
        description: "All 3 bills are being downloaded...",
      });
    } catch (error) {
      console.error('Error generating all bills:', error);
      toast({
        title: "Error",
        description: "Failed to generate bills",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (!showAll) {
    return (
      <div className="flex gap-2">
        <Button
          onClick={handleDownloadPaymentInvoice}
          variant="outline"
          size="sm"
          className="flex-1"
          disabled={isGenerating}
        >
          <Download className="h-4 w-4 mr-2" />
          {isGenerating ? "Generating..." : "Download Invoice"}
        </Button>
        <Button
          onClick={handlePreviewPaymentInvoice}
          variant="outline"
          size="sm"
          disabled={isGenerating}
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button
          onClick={handlePrintPaymentInvoice}
          variant="outline"
          size="sm"
          disabled={isGenerating}
        >
          <Printer className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Download Bills & Documents
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Performa Invoice */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <FileText className="h-4 w-4" />
            Performa Invoice (Gift)
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleDownloadPaymentInvoice}
              variant="outline"
              size="sm"
              className="flex-1"
              disabled={isGenerating}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button
              onClick={handlePreviewPaymentInvoice}
              variant="outline"
              size="sm"
              disabled={isGenerating}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button
              onClick={handlePrintPaymentInvoice}
              variant="outline"
              size="sm"
              disabled={isGenerating}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </div>

        {/* AWB Verification */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Plane className="h-4 w-4" />
            Airway Bill (Airport Verification)
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleDownloadAWBVerification}
              variant="outline"
              size="sm"
              className="flex-1"
              disabled={isGenerating}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button
              onClick={handlePreviewAWBVerification}
              variant="outline"
              size="sm"
              disabled={isGenerating}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button
              onClick={handlePrintAWBVerification}
              variant="outline"
              size="sm"
              disabled={isGenerating}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </div>

        {/* AWB With Payment */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Plane className="h-4 w-4" />
            Airway Bill (Sender Copy with Payment)
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleDownloadAWBWithPayment}
              variant="outline"
              size="sm"
              className="flex-1"
              disabled={isGenerating}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button
              onClick={handlePreviewAWBWithPayment}
              variant="outline"
              size="sm"
              disabled={isGenerating}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button
              onClick={handlePrintAWBWithPayment}
              variant="outline"
              size="sm"
              disabled={isGenerating}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </div>

        <div className="pt-2 border-t">
          <Button
            onClick={handleDownloadAll}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
            disabled={isGenerating}
          >
            <Download className="h-4 w-4 mr-2" />
            {isGenerating ? "Generating..." : "Download All 3 Bills"}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground pt-2">
          <p className="font-semibold mb-1">Bill Types:</p>
          <ul className="space-y-1 list-disc list-inside">
            <li><strong>Performa Invoice (Gift):</strong> For customs declaration</li>
            <li><strong>Airway Bill (Verification):</strong> For airport/customs verification</li>
            <li><strong>Airway Bill (Sender Copy):</strong> Sender receipt with payment details</li>
          </ul>
          <p className="mt-2 text-green-600 font-medium">✓ All bills include 9-digit tracking IDs</p>
        </div>
      </CardContent>
    </Card>
  );
};