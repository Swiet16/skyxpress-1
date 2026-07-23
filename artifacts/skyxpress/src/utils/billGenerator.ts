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


// Convert 2-letter ISO codes or common aliases (UK, USA, UAE) to full country names.
// Returns the input unchanged when already a full name.
const codeToCountryName = (input: string): string => {
  if (!input) return '';
  const trimmed = String(input).trim();
  const upper = trimmed.toUpperCase();
  const aliases: Record<string, string> = {
    'UK': 'United Kingdom',
    'USA': 'United States',
    'UAE': 'United Arab Emirates',
    'KSA': 'Saudi Arabia',
  };
  if (aliases[upper]) return aliases[upper];
  const codeMap: Record<string, string> = {
    GB: 'United Kingdom', US: 'United States', PK: 'Pakistan', AE: 'United Arab Emirates',
    SA: 'Saudi Arabia', DE: 'Germany', FR: 'France', IT: 'Italy', ES: 'Spain',
    NL: 'Netherlands', BE: 'Belgium', CA: 'Canada', AU: 'Australia', NZ: 'New Zealand',
    CN: 'China', JP: 'Japan', IN: 'India', BD: 'Bangladesh', LK: 'Sri Lanka',
    NP: 'Nepal', TR: 'Turkey', SE: 'Sweden', NO: 'Norway', DK: 'Denmark', FI: 'Finland',
    CH: 'Switzerland', AT: 'Austria', PT: 'Portugal', IE: 'Ireland', PL: 'Poland',
    CZ: 'Czech Republic', HU: 'Hungary', GR: 'Greece', RO: 'Romania', QA: 'Qatar',
    KW: 'Kuwait', BH: 'Bahrain', OM: 'Oman', JO: 'Jordan', MY: 'Malaysia',
    SG: 'Singapore', ID: 'Indonesia', TH: 'Thailand', PH: 'Philippines',
    ZA: 'South Africa', NG: 'Nigeria', KE: 'Kenya', GH: 'Ghana', EG: 'Egypt',
    MA: 'Morocco', BR: 'Brazil', MX: 'Mexico', AR: 'Argentina', CL: 'Chile',
    RU: 'Russia', UA: 'Ukraine',
  };
  if (upper.length === 2 && codeMap[upper]) return codeMap[upper];
  return trimmed;
};

// Renders an "Address:" label followed by wrapped address lines within maxWidth.
// Returns the Y position after the last rendered line.
const drawWrappedAddress = (
  pdf: jsPDF,
  parts: Array<string | undefined>,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
  lineGap: number
): number => {
  pdf.setFontSize(fontSize);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Address:', x, y);
  pdf.setFont('helvetica', 'normal');
  let curY = y + lineGap;
  const cleaned = parts.map(p => (p == null ? '' : String(p).trim())).filter(Boolean);
  cleaned.forEach((raw) => {
    const lines = pdf.splitTextToSize(raw, maxWidth) as string[];
    lines.forEach((ln) => {
      pdf.text(ln, x, curY);
      curY += lineGap;
    });
  });
  return curY;
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

  // Logo and top contact info intentionally removed per client request.

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
  
  // Address block: label + wrapped lines within box width
  shipperY += senderLineGap;
  shipperY = drawWrappedAddress(
    pdf,
    [
      parcel.sender_address,
      parcel.sender_address_2,
      parcel.sender_address_3,
      `${safeText(parcel.sender_city, '')}, ${codeToCountryName(safeText(parcel.sender_country, 'Pakistan'))}`,
    ],
    margin + 2,
    shipperY,
    boxWidth - 4,
    senderFontSize,
    senderLineGap - 1
  );
  pdf.setFontSize(9);
  
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
  
  // Address block: label + wrapped lines within box width
  receiverY += receiverLineGap;
  receiverY = drawWrappedAddress(
    pdf,
    [
      parcel.receiver_address,
      parcel.receiver_address_2,
      parcel.receiver_address_3,
      `${safeText(parcel.receiver_city, '')}, ${safeText(parcel.receiver_state, '')}`.replace(/^,\s*|,\s*$/g, ''),
      codeToCountryName(safeText(parcel.receiver_country, 'United Kingdom')),
    ],
    receiverX + 2,
    receiverY,
    boxWidth - 4,
    receiverFontSize,
    receiverLineGap - 1
  );
  pdf.setFontSize(9);
  
  // Contact rows: shrink and wrap to keep values inside the receiver box
  pdf.setFontSize(7.5);
  receiverY += 2.5;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Postal Code:', receiverX + 2, receiverY);
  pdf.setFont('helvetica', 'normal');
  {
    const lines = pdf.splitTextToSize(safeText(parcel.receiver_postal_code, 'N/A'), boxWidth - 25);
    lines.forEach((ln: string, i: number) => pdf.text(ln, receiverX + 23, receiverY + i * 3.5));
    receiverY += (lines.length - 1) * 3.5;
  }

  receiverY += 2.5;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Phone:', receiverX + 2, receiverY);
  pdf.setFont('helvetica', 'normal');
  {
    const lines = pdf.splitTextToSize(safeText(parcel.receiver_phone, 'N/A'), boxWidth - 17);
    lines.forEach((ln: string, i: number) => pdf.text(ln, receiverX + 15, receiverY + i * 3.5));
    receiverY += (lines.length - 1) * 3.5;
  }

  receiverY += 2.5;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Email:', receiverX + 2, receiverY);
  pdf.setFont('helvetica', 'normal');
  {
    const receiverEmail = safeText(parcel.receiver_email, 'N/A');
    const emailLines = pdf.splitTextToSize(receiverEmail, boxWidth - 16);
    emailLines.forEach((ln: string, i: number) => pdf.text(ln, receiverX + 14, receiverY + i * 3.5));
    receiverY += (emailLines.length - 1) * 3.5;
  }
  pdf.setFontSize(9);

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
  pdf.text('Email: skyxpress786@gmail.com | Phone: (042) 37255473 | Mobile: 0321 4710522 | WhatsApp: 0326 9422411', pageWidth / 2, footerY, { align: 'center' });

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
    
    const conditions = [
      'By tendering goods for transport by SKY XPRESS WORLDWIDE EXPRESS, the Consignor agrees to the following conditions:',
      '',
      '1. DEFINITIONS: "SKY XPRESS" means Sky Xpress Worldwide Express. "Consignor" or "Shipper" means the sender.',
      '"Consignee" means the person to whom the goods are consigned.',
      '',
      '2. CONSIGNMENT NOTE: Each consignment shall be correctly addressed and accompanied by SKY XPRESS form of',
      'Consignment Note which the Consignor shall properly complete. The Consignor is responsible for correctness of information.',
      '',
      '3. SUB-CONTRACTING: SKY XPRESS may sub-contract all or any part and may engage agents or sub-contractors.',
      '',
      '4. COMMON CARRIER: The company is not a common carrier and will only carry goods on these conditions.',
      '',
      '5. LIABILITY: SKY XPRESS shall not be liable for any loss, damage, or delays except where directly caused by proven',
      'negligence. Maximum liability is limited to USD 100 per shipment unless additional insurance is purchased.',
      '',
      '6. PROHIBITED ITEMS: Consignor warrants goods do not contain dangerous, hazardous, or prohibited items including',
      'narcotics, weapons, explosives, antiques, liquids, or items prohibited by IATA or local laws. Consignor fully responsible.',
      '',
      '7. CUSTOMS & DUTIES: Any customs duties, taxes, or charges levied at destination shall be paid by Consignee.',
      'If Consignee refuses payment, Consignor shall be liable.',
      '',
      '8. GOVERNING LAW: These conditions governed by laws of Pakistan. Disputes subject to exclusive jurisdiction of Pakistani courts.'
    ];
    
    let conditionsY = yPos;
    conditions.forEach((line) => {
      const lines = pdf.splitTextToSize(line, pageWidth - 24);
      pdf.text(lines, 12, conditionsY);
      conditionsY += lines.length * 3;
    });

    footerY = pageHeight - 10;
    pdf.setDrawColor(30, 144, 255);
    pdf.setLineWidth(0.5);
    pdf.line(10, footerY, pageWidth - 10, footerY);
    footerY += 3;
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(80, 80, 80);
    pdf.text('Email: skyxpress786@gmail.com | Phone: (042) 37255473 | Mobile: 0321 4710522 | WhatsApp: 0326 9422411', pageWidth / 2, footerY, { align: 'center' });
  } else {
    pdf.setFillColor(250, 250, 250);
    const availableHeight = pageHeight - yPos - 20;
    pdf.rect(10, yPos, pageWidth - 20, availableHeight, 'F');
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(60, 60, 60);
    pdf.text('STANDARD TRADING CONDITIONS', pageWidth / 2, yPos + 4, { align: 'center' });
    
    yPos += 8;
    
    pdf.setFontSize(5.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(60, 60, 60);
    
    const conditions = [
      'By tendering goods for transport by SKY XPRESS WORLDWIDE EXPRESS, the Consignor agrees to the following conditions:',
      '',
      '1. DEFINITIONS: "SKY XPRESS" means Sky Xpress Worldwide Express. "Consignor" or "Shipper" means the sender. "Consignee" means the person to whom the goods are consigned.',
      '',
      '2. CONSIGNMENT NOTE: Each consignment shall be correctly addressed and accompanied by SKY XPRESS form of Consignment Note which the Consignor shall properly complete. The Consignor is responsible for correctness of information.',
      '',
      '3. SUB-CONTRACTING: SKY XPRESS may sub-contract all or any part and may engage agents or sub-contractors.',
      '',
      '4. COMMON CARRIER: The company is not a common carrier and will only carry goods on these conditions.',
      '',
      '5. LIABILITY: SKY XPRESS shall not be liable for any loss, damage, or delays except where directly caused by proven negligence. Maximum liability is limited to USD 100 per shipment unless additional insurance is purchased.',
      '',
      '6. PROHIBITED ITEMS: Consignor warrants goods do not contain dangerous, hazardous, or prohibited items including narcotics, weapons, explosives, antiques, liquids, or items prohibited by IATA or local laws. Consignor fully responsible.',
      '',
      '7. CUSTOMS & DUTIES: Any customs duties, taxes, or charges levied at destination shall be paid by Consignee. If Consignee refuses payment, Consignor shall be liable.',
      '',
      '8. GOVERNING LAW: These conditions governed by laws of Pakistan. Disputes subject to exclusive jurisdiction of Pakistani courts.'
    ];
    
    let conditionsY = yPos;
    conditions.forEach((line) => {
      const lines = pdf.splitTextToSize(line, pageWidth - 24);
      pdf.text(lines, 12, conditionsY);
      conditionsY += lines.length * 2.2;
    });

    footerY = pageHeight - 10;
    pdf.setDrawColor(30, 144, 255);
    pdf.setLineWidth(0.5);
    pdf.line(10, footerY, pageWidth - 10, footerY);
    footerY += 3;
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(80, 80, 80);
    pdf.text('Email: skyxpress786@gmail.com | Phone: (042) 37255473 | Mobile: 0321 4710522 | WhatsApp: 0326 9422411', pageWidth / 2, footerY, { align: 'center' });
  }

  handlePDFOutput(pdf, `Performa-Invoice-${refNumber}.pdf`, mode);
};

// ===== 2. AIRWAY BILL (Verification) =====
export const generateAirwayBillVerification = async (parcel: any, mode: OutputMode = 'download'): Promise<void> => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  const length = parcel.length || 12;
  const width = parcel.width || 12;
  const height = parcel.height || 16;
  const calcDimWeight = parseFloat(((height * width * length) / 5000).toFixed(2));
  const dimWeight = parcel.dim_weight_override != null ? parcel.dim_weight_override : calcDimWeight;
  const dimWeightStr = Number(dimWeight).toFixed(2);
  const actualWeight = parcel.weight || 5;
  const chargeableWeight = Math.max(parseFloat(dimWeightStr), actualWeight);
  const pieces = parcel.pieces || 1;
  const documentType = (parcel.document_type || 'document').toUpperCase();
  
  const refNumber = safeText(parcel.reference_id || parcel.tracking_id, '000000000');
  const dimLabel = parcel.dim_weight_override != null ? `${dimWeightStr} KG*` : `${dimWeightStr} KG`;

  // Determine extra address flags
  const hasSenderExtra = !!(parcel.sender_address_2 || parcel.sender_address_3);
  const hasReceiverExtra = !!(parcel.receiver_address_2 || parcel.receiver_address_3);
  const senderFontSize = hasSenderExtra ? 7.5 : 8;
  const senderLineGap = hasSenderExtra ? 4 : 5;
  const receiverFontSize = hasReceiverExtra ? 7.5 : 8;
  const receiverLineGap = hasReceiverExtra ? 4 : 5;

  // Function to generate one copy
  const generateCopy = async (startY: number, copyLabel: string) => {
    let yPos = startY;

    // Border for this copy
    pdf.setDrawColor(255, 140, 0);
    pdf.setLineWidth(0.5);
    pdf.rect(5, startY - 2, pageWidth - 10, 140);

    // Add logo
    await addLogo(pdf, 10, yPos, 50, 30);

    // Top contact info removed per client request.

    // Right header box (same 20mm height — compact barcode replaces QR)
    const headerX = pageWidth - 75;
    pdf.setFillColor(255, 248, 240);
    pdf.setDrawColor(255, 140, 0);
    pdf.setLineWidth(0.5);
    pdf.rect(headerX, yPos, 65, 20, 'FD');
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 100, 0);
    pdf.text('AIRWAY BILL', headerX + 2, yPos + 6);
    
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(60, 60, 60);
    pdf.text('DESTINATION:', headerX + 2, yPos + 11);
    pdf.text('SERVICE:', headerX + 2, yPos + 14);
    pdf.text('Ref:', headerX + 2, yPos + 17);
    
    pdf.setFont('helvetica', 'normal');
    const destination = codeToCountryName(safeText(parcel.receiver_country, 'UK'));
    const service = safeText(parcel.service_type, 'STANDARD').toUpperCase();
    
    pdf.text(destination, headerX + 25, yPos + 11);
    pdf.text(service, headerX + 20, yPos + 14);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 100, 0);
    pdf.text(refNumber, headerX + 12, yPos + 17);

    // Compact barcode (20×12mm) replacing the QR code in right slot
    await addBarcode(pdf, refNumber, headerX + 43, yPos + 2, 20, 14);

    yPos += 28;

    // Shipper & Receiver
    const boxWidth = (pageWidth - 20 - 2) / 2;
    
    pdf.setFillColor(255, 250, 245);
    pdf.setDrawColor(220, 220, 220);
    pdf.rect(10, yPos, boxWidth, 43, 'FD');
    pdf.rect(pageWidth / 2 + 1, yPos, boxWidth, 43, 'FD');

    // Shipper
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 100, 0);
    pdf.text('SHIPPER', 12, yPos + 5);
    
    pdf.setFontSize(senderFontSize);
    pdf.setTextColor(0, 0, 0);
    let shipperY = yPos + 10;
    
    pdf.setFont('helvetica', 'bold');
    pdf.text('Name:', 12, shipperY);
    pdf.setFont('helvetica', 'normal');
    pdf.text(safeText(parcel.sender_name, 'N/A'), 24, shipperY);
    
    shipperY += senderLineGap;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Company:', 12, shipperY);
    pdf.setFont('helvetica', 'normal');
    pdf.text(safeText(parcel.sender_company, 'N/A'), 28, shipperY);
    
    shipperY += senderLineGap;
    shipperY = drawWrappedAddress(
      pdf,
      [
        parcel.sender_address,
        parcel.sender_address_2,
        parcel.sender_address_3,
        `${safeText(parcel.sender_city, '')}, ${codeToCountryName(safeText(parcel.sender_country, 'Pakistan'))}`,
      ],
      12,
      shipperY,
      boxWidth - 4,
      senderFontSize,
      senderLineGap - 1
    );
    pdf.setFontSize(senderFontSize);
    
    shipperY += senderLineGap;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Phone:', 12, shipperY);
    pdf.setFont('helvetica', 'normal');
    pdf.text(safeText(parcel.sender_phone, 'N/A'), 24, shipperY);
    
    shipperY += senderLineGap;
    pdf.setFont('helvetica', 'bold');
    pdf.text('CNIC:', 12, shipperY);
    pdf.setFont('helvetica', 'normal');
    pdf.text(safeText(parcel.sender_cnic, 'N/A'), 23, shipperY);

    // Receiver
    const receiverX = pageWidth / 2 + 3;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 100, 0);
    pdf.text('RECEIVER', receiverX, yPos + 5);
    
    pdf.setFontSize(receiverFontSize);
    pdf.setTextColor(0, 0, 0);
    let receiverY = yPos + 10;
    
    pdf.setFont('helvetica', 'bold');
    pdf.text('Name:', receiverX, receiverY);
    pdf.setFont('helvetica', 'normal');
    pdf.text(safeText(parcel.receiver_name, 'N/A'), receiverX + 12, receiverY);
    
    receiverY += receiverLineGap;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Company:', receiverX, receiverY);
    pdf.setFont('helvetica', 'normal');
    pdf.text(safeText(parcel.receiver_company, 'N/A'), receiverX + 20, receiverY);
    
    receiverY += receiverLineGap;
    receiverY = drawWrappedAddress(
      pdf,
      [
        parcel.receiver_address,
        parcel.receiver_address_2,
        parcel.receiver_address_3,
        `${safeText(parcel.receiver_city, '')}, ${safeText(parcel.receiver_state, '')}`.replace(/^,\s*|,\s*$/g, ''),
        codeToCountryName(safeText(parcel.receiver_country, 'United Kingdom')),
      ],
      receiverX,
      receiverY,
      boxWidth - 4,
      receiverFontSize,
      receiverLineGap - 1
    );
    pdf.setFontSize(receiverFontSize);
    
    pdf.setFontSize(7);
    receiverY += receiverLineGap - 2.5;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Postal Code:', receiverX, receiverY);
    pdf.setFont('helvetica', 'normal');
    {
      const lines = pdf.splitTextToSize(safeText(parcel.receiver_postal_code, 'N/A'), boxWidth - 22);
      lines.forEach((ln: string, i: number) => pdf.text(ln, receiverX + 20, receiverY + i * 3.2));
      receiverY += (lines.length - 1) * 3.2;
    }

    receiverY += receiverLineGap - 2.5;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Phone:', receiverX, receiverY);
    pdf.setFont('helvetica', 'normal');
    {
      const lines = pdf.splitTextToSize(safeText(parcel.receiver_phone, 'N/A'), boxWidth - 14);
      lines.forEach((ln: string, i: number) => pdf.text(ln, receiverX + 12, receiverY + i * 3.2));
      receiverY += (lines.length - 1) * 3.2;
    }

    receiverY += receiverLineGap - 2.5;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Email:', receiverX, receiverY);
    pdf.setFont('helvetica', 'normal');
    {
      const receiverEmail = safeText(parcel.receiver_email, 'N/A');
      const emailLines = pdf.splitTextToSize(receiverEmail, boxWidth - 14);
      emailLines.forEach((ln: string, i: number) => pdf.text(ln, receiverX + 12, receiverY + i * 3.2));
      receiverY += (emailLines.length - 1) * 3.2;
    }
    pdf.setFontSize(receiverFontSize);

    yPos += 45;

    // Shipment details
    pdf.setFillColor(255, 140, 0);
    pdf.rect(10, yPos, pageWidth - 20, 7, 'F');
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text('SHIPMENT DETAILS', 12, yPos + 5);
    
    yPos += 8;
    pdf.setFillColor(255, 252, 248);
    pdf.rect(10, yPos, pageWidth - 20, 21, 'FD');
    
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(60, 60, 60);
    
    // Row 1
    pdf.text('BOOKING DATE:', 12, yPos + 4);
    pdf.text('DIMENSIONS:', 95, yPos + 4);
    pdf.text('PIECES:', 145, yPos + 4);
    pdf.text('WEIGHT:', pageWidth - 30, yPos + 4);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);
    const bookingDate = parcel.created_at ? new Date(parcel.created_at).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');
    pdf.text(bookingDate, 12, yPos + 8);
    pdf.text(`${length}x${width}x${height}`, 95, yPos + 8);
    pdf.text(String(pieces), 145, yPos + 8);

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${actualWeight} KG`, pageWidth - 30, yPos + 8);

    // Row 2
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(60, 60, 60);
    pdf.text('DIM WEIGHT:', 12, yPos + 14);
    pdf.text('CHARGEABLE:', 95, yPos + 14);
    pdf.text('TYPE:', 145, yPos + 14);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);
    pdf.text(dimLabel, 12, yPos + 18);
    pdf.text(`${chargeableWeight} KG`, 95, yPos + 18);
    pdf.text(documentType, 145, yPos + 18);

    yPos += 21;

    // Disclaimer
    yPos += 3;
    pdf.setFontSize(5.5);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(120, 120, 120);
    const disclaimer = 'I/WE HEREBY DECLARE AND UNDERTAKE THAT THE ABOVE MENTIONED PARTICULARS ARE TRUE AND CORRECT. THERE IS NOTHING DANGEROUS, ANTIQUES, NARCOTICS, LIQUID OR ANYTHING LIKELY TO CAUSE DAMAGE. IF ANYTHING FOUND I/WE WILL BE FULLY RESPONSIBLE. NOTE: ANY TAXES AT THE DESTINATION WILL BE PAID BY THE CONSIGNEE. MAXIMUM LIABILITY LIMITED TO USD 100.';
    const disclaimerLines = pdf.splitTextToSize(disclaimer, pageWidth - 20);
    pdf.text(disclaimerLines, 10, yPos);

    yPos += 7;

    // Signature section
    pdf.setFillColor(255, 250, 245);
    pdf.rect(10, yPos, pageWidth - 20, 18, 'FD');
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('BOOKING OFFICE:', 12, yPos + 5);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Sky Office', 42, yPos + 5);
    
    pdf.setFont('helvetica', 'bold');
    pdf.text('SHIPPER SIGNATURE:', 12, yPos + 12);
    pdf.rect(50, yPos + 8, 45, 8);
    
    pdf.setFont('helvetica', 'bold');
    pdf.text('SHIPPER CNIC:', pageWidth - 70, yPos + 12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(safeText(parcel.sender_cnic, 'N/A'), pageWidth - 40, yPos + 12);

    yPos += 18;

    // Copy label
    pdf.setFillColor(255, 140, 0);
    pdf.rect(10, yPos, pageWidth - 20, 6, 'F');
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text(copyLabel, pageWidth / 2, yPos + 4, { align: 'center' });
  };

  // Generate Account Copy
  await generateCopy(6, 'Account Copy');

  // Generate Forward Copy
  await generateCopy(154, 'FORWARD COPY');

  handlePDFOutput(pdf, `AWB-Verification-${refNumber}.pdf`, mode);
};

// ===== 3. AIRWAY BILL with Payment (Sender Copy) =====
export const generateAirwayBillWithPayment = async (parcel: any, mode: OutputMode = 'download'): Promise<void> => {
  // Fetch PKR exchange rate from pricing config
  let pkrRate = 285.0;
  try {
    const { data: pricingData } = await supabase
      .from('pricing_config')
      .select('currency_rates')
      .single();
    
    if ((pricingData?.currency_rates as any)?.PKR) {
      pkrRate = (pricingData.currency_rates as any).PKR;
    }
  } catch (error) {
    console.warn('Failed to fetch PKR rate, using default:', error);
  }

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let yPos = 6;

  // Border
  pdf.setDrawColor(220, 20, 60);
  pdf.setLineWidth(0.8);
  pdf.rect(5, 5, pageWidth - 10, pageHeight - 10);

  const refNumber = safeText(parcel.reference_id || parcel.tracking_id, '000000000');

  // Add logo at top left
  await addLogo(pdf, 10, yPos, 50, 30);

  // Top contact info removed per client request.

  // Right header box — extended to 32mm to fit barcode
  const headerX = pageWidth - 75;
  pdf.setFillColor(255, 240, 245);
  pdf.setDrawColor(220, 20, 60);
  pdf.setLineWidth(0.5);
  pdf.rect(headerX, yPos, 65, 32, 'FD');
  
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(220, 20, 60);
  pdf.text('AIRWAY BILL', headerX + 2, yPos + 6);
  
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(60, 60, 60);
  pdf.text('DESTINATION:', headerX + 2, yPos + 11);
  pdf.text('SERVICE:', headerX + 2, yPos + 14);
  pdf.text('REF#:', headerX + 2, yPos + 17);

  pdf.setFont('helvetica', 'normal');
  const destination = codeToCountryName(safeText(parcel.receiver_country, 'UK'));
  const service = safeText(parcel.service_type, 'STANDARD').toUpperCase();

  pdf.text(destination, headerX + 25, yPos + 11);
  pdf.text(service, headerX + 20, yPos + 14);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(220, 20, 60);
  pdf.text(refNumber, headerX + 14, yPos + 17);

  // Wide barcode spanning most of the header box width (bottom section)
  await addBarcode(pdf, refNumber, headerX + 2, yPos + 20, 61, 10);

  yPos += 40; // 32mm box + 8mm gap

  // Shipper & Receiver
  const boxWidth = (pageWidth - 20 - 2) / 2;

  // Determine extra address flags
  const hasSenderExtra = !!(parcel.sender_address_2 || parcel.sender_address_3);
  const hasReceiverExtra = !!(parcel.receiver_address_2 || parcel.receiver_address_3);
  const senderFontSize = hasSenderExtra ? 7.5 : 8;
  const senderLineGap = hasSenderExtra ? 4 : 5;
  const receiverFontSize = hasReceiverExtra ? 7.5 : 8;
  const receiverLineGap = hasReceiverExtra ? 4 : 5;
  
  pdf.setFillColor(252, 252, 252);
  pdf.setDrawColor(200, 200, 200);
  pdf.rect(10, yPos, boxWidth, 48, 'FD');
  pdf.rect(pageWidth / 2 + 1, yPos, boxWidth, 48, 'FD');

  // Shipper header
  pdf.setFillColor(220, 20, 60);
  pdf.rect(10, yPos, boxWidth, 6, 'F');
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('SHIPPER', 12, yPos + 4);
  
  pdf.setFontSize(senderFontSize);
  pdf.setTextColor(0, 0, 0);
  let shipperY = yPos + 11;
  
  pdf.setFont('helvetica', 'bold');
  pdf.text('Name:', 12, shipperY);
  pdf.setFont('helvetica', 'normal');
  pdf.text(safeText(parcel.sender_name, 'N/A'), 24, shipperY);
  
  shipperY += senderLineGap;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Company:', 12, shipperY);
  pdf.setFont('helvetica', 'normal');
  pdf.text(safeText(parcel.sender_company, 'N/A'), 28, shipperY);
  
  shipperY += senderLineGap;
  shipperY = drawWrappedAddress(
    pdf,
    [
      parcel.sender_address,
      parcel.sender_address_2,
      parcel.sender_address_3,
      `${safeText(parcel.sender_city, '')}, ${codeToCountryName(safeText(parcel.sender_country, 'Pakistan'))}`,
    ],
    12,
    shipperY,
    boxWidth - 4,
    senderFontSize,
    senderLineGap - 1
  );
  pdf.setFontSize(senderFontSize);
  
  shipperY += senderLineGap;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Phone:', 12, shipperY);
  pdf.setFont('helvetica', 'normal');
  pdf.text(safeText(parcel.sender_phone, 'N/A'), 24, shipperY);
  
  shipperY += senderLineGap;
  pdf.setFont('helvetica', 'bold');
  pdf.text('CNIC:', 12, shipperY);
  pdf.setFont('helvetica', 'normal');
  pdf.text(safeText(parcel.sender_cnic, 'N/A'), 23, shipperY);

  // Receiver header
  const receiverX = pageWidth / 2 + 1;
  pdf.setFillColor(220, 20, 60);
  pdf.rect(receiverX, yPos, boxWidth, 6, 'F');
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('RECEIVER', receiverX + 2, yPos + 4);
  
  pdf.setFontSize(receiverFontSize);
  pdf.setTextColor(0, 0, 0);
  let receiverY = yPos + 11;
  
  pdf.setFont('helvetica', 'bold');
  pdf.text('Name:', receiverX + 2, receiverY);
  pdf.setFont('helvetica', 'normal');
  pdf.text(safeText(parcel.receiver_name, 'N/A'), receiverX + 14, receiverY);
  
  receiverY += receiverLineGap;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Company:', receiverX + 2, receiverY);
  pdf.setFont('helvetica', 'normal');
  pdf.text(safeText(parcel.receiver_company, 'N/A'), receiverX + 20, receiverY);
  
  receiverY += receiverLineGap;
  receiverY = drawWrappedAddress(
    pdf,
    [
      parcel.receiver_address,
      parcel.receiver_address_2,
      parcel.receiver_address_3,
      `${safeText(parcel.receiver_city, '')}, ${safeText(parcel.receiver_state, '')}`.replace(/^,\s*|,\s*$/g, ''),
      codeToCountryName(safeText(parcel.receiver_country, 'United Kingdom')),
    ],
    receiverX + 2,
    receiverY,
    boxWidth - 4,
    receiverFontSize,
    receiverLineGap - 1
  );
  pdf.setFontSize(receiverFontSize);
  
  pdf.setFontSize(7);
  receiverY += receiverLineGap - 2.5;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Postal Code:', receiverX + 2, receiverY);
  pdf.setFont('helvetica', 'normal');
  {
    const lines = pdf.splitTextToSize(safeText(parcel.receiver_postal_code, 'N/A'), boxWidth - 24);
    lines.forEach((ln: string, i: number) => pdf.text(ln, receiverX + 22, receiverY + i * 3.2));
    receiverY += (lines.length - 1) * 3.2;
  }

  receiverY += receiverLineGap - 2.5;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Phone:', receiverX + 2, receiverY);
  pdf.setFont('helvetica', 'normal');
  {
    const lines = pdf.splitTextToSize(safeText(parcel.receiver_phone, 'N/A'), boxWidth - 16);
    lines.forEach((ln: string, i: number) => pdf.text(ln, receiverX + 14, receiverY + i * 3.2));
    receiverY += (lines.length - 1) * 3.2;
  }

  receiverY += receiverLineGap - 2.5;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Email:', receiverX + 2, receiverY);
  pdf.setFont('helvetica', 'normal');
  {
    const receiverEmail = safeText(parcel.receiver_email, 'N/A');
    const emailLines = pdf.splitTextToSize(receiverEmail, boxWidth - 14);
    emailLines.forEach((ln: string, i: number) => pdf.text(ln, receiverX + 12, receiverY + i * 3.2));
    receiverY += (emailLines.length - 1) * 3.2;
  }
  pdf.setFontSize(receiverFontSize);

  yPos += 52;

  // Items table
  pdf.setFillColor(220, 20, 60);
  pdf.rect(10, yPos, pageWidth - 20, 6, 'F');
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('ITEMS / CONTENTS', 12, yPos + 4);
  
  yPos += 7;
  
  // Table header
  pdf.setFillColor(255, 250, 250);
  pdf.rect(10, yPos, pageWidth - 20, 6, 'F');
  pdf.setDrawColor(220, 220, 220);
  pdf.rect(10, yPos, pageWidth - 20, 6);
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(60, 60, 60);
  pdf.text('DESCRIPTION', 12, yPos + 4);
  pdf.text('QTY', 115, yPos + 4);
  pdf.text('UNIT PRICE', 135, yPos + 4);
  pdf.text('TOTAL', pageWidth - 22, yPos + 4);
  
  yPos += 7;
  
  const senderItems = parcel.items || [{ description: 'General Goods', quantity: 1, unit_price: parcel.total_price || 100 }];
  let senderGrandTotal = 0;

  // Scale row height and font size based on item count so everything fits
  const senderItemCount = senderItems.length;
  const senderItemRowH = senderItemCount >= 6 ? 7 : 10;
  const senderItemFont = senderItemCount >= 6 ? 6.5 : 8;

  senderItems.forEach((item: any, index: number) => {
    const itemTotal = (item.quantity || 1) * (item.unit_price || 0);
    senderGrandTotal += itemTotal;
    
    pdf.setFillColor(index % 2 === 0 ? 255 : 252, index % 2 === 0 ? 252 : 250, index % 2 === 0 ? 252 : 248);
    pdf.rect(10, yPos - 2, pageWidth - 20, senderItemRowH, 'F');
    pdf.setDrawColor(230, 230, 230);
    pdf.rect(10, yPos - 2, pageWidth - 20, senderItemRowH);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(senderItemFont);
    pdf.setTextColor(0, 0, 0);
    const desc = safeText(item.description, 'Item');
    const descLines = pdf.splitTextToSize(desc, 90);
    pdf.text(descLines[0], 13, yPos + (senderItemRowH / 2));
    pdf.setFontSize(senderItemFont);
    pdf.text(String(item.quantity || 1), 118, yPos + (senderItemRowH / 2));
    pdf.text(`${(item.unit_price || 0).toFixed(2)}`, 138, yPos + (senderItemRowH / 2));
    pdf.text(`${itemTotal.toFixed(2)}`, pageWidth - 19, yPos + (senderItemRowH / 2));
    
    yPos += senderItemRowH;
  });
  
  // Total row - USD only
  pdf.setFillColor(220, 20, 60);
  pdf.rect(10, yPos - 2, pageWidth - 20, 10, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(255, 255, 255);

  const senderCurrency = parcel.currency || 'USD';
  pdf.text(`TOTAL ${senderCurrency}: ${senderGrandTotal.toFixed(2)}`, pageWidth / 2, yPos + 4, { align: 'center' });

  yPos += 12;

  // Shipment details
  const lengthB3 = parcel.length || 12;
  const widthB3 = parcel.width || 12;
  const heightB3 = parcel.height || 16;
  const calcDimWeightB3 = parseFloat(((lengthB3 * widthB3 * heightB3) / 5000).toFixed(2));
  const dimWeightB3 = parcel.dim_weight_override != null ? parcel.dim_weight_override : calcDimWeightB3;
  const dimWeightStrB3 = Number(dimWeightB3).toFixed(2);
  const piecesB3 = parcel.pieces || 1;
  const actualWeightB3 = parcel.weight || 5;
  const chargeableWeightB3 = Math.max(parseFloat(dimWeightStrB3), actualWeightB3);
  const documentTypeB3 = (parcel.document_type || 'document').toUpperCase();
  const dimLabelB3 = parcel.dim_weight_override != null ? `${dimWeightStrB3} KG*` : `${dimWeightStrB3} KG`;

  pdf.setFillColor(50, 50, 50);
  pdf.rect(10, yPos, pageWidth - 20, 6, 'F');
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('SHIPMENT DETAILS', 12, yPos + 4);

  yPos += 7;
  pdf.setFillColor(250, 250, 250);
  pdf.rect(10, yPos, pageWidth - 20, 24, 'FD');

  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(60, 60, 60);

  // Row 1
  pdf.text('BOOKING DATE:', 12, yPos + 4);
  pdf.text('DIMENSIONS:', 95, yPos + 4);
  pdf.text('PIECES:', 145, yPos + 4);
  pdf.text('WEIGHT:', pageWidth - 30, yPos + 4);

  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  const bookingDate = parcel.created_at ? new Date(parcel.created_at).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');
  pdf.text(bookingDate, 12, yPos + 8);
  pdf.text(`${lengthB3}x${widthB3}x${heightB3}`, 95, yPos + 8);
  pdf.text(String(piecesB3), 145, yPos + 8);

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${actualWeightB3} KG`, pageWidth - 30, yPos + 8);

  // Row 2
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(60, 60, 60);
  pdf.text('DIM WEIGHT:', 12, yPos + 14);
  pdf.text('CHARGEABLE:', 95, yPos + 14);
  pdf.text('TYPE:', 145, yPos + 14);

  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  pdf.text(dimLabelB3, 12, yPos + 18);
  pdf.text(`${chargeableWeightB3} KG`, 95, yPos + 18);
  pdf.text(documentTypeB3, 145, yPos + 18);

  yPos += 24;

  // Payment box — use amount_override if set, else freight_amount_pkr
  const freightPkr = parcel.amount_override != null ? parcel.amount_override : (parcel.freight_amount_pkr || 0);
  const freightLabel = parcel.amount_override != null ? `PKR ${Number(freightPkr).toLocaleString()} (override)` : `PKR ${Number(freightPkr).toLocaleString()}`;

  pdf.setFillColor(255, 240, 240);
  pdf.setDrawColor(220, 20, 60);
  pdf.rect(10, yPos, pageWidth - 20, 12, 'FD');
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('SHIPMENT FREIGHT:', 12, yPos + 5);
  
  pdf.setFontSize(14);
  pdf.setTextColor(220, 20, 60);
  pdf.text(freightLabel, 12, yPos + 9);
  
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'italic');
  pdf.setTextColor(100, 100, 100);
  pdf.text('(Payment to be collected from sender)', pageWidth - 12, yPos + 8, { align: 'right' });

  yPos += 16;

  // Disclaimer
  pdf.setFontSize(6);
  pdf.setFont('helvetica', 'italic');
  pdf.setTextColor(120, 120, 120);
  const disclaimer1 = 'I/WE HEREBY DECLARE AND UNDERTAKE THAT THE ABOVE MENTIONED PARTICULARS ARE TRUE AND CORRECT.';
  const disclaimer2 = 'THERE IS NOTHING DANGEROUS OR PROHIBITED. MAXIMUM LIABILITY: USD 100 UNLESS ADDITIONAL INSURANCE PURCHASED.';
  const disclaimer3 = 'CONSIGNEE PAYS ALL DESTINATION DUTIES/TAXES.';
  
  const disclaimerLines1 = pdf.splitTextToSize(disclaimer1, pageWidth - 20);
  const disclaimerLines2 = pdf.splitTextToSize(disclaimer2, pageWidth - 20);
  const disclaimerLines3 = pdf.splitTextToSize(disclaimer3, pageWidth - 20);
  
  pdf.text(disclaimerLines1, 10, yPos);
  yPos += disclaimerLines1.length * 2.5;
  pdf.text(disclaimerLines2, 10, yPos);
  yPos += disclaimerLines2.length * 2.5;
  pdf.text(disclaimerLines3, 10, yPos);

  yPos += 8;

  // Contact bar
  pdf.setFillColor(240, 240, 240);
  pdf.rect(10, yPos, pageWidth - 20, 7, 'F');
  pdf.setDrawColor(200, 200, 200);
  pdf.rect(10, yPos, pageWidth - 20, 7);
  
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(60, 60, 60);
  pdf.text('Phone: (042) 37255473  |  Mobile: 0321 4710522  |  WhatsApp: 0326 9422411  |  Email: skyxpress786@gmail.com', pageWidth / 2, yPos + 4, { align: 'center' });

  yPos += 10;

  // Sender copy header
  pdf.setFillColor(220, 20, 60);
  pdf.rect(10, yPos, pageWidth - 20, 7, 'F');
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('SENDER COPY', 12, yPos + 5);
  pdf.setFontSize(8);
  pdf.text('BOOKING OFFICE: Sky Office', pageWidth - 12, yPos + 5, { align: 'right' });

  yPos += 10;

  const itemCount = (parcel.items || [{ description: 'General Goods', quantity: 1, unit_price: parcel.total_price || 100 }]).length;
  
  if (itemCount >= 8) {
    pdf.addPage();
    yPos = 15;
    
    pdf.setDrawColor(220, 20, 60);
    pdf.setLineWidth(0.8);
    pdf.rect(5, 5, pageWidth - 10, pageHeight - 10);

    pdf.setFillColor(250, 250, 250);
    pdf.rect(10, yPos, pageWidth - 20, pageHeight - yPos - 15, 'F');
    pdf.setDrawColor(220, 20, 60);
    pdf.rect(10, yPos, pageWidth - 20, pageHeight - yPos - 15);
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(220, 20, 60);
    pdf.text('STANDARD TRADING CONDITIONS', pageWidth / 2, yPos + 5, { align: 'center' });
    
    yPos += 10;
    
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(60, 60, 60);
    
    const conditions = [
      'By tendering goods for transport by SKY XPRESS WORLDWIDE EXPRESS, the Consignor agrees to the following conditions:',
      '',
      '1. DEFINITIONS: "SKY XPRESS" means Sky Xpress Worldwide Express. "Consignor" or "Shipper" means the sender.',
      '"Consignee" means the person to whom the goods are consigned.',
      '',
      '2. CONSIGNMENT NOTE: Each consignment shall be correctly addressed and accompanied by SKY XPRESS form of',
      'Consignment Note which the Consignor shall properly complete. The Consignor is responsible for correctness of information.',
      '',
      '3. SUB-CONTRACTING: SKY XPRESS may sub-contract all or any part and may engage agents or sub-contractors.',
      '',
      '4. COMMON CARRIER: The company is not a common carrier and will only carry goods on these conditions.',
      '',
      '5. LIABILITY: SKY XPRESS shall not be liable for any loss, damage, or delays except where directly caused by proven',
      'negligence. Maximum liability is limited to USD 100 per shipment unless additional insurance is purchased.',
      '',
      '6. PROHIBITED ITEMS: Consignor warrants goods do not contain dangerous, hazardous, or prohibited items including',
      'narcotics, weapons, explosives, antiques, liquids, or items prohibited by IATA or local laws. Consignor fully responsible.',
      '',
      '7. CUSTOMS & DUTIES: Any customs duties, taxes, or charges levied at destination shall be paid by Consignee.',
      'If Consignee refuses payment, Consignor shall be liable.',
      '',
      '8. GOVERNING LAW: These conditions governed by laws of Pakistan. Disputes subject to exclusive jurisdiction of Pakistani courts.'
    ];
    
    let conditionsY = yPos;
    conditions.forEach((line) => {
      const lines = pdf.splitTextToSize(line, pageWidth - 24);
      pdf.text(lines, 12, conditionsY);
      conditionsY += lines.length * 3;
    });

    yPos = pageHeight - 8;
    pdf.setDrawColor(220, 20, 60);
    pdf.line(10, yPos, pageWidth - 10, yPos);
    yPos += 3;
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(220, 20, 60);
    pdf.text('© 2025 Sky Xpress International - All Rights Reserved', pageWidth / 2, yPos, { align: 'center' });
  } else {
    pdf.setFillColor(250, 250, 250);
    const availableHeight = pageHeight - yPos - 12;
    pdf.rect(10, yPos, pageWidth - 20, availableHeight, 'F');
    pdf.setDrawColor(220, 20, 60);
    pdf.rect(10, yPos, pageWidth - 20, availableHeight);
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(220, 20, 60);
    pdf.text('STANDARD TRADING CONDITIONS', pageWidth / 2, yPos + 4, { align: 'center' });
    
    yPos += 8;
    
    pdf.setFontSize(5.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(60, 60, 60);
    
    const conditions = [
      'By tendering goods for transport by SKY XPRESS WORLDWIDE EXPRESS, the Consignor agrees to the following conditions:',
      '',
      '1. DEFINITIONS: "SKY XPRESS" means Sky Xpress Worldwide Express. "Consignor" or "Shipper" means the sender. "Consignee" means the person to whom the goods are consigned.',
      '',
      '2. CONSIGNMENT NOTE: Each consignment shall be correctly addressed and accompanied by SKY XPRESS form of Consignment Note which the Consignor shall properly complete. The Consignor is responsible for correctness of information.',
      '',
      '3. SUB-CONTRACTING: SKY XPRESS may sub-contract all or any part and may engage agents or sub-contractors.',
      '',
      '4. COMMON CARRIER: The company is not a common carrier and will only carry goods on these conditions.',
      '',
      '5. LIABILITY: SKY XPRESS shall not be liable for any loss, damage, or delays except where directly caused by proven negligence. Maximum liability is limited to USD 100 per shipment unless additional insurance is purchased.',
      '',
      '6. PROHIBITED ITEMS: Consignor warrants goods do not contain dangerous, hazardous, or prohibited items including narcotics, weapons, explosives, antiques, liquids, or items prohibited by IATA or local laws. Consignor fully responsible.',
      '',
      '7. CUSTOMS & DUTIES: Any customs duties, taxes, or charges levied at destination shall be paid by Consignee. If Consignee refuses payment, Consignor shall be liable.',
      '',
      '8. GOVERNING LAW: These conditions governed by laws of Pakistan. Disputes subject to exclusive jurisdiction of Pakistani courts.'
    ];
    
    let conditionsY = yPos;
    conditions.forEach((line) => {
      const lines = pdf.splitTextToSize(line, pageWidth - 24);
      pdf.text(lines, 12, conditionsY);
      conditionsY += lines.length * 2.2;
    });

    yPos = pageHeight - 8;
    pdf.setDrawColor(220, 20, 60);
    pdf.line(10, yPos, pageWidth - 10, yPos);
    yPos += 3;
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(220, 20, 60);
    pdf.text('© 2025 Sky Xpress International - All Rights Reserved', pageWidth / 2, yPos, { align: 'center' });
  }

  handlePDFOutput(pdf, `AWB-Sender-Copy-${refNumber}.pdf`, mode);
};

// Generate all 3 bills at once
export const generateAllBills = async (parcel: ParcelData): Promise<void> => {
  await generatePaymentInvoice(parcel);
  setTimeout(async () => await generateAirwayBillVerification(parcel), 500);
  setTimeout(async () => await generateAirwayBillWithPayment(parcel), 1000);
};
