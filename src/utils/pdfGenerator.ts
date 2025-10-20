import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface InvoiceData {
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
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  total_amount?: number;
  total_price?: number;
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

export const generateInvoicePDF = async (invoice: InvoiceData, items: InvoiceItem[]): Promise<void> => {
  try {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    let yPosition = margin;

    // Helper function to get currency symbol
    const getCurrencySymbol = (currencyCode: string) => {
      return currencies.find(c => c.code === currencyCode)?.symbol || currencyCode;
    };

    // Helper function to format date
    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    // Header - Company Logo and Title
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(59, 130, 246); // Primary blue color
    pdf.setFontSize(32);
    pdf.text('SkyXpress', margin, yPosition);
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    pdf.text('International Courier & Cargo', margin, yPosition + 8);
    
    // Invoice title and number
    pdf.setFontSize(28);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(59, 130, 246);
    pdf.text('INVOICE', pageWidth - margin - 50, yPosition);
    
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);
    pdf.text(`#${invoice.invoice_number}`, pageWidth - margin - 50, yPosition + 10);

    yPosition += 30;

    // Company contact info
    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    pdf.text('Email: skyxpress786@gmail.com', margin, yPosition);
    pdf.text('Phone: 0326 9422411 • 0321 4710522', margin, yPosition + 5);

    yPosition += 20;

    // From and Bill To sections
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(59, 130, 246);
    pdf.text('From:', margin, yPosition);
    pdf.text('Bill To:', pageWidth / 2, yPosition);

    yPosition += 8;

    // Company details
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);
    pdf.text('SkyXpress International', margin, yPosition);
    pdf.text('Courier & Cargo Services', margin, yPosition + 5);
    pdf.text('skyxpress786@gmail.com', margin, yPosition + 10);
    pdf.text('0326 9422411', margin, yPosition + 15);

    // Customer details
    pdf.text(invoice.customer_name, pageWidth / 2, yPosition);
    pdf.text(invoice.customer_email, pageWidth / 2, yPosition + 5);
    if (invoice.customer_phone) {
      pdf.text(invoice.customer_phone, pageWidth / 2, yPosition + 10);
    }
    if (invoice.customer_address) {
      const addressLines = pdf.splitTextToSize(invoice.customer_address, 80);
      pdf.text(addressLines, pageWidth / 2, yPosition + 15);
    }

    yPosition += 35;

    // Invoice details box
    pdf.setFillColor(245, 245, 245);
    pdf.rect(margin, yPosition, pageWidth - 2 * margin, 20, 'F');
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(100, 100, 100);
    pdf.text('Invoice Date', margin + 5, yPosition + 6);
    pdf.text('Due Date', margin + 60, yPosition + 6);
    pdf.text('Tracking Number', margin + 120, yPosition + 6);

    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);
    pdf.text(formatDate(invoice.invoice_date), margin + 5, yPosition + 14);
    pdf.text(formatDate(invoice.due_date), margin + 60, yPosition + 14);
    pdf.text(invoice.tracking_number, margin + 120, yPosition + 14);

    yPosition += 30;

    // Shipment details if available
    if (invoice.origin_country || invoice.destination_country) {
      pdf.setDrawColor(200, 200, 200);
      pdf.rect(margin, yPosition, pageWidth - 2 * margin, 25);
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(59, 130, 246);
      pdf.text('Shipment Details', margin + 5, yPosition + 8);

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 0);
      
      let shipmentY = yPosition + 16;
      if (invoice.origin_country) {
        pdf.text(`Origin: ${invoice.origin_country}`, margin + 5, shipmentY);
      }
      if (invoice.destination_country) {
        pdf.text(`Destination: ${invoice.destination_country}`, margin + 60, shipmentY);
      }
      if (invoice.service_type) {
        pdf.text(`Service: ${invoice.service_type}`, margin + 120, shipmentY);
      }
      if (invoice.weight) {
        pdf.text(`Weight: ${invoice.weight} kg`, margin + 5, shipmentY + 6);
      }

      yPosition += 35;
    }

    // Currency information
    if (invoice.currency !== 'USD' && invoice.exchange_rate) {
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      const currencyInfo = currencies.find(c => c.code === invoice.currency);
      if (currencyInfo) {
        pdf.text(`Currency: ${currencyInfo.name} (${currencyInfo.country})`, margin, yPosition);
        pdf.text(`Exchange Rate: 1 USD = ${invoice.exchange_rate} ${invoice.currency}`, margin, yPosition + 5);
        yPosition += 15;
      }
    }

    // Items table header
    pdf.setFillColor(59, 130, 246);
    pdf.rect(margin, yPosition, pageWidth - 2 * margin, 10, 'F');
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text('Description', margin + 5, yPosition + 7);
    pdf.text('Qty', pageWidth - 120, yPosition + 7);
    pdf.text('Unit Price', pageWidth - 80, yPosition + 7);
    pdf.text('Total', pageWidth - 40, yPosition + 7);

    yPosition += 10;

    // Items
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);
    
    items.forEach((item, index) => {
      if (yPosition > pageHeight - 50) {
        pdf.addPage();
        yPosition = margin;
      }

      const rowHeight = 8;
      if (index % 2 === 0) {
        pdf.setFillColor(250, 250, 250);
        pdf.rect(margin, yPosition, pageWidth - 2 * margin, rowHeight, 'F');
      }

      const descriptionLines = pdf.splitTextToSize(item.description, 100);
      pdf.text(descriptionLines, margin + 5, yPosition + 5);
      
      pdf.text(item.quantity.toString(), pageWidth - 120, yPosition + 5);
      
      const unitPrice = (item.unit_price).toFixed(2);
      pdf.text(`${getCurrencySymbol(invoice.currency)} ${unitPrice}`, pageWidth - 80, yPosition + 5);
      
      const total = (item.total_amount || item.total_price || 0).toFixed(2);
      pdf.text(`${getCurrencySymbol(invoice.currency)} ${total}`, pageWidth - 40, yPosition + 5);

      yPosition += rowHeight;
    });

    yPosition += 10;

    // Totals section
    const totalsX = pageWidth - 80;
    
    pdf.setFont('helvetica', 'normal');
    pdf.text('Subtotal:', totalsX - 30, yPosition);
    pdf.text(`${getCurrencySymbol(invoice.currency)} ${invoice.total_amount.toFixed(2)}`, totalsX, yPosition);
    
    yPosition += 8;
    pdf.text(`Tax (${(invoice.tax_rate || 10)}%):`, totalsX - 30, yPosition);
    pdf.text(`${getCurrencySymbol(invoice.currency)} ${invoice.tax_amount.toFixed(2)}`, totalsX, yPosition);
    
    yPosition += 8;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text("Total:", totalsX - 30, yPosition);
    pdf.text(`${getCurrencySymbol(invoice.currency)} ${invoice.final_amount.toFixed(2)}`, totalsX, yPosition);

    yPosition += 20;

    // Notes if available
    if (invoice.notes) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(59, 130, 246);
      pdf.text('Notes:', margin, yPosition);
      
      yPosition += 8;
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 0);
      const notesLines = pdf.splitTextToSize(invoice.notes, pageWidth - 2 * margin);
      pdf.text(notesLines, margin, yPosition);
      yPosition += notesLines.length * 5 + 10;
    }

    // Barcode representation
    pdf.setTextColor(59, 130, 246);
    pdf.setFont('courier', 'bold');
    pdf.setFontSize(16);
    pdf.text('|||||| || |||| | ||| |||| || ||||||', margin, yPosition);
    
    pdf.setFont('courier', 'normal');
    pdf.setFontSize(10);
    pdf.text(invoice.tracking_number, margin, yPosition + 8);

    yPosition += 25;

    // Footer
    yPosition = pageHeight - 30;
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
    
    yPosition += 8;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(59, 130, 246);
    pdf.text('Thank you for choosing SkyXpress International', pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 6;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text('For any inquiries, please contact us at skyxpress786@gmail.com', pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 5;
    pdf.text('© 2025 SkyXpress International. All rights reserved.', pageWidth / 2, yPosition, { align: 'center' });

    // Save the PDF
    pdf.save(`SkyXpress_Invoice_${invoice.invoice_number}.pdf`);

  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF');
  }
};

export const generateInvoicePDFFromElement = async (elementId: string, filename: string): Promise<void> => {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error('Invoice element not found');
    }

    // Hide print-only elements and payment status
    const printOnlyElements = element.querySelectorAll('.print\\:hidden');
    const paymentStatusElements = element.querySelectorAll('[data-payment-status]');
    
    printOnlyElements.forEach(el => {
      (el as HTMLElement).style.display = 'none';
    });
    
    paymentStatusElements.forEach(el => {
      (el as HTMLElement).style.display = 'none';
    });

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    });

    // Restore hidden elements
    printOnlyElements.forEach(el => {
      (el as HTMLElement).style.display = '';
    });
    
    paymentStatusElements.forEach(el => {
      (el as HTMLElement).style.display = '';
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    const imgX = (pdfWidth - imgWidth * ratio) / 2;
    const imgY = 0;

    pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
    pdf.save(filename);

  } catch (error) {
    console.error('Error generating PDF from element:', error);
    throw new Error('Failed to generate PDF');
  }
};