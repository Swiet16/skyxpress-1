// @ts-nocheck
import jsPDF from 'jspdf';
import bwipjs from 'bwip-js';
import { supabase } from '@/integrations/supabase/client';

interface ParcelData {
  tracking_id: string;
  reference_id?: string;
  sender_name: string;
  sender_company?: string;
  sender_address: string;
  sender_address_2?: string;
  sender_address_3?: string;
  sender_city: string;
  sender_country: string;
  sender_phone: string;
  sender_email?: string;
  sender_cnic?: string;
  receiver_name: string;
  receiver_company?: string;
  receiver_email?: string;
  receiver_address: string;
  receiver_address_2?: string;
  receiver_address_3?: string;
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
  dim_weight_override?: number | null;
  amount_override?: number | null;
}

// Helper function to ensure valid text for jsPDF
const safeText = (value: any, fallback: string = 'N/A'): string => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  return String(value);
};

// Map country names (full or partial) to ISO 2-letter codes
const countryNameToCode = (name: string): string => {
  const n = name.trim().toUpperCase();
  const map: Record<string, string> = {
    'UNITED KINGDOM': 'GB', 'GREAT BRITAIN': 'GB', 'UK': 'GB', 'ENGLAND': 'GB',
    'SCOTLAND': 'GB', 'WALES': 'GB', 'NORTHERN IRELAND': 'GB',
    'UNITED STATES': 'US', 'USA': 'US', 'UNITED STATES OF AMERICA': 'US',
    'PAKISTAN': 'PK', 'UNITED ARAB EMIRATES': 'AE', 'UAE': 'AE',
    'SAUDI ARABIA': 'SA', 'KSA': 'SA', 'GERMANY': 'DE', 'FRANCE': 'FR',
    'ITALY': 'IT', 'SPAIN': 'ES', 'NETHERLANDS': 'NL', 'HOLLAND': 'NL',
    'BELGIUM': 'BE', 'CANADA': 'CA', 'AUSTRALIA': 'AU', 'NEW ZEALAND': 'NZ',
    'CHINA': 'CN', 'JAPAN': 'JP', 'INDIA': 'IN', 'BANGLADESH': 'BD',
    'SRI LANKA': 'LK', 'NEPAL': 'NP', 'TURKEY': 'TR', 'TURKIYE': 'TR',
    'SWEDEN': 'SE', 'NORWAY': 'NO', 'DENMARK': 'DK', 'FINLAND': 'FI',
    'SWITZERLAND': 'CH', 'AUSTRIA': 'AT', 'PORTUGAL': 'PT', 'IRELAND': 'IE',
    'POLAND': 'PL', 'CZECH REPUBLIC': 'CZ', 'CZECHIA': 'CZ', 'HUNGARY': 'HU',
    'GREECE': 'GR', 'ROMANIA': 'RO', 'QATAR': 'QA', 'KUWAIT': 'KW',
    'BAHRAIN': 'BH', 'OMAN': 'OM', 'JORDAN': 'JO', 'MALAYSIA': 'MY',
    'SINGAPORE': 'SG', 'INDONESIA': 'ID', 'THAILAND': 'TH', 'PHILIPPINES': 'PH',
    'SOUTH AFRICA': 'ZA', 'NIGERIA': 'NG', 'KENYA': 'KE', 'GHANA': 'GH',
    'EGYPT': 'EG', 'MOROCCO': 'MA', 'BRAZIL': 'BR', 'MEXICO': 'MX',
    'ARGENTINA': 'AR', 'CHILE': 'CL', 'RUSSIA': 'RU', 'UKRAINE': 'UA',
  };
  // Exact match first
  if (map[n]) return map[n];
  // Partial match
  for (const [key, code] of Object.entries(map)) {
    if (n.includes(key) || key.includes(n)) return code;
  }
  // Fallback: first 2 chars
  return n.substring(0, 2);
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
    return Promise.resolve();
  }
};

// Generate barcode using bwip-js (Code128) — no external API needed
const addBarcode = async (
  pdf: jsPDF,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number
): Promise<void> => {
  try {
    const canvas = document.createElement('canvas');
    bwipjs.toCanvas(canvas, {
      bcid: 'code128',
      text: text,
      scale: 3,
      height: 12,
      includetext: false,
    });
    const dataUrl = canvas.toDataURL('image/png');
    pdf.addImage(dataUrl, 'PNG', x, y, width, height);
    console.log('✓ Barcode generated successfully');
  } catch (err) {
    console.error('Barcode generation failed:', err);
    // Draw a placeholder rectangle if barcode fails
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.3);
    pdf.rect(x, y, width, height);
    pdf.setFontSize(6);
    pdf.setTextColor(0, 0, 0);
    pdf.text(text, x + width / 2, y + height / 2, { align: 'center' });
  }
};

// ===== 1. INVOICE =====
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

  // Contact info next to logo
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(80, 80, 80);
  pdf.text('Email: skyxpress786@gmail.com', 60, yPos + 3);
  pdf.text('Phone: 042 999164619', 60, yPos + 8);
  pdf.text('WhatsApp: 0326 9422411', 60, yPos + 13);
  pdf.text('www.skyxpress.site', 60, yPos + 18);

  // Right side: Header box — extended to 32mm to fit barcode
  const rightBoxX = pageWidth - margin - 75;
  pdf.setFillColor(30, 144, 255);
  pdf.rect(rightBoxX, yPos, 65, 32, 'F');
  
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('INVOICE', rightBoxX + 2, yPos + 6);
  
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('INVOICE #:', rightBoxX + 2, yPos + 11);

  // USE REFERENCE_ID instead of tracking_id
  const refNumber = safeText(parcel.reference_id || parcel.tracking_id, '000000000');
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text(refNumber, rightBoxX + 2, yPos + 16);

  // Wide barcode spanning most of the header box width (bottom section)
  await addBarcode(pdf, refNumber, rightBoxX + 2, yPos + 20, 61, 10);

  yPos += 40; // 32mm box + 8mm gap

  // Shipper & Receiver sections
  const boxWidth = (pageWidth - 2 * margin - 3) / 2;

  // Determine if extra address lines are present for shipper
  const hasSenderExtra = !!(parcel.sender_address_2 || parcel.sender_address_3);
  const senderFontSize = hasSenderExtra ? 7.5 : 9;
  const senderLineGap = hasSenderExtra ? 4 : 5;
  
  // Shipper box
  pdf.setFillColor(30, 144, 255);
  pdf.rect(margin, yPos, boxWidth, 7, 'F');
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('SHIPPER', margin + 2, yPos + 5);
  
  pdf.setFillColor(250, 250, 250);
  pdf.rect(margin, yPos + 7, boxWidth, 40, 'F');
  pdf.setDrawColor(200, 200, 200);
  pdf.rect(margin, yPos, boxWidth, 47);
  
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
  
  // Address block with optional extra lines
  shipperY += senderLineGap;
  pdf.setFontSize(senderFontSize);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Address:', margin + 2, shipperY);
  pdf.setFont('helvetica', 'normal');
  pdf.text(safeText(parcel.sender_address, 'N/A'), margin + 18, shipperY);
  if (parcel.sender_address_2) {
    shipperY += senderLineGap - 1;
    pdf.text(safeText(parcel.sender_address_2), margin + 2, shipperY);
  }
  if (parcel.sender_address_3) {
    shipperY += senderLineGap - 1;
    pdf.text(safeText(parcel.sender_address_3), margin + 2, shipperY);
  }
  pdf.setFontSize(9);

  shipperY += senderLineGap;
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

  // Determine if extra address lines are present for receiver
  const hasReceiverExtra = !!(parcel.receiver_address_2 || parcel.receiver_address_3);
  const receiverFontSize = hasReceiverExtra ? 7.5 : 9;
  const receiverLineGap = hasReceiverExtra ? 4 : 5;

  // Receiver box
  const receiverX = pageWidth / 2 + 1.5;
  pdf.setFillColor(30, 144, 255);
  pdf.rect(receiverX, yPos, boxWidth, 7, 'F');
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('RECEIVER', receiverX + 2, yPos + 5);
  
  pdf.setFillColor(250, 250, 250);
  pdf.rect(receiverX, yPos + 7, boxWidth, 40, 'F');
  pdf.setDrawColor(200, 200, 200);
  pdf.rect(receiverX, yPos, boxWidth, 47);
  
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
  
  // Address block with optional extra lines
  receiverY += receiverLineGap;
  pdf.setFontSize(receiverFontSize);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Address:', receiverX + 2, receiverY);
  pdf.setFont('helvetica', 'normal');
  pdf.text(safeText(parcel.receiver_address, 'N/A'), receiverX + 18, receiverY);
  if (parcel.receiver_address_2) {
    receiverY += receiverLineGap - 1;
    pdf.text(safeText(parcel.receiver_address_2), receiverX + 2, receiverY);
  }
  if (parcel.receiver_address_3) {
    receiverY += receiverLineGap - 1;
    pdf.text(safeText(parcel.receiver_address_3), receiverX + 2, receiverY);
  }
  pdf.setFontSize(9);

  receiverY += receiverLineGap;
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
  const receiverEmail = safeText(parcel.receiver_email, 'N/A');
  const emailLines = pdf.splitTextToSize(receiverEmail, 70);
  pdf.text(emailLines[0], receiverX + 14, receiverY);

  yPos += 51;

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
  
  const items = parcel.items || [{ description: 'General Goods', quantity: 1, unit_price: parcel.total_price || 100 }];
  let grandTotal = 0;
  
  // Scale row height and font size based on item count so everything fits
  const itemCount1 = items.length;
  const itemRowH = itemCount1 >= 6 ? 7 : 10;
  const itemFontSize = itemCount1 >= 6 ? 6.5 : 8;

  items.forEach((item: any, index: number) => {
    const itemTotal = (item.quantity || 1) * (item.unit_price || 0);
    grandTotal += itemTotal;
    
    pdf.setFillColor(index % 2 === 0 ? 255 : 250, index % 2 === 0 ? 255 : 250, index % 2 === 0 ? 255 : 250);
    pdf.rect(margin, yPos - 2, pageWidth - 2 * margin, itemRowH, 'F');
    pdf.setDrawColor(220, 220, 220);
    pdf.rect(margin, yPos - 2, pageWidth - 2 * margin, itemRowH);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(itemFontSize);
    const desc = safeText(item.description, 'Item');
    const descLines = pdf.splitTextToSize(desc, 95);
    pdf.text(descLines[0], margin + 3, yPos + (itemRowH / 2));
    pdf.setFontSize(itemFontSize);
    pdf.text(String(item.quantity || 1), margin + 113, yPos + (itemRowH / 2));
    pdf.text(`${(item.unit_price || 0).toFixed(2)}`, margin + 133, yPos + (itemRowH / 2));
    pdf.text(`${itemTotal.toFixed(2)}`, pageWidth - margin - 17, yPos + (itemRowH / 2));
    
    yPos += itemRowH;
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
  const calcDimWeight = parseFloat(((length * width * height) / 5000).toFixed(2));
  const dimWeight = parcel.dim_weight_override != null ? parcel.dim_weight_override : calcDimWeight;
  const dimWeightStr = Number(dimWeight).toFixed(2);
  const pieces = parcel.pieces || 1;
  const documentType = (parcel.document_type || 'document').toUpperCase();
  const actualWeight = parcel.weight || 5;
  const chargeableWeight = Math.max(parseFloat(dimWeightStr), actualWeight);
  
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(60, 60, 60);
  
  // Row 1
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
  
  // Row 2
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(60, 60, 60);
  pdf.text('DIM WEIGHT:', margin + 2, yPos + 14);
  pdf.text('CHARGEABLE:', margin + 95, yPos + 14);
  pdf.text('TYPE:', margin + 145, yPos + 14);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  const dimLabel = parcel.dim_weight_override != null ? `${dimWeightStr} KG*` : `${dimWeightStr} KG`;
  pdf.text(dimLabel, margin + 2, yPos + 18);
  pdf.text(`${chargeableWeight} KG`, margin + 95, yPos + 18);
  pdf.text(documentType, margin + 145, yPos + 18);

  yPos += 24;

  // Declaration
  yPos += 4; 
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'italic');
  pdf.setTextColor(100, 100, 100);
  const disclaimer1 = 'DECLARATION: I/WE HEREBY DECLARE THAT THE ABOVE PARTICULARS ARE TRUE AND CORRECT.';
  pdf.text(disclaimer1, margin, yPos);
  yPos += 3;
  const disclaimer2 = 'THESE GOODS ARE SENT AS A GIFT. NO COMMERCIAL VALUE. FOR CUSTOMS PURPOSES ONLY.';
  pdf.text(disclaimer2, margin, yPos);

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
  
