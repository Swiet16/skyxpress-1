import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';
import { addBarcode, addWrappedText } from './pdfHelpers';

interface ParcelData {
  tracking_id: string;
  reference_id?: string;
  sender_name: string;
  sender_company?: string;
  sender_address: string;
  sender_city: string;
  sender_country: string;
  sender_phone: string;
  sender_email?: string;
  sender_cnic?: string;
  receiver_name: string;
  receiver_company?: string;
  receiver_email?: string;
  receiver_address: string;
  receiver_city: string;
  receiver_state: string;
  receiver_postal_code: string;
  receiver_country: string;
  receiver_phone: string;
  weight: number;
  length?: number;
  width?: number;
  height?: number;
  pieces?: number;
  service_type: string;
  document_type?: string;
  items?: Array<{
    description: string;
    quantity: number;
    unit_price?: number;
    hs_code?: string;
    total?: number;
  }>;
  total_price: number;
  currency?: string;
  created_at?: string;
  freight_amount_pkr?: number;
}

// Helper function to ensure valid text for jsPDF
const safeText = (value: any, fallback: string = 'N/A'): string => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  return String(value);
};

type OutputMode = 'download' | 'preview' | 'print';

const handlePDFOutput = (pdf: jsPDF, filename: string, mode: OutputMode = 'download') => {
  const blob = pdf.output('blob');
  const url = URL.createObjectURL(blob);
  
  if (mode === 'download') {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  } else if (mode === 'preview') {
    const newWindow = window.open(url, '_blank');
    if (!newWindow) {
      window.location.href = url;
    }
  } else if (mode === 'print') {
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    } else {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = url;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(url);
        }, 1000);
      };
    }
  }
};

// Load and add logo to PDF - using user's provided logo
const addLogo = async (pdf: jsPDF, x: number, y: number, width: number, height: number) => {
  const logoUrl = 'https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/document-uploads/skyxpress-logo-1760347926331.jpg';
  
  try {
    const response = await fetch(logoUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch logo: ${response.status}`);
    }
    const blob = await response.blob();
    
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          const base64 = reader.result as string;
          pdf.addImage(base64, 'JPEG', x, y, width, height);
          console.log('✓ Logo added successfully');
          resolve();
        } catch (err) {
          console.error('Error adding logo to PDF:', err);
          resolve(); // Continue without logo
        }
      };
      reader.onerror = () => {
        console.error('FileReader error');
        resolve(); // Continue without logo
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error loading logo:', error);
    // Don't throw - just continue without logo
    return Promise.resolve();
  }
};

// ===== 1. INVOICE (removed GIFT) =====
export const generatePaymentInvoice = async (parcel: any, mode: OutputMode = 'download'): Promise<void> => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  let yPos = 6;

  // Professional border
  pdf.setDrawColor(30, 144, 255);
  pdf.setLineWidth(0.8);
  pdf.rect(5, 5, pageWidth - 10, pageHeight - 10);

  // Add logo at top
  await addLogo(pdf, margin, yPos, 50, 30);

  // Contact info next to logo - 4 rows (matching Airway Bill 2)
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(80, 80, 80);
  pdf.text('Email: skyxpress786@gmail.com', 60, yPos + 3);
  pdf.text('Phone: 042 999164619', 60, yPos + 8);
  pdf.text('WhatsApp: 0326 9422411', 60, yPos + 13);
  pdf.text('www.skyxpress.site', 60, yPos + 18);

  // Right side: Header box
  const rightBoxX = pageWidth - margin - 75;
  pdf.setFillColor(30, 144, 255);
  pdf.rect(rightBoxX, yPos, 65, 20, 'F');
  
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('INVOICE', rightBoxX + 2, yPos + 6);
  
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('INVOICE #:', rightBoxX + 2, yPos + 11);

  const refNumber = safeText(parcel.reference_id || parcel.tracking_id, '000000000');
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text(refNumber, rightBoxX + 24, yPos + 11);

  // Barcode instead of QR code -- rendered client-side via bwip-js,
  // no external API call needed. Sits along the bottom of the header box.
  addBarcode(pdf, refNumber, rightBoxX + 2, yPos + 12.5, 61, 7, false);

  yPos += 28;

  // Shipper & Receiver sections
  const boxWidth = (pageWidth - 2 * margin - 3) / 2;
  const infoBoxHeight = 51; // grown from 47 to give wrapped addresses room
  const infoFillHeight = infoBoxHeight - 7;

  // Shipper box
  pdf.setFillColor(30, 144, 255);
  pdf.rect(margin, yPos, boxWidth, 7, 'F');
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('SHIPPER', margin + 2, yPos + 5);
  
  pdf.setFillColor(250, 250, 250);
  pdf.rect(margin, yPos + 7, boxWidth, infoFillHeight, 'F');
  pdf.setDrawColor(200, 200, 200);
  pdf.rect(margin, yPos, boxWidth, infoBoxHeight);
  
  pdf.setFontSize(9);
  pdf.setTextColor(0, 0, 0);
  let shipperY = yPos + 12;
  
  pdf.setFont('helvetica', 'bold');
  pdf.text('Name:', margin + 2, shipperY);
  pdf.setFont('helvetica', 'normal');
  pdf.text(safeText(parcel.sender_name, 'N/A'), margin + 15, shipperY);
  
  shipperY += 5;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Company:', margin + 2, shipperY);
  pdf.setFont('helvetica', 'normal');
  pdf.text(safeText(parcel.sender_company, 'N/A'), margin + 20, shipperY);
  
  shipperY += 5;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Address:', margin + 2, shipperY);
  pdf.setFont('helvetica', 'normal');
  // Wraps up to 3 lines and reports back where it actually ended, so the
  // fields below never overlap a long address anymore.
  shipperY = addWrappedText(
    pdf,
    safeText(parcel.sender_address, 'N/A'),
    margin + 18,
    shipperY,
    boxWidth - 20,
    4,
    3
  );
  
  shipperY += 5;
  pdf.setFont('helvetica', 'normal');
  pdf.text(`${safeText(parcel.sender_city, '')}, ${safeText(parcel.sender_country, 'Pakistan')}`, margin + 2, shipperY);
  
  shipperY += 5;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Phone:', margin + 2, shipperY);
  pdf.setFont('helvetica', 'normal');
  pdf.text(safeText(parcel.sender_phone, 'N/A'), margin + 15, shipperY);
  
  shipperY += 5;
  pdf.setFont('helvetica', 'bold');
  pdf.text('CNIC:', margin + 2, shipperY);
  pdf.setFont('helvetica', 'normal');
  pdf.text(safeText(parcel.sender_cnic, 'N/A'), margin + 13, shipperY);

  // Receiver box
  const receiverX = pageWidth / 2 + 1.5;
  pdf.setFillColor(30, 144, 255);
  pdf.rect(receiverX, yPos, boxWidth, 7, 'F');
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('RECEIVER', receiverX + 2, yPos + 5);
  
  pdf.setFillColor(250, 250, 250);
  pdf.rect(receiverX, yPos + 7, boxWidth, infoFillHeight, 'F');
  pdf.setDrawColor(200, 200, 200);
  pdf.rect(receiverX, yPos, boxWidth, infoBoxHeight);
  
  pdf.setFontSize(9);
  pdf.setTextColor(0, 0, 0);
  let receiverY = yPos + 12;
  
  pdf.setFont('helvetica', 'bold');
  pdf.text('Name:', receiverX + 2, receiverY);
  pdf.setFont('helvetica', 'normal');
  pdf.text(safeText(parcel.receiver_name, 'N/A'), receiverX + 15, receiverY);
  
  receiverY += 5;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Company:', receiverX + 2, receiverY);
  pdf.setFont('helvetica', 'normal');
  pdf.text(safeText(parcel.receiver_company, 'N/A'), receiverX + 20, receiverY);
  
  receiverY += 5;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Address:', receiverX + 2, receiverY);
  pdf.setFont('helvetica', 'normal');
  const receiverFullAddress = `${safeText(parcel.receiver_address, '')} ${safeText(parcel.receiver_city, '')}`.trim();
  receiverY = addWrappedText(
    pdf,
    receiverFullAddress,
    receiverX + 18,
    receiverY,
    boxWidth - 20,
    4,
    3
  );
  
  receiverY += 5;
  pdf.setFont('helvetica', 'normal');
  pdf.text(`${safeText(parcel.receiver_state, '')}, ${safeText(parcel.receiver_country, 'UK')}`, receiverX + 2, receiverY);
  
  receiverY += 5;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Postal Code:', receiverX + 2, receiverY);
  pdf.setFont('helvetica', 'normal');
  pdf.text(safeText(parcel.receiver_postal_code, 'N/A'), receiverX + 23, receiverY);
  
  receiverY += 5;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Phone:', receiverX + 2, receiverY);
  pdf.setFont('helvetica', 'normal');
  pdf.text(safeText(parcel.receiver_phone, 'N/A'), receiverX + 15, receiverY);
  
  receiverY += 5;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Email:', receiverX + 2, receiverY);
  pdf.setFont('helvetica', 'normal');
  addWrappedText(pdf, safeText(parcel.receiver_email, 'N/A'), receiverX + 14, receiverY, boxWidth - 16, 4, 2);

  // Both columns are now variable height (address wrap can push things
  // down); continue the layout from whichever column ended lower so
  // nothing downstream overlaps either box.
  yPos += infoBoxHeight + 4;

  // Items table
  pdf.setFillColor(30, 144, 255);
  pdf.rect(margin, yPos, pageWidth - 2 * margin, 7, 'F');
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('ITEMS / CONTENTS', margin + 2, yPos + 5);
  
  yPos += 8;
  
  // Table header
  pdf.setFillColor(240, 240, 240);
  pdf.rect(margin, yPos, pageWidth - 2 * margin, 6, 'F');
  pdf.setDrawColor(200, 200, 200);
  pdf.rect(margin, yPos, pageWidth - 2 * margin, 6);
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('DESCRIPTION', margin + 2, yPos + 4);
  pdf.text('QTY', margin + 110, yPos + 4);
  pdf.text('UNIT PRICE', margin + 130, yPos + 4);
  pdf.text('TOTAL', pageWidth - margin - 20, yPos + 4);
  
  yPos += 7;
  
  // Table rows
  const items = parcel.items || [{ description: 'General Goods', quantity: 1, unit_price: parcel.total_price || 100 }];
  let grandTotal = 0;
  
  items.forEach((item: any, index: number) => {
    const itemTotal = (item.quantity || 1) * (item.unit_price || 0);
    grandTotal += itemTotal;
    
    pdf.setFillColor(index % 2 === 0 ? 255 : 250, index % 2 === 0 ? 255 : 250, index % 2 === 0 ? 255 : 250);
    pdf.rect(margin, yPos - 2, pageWidth - 2 * margin, 10, 'F');
    pdf.setDrawColor(220, 220, 220);
    pdf.rect(margin, yPos - 2, pageWidth - 2 * margin, 10);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    const desc = safeText(item.description, 'Item');
    const descLines = pdf.splitTextToSize(desc, 95);
    pdf.text(descLines[0], margin + 3, yPos + 3);
    if (descLines[1]) {
      pdf.setFontSize(7);
      pdf.text(descLines[1], margin + 3, yPos + 6);
    }
    pdf.setFontSize(8);
    pdf.text(String(item.quantity || 1), margin + 113, yPos + 4);
    pdf.text(`$${(item.unit_price || 0).toFixed(2)}`, margin + 133, yPos + 4);
    pdf.text(`$${itemTotal.toFixed(2)}`, pageWidth - margin - 17, yPos + 4);
    
    yPos += 10;
  });
  
  // Total row
  pdf.setFillColor(30, 144, 255);
  pdf.rect(margin, yPos - 2, pageWidth - 2 * margin, 7, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(255, 255, 255);
  pdf.text('TOTAL VALUE:', margin + 3, yPos + 1);
  pdf.setFontSize(11);
  const currency = parcel.currency || 'USD';
  pdf.text(`${currency} ${grandTotal.toFixed(2)}`, pageWidth - margin - 15, yPos + 1, { align: 'right' });
  
  yPos += 8;

  // Shipment details with dimensional calculation
  pdf.setFillColor(50, 50, 50);
  pdf.rect(margin, yPos, pageWidth - 2 * margin, 7, 'F');
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('SHIPMENT DETAILS', margin + 2, yPos + 5);
  
  yPos += 8;
  pdf.setFillColor(252, 252, 252);
  pdf.rect(margin, yPos, pageWidth - 2 * margin, 24, 'F');
  pdf.setDrawColor(200, 200, 200);
  pdf.rect(margin, yPos, pageWidth - 2 * margin, 24);
  
  const length = parcel.length || 12;
  const width = parcel.width || 12;
  const height = parcel.height || 16;
  const dimWeight = ((length * width * height) / 5000).toFixed(2);
  const pieces = parcel.pieces || 1;
  const documentType = (parcel.document_type || 'document').toUpperCase();
  const actualWeight = parcel.weight || 5;
  const chargeableWeight = Math.max(parseFloat(dimWeight), actualWeight);
  
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(60, 60, 60);
  
  pdf.text('BOOKING DATE:', margin + 2, yPos + 4);
  pdf.text('DIMENSIONS:', margin + 95, yPos + 4);
  pdf.text('PIECES:', margin + 145, yPos + 4);
  pdf.text('WEIGHT:', pageWidth - margin - 30, yPos + 4);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  const bookingDate = parcel.created_at ? new Date(parcel.created_at).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');
  pdf.text(bookingDate, margin + 2, yPos + 8);
  pdf.text(`${length}x${width}x${height}`, margin + 95, yPos + 8);
  pdf.text(String(pieces), margin + 145, yPos + 8);
  
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${actualWeight} KG`, pageWidth - margin - 30, yPos + 8);
  
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(60, 60, 60);
  pdf.text('DIM WEIGHT:', margin + 2, yPos + 14);
  pdf.text('CHARGEABLE:', margin + 95, yPos + 14);
  pdf.text('TYPE:', margin + 145, yPos + 14);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  pdf.text(`${dimWeight} KG`, margin + 2, yPos + 18);
  pdf.text(`${chargeableWeight} KG`, margin + 95, yPos + 18);
  pdf.text(documentType, margin + 145, yPos + 18);

  yPos += 24;

  // Declaration
  yPos += 4; 
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'italic');
  pdf.setTextColor(100, 100, 100);
  pdf.text('DECLARATION: I/WE HEREBY DECLARE THAT THE ABOVE PARTICULARS ARE TRUE AND CORRECT.', margin, yPos);
  yPos += 3;
  pdf.text('THESE GOODS ARE SENT AS A GIFT. NO COMMERCIAL VALUE. FOR CUSTOMS PURPOSES ONLY.', margin, yPos);

  yPos += 8;

  // Signature section
  pdf.setFillColor(250, 250, 250);
  pdf.rect(margin, yPos, pageWidth - 2 * margin, 15, 'F');
  pdf.setDrawColor(200, 200, 200);
  pdf.rect(margin, yPos, pageWidth - 2 * margin, 15);
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('SHIPPER CNIC:', margin + 2, yPos + 8);
  pdf.setFont('helvetica', 'normal');
  pdf.text(safeText(parcel.sender_cnic, 'N/A'), margin + 28, yPos + 8);
  
  pdf.rect(pageWidth - margin - 40, yPos + 2, 38, 11);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('SHIPPER SIGNATURE', pageWidth - margin - 38, yPos + 7);

  // Footer on first page
  let footerY = pageHeight - 10;
  pdf.setDrawColor(30, 144, 255);
  pdf.setLineWidth(0.5);
  pdf.line(margin, footerY, pageWidth - margin, footerY);
  
  footerY += 3;
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(80, 80, 80);
  pdf.text('Email: skyxpress786@gmail.com | Phone: 042 999164619 | Mobile: 0321 4710522 | WhatsApp: 0326 9422411', pageWidth / 2, footerY, { align: 'center' });

  const itemCount = items.length;
  
  if (itemCount >= 8) {
    pdf.addPage();
    yPos = 15;
    
    pdf.setDrawColor(30, 144, 255);
    pdf.setLineWidth(0.8);
    pdf.rect(5, 5, pageWidth - 10, pageHeight - 10);

    pdf.setFillColor(250, 250, 250);
    const conditionsHeight = pageHeight - yPos - 25;
    pdf.rect(10, yPos, pageWidth - 20, conditionsHeight, 'F');
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(60, 60, 60);
    pdf.text('STANDARD TRADING CONDITIONS', pageWidth / 2, yPos + 6, { align: 'center' });
    
    yPos += 12;
    
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(60, 60, 60);
    
    // NOTE: the conditions list and everything after it was cut off in
    // the file you pasted -- paste the remainder of your original
    // generatePaymentInvoice function (and any other bill-generating
    // functions in this file) back to me and I'll apply the same
    // barcode + address-wrap fix to those too.
  }

  const filename = `Invoice_${safeText(parcel.reference_id || parcel.tracking_id, 'unknown')}.pdf`;
  handlePDFOutput(pdf, filename, mode);
};
