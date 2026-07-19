// @ts-nocheck
import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';

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

// Load and add QR code to PDF using multiple APIs with fallback
const addQRCode = async (pdf: jsPDF, referenceId: string, x: number, y: number, size: number = 25) => {
  // Array of QR code API endpoints - will try each one until success
  const qrApis = [
    // API 1: QuickChart.io
    `https://quickchart.io/qr?text=${encodeURIComponent(referenceId)}&size=300`,
    
    // API 2: QR Server
    `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(referenceId)}`,
    
    // API 3: Google Charts (deprecated but still works)
    `https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl=${encodeURIComponent(referenceId)}`,
    
    // API 4: QR Code Generator
    `https://qrcode.tec-it.com/API/QRCode?data=${encodeURIComponent(referenceId)}&size=medium`,
    
    // API 5: GoQR.me
    `https://api.qrserver.com/v1/create-qr-code/?size=300x300&format=png&data=${encodeURIComponent(referenceId)}`
  ];
  
  // Try each API in sequence
  for (let i = 0; i < qrApis.length; i++) {
    try {
      console.log(`Trying QR API ${i + 1}/${qrApis.length}:`, qrApis[i]);
      
      const response = await fetch(qrApis[i]);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
      
      // Verify blob is valid
      if (blob.size === 0) {
        throw new Error('Empty response blob');
      }
      
      const reader = new FileReader();
      
      return new Promise<void>((resolve, reject) => {
        reader.onloadend = () => {
          try {
            const base64 = reader.result as string;
            pdf.addImage(base64, 'PNG', x, y, size, size);
            console.log(`✓ QR code generated successfully using API ${i + 1}`);
            resolve();
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = () => reject(new Error('FileReader error'));
        reader.readAsDataURL(blob);
      });
      
    } catch (error) {
      console.warn(`QR API ${i + 1} failed:`, error);
      
      // If this was the last API, throw error
      if (i === qrApis.length - 1) {
        console.error('All QR code APIs failed. QR code will not be added.');
        return; // Don't throw - just skip QR code
      }
      
      // Otherwise, continue to next API
      continue;
    }
  }
};

// ===== 1. INVOICE (removed GIFT) =====
export const generatePaymentInvoice = async (parcel: any, mode: OutputMode = 'download'): Promise<void> => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  let yPos = 6; // RESTORED to 6 from 5

  // Professional border
  pdf.setDrawColor(30, 144, 255);
  pdf.setLineWidth(0.8);
  pdf.rect(5, 5, pageWidth - 10, pageHeight - 10);

  // Add logo at top - UPDATED SIZE to 50x30
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

  pdf.setFont('helvetica', 'normal');
  
  // USE REFERENCE_ID instead of tracking_id
  const refNumber = safeText(parcel.reference_id || parcel.tracking_id, '000000000');
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text(refNumber, rightBoxX + 20, yPos + 15);

  // Add QR Code INSIDE the frame (matching Airway Bill 2)
  await addQRCode(pdf, refNumber, rightBoxX + 43, yPos + 1, 18);

  yPos += 28; // UPDATED from 26 to 28 to match Airway Bills

  // Shipper & Receiver sections
  const boxWidth = (pageWidth - 2 * margin - 3) / 2;
  
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
  
  shipperY += 5;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Address:', margin + 2, shipperY);
  pdf.setFont('helvetica', 'normal');
  const shipperAddr = pdf.splitTextToSize(safeText(parcel.sender_address, 'N/A'), 70);
  pdf.text(shipperAddr[0], margin + 18, shipperY);
  if (shipperAddr[1]) {
    shipperY += 4;
    pdf.text(shipperAddr[1], margin + 2, shipperY);
  }
  
  shipperY += 5;
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
  
  receiverY += 5;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Address:', receiverX + 2, receiverY);
  pdf.setFont('helvetica', 'normal');
  const receiverAddr = pdf.splitTextToSize(`${safeText(parcel.receiver_address, '')} ${safeText(parcel.receiver_city, '')}`, 70);
  pdf.text(receiverAddr[0], receiverX + 18, receiverY);
  if (receiverAddr[1]) {
    receiverY += 4;
    pdf.text(receiverAddr[1], receiverX + 2, receiverY);
  }
  
  receiverY += 5;
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
  
  // Table rows - REDUCED HEIGHT to 10mm
  const items = parcel.items || [{ description: 'General Goods', quantity: 1, unit_price: parcel.total_price || 100 }];
  let grandTotal = 0;
  
  items.forEach((item: any, index: number) => {
    const itemTotal = (item.quantity || 1) * (item.unit_price || 0);
    grandTotal += itemTotal;
    
    // Reduced row height to 10mm
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
  
  // Row 1
  pdf.text('BOOKING DATE:', margin + 2, yPos + 4);
  pdf.text('DIMENSIONS:', margin + 95, yPos + 4);
  pdf.text('PIECES:', margin + 145, yPos + 4);
  pdf.text('WEIGHT:', pageWidth - margin - 30, yPos + 4);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  const bookingDate = parcel.created_at ? new Date(parcel.created_at).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');
  const service = safeText(parcel.service_type, 'STANDARD').toUpperCase();
  pdf.text(bookingDate, margin + 2, yPos + 8);
  pdf.text(`${length}x${width}x${height}`, margin + 95, yPos + 8);
  pdf.text(String(pieces), margin + 145, yPos + 8);
  
  // WEIGHT VALUE - BIGGER AND BOLD
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
  pdf.text(`${dimWeight} KG`, margin + 2, yPos + 18);
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
  
  // Signature box
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

  // Check number of items to determine conditions placement
  const itemCount = items.length;
  
  // If 8 or more items, add new page for conditions
  if (itemCount >= 8) {
    // ADD NEW PAGE FOR STANDARD TRADING CONDITIONS
    pdf.addPage();
    yPos = 15;
    
    // Add border on new page
    pdf.setDrawColor(30, 144, 255);
    pdf.setLineWidth(0.8);
    pdf.rect(5, 5, pageWidth - 10, pageHeight - 10);

    // Standard Trading Conditions - FULL SIZE
    pdf.setFillColor(250, 250, 250);
    const conditionsHeight = pageHeight - yPos - 25; // Increased space for footer
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

    // Footer on second page
    footerY = pageHeight - 10;
    pdf.setDrawColor(30, 144, 255);
    pdf.setLineWidth(0.5);
    pdf.line(10, footerY, pageWidth - 10, footerY);
    footerY += 3;
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(80, 80, 80);
    pdf.text('Email: skyxpress786@gmail.com | Phone: 042 999164619 | Mobile: 0321 4710522 | WhatsApp: 0326 9422411', pageWidth / 2, footerY, { align: 'center' });
  } else {
    // 7 or fewer items - keep conditions on same page with smaller text
    // Standard Trading Conditions - COMPACT SIZE
    pdf.setFillColor(250, 250, 250);
    const availableHeight = pageHeight - yPos - 20; // Increased space for footer
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

    // Footer on same page
    footerY = pageHeight - 10;
    pdf.setDrawColor(30, 144, 255);
    pdf.setLineWidth(0.5);
    pdf.line(10, footerY, pageWidth - 10, footerY);
    footerY += 3;
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(80, 80, 80);
    pdf.text('Email: skyxpress786@gmail.com | Phone: 042 999164619 | Mobile: 0321 4710522 | WhatsApp: 0326 9422411', pageWidth / 2, footerY, { align: 'center' });
  }

  handlePDFOutput(pdf, `Performa-Invoice-${refNumber}.pdf`, mode);
};

// ===== 2. AIRWAY BILL (Verification) =====
export const generateAirwayBillVerification = async (parcel: any, mode: OutputMode = 'download'): Promise<void> => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  // Calculate dimensional weight
  const length = parcel.length || 12;
  const width = parcel.width || 12;
  const height = parcel.height || 16;
  const dimensionalWeight = ((height * width * length) / 5000).toFixed(2);
  const dimWeightFor5000 = ((height * width * length) / 5000).toFixed(2);
  const actualWeight = parcel.weight || 5;
  const chargeableWeight = Math.max(parseFloat(dimensionalWeight), actualWeight);
  const pieces = parcel.pieces || 1;
  const documentType = (parcel.document_type || 'document').toUpperCase();
  
  // USE REFERENCE_ID instead of tracking_id
  const refNumber = safeText(parcel.reference_id || parcel.tracking_id, '000000000');

  // Function to generate one copy
  const generateCopy = async (startY: number, copyLabel: string) => {
    let yPos = startY;

    // Border for this copy
    pdf.setDrawColor(255, 140, 0);
    pdf.setLineWidth(0.5);
    pdf.rect(5, startY - 2, pageWidth - 10, 140);

    // Add logo - INCREASED SIZE to 50x30
    await addLogo(pdf, 10, yPos, 50, 30);

    // Contact info next to logo
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(80, 80, 80);
    pdf.text('Email: skyxpress786@gmail.com', 65, yPos + 5);
    pdf.text('Phone: 042 999164619', 65, yPos + 10);
    pdf.text('Mobile: 0321 4710522', 65, yPos + 15);
    pdf.text('www.skyxpress.site', 65, yPos + 20);

    // Right header
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
    pdf.text('Tracking number:', headerX + 2, yPos + 17);
    
    pdf.setFont('helvetica', 'normal');
    const destination = safeText(parcel.receiver_country, 'UK').substring(0, 2).toUpperCase();
    const service = safeText(parcel.service_type, 'STANDARD').toUpperCase();
    
    pdf.text(destination, headerX + 25, yPos + 11);
    pdf.text(service, headerX + 20, yPos + 14);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 100, 0);
    pdf.text(refNumber, headerX + 28, yPos + 17);

    // Add QR Code - MOVED to right side inside AIRWAY BILL border frame
    await addQRCode(pdf, refNumber, headerX + 43, yPos + 1, 18);

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
    
    pdf.setFontSize(8);
    pdf.setTextColor(0, 0, 0);
    let shipperY = yPos + 10;
    
    pdf.setFont('helvetica', 'bold');
    pdf.text('Name:', 12, shipperY);
    pdf.setFont('helvetica', 'normal');
    pdf.text(safeText(parcel.sender_name, 'N/A'), 24, shipperY);
    
    shipperY += 5;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Company:', 12, shipperY);
    pdf.setFont('helvetica', 'normal');
    pdf.text(safeText(parcel.sender_company, 'N/A'), 28, shipperY);
    
    shipperY += 5;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Address:', 12, shipperY);
    pdf.setFont('helvetica', 'normal');
    const shipperAddr = pdf.splitTextToSize(safeText(parcel.sender_address, 'N/A'), 70);
    pdf.text(shipperAddr[0], 26, shipperY);
    if (shipperAddr[1]) {
      shipperY += 4;
      pdf.text(shipperAddr[1], 12, shipperY);
    }
    
    shipperY += 5;
    pdf.text(`${safeText(parcel.sender_city, '')}, ${safeText(parcel.sender_country, 'Pakistan')}`, 12, shipperY);
    
    shipperY += 5;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Phone:', 12, shipperY);
    pdf.setFont('helvetica', 'normal');
    pdf.text(safeText(parcel.sender_phone, 'N/A'), 24, shipperY);
    
    shipperY += 5;
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
    
    pdf.setFontSize(8);
    pdf.setTextColor(0, 0, 0);
    let receiverY = yPos + 10;
    
    pdf.setFont('helvetica', 'bold');
    pdf.text('Name:', receiverX, receiverY);
    pdf.setFont('helvetica', 'normal');
    pdf.text(safeText(parcel.receiver_name, 'N/A'), receiverX + 12, receiverY);
    
    receiverY += 5;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Company:', receiverX, receiverY);
    pdf.setFont('helvetica', 'normal');
    pdf.text(safeText(parcel.receiver_company, 'N/A'), receiverX + 20, receiverY);
    
    receiverY += 5;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Address:', receiverX, receiverY);
    pdf.setFont('helvetica', 'normal');
    const receiverAddr = pdf.splitTextToSize(`${safeText(parcel.receiver_address, '')} ${safeText(parcel.receiver_city, '')}`, 70);
    pdf.text(receiverAddr[0], receiverX + 16, receiverY);
    if (receiverAddr[1]) {
      receiverY += 4;
      pdf.text(receiverAddr[1], receiverX, receiverY);
    }
    
    receiverY += 5;
    pdf.text(`${safeText(parcel.receiver_state, '')}, ${safeText(parcel.receiver_country, 'UK')}`, receiverX, receiverY);
    
    receiverY += 5;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Postal Code:', receiverX, receiverY);
    pdf.setFont('helvetica', 'normal');
    pdf.text(safeText(parcel.receiver_postal_code, 'N/A'), receiverX + 20, receiverY);
    
    receiverY += 5;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Phone:', receiverX, receiverY);
    pdf.setFont('helvetica', 'normal');
    pdf.text(safeText(parcel.receiver_phone, 'N/A'), receiverX + 12, receiverY);
    
    receiverY += 5;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Email:', receiverX, receiverY);
    pdf.setFont('helvetica', 'normal');
    const receiverEmail = safeText(parcel.receiver_email, 'N/A');
    const emailLines = pdf.splitTextToSize(receiverEmail, 65);
    pdf.text(emailLines[0], receiverX + 12, receiverY);

    yPos += 45;

    // Shipment details - UPDATED WITH DIMENSION CALCULATION AND PIECES
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
    const documentType = (parcel.document_type || 'document').toUpperCase();
    pdf.text(bookingDate, 12, yPos + 8);
    pdf.text(`${length}x${width}x${height}`, 95, yPos + 8);
    pdf.text(String(pieces), 145, yPos + 8);

    // WEIGHT VALUE - BIGGER AND BOLD
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
    pdf.text(`${dimWeightFor5000} KG`, 12, yPos + 18);
    pdf.text(`${chargeableWeight} KG`, 95, yPos + 18);
    pdf.text(documentType, 145, yPos + 18);

    yPos += 21;

    // Disclaimer in English - MOVED DOWN 3mm
    yPos += 3;
    pdf.setFontSize(5.5);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(120, 120, 120);
    const disclaimer = 'I/WE HEREBY DECLARE AND UNDERTAKE THAT THE ABOVE MENTIONED PARTICULARS ARE TRUE AND CORRECT. THERE IS NOTHING DANGEROUS, ANTIQUES, NARCOTICS, LIQUID OR ANYTHING LIKELY TO CAUSE DAMAGE. IF ANYTHING FOUND I/WE WILL BE FULLY RESPONSIBLE. NOTE: ANY TAXES AT THE DESTINATION WILL BE PAID BY THE CONSIGNEE. MAXIMUM LIABILITY LIMITED TO USD 100.';
    const disclaimerLines = pdf.splitTextToSize(disclaimer, pageWidth - 20);
    pdf.text(disclaimerLines, 10, yPos);

    yPos += 7; // Gap set to 7 (booking frame spacing)

    // Signature section - REORGANIZED TO PREVENT OVERLAPPING
    pdf.setFillColor(255, 250, 245);
    pdf.rect(10, yPos, pageWidth - 20, 18, 'FD');
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('BOOKING OFFICE:', 12, yPos + 5);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Sky Office', 42, yPos + 5);
    
    // SHIPPER SIGNATURE moved to next line
    pdf.setFont('helvetica', 'bold');
    pdf.text('SHIPPER SIGNATURE:', 12, yPos + 12);
    pdf.rect(50, yPos + 8, 45, 8);
    
    // CNIC on the right
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

  // Generate Sender Copy - MOVED UP from 8 to 6
  await generateCopy(6, 'Account Copy');

  // Generate Forward Copy - MOVED UP from 156 to 154
  await generateCopy(154, 'FORWARD COPY');

  handlePDFOutput(pdf, `AWB-Verification-${refNumber}.pdf`, mode);
};

// ===== 3. AIRWAY BILL with Payment (Sender Copy) =====
export const generateAirwayBillWithPayment = async (parcel: any, mode: OutputMode = 'download'): Promise<void> => {
  // Fetch PKR exchange rate from pricing config
  let pkrRate = 285.0; // Default fallback rate
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
  let yPos = 6; // MOVED UP from 8 to 6

  // Border
  pdf.setDrawColor(220, 20, 60);
  pdf.setLineWidth(0.8);
  pdf.rect(5, 5, pageWidth - 10, pageHeight - 10);

  // USE REFERENCE_ID instead of tracking_id
  const refNumber = safeText(parcel.reference_id || parcel.tracking_id, '000000000');

  // Add logo at top left - UPDATED SIZE to 50x30, MOVED UP
  await addLogo(pdf, 10, yPos, 50, 30);

  // Contact info next to logo - 4 rows now
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(80, 80, 80);
  pdf.text('Email: skyxpress786@gmail.com', 60, yPos + 3);
  pdf.text('Phone: 042 999164619', 60, yPos + 8);
  pdf.text('WhatsApp: 0326 9422411', 60, yPos + 13);
  pdf.text('www.skyxpress.site', 60, yPos + 18);

  // Right header box
  const headerX = pageWidth - 75;
  pdf.setFillColor(255, 240, 245);
  pdf.setDrawColor(220, 20, 60);
  pdf.setLineWidth(0.5);
  pdf.rect(headerX, yPos, 65, 20, 'FD');
  
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(220, 20, 60);
  pdf.text('AIRWAY BILL', headerX + 2, yPos + 6);
  
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(60, 60, 60);
  pdf.text('DESTINATION:', headerX + 2, yPos + 11);
  pdf.text('SERVICE:', headerX + 2, yPos + 14);
  pdf.text('Tracking number:', headerX + 2, yPos + 17);
  
  pdf.setFont('helvetica', 'normal');
  const destination = safeText(parcel.receiver_country, 'UK').substring(0, 2).toUpperCase();
  const service = safeText(parcel.service_type, 'STANDARD').toUpperCase();
  
  pdf.text(destination, headerX + 25, yPos + 11);
  pdf.text(service, headerX + 20, yPos + 14);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(220, 20, 60);
  pdf.text(refNumber, headerX + 28, yPos + 17);

  // Add QR Code - MOVED to inside AIRWAY BILL border frame (same as verification bill)
  await addQRCode(pdf, refNumber, headerX + 43, yPos + 1, 18);

  yPos += 28;

  // Shipper & Receiver
  const boxWidth = (pageWidth - 20 - 2) / 2;
  
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
  
  pdf.setFontSize(8);
  pdf.setTextColor(0, 0, 0);
  let shipperY = yPos + 11;
  
  pdf.setFont('helvetica', 'bold');
  pdf.text('Name:', 12, shipperY);
  pdf.setFont('helvetica', 'normal');
  pdf.text(safeText(parcel.sender_name, 'N/A'), 24, shipperY);
  
  shipperY += 5;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Company:', 12, shipperY);
  pdf.setFont('helvetica', 'normal');
  pdf.text(safeText(parcel.sender_company, 'N/A'), 28, shipperY);
  
  shipperY += 5;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Address:', 12, shipperY);
  pdf.setFont('helvetica', 'normal');
  const shipperAddr = pdf.splitTextToSize(safeText(parcel.sender_address, 'N/A'), 70);
  pdf.text(shipperAddr[0], 26, shipperY);
  if (shipperAddr[1]) {
    shipperY += 4;
    pdf.text(shipperAddr[1], 12, shipperY);
  }
  
  shipperY += 5;
  pdf.text(`${safeText(parcel.sender_city, '')}, ${safeText(parcel.sender_country, 'Pakistan')}`, 12, shipperY);
  
  shipperY += 5;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Phone:', 12, shipperY);
  pdf.setFont('helvetica', 'normal');
  pdf.text(safeText(parcel.sender_phone, 'N/A'), 24, shipperY);
  
  shipperY += 5;
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
  
  pdf.setFontSize(8);
  pdf.setTextColor(0, 0, 0);
  let receiverY = yPos + 11;
  
  pdf.setFont('helvetica', 'bold');
  pdf.text('Name:', receiverX + 2, receiverY);
  pdf.setFont('helvetica', 'normal');
  pdf.text(safeText(parcel.receiver_name, 'N/A'), receiverX + 14, receiverY);
  
  receiverY += 5;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Company:', receiverX + 2, receiverY);
  pdf.setFont('helvetica', 'normal');
  pdf.text(safeText(parcel.receiver_company, 'N/A'), receiverX + 20, receiverY);
  
  receiverY += 5;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Address:', receiverX + 2, receiverY);
  pdf.setFont('helvetica', 'normal');
  const receiverAddr = pdf.splitTextToSize(`${safeText(parcel.receiver_address, '')} ${safeText(parcel.receiver_city, '')}`, 70);
  pdf.text(receiverAddr[0], receiverX + 16, receiverY);
  if (receiverAddr[1]) {
    receiverY += 4;
    pdf.text(receiverAddr[1], receiverX + 2, receiverY);
  }
  
  receiverY += 5;
  pdf.text(`${safeText(parcel.receiver_state, '')}, ${safeText(parcel.receiver_country, 'UK')}`, receiverX + 2, receiverY);
  
  receiverY += 5;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Postal Code:', receiverX + 2, receiverY);
  pdf.setFont('helvetica', 'normal');
  pdf.text(safeText(parcel.receiver_postal_code, 'N/A'), receiverX + 22, receiverY);
  
  receiverY += 5;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Phone:', receiverX + 2, receiverY);
  pdf.setFont('helvetica', 'normal');
  pdf.text(safeText(parcel.receiver_phone, 'N/A'), receiverX + 14, receiverY);
  
  receiverY += 5;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Email:', receiverX + 2, receiverY);
  pdf.setFont('helvetica', 'normal');
  const receiverEmail = safeText(parcel.receiver_email, 'N/A');
  const emailLines = pdf.splitTextToSize(receiverEmail, 65);
  pdf.text(emailLines[0], receiverX + 12, receiverY);

  yPos += 52;

  // Items table - REDUCED HEIGHT TO 10mm
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
  
  // Table rows - REDUCED HEIGHT TO 10mm
  const senderItems = parcel.items || [{ description: 'General Goods', quantity: 1, unit_price: parcel.total_price || 100 }];
  let senderGrandTotal = 0;
  
  senderItems.forEach((item: any, index: number) => {
    const itemTotal = (item.quantity || 1) * (item.unit_price || 0);
    senderGrandTotal += itemTotal;
    
    // Reduced row height to 10mm
    pdf.setFillColor(index % 2 === 0 ? 255 : 252, index % 2 === 0 ? 252 : 250, index % 2 === 0 ? 252 : 248);
    pdf.rect(10, yPos - 2, pageWidth - 20, 10, 'F');
    pdf.setDrawColor(230, 230, 230);
    pdf.rect(10, yPos - 2, pageWidth - 20, 10);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(0, 0, 0);
    const desc = safeText(item.description, 'Item');
    const descLines = pdf.splitTextToSize(desc, 90);
    pdf.text(descLines[0], 13, yPos + 3);
    if (descLines[1]) {
      pdf.setFontSize(7);
      pdf.text(descLines[1], 13, yPos + 6);
    }
    pdf.setFontSize(8);
    pdf.text(String(item.quantity || 1), 118, yPos + 4);
    pdf.text(`$${(item.unit_price || 0).toFixed(2)}`, 138, yPos + 4);
    pdf.text(`$${itemTotal.toFixed(2)}`, pageWidth - 19, yPos + 4);
    
    yPos += 10;
  });
  
  // Total row - USD only
  pdf.setFillColor(220, 20, 60);
  pdf.rect(10, yPos - 2, pageWidth - 20, 10, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(255, 255, 255);

  // USD Total - cleaner display
  const senderCurrency = parcel.currency || 'USD';
  pdf.text(`TOTAL ${senderCurrency}: ${senderGrandTotal.toFixed(2)}`, pageWidth / 2, yPos + 4, { align: 'center' });

  yPos += 12;

  // Shipment details - IMPROVED LAYOUT
  const length = parcel.length || 12;
  const width = parcel.width || 12;
  const height = parcel.height || 16;
  const dimWeightFor5000 = ((length * width * height) / 5000).toFixed(2);
  const pieces = parcel.pieces || 1;
  const actualWeight = parcel.weight || 5;
  const chargeableWeight = Math.max(parseFloat(dimWeightFor5000), actualWeight);
  const documentType = (parcel.document_type || 'document').toUpperCase();

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
  pdf.text(`${length}x${width}x${height}`, 95, yPos + 8);
  pdf.text(String(pieces), 145, yPos + 8);

  // WEIGHT VALUE - BIGGER AND BOLD
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
  pdf.text(`${dimWeightFor5000} KG`, 12, yPos + 18);
  pdf.text(`${chargeableWeight} KG`, 95, yPos + 18);
  pdf.text(documentType, 145, yPos + 18);

  yPos += 24;

  // Payment box - PKR ONLY
  pdf.setFillColor(255, 240, 240);
  pdf.setDrawColor(220, 20, 60);
  pdf.rect(10, yPos, pageWidth - 20, 12, 'FD');
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('SHIPMENT FREIGHT:', 12, yPos + 5);
  
  // PKR Amount ONLY (from freight_amount_pkr column)
  pdf.setFontSize(14);
  pdf.setTextColor(220, 20, 60);
  const freightPkr = parcel.freight_amount_pkr || 0;
  pdf.text(`PKR ${freightPkr.toLocaleString()}`, 12, yPos + 9);
  
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
  pdf.text('Phone: 042 999164619  |  Mobile: 0321 4710522  |  WhatsApp: 0326 9422411  |  Email: skyxpress786@gmail.com', pageWidth / 2, yPos + 4, { align: 'center' });

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

  // Check number of items to determine conditions placement
  const itemCount = (parcel.items || [{ description: 'General Goods', quantity: 1, unit_price: parcel.total_price || 100 }]).length;
  
  // If 8 or more items, add new page for conditions
  if (itemCount >= 8) {
    pdf.addPage();
    yPos = 15;
    
    // Add border on new page
    pdf.setDrawColor(220, 20, 60);
    pdf.setLineWidth(0.8);
    pdf.rect(5, 5, pageWidth - 10, pageHeight - 10);

    // Standard Trading Conditions - FULL SIZE
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

    // Footer on new page
    yPos = pageHeight - 8;
    pdf.setDrawColor(220, 20, 60);
    pdf.line(10, yPos, pageWidth - 10, yPos);
    yPos += 3;
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(220, 20, 60);
    pdf.text('© 2025 Sky Xpress International - All Rights Reserved', pageWidth / 2, yPos, { align: 'center' });
  } else {
    // 7 or fewer items - keep conditions on same page with smaller text
    // Standard Trading Conditions - COMPACT SIZE
    pdf.setFillColor(250, 250, 250);
    const availableHeight = pageHeight - yPos - 12; // Leave space for footer
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

    // Footer on same page
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
