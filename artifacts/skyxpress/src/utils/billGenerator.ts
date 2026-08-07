// @ts-nocheck
import jsPDF from 'jspdf';
import JsBarcode from 'jsbarcode';
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

// Measures the vertical space drawWrappedAddress would consume (label line + wrapped lines),
// without drawing anything. Mirrors drawWrappedAddress's line-counting logic exactly.
const measureWrappedAddressHeight = (
  pdf: jsPDF,
  parts: Array<string | undefined>,
  maxWidth: number,
  fontSize: number,
  lineGap: number
): number => {
  pdf.setFontSize(fontSize);
  const cleaned = parts.map(p => (p == null ? '' : String(p).trim())).filter(Boolean);
  let totalLines = 0;
  cleaned.forEach((raw) => {
    const lines = pdf.splitTextToSize(raw, maxWidth) as string[];
    totalLines += lines.length;
  });
  return lineGap * (1 + totalLines); // +1 for the "Address:" label line itself
};

// Measures how many extra lines (beyond the first) a single labeled value (postal code,
// phone, email) will wrap into, given the available width for the value.
const measureExtraWrapLines = (
  pdf: jsPDF,
  value: string,
  maxWidth: number
): number => {
  const lines = pdf.splitTextToSize(value, maxWidth) as string[];
  return Math.max(0, lines.length - 1);
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

// Generate barcode using JsBarcode (Code128)
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
    JsBarcode(canvas, text, {
      format: 'CODE128',
      displayValue: false,
      margin: 4,
      width: 2,
      height: 80,
      background: '#ffffff',
      lineColor: '#000000',
    });
    const dataUrl = canvas.toDataURL('image/png');
    pdf.addImage(dataUrl, 'PNG', x, y, width, height);
    console.log('✓ Barcode generated successfully');
  } catch (err) {
    console.error('Barcode generation failed:', err);
    // Fallback: plain rect with number
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.3);
    pdf.rect(x, y, width, height);
    pdf.setFontSize(6);
    pdf.setTextColor(0, 0, 0);
    pdf.text(text, x + width / 2, y + height / 2, { align: 'center' });
  }
};

// Generate a Code128 barcode rotated 90° (used for the vertical strip on the piece label).
const addBarcodeVertical = async (
  pdf: jsPDF,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number
): Promise<void> => {
  try {
    const source = document.createElement('canvas');
    JsBarcode(source, text, {
      format: 'CODE128',
      displayValue: false,
      margin: 2,
      width: 2,
      height: 80,
      background: '#ffffff',
      lineColor: '#000000',
    });
    // Rotate the generated barcode canvas 90 degrees clockwise onto a new canvas
    const rotated = document.createElement('canvas');
    rotated.width = source.height;
    rotated.height = source.width;
    const ctx = rotated.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    ctx.translate(rotated.width / 2, rotated.height / 2);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(source, -source.width / 2, -source.height / 2);
    const dataUrl = rotated.toDataURL('image/png');
    pdf.addImage(dataUrl, 'PNG', x, y, width, height);
  } catch (err) {
    console.error('Vertical barcode generation failed:', err);
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.3);
    pdf.rect(x, y, width, height);
  }
};

// ===== 1. INVOICE (Proforma — DHL-style) =====
export const generatePaymentInvoice = async (parcel: any, mode: OutputMode = 'download'): Promise<void> => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const PW = pdf.internal.pageSize.getWidth();   // 210mm
  const PH = pdf.internal.pageSize.getHeight();  // 297mm
  const M  = 10;                                 // left/right margin
  const U  = PW - 2 * M;                         // 190mm usable
  let y = 8;

  // ── tiny helpers (always reset draw+text colour to black after use) ────────
  const setDraw  = (r=0,g=0,b=0,w=0.2) => { pdf.setDrawColor(r,g,b); pdf.setLineWidth(w); };
  const setText  = (r=0,g=0,b=0)       => { pdf.setTextColor(r,g,b); };
  const setFont  = (s: number, f: 'normal'|'bold'|'italic' = 'normal') => {
    pdf.setFontSize(s); pdf.setFont('helvetica', f);
  };

  const hRule = (yy: number, w=0.3) => {
    setDraw(0,0,0,w); pdf.line(M, yy, M+U, yy);
  };
  const vLine = (x: number, y0: number, y1: number) => {
    setDraw(0,0,0,0.2); pdf.line(x, y0, x, y1);
  };
  const cellText = (
    text: string, cellX: number, cellY: number,
    cellW: number, cellH: number,
    align: 'left'|'center'|'right' = 'center',
    fontSize = 6.5
  ) => {
    setFont(fontSize); setText(0,0,0);
    const lines = pdf.splitTextToSize(text, cellW - 2) as string[];
    const line = lines[0] ?? '';
    const tx = align === 'center' ? cellX + cellW / 2
             : align === 'right'  ? cellX + cellW - 1
             :                      cellX + 1;
    pdf.text(line, tx, cellY + cellH / 2 + 1, { align });
  };

  // ── parcel data ────────────────────────────────────────────────────────────
  const ref          = safeText(parcel.reference_id || parcel.tracking_id, '000000000');
  const invDate      = parcel.created_at
    ? new Date(parcel.created_at).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];
  const cur          = parcel.currency || 'USD';
  const items        = (parcel.items && parcel.items.length)
    ? parcel.items
    : [{ description: 'General Goods', quantity: 1, unit_price: parcel.total_price || 0 }];
  const weight       = parcel.weight  || 0;
  const pieces       = parcel.pieces  || 1;
  const fromCountry  = codeToCountryName(safeText(parcel.sender_country,  'Pakistan'));
  const toCountry    = codeToCountryName(safeText(parcel.receiver_country, 'United Kingdom'));

  // ══════════════════════════════════════════════════════════════════════════
  // 1 — HEADER: title left · barcode box top-right
  // ══════════════════════════════════════════════════════════════════════════
  const bcW = 68; const bcH = 30;
  const bcX = M + U - bcW;

  // Title
  setFont(16, 'bold'); setText(0,0,0);
  pdf.text('Proforma Invoice', M, y + 10);

  // Barcode box (thin border, no fill)
  setDraw(0,0,0,0.3);
  pdf.rect(bcX, y, bcW, bcH);
  setFont(6.5, 'bold'); setText(0,0,0);
  pdf.text('AWB / REFERENCE NO', bcX + bcW/2, y + 5, { align: 'center' });
  setFont(8.5, 'bold');
  pdf.text(ref, bcX + bcW/2, y + 10.5, { align: 'center' });
  // barcode image fills the interior
  await addBarcode(pdf, ref, bcX + 2, y + 12, bcW - 4, 14);
  setFont(6, 'normal'); setText(50,50,50);
  pdf.text(ref, bcX + bcW/2, y + 28.5, { align: 'center' });

  y += bcH + 2;

  // ── AWB / Date / Invoice No info strip ───────────────────────────────────
  hRule(y, 0.5); y += 1;
  setFont(7.5); setText(0,0,0);
  pdf.text(`AWB No: ${ref}`,         M,      y + 5);
  pdf.text(`Invoice Date: ${invDate}`, PW/2,  y + 5, { align: 'center' });
  pdf.text(`Invoice No: ${ref}`,      M + U,  y + 5, { align: 'right' });
  y += 7;
  hRule(y, 0.5); y += 3;

  // ══════════════════════════════════════════════════════════════════════════
  // 2 — SHIP FROM / SHIP TO
  // ══════════════════════════════════════════════════════════════════════════
  const colW = U / 2;   // 95mm per column
  const pad  = 2;
  const fw   = colW - pad * 2;  // inner text width = 91mm
  const lg   = 3.8;             // line gap mm

  // column headers — draw above the box, then leave 8 mm gap before names start
  setFont(7.5, 'bold'); setText(0,0,0);
  pdf.text('SHIP FROM:', M,              y + 4);
  pdf.text('SHIP TO:',   M + colW + pad, y + 4);
  y += 9;

  const boxTop = y;

  const drawAddrCol = (side: 'from'|'to', startX: number): number => {
    let cy = startX;   // actually used as Y; reuse variable name kept for clarity
    // resolve fields
    const name    = side === 'from' ? safeText(parcel.sender_name,   '') : safeText(parcel.receiver_name, '');
    const company = side === 'from' ? safeText(parcel.sender_company,'') : safeText(parcel.receiver_company,'');
    const addr1   = side === 'from' ? safeText(parcel.sender_address,'') : safeText(parcel.receiver_address,'');
    const addr2   = side === 'from' ? safeText(parcel.sender_address_2??'','') : safeText(parcel.receiver_address_2??'','');
    const addr3   = side === 'from' ? safeText(parcel.sender_address_3??'','') : safeText(parcel.receiver_address_3??'','');
    const city    = side === 'from' ? safeText(parcel.sender_city,   '') : safeText(parcel.receiver_city,'');
    const state   = side === 'from' ? '' : safeText(parcel.receiver_state,'');
    const postal  = side === 'from' ? '' : safeText(parcel.receiver_postal_code,'');
    const country = side === 'from' ? fromCountry : toCountry;
    const phone   = side === 'from' ? safeText(parcel.sender_phone,  '') : safeText(parcel.receiver_phone,'');
    const email   = side === 'from' ? safeText(parcel.sender_email??'','') : safeText(parcel.receiver_email??'','');
    const cnic    = side === 'from' ? safeText(parcel.sender_cnic??'','') : '';

    const colX = side === 'from' ? M : M + colW;
    let rowY   = boxTop + 3;  // top padding inside box so text clears the border

    const writeLine = (txt: string, bold = false) => {
      if (!txt) return;
      setFont(7, bold ? 'bold' : 'normal'); setText(0,0,0);
      const ls = pdf.splitTextToSize(txt, fw) as string[];
      ls.slice(0, 2).forEach((ln: string) => {
        pdf.text(ln, colX + pad, rowY);
        rowY += lg;
      });
    };

    writeLine(name.toUpperCase(), true);
    if (company) writeLine(company);
    [addr1, addr2, addr3].filter(Boolean).forEach(a => writeLine(a));
    writeLine([city, state, postal].filter(Boolean).join(', '));
    writeLine(country, true);
    if (phone) writeLine(phone);
    if (email) {
      setFont(7); setText(0,0,0);
      const el = pdf.splitTextToSize(email, fw) as string[];
      pdf.text(el[0] ?? '', colX + pad, rowY);
      rowY += lg;
    }
    rowY += 1;
    writeLine(`Trader Type: ${side === 'from' ? 'BUSINESS' : 'PRIVATE'}`);
    writeLine('VAT No:');
    writeLine('EORI:');
    if (side === 'from') writeLine('TAX ID:');
    if (cnic) writeLine(`CNIC: ${cnic}`);

    return rowY;
  };

  // draw both columns (text only), capture end Y for box sizing
  const fromEndY = drawAddrCol('from', 0);   // arg 2 unused, uses boxTop internally
  const toEndY   = drawAddrCol('to',   0);
  const boxBot   = Math.max(fromEndY, toEndY) + 2;

  // borders drawn AFTER text so they don't get clipped under fill
  setDraw(0,0,0,0.2);
  pdf.rect(M,         boxTop - 1, colW, boxBot - boxTop + 1);
  pdf.rect(M + colW,  boxTop - 1, colW, boxBot - boxTop + 1);

  y = boxBot + 3;

  // ══════════════════════════════════════════════════════════════════════════
  // 3 — REFERENCES & REMARKS (only if there's data)
  // ══════════════════════════════════════════════════════════════════════════
  hRule(y, 0.2); y += 4;

  const writeRef = (label: string, value: string) => {
    setFont(7, 'bold'); setText(0,0,0); pdf.text(label, M, y);
    setFont(7, 'normal');
    const vx = M + pdf.getTextWidth(label) + 3;
    const vw = U - (vx - M);
    if (value) {
      const ls = pdf.splitTextToSize(value, vw) as string[];
      pdf.text(ls[0] ?? '', vx, y);
    }
    y += 4.5;
  };

  writeRef('Shipper Reference:', ref);
  const remarks = safeText(parcel.remarks??'','');
  if (remarks) writeRef('Remarks:', remarks);

  hRule(y, 0.2); y += 3;

  // ══════════════════════════════════════════════════════════════════════════
  // 4 — ITEMS TABLE
  //
  // Columns and widths (total = 190mm = usable):
  //  #(8) | Description(55) | HS Code(18) | Item Wt(16) | Total Wt(16) |
  //  COO(12) | QTY(11) | Unit Value(27) | Sub Total(27)
  // ══════════════════════════════════════════════════════════════════════════
  interface TCol { label: string; w: number; x: number; }
  const tCols: TCol[] = (() => {
    const defs = [
      { label: '#',             w: 8  },
      { label: 'Description',   w: 55 },
      { label: 'HS Code',       w: 18 },
      { label: 'Item Wt\n(kg)', w: 16 },
      { label: 'Total Wt\n(kg)',w: 16 },
      { label: 'COO',           w: 12 },
      { label: 'QTY',           w: 11 },
      { label: 'Unit Value',    w: 27 },
      { label: 'Sub Total',     w: 27 },
    ];
    let acc = M;
    return defs.map(d => { const c = { ...d, x: acc }; acc += d.w; return c; });
  })();
  const tblW  = tCols.reduce((s, c) => s + c.w, 0); // must = 190
  const hdrH  = 9;
  const rowH  = 11;

  // header
  pdf.setFillColor(230, 230, 230);
  pdf.rect(M, y, tblW, hdrH, 'F');
  setDraw(0,0,0,0.25);
  pdf.rect(M, y, tblW, hdrH);
  tCols.forEach((c, i) => {
    if (i > 0) vLine(c.x, y, y + hdrH);
    setFont(6, 'bold'); setText(0,0,0);
    const lines = c.label.split('\n');
    const startY = lines.length === 1 ? y + hdrH/2 + 1.5 : y + 3;
    lines.forEach((ln, li) => {
      pdf.text(ln, c.x + c.w/2, startY + li * 3.2, { align: 'center' });
    });
  });
  y += hdrH;

  // rows
  let grandTotal = 0;
  let totalQty   = 0;

  items.forEach((item: any, idx: number) => {
    const qty      = Number(item.quantity)   || 1;
    const unitVal  = Number(item.unit_price) || 0;
    const subTotal = qty * unitVal;
    const hsCode   = safeText(item.hs_code ?? '', '');
    const coo      = safeText(item.country_of_origin ?? countryNameToCode(fromCountry), '');
    // per-item weight: spread total weight evenly across items
    const itemW    = items.length > 0 ? weight / items.length : 0;
    const itemWStr = itemW.toFixed(3);
    const totWStr  = (itemW * qty).toFixed(3);

    grandTotal += subTotal;
    totalQty   += qty;

    const rg = idx % 2 === 0 ? 255 : 246;
    pdf.setFillColor(rg, rg, rg);
    pdf.rect(M, y, tblW, rowH, 'F');
    setDraw(0,0,0,0.2);
    pdf.rect(M, y, tblW, rowH);

    tCols.forEach((c, ci) => {
      if (ci > 0) vLine(c.x, y, y + rowH);

      setFont(6.5, 'normal'); setText(0,0,0);

      if (ci === 1) {
        // Description — left-aligned, up to 2 wrap lines
        const ls = pdf.splitTextToSize(safeText(item.description, 'General Goods'), c.w - 2) as string[];
        ls.slice(0, 2).forEach((ln: string, li: number) => {
          pdf.text(ln, c.x + 1.5, y + 4 + li * 3.5);
        });
      } else {
        // All other cells — centered, single line, clipped to column
        const val = [
          String(idx + 1),
          '',                              // handled above
          hsCode,
          itemWStr,
          totWStr,
          coo,
          String(qty),
          `${unitVal.toFixed(2)} ${cur}`,
          `${subTotal.toFixed(2)} ${cur}`,
        ][ci];
        const trimmed = (pdf.splitTextToSize(val, c.w - 1) as string[])[0] ?? '';
        pdf.text(trimmed, c.x + c.w/2, y + rowH/2 + 1.5, { align: 'center' });
      }
    });
    y += rowH;
  });

  // totals footer row (two lines to avoid overlap)
  setDraw(0,0,0,0.3);
  pdf.rect(M, y, tblW, 10);
  setFont(7, 'bold'); setText(0,0,0);
  pdf.text('Total Goods Value:', M + 2, y + 4);
  setFont(7, 'normal');
  pdf.text(`${grandTotal.toFixed(2)} ${cur}`, M + 42, y + 4);
  setFont(7, 'bold');
  pdf.text('Total line items:', M + 2, y + 8.5);
  setFont(7, 'normal');
  pdf.text(String(items.length), M + 32, y + 8.5);
  setFont(7, 'bold');
  pdf.text('Total units:', M + U/2, y + 4);
  setFont(7, 'normal');
  pdf.text(String(totalQty), M + U/2 + 22, y + 4);
  y += 12;

  // ══════════════════════════════════════════════════════════════════════════
  // 5 — SUMMARY (only real parcel fields, two columns)
  // ══════════════════════════════════════════════════════════════════════════
  hRule(y, 0.2); y += 3;

  const sumLg    = 4.5;
  const labelW   = 48;   // width reserved for label text
  const valueW   = U/2 - labelW - 2;

  const sumRow = (label: string, value: string, x: number, yy: number): number => {
    if (!value || !value.trim()) return yy;
    setFont(7, 'bold'); setText(0,0,0);
    pdf.text(label, x + 1, yy);
    setFont(7, 'normal');
    const vx = x + 1 + labelW;
    const ls = pdf.splitTextToSize(value, valueW) as string[];
    pdf.text(ls[0] ?? '', vx, yy);
    return yy + sumLg;
  };

  let ly = y;
  let ry = y;
  const lx = M;
  const rx = M + U/2 + 2;

  // left column
  ly = sumRow('Total Goods Value:',   `${grandTotal.toFixed(2)} ${cur}`, lx, ly);
  ly = sumRow('Total Invoice Amount:',`${grandTotal.toFixed(2)} ${cur}`, lx, ly);
  ly = sumRow('Currency Code:',        cur,                              lx, ly);
  if (weight > 0) {
    ly = sumRow('Total Net Weight:',   `${weight.toFixed(3)} kg`,        lx, ly);
    ly = sumRow('Total Gross Weight:', `${weight.toFixed(3)} kg`,        lx, ly);
  }
  if (pieces > 1) ly = sumRow('Total Pieces:', String(pieces),           lx, ly);

  // right column
  const carrier = safeText(parcel.service_type, '');
  if (carrier) ry = sumRow('Carrier:',           carrier,                rx, ry);

  y = Math.max(ly, ry) + 3;
  hRule(y, 0.2); y += 4;

  // ══════════════════════════════════════════════════════════════════════════
  // 6 — CERTIFICATION
  // ══════════════════════════════════════════════════════════════════════════
  setFont(7, 'italic'); setText(50,50,50);
  const cert = pdf.splitTextToSize(
    'I/We hereby certify that the information contained in the invoice is true and correct and that the contents of this shipment are as stated above.',
    U
  ) as string[];
  pdf.text(cert, M, y);
  y += cert.length * 4 + 4;

  // ══════════════════════════════════════════════════════════════════════════
  // 7 — SIGNATURE BLOCK
  // ══════════════════════════════════════════════════════════════════════════
  hRule(y, 0.2); y += 3;
  const sigW = U / 3;
  setDraw(0,0,0,0.2);
  pdf.rect(M, y, U, 22);
  vLine(M + sigW,     y, y + 22);
  vLine(M + sigW * 2, y, y + 22);

  setFont(7, 'bold'); setText(0,0,0);
  pdf.text('Name:',              M + 2,            y + 5);
  pdf.text('Position:',          M + 2,            y + 11);
  pdf.text('Date of Signature:', M + 2,            y + 17);
  setFont(7, 'normal');
  pdf.text(invDate,              M + 34,           y + 17);
  setFont(7, 'bold');
  pdf.text('Signature:',         M + sigW + 2,     y + 5);
  pdf.text('Company Stamp',      M + sigW*2 + sigW/2, y + 12, { align: 'center' });

  y += 25;

  handlePDFOutput(pdf, `Performa-Invoice-${ref}.pdf`, mode);
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

  // Shipper & Receiver box sizing — computed once up front (same for both copies) so the
  // outer frame can be sized to fit it, instead of the frame being a fixed height that
  // content could later grow past.
  const boxWidth = (pageWidth - 20 - 2) / 2;
  const contactGap = 3.2; // safe row gap for postal/phone/email at small font size

  const senderAddrHeightBase = measureWrappedAddressHeight(
    pdf,
    [
      parcel.sender_address,
      parcel.sender_address_2,
      parcel.sender_address_3,
      `${safeText(parcel.sender_city, '')}, ${codeToCountryName(safeText(parcel.sender_country, 'Pakistan'))}`,
    ],
    boxWidth - 4,
    senderFontSize,
    senderLineGap - 1
  );
  const shipperContentHeightBase = senderLineGap * 2 + senderAddrHeightBase + senderLineGap * 2;

  const receiverAddrHeightBase = measureWrappedAddressHeight(
    pdf,
    [
      parcel.receiver_address,
      parcel.receiver_address_2,
      parcel.receiver_address_3,
      `${safeText(parcel.receiver_city, '')}, ${safeText(parcel.receiver_state, '')}`.replace(/^,\s*|,\s*$/g, ''),
      codeToCountryName(safeText(parcel.receiver_country, 'United Kingdom')),
    ],
    boxWidth - 4,
    receiverFontSize,
    receiverLineGap - 1
  );
  const postalExtraBase = measureExtraWrapLines(pdf, safeText(parcel.receiver_postal_code, 'N/A'), boxWidth - 22);
  const phoneExtraBase = measureExtraWrapLines(pdf, safeText(parcel.receiver_phone, 'N/A'), boxWidth - 14);
  const emailExtraBase = measureExtraWrapLines(pdf, safeText(parcel.receiver_email, 'N/A'), boxWidth - 14);
  const receiverContentHeightBase =
    receiverLineGap * 2 + receiverAddrHeightBase +
    contactGap + postalExtraBase * contactGap +
    contactGap + phoneExtraBase * contactGap +
    contactGap + emailExtraBase * contactGap;

  const boxHeight = Math.max(43, shipperContentHeightBase + 15, receiverContentHeightBase + 15);
  // Original design was tuned for a 43mm box inside a 140mm frame; grow the frame by
  // whatever the box grows by, so longer addresses can never push content past the border.
  const frameHeight = 140 + Math.max(0, boxHeight - 43);
  const copy1StartY = 6;
  const copy2StartY = copy1StartY + frameHeight + 4; // 8mm matches the original gap between copies

  // Function to generate one copy
  const generateCopy = async (startY: number, copyLabel: string) => {
    let yPos = startY;

    // Border for this copy
    pdf.setDrawColor(255, 140, 0);
    pdf.setLineWidth(0.5);
    pdf.rect(5, startY - 2, pageWidth - 10, frameHeight);

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

    // Shipper & Receiver box (size already computed once above, shared by both copies)
    pdf.setFillColor(255, 250, 245);
    pdf.setDrawColor(220, 220, 220);
    pdf.rect(10, yPos, boxWidth, boxHeight, 'FD');
    pdf.rect(pageWidth / 2 + 1, yPos, boxWidth, boxHeight, 'FD');

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
    receiverY += contactGap;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Postal Code:', receiverX, receiverY);
    pdf.setFont('helvetica', 'normal');
    {
      const lines = pdf.splitTextToSize(safeText(parcel.receiver_postal_code, 'N/A'), boxWidth - 22);
      lines.forEach((ln: string, i: number) => pdf.text(ln, receiverX + 20, receiverY + i * contactGap));
      receiverY += (lines.length - 1) * contactGap;
    }

    receiverY += contactGap;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Phone:', receiverX, receiverY);
    pdf.setFont('helvetica', 'normal');
    {
      const lines = pdf.splitTextToSize(safeText(parcel.receiver_phone, 'N/A'), boxWidth - 14);
      lines.forEach((ln: string, i: number) => pdf.text(ln, receiverX + 12, receiverY + i * contactGap));
      receiverY += (lines.length - 1) * contactGap;
    }

    receiverY += contactGap;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Email:', receiverX, receiverY);
    pdf.setFont('helvetica', 'normal');
    {
      const receiverEmail = safeText(parcel.receiver_email, 'N/A');
      const emailLines = pdf.splitTextToSize(receiverEmail, boxWidth - 14);
      emailLines.forEach((ln: string, i: number) => pdf.text(ln, receiverX + 12, receiverY + i * contactGap));
      receiverY += (emailLines.length - 1) * contactGap;
    }
    pdf.setFontSize(receiverFontSize);

    yPos += boxHeight + 2; // matches this copy's fixed 140mm outer frame — do not increase without also resizing the frame below

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
  await generateCopy(copy1StartY, 'Account Copy');

  // Generate Forward Copy
  await generateCopy(copy2StartY, 'FORWARD COPY');

  handlePDFOutput(pdf, `AWB-Verification-${refNumber}.pdf`, mode);
};

// ===== 3. AIRWAY BILL with Payment (Sender Copy) =====
// Compact, numbered-box AWB grid (1 Account/Shipper, 2 Consignee, 3 Sender Authorization,
// 4 POD, 5 Service Type/Contents, 6 Size & Weight) with a tracking-number strip and
// barcode in the centre column. Block heights are fixed mm values (rather than fractions
// of an arbitrary outer box height) so the design is compact with no leftover blank space,
// and the layout on page 2 leaves dedicated room for the vertical barcode strip so it can
// never be cropped off the page edge. All values are still driven purely by the existing
// ParcelData fields already used elsewhere in this file — no new/invented fields.
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
  const PW = pdf.internal.pageSize.getWidth();   // 210mm
  const PH = pdf.internal.pageSize.getHeight();  // 297mm
  const M  = 8;
  const FULL_UW = PW - M * 2;                    // full usable width when no side strip is needed

  // ── palette — deep navy + amber accent, modern/stylish but still print-friendly ──
  const INK    = [26, 28, 33]    as const; // near-black for text/borders
  const NAVY   = [17, 34, 68]    as const; // header bar
  const AMBER  = [214, 128, 20]  as const; // accent (badges, highlights)
  const PALE   = [246, 244, 239] as const; // soft section tint
  const LINE   = [205, 205, 205] as const; // hairline grey
  const WHITE  = [255, 255, 255] as const;
  const MID    = [110, 110, 110] as const;
  const LINK   = [30, 90, 200]   as const; // hyperlink blue for the website text

  const F  = (c: readonly number[])            => pdf.setFillColor(c[0], c[1], c[2]);
  const D  = (c: readonly number[], w = 0.25)  => { pdf.setDrawColor(c[0], c[1], c[2]); pdf.setLineWidth(w); };
  const TX = (c: readonly number[])             => pdf.setTextColor(c[0], c[1], c[2]);
  const TF = (size: number, style: 'normal'|'bold'|'italic' = 'normal') => {
    pdf.setFontSize(size); pdf.setFont('helvetica', style);
  };

  // ── shared parcel fields (all pulled from the existing ParcelData shape) ─
  const refNumber   = safeText(parcel.reference_id || parcel.tracking_id, '000000000');
  const bookingDate = parcel.created_at
    ? new Date(parcel.created_at).toLocaleDateString('en-GB')
    : new Date().toLocaleDateString('en-GB');
  const bookingTime = parcel.created_at
    ? new Date(parcel.created_at).toLocaleTimeString('en-GB')
    : new Date().toLocaleTimeString('en-GB');
  const service      = safeText(parcel.service_type, 'STANDARD').toUpperCase();
  const senderCurrency = parcel.currency || 'USD';

  const pL = parcel.length || 0;
  const pW = parcel.width  || 0;
  const pH = parcel.height || 0;
  const calcDW   = parseFloat((((pL || 12) * (pW || 12) * (pH || 16)) / 5000).toFixed(2));
  const dimWt    = parcel.dim_weight_override != null ? parcel.dim_weight_override : calcDW;
  const chargeWt = Math.max(dimWt, parcel.weight || 0);
  const pieces    = parcel.pieces || 1;

  const items = parcel.items?.length ? parcel.items : [{ description: 'General Goods', quantity: 1, unit_price: parcel.total_price || 0 }];
  const contentsDescription = items.map((it: any) => safeText(it.description, 'General Goods')).join(', ');

  const freightPkr   = parcel.amount_override != null ? parcel.amount_override : (parcel.freight_amount_pkr || 0);
  const freightLabel = `PKR ${Number(freightPkr).toLocaleString()}`;
  const declaredValueLabel = `${Number(parcel.total_price || 0).toFixed(2)} ${senderCurrency}`;

  // ══════════════════════════════════════════════════════════════════════
  // Draws one compact copy of the AWB grid. `scale` shrinks every fixed
  // block height uniformly (used for the two smaller label copies on
  // page 2). When opts.verticalStrip is true, the content width is
  // narrowed up front so the rotated barcode strip sits fully inside the
  // page — it never overhangs the right margin and can't be cropped.
  // Returns the Y position of the grid's bottom edge.
  // ══════════════════════════════════════════════════════════════════════
  const drawAwbGrid = async (
    startY: number,
    scale: number,
    opts: { topRightMode: 'warning' | 'piece' | 'none'; verticalStrip: boolean }
  ): Promise<number> => {
    const STRIP_W = 7, STRIP_GAP = 2;             // reserved on the right when verticalStrip is on
    const UW = opts.verticalStrip ? FULL_UW - (STRIP_W + STRIP_GAP) : FULL_UW;

    const s = (mm: number) => mm * scale;         // scale a fixed-mm block height
    const headerH = s(13);
    let y = startY;

    // ── header row: logo · service badge (full name) · centered notice ───
    await addLogo(pdf, M, y, s(40), s(13));

    const badgeH = s(13);
    const badgeMaxW = s(46);           // cap so a long service name can't crowd the header
    const badgeMinW = s(22);
    let badgeFontSize = Math.max(7, s(9.5));
    TF(badgeFontSize, 'bold');
    const badgeTextW = pdf.getTextWidth(service);
    let badgeW = Math.min(badgeMaxW, Math.max(badgeMinW, badgeTextW + s(6)));
    if (badgeTextW + s(6) > badgeMaxW) {
      badgeFontSize = Math.max(5, badgeFontSize * (badgeMaxW - s(6)) / badgeTextW);
      TF(badgeFontSize, 'bold');
    }
    const badgeX = M + UW - badgeW;
    F(NAVY);
    pdf.roundedRect(badgeX, y, badgeW, badgeH, 1.2, 1.2, 'F');
    TX(WHITE);
    pdf.text(service, badgeX + badgeW / 2, y + badgeH / 2 + s(2.2), { align: 'center' });

    if (opts.topRightMode === 'warning') {
      // Warning line — shifted up slightly to leave room for the website text below it.
      TF(Math.max(6, s(7.5)), 'bold'); TX(AMBER);
      pdf.text('SELF-COLLECTION NOT AVAILABLE FOR THIS SHIPMENT', M + UW / 2, y + headerH / 2 - 1, { align: 'center' });
      // Website — plain printed text, centered on its own line directly below the
      // warning text. Not a clickable link, just visible text on the printout.
      TF(Math.max(5, s(6)), 'bold'); TX(INK);
      pdf.text('www.skyxpress.site', M + UW / 2, y + headerH / 2 + 4, { align: 'center' });
    } else if (opts.topRightMode === 'piece') {
      TF(Math.max(8, s(11)), 'bold'); TX(INK);
      pdf.text(`PIECE ${1}/${pieces}`, M + UW / 2, y + headerH / 2 + 1.5, { align: 'center' });
    }

    y += headerH + s(1.5);
    const boxTop = y;

    // ── fixed-mm block heights (scaled) — chosen so each column sums to
    //    the same total gridH, leaving no leftover blank space ───────────
    const accountH = s(7);
    const shipperH = s(24);
    const authH    = s(17);
    const podH     = s(14);
    const gridH    = accountH + shipperH + authH + podH;   // column A drives the total height

    const trackH     = s(6.5);
    const consigneeH = s(22);
    const dapH       = s(9);
    const barcodeH   = gridH - trackH - consigneeH - dapH; // column B fills the rest

    const refH       = s(10);
    const freightH   = s(7);
    const svcH       = s(22);
    const swH        = gridH - refH - freightH - svcH;     // column C fills the rest

    // ── column widths ──────────────────────────────────────────────────
    const wA = UW * 0.395;
    const wB = UW * 0.275;
    const wC = UW - wA - wB;
    const xA = M, xB = M + wA, xC = M + wA + wB;

    // outer frame with soft rounded corners + column dividers
    D(INK, 0.5);
    pdf.roundedRect(xA, boxTop, UW, gridH, 1.5, 1.5);
    D(LINE, 0.3);
    pdf.line(xB, boxTop, xB, boxTop + gridH);
    pdf.line(xC, boxTop, xC, boxTop + gridH);

    const badge = (x: number, yy: number, n: string) => {
      F(AMBER);
      const bs = Math.max(3.2, s(4.2));
      pdf.roundedRect(x, yy, bs, bs, 0.6, 0.6, 'F');
      TF(Math.max(5, s(6)), 'bold'); TX(WHITE);
      pdf.text(n, x + bs / 2, yy + bs * 0.72, { align: 'center' });
      return bs;
    };
    const sectionLabel = (x: number, yy: number, w: number, text: string) => {
      TF(Math.max(4.6, s(5.4)), 'bold'); TX(NAVY);
      pdf.text(text, x, yy);
    };
    // Vertical (rotated 90°) side label, e.g. "SHIPPER" / "CONSIGNEE", drawn along the
    // left edge of its strip. Anchored WITHOUT jsPDF's built-in align:'center', because
    // align does not re-project onto the rotated axis reliably — using it here made the
    // label's effective horizontal anchor shift left by ~half the (unrotated) text width,
    // pushing it outside the box border. Instead we manually centre the text within
    // [topY, topY + height] along the vertical axis it will actually be drawn on.
    const vLabel = (x: number, topY: number, height: number, text: string, fontSize: number, color: readonly number[] = INK) => {
      TF(fontSize, 'bold'); TX(color);
      const textW = pdf.getTextWidth(text);
      const startY = topY + (height + textW) / 2;
      pdf.text(text, x, startY, { angle: 90 });
    };

    // ══════════════ COLUMN A — Account / Shipper / Sender Auth / POD ═════
    const aPad = s(2);
    let ay = boxTop + s(3.2);
    const b1 = badge(xA + aPad, ay - s(2.9), '1');
    const labelX1 = xA + aPad + b1 + s(1.4);
    sectionLabel(labelX1, ay, wA, 'ACCOUNT NAME');
    // Measure "ACCOUNT NAME" at the exact font sectionLabel used, so the value can be
    // placed right after it on the SAME line instead of dropping to a line below.
    TF(Math.max(4.6, s(5.4)), 'bold');
    const labelW1 = pdf.getTextWidth('ACCOUNT NAME');
    TF(Math.max(5.6, s(6.4)), 'bold'); TX(INK);
    pdf.text(
      safeText(parcel.created_by_name, 'www.skyxpress.site'),
      labelX1 + labelW1 + s(2.2),
      ay
    );
    const shipperTop = boxTop + accountH;
    D(LINE, 0.25); pdf.line(xA, shipperTop, xA + wA, shipperTop);
    // vertical "SHIPPER" label strip
    D(LINE, 0.2); pdf.line(xA + s(4.6), shipperTop, xA + s(4.6), shipperTop + shipperH);
    vLabel(xA + s(2.3), shipperTop, shipperH, 'SHIPPER', Math.max(4.6, s(5.2)));

    let sy = shipperTop + s(3.4);
    const sx = xA + s(6.6);
    const sw = wA - s(8.6);
    TF(Math.max(5.6, s(6.4)), 'bold'); TX(INK);
    pdf.text(safeText(parcel.sender_name, 'N/A').toUpperCase(), sx, sy, { maxWidth: sw });
    sy += s(3.4);
    TF(Math.max(5, s(5.6)), 'normal');
    const senderAddrLines = pdf.splitTextToSize(
      [parcel.sender_address, parcel.sender_address_2, parcel.sender_address_3].filter(Boolean).join(', '),
      sw
    ) as string[];
    senderAddrLines.slice(0, 2).forEach((ln) => { pdf.text(ln, sx, sy); sy += s(3); });
    pdf.text(safeText(parcel.sender_city, ''), sx, sy); sy += s(3);
    pdf.text(codeToCountryName(safeText(parcel.sender_country, 'Pakistan')).toUpperCase(), sx, sy); sy += s(3);
    if (safeText(parcel.sender_phone, '')) { pdf.text(safeText(parcel.sender_phone, ''), sx, sy); sy += s(3); }
    if (safeText(parcel.sender_cnic, '')) { TF(Math.max(4.4, s(5)), 'normal'); pdf.text(`CNIC/NTN: ${safeText(parcel.sender_cnic, '')}`, sx, sy); }

    // 3 — Sender's Authorization & Signature
    const authTop = shipperTop + shipperH;
    D(LINE, 0.25); pdf.line(xA, authTop, xA + wA, authTop);
    const authBadgeY = authTop + s(2.4);
    const b3 = badge(xA + aPad, authBadgeY, '3');
    sectionLabel(xA + aPad + b3 + s(1.4), authBadgeY + b3 * 0.72, wA - 12, "SENDER'S AUTHORIZATION");
    TF(Math.max(4.4, s(4.7)), 'normal'); TX(MID);
    const authText = pdf.splitTextToSize(
      'I/We agree that the carrier\u2019s standard terms and conditions apply and limit carrier liability.',
      wA - s(5)
    ) as string[];
    // Extra clearance below the label — the label baseline sits ~authTop+5.4, so the
    // paragraph now starts further down instead of ~2mm below it (which visually
    // overlapped the label text).
    let authY = authTop + s(9.2);
    authText.slice(0, 2).forEach((ln) => { pdf.text(ln, xA + aPad, authY); authY += s(2.6); });
    TF(Math.max(4.6, s(5)), 'bold'); TX(INK);
    pdf.text(`Date: ${bookingDate} ${bookingTime}`, xA + aPad, authY + s(1.6));

    // 4 — Proof of Delivery
    const podTop = authTop + authH;
    D(LINE, 0.25); pdf.line(xA, podTop, xA + wA, podTop);
    const b4 = badge(xA + aPad, podTop + s(2.4), '4');
    sectionLabel(xA + aPad + b4 + s(1.4), podTop + s(2.4) + b4 * 0.72, wA - 12, 'PROOF OF DELIVERY (POD)');
    TF(Math.max(4.6, s(5)), 'normal'); TX(INK);
    pdf.text('Signature: ________________  Date: __ /__ /__', xA + aPad, podTop + s(8));
    pdf.text('Print Name: ______________________________', xA + aPad, podTop + s(11.5));

    // ══════════════ COLUMN B — Tracking # / Consignee / DAP / Barcode ════
    const bPad = s(2);
    D(LINE, 0.3); pdf.rect(xB, boxTop, wB, trackH);
    F(PALE); pdf.rect(xB + 0.3, boxTop + 0.3, wB * 0.32 - 0.3, trackH - 0.6, 'F');
    D(LINE, 0.2); pdf.line(xB + wB * 0.32, boxTop, xB + wB * 0.32, boxTop + trackH);
    TF(Math.max(6, s(7.2)), 'bold'); TX(NAVY);
    pdf.text('AWB', xB + wB * 0.16, boxTop + trackH / 2 + 1.4, { align: 'center' });
    TF(Math.max(6, s(7.2)), 'bold'); TX(INK);
    pdf.text(refNumber, xB + wB * 0.66, boxTop + trackH / 2 + 1.4, { align: 'center' });

    let by = boxTop + trackH;
    const b2 = badge(xB + bPad, by + s(1.1), '2');
    TF(Math.max(5.6, s(6.2)), 'bold'); TX(INK);
    pdf.text(safeText(parcel.receiver_name, 'N/A').toUpperCase(), xB + bPad + b2 + s(1.4), by + s(1.1) + b2 * 0.72, { maxWidth: wB - 12 });

    const consigneeTop = by + s(5.6);
    D(LINE, 0.2); pdf.line(xB + s(4.6), consigneeTop, xB + s(4.6), consigneeTop + consigneeH);
    vLabel(xB + s(2.3), consigneeTop, consigneeH, 'CONSIGNEE', Math.max(4.6, s(5.2)), NAVY);

    let cy = consigneeTop + s(3.1);
    const cx = xB + s(6.6);
    const cw = wB - s(8.6);
    TF(Math.max(5, s(5.6)), 'normal'); TX(INK);
    const recvAddrLines = pdf.splitTextToSize(
      [parcel.receiver_address, parcel.receiver_address_2, parcel.receiver_address_3].filter(Boolean).join(', '),
      cw
    ) as string[];
    recvAddrLines.slice(0, 2).forEach((ln) => { pdf.text(ln, cx, cy); cy += s(2.9); });
    pdf.text(safeText(parcel.receiver_city, ''), cx, cy); cy += s(2.9);
    pdf.text(`${safeText(parcel.receiver_state, '')} ${safeText(parcel.receiver_postal_code, '')}`.trim(), cx, cy); cy += s(2.9);
    pdf.text(codeToCountryName(safeText(parcel.receiver_country, 'United Kingdom')).toUpperCase(), cx, cy); cy += s(2.9);
    TF(Math.max(4.4, s(4.8)), 'normal');
    if (safeText(parcel.receiver_phone, '')) pdf.text(safeText(parcel.receiver_phone, ''), cx, cy);

    // DAP / Declared value row
    const dapTop = consigneeTop + consigneeH;
    D(LINE, 0.3); pdf.rect(xB, dapTop, wB, dapH);
    D(LINE, 0.2); pdf.line(xB + wB * 0.34, dapTop, xB + wB * 0.34, dapTop + dapH);
    TF(Math.max(6, s(7)), 'bold'); TX(AMBER);
    pdf.text('DAP', xB + wB * 0.17, dapTop + dapH / 2 + 1.2, { align: 'center' });
    TF(Math.max(4, s(4.4)), 'bold'); TX(MID);
    pdf.text('DECLARED VALUE', xB + wB * 0.67, dapTop + dapH * 0.4, { align: 'center' });
    TF(Math.max(5.6, s(6.2)), 'bold'); TX(INK);
    pdf.text(declaredValueLabel, xB + wB * 0.67, dapTop + dapH * 0.78, { align: 'center' });

    // Barcode block — height derives from remaining space, so it always has room
    const bcTop = dapTop + dapH;
    D(LINE, 0.3); pdf.rect(xB, bcTop, wB, barcodeH);
    const bcPad = s(1.6);
    await addBarcode(pdf, refNumber, xB + bcPad, bcTop + bcPad * 0.6, wB - bcPad * 2, Math.max(6, barcodeH - s(5.6)));
    TF(Math.max(4.6, s(5.2)), 'bold'); TX(INK);
    pdf.text(`*${refNumber}*`, xB + wB / 2, bcTop + barcodeH - s(2.1), { align: 'center' });

    // ══════════════ COLUMN C — References / Freight / Service / Size ═══
    const cPad = s(2);
    let dy = boxTop + s(3.4);
    TF(Math.max(4.6, s(5)), 'bold'); TX(NAVY);
    pdf.text('CUSTOMER REFERENCE', xC + cPad, dy);
    dy += s(3);
    TF(Math.max(5.4, s(6)), 'normal'); TX(INK);
    pdf.text(safeText(parcel.reference_id, refNumber), xC + cPad, dy);
    dy = boxTop + refH - s(1.2);
    TF(Math.max(4.6, s(5)), 'bold'); TX(NAVY);
    pdf.text('ALT. REF', xC + cPad, dy);
    TF(Math.max(5.4, s(6)), 'normal'); TX(INK);
    pdf.text(safeText(parcel.tracking_id, 'N/A'), xC + cPad + s(15), dy);

    // Freight amount
    const freightTop = boxTop + refH;
    F(NAVY); pdf.rect(xC, freightTop, wC, freightH, 'F');
    TF(Math.max(4.6, s(5)), 'bold'); TX(AMBER);
    pdf.text('FREIGHT (PAID BY SENDER)', xC + cPad, freightTop + freightH * 0.4);
    TF(Math.max(6.4, s(7.2)), 'bold'); TX(WHITE);
    pdf.text(freightLabel, xC + cPad, freightTop + freightH * 0.82);

    // 5 — Service Type / Contents / Instructions
    const svcTop = freightTop + freightH;
    D(LINE, 0.25); pdf.line(xC, svcTop, xC + wC, svcTop);
    let ey = svcTop + s(3);
    const b5 = badge(xC + cPad, ey - s(2.6), '5');
    sectionLabel(xC + cPad + b5 + s(1.4), ey, wC - 12, 'SERVICE TYPE');
    // Extra clearance below the label so the (larger, bold) service value below it
    // doesn't visually touch/overlap the "SERVICE TYPE" label above it.
    ey += s(4.4);
    TF(Math.max(5.6, s(6.2)), 'bold'); TX(INK);
    const serviceLines = pdf.splitTextToSize(service, wC - s(4)) as string[];
    pdf.text(serviceLines[0] ?? '', xC + cPad, ey);
    ey += s(3.4);
    TF(Math.max(4.2, s(4.5)), 'bold'); TX(NAVY);
    pdf.text('CONTENTS:', xC + cPad, ey);
    ey += s(2.8);
    TF(Math.max(4.6, s(5)), 'normal'); TX(INK);
    const contentsLines = pdf.splitTextToSize(contentsDescription, wC - s(4)) as string[];
    contentsLines.slice(0, 2).forEach((ln) => { pdf.text(ln, xC + cPad, ey); ey += s(2.7); });
    ey += s(0.6);
    TF(Math.max(4.2, s(4.5)), 'bold'); TX(NAVY);
    pdf.text('SPECIAL INSTRUCTIONS:', xC + cPad, ey);
    ey += s(2.7);
    TF(Math.max(4.6, s(5)), 'normal'); TX(INK);
    pdf.text(safeText(parcel.document_type, 'N/A'), xC + cPad, ey);

    // 6 — Size & Weight
    const swTop = svcTop + svcH;
    D(LINE, 0.25); pdf.line(xC, swTop, xC + wC, swTop);
    const b6 = badge(xC + cPad, swTop + s(2.6), '6');
    sectionLabel(xC + cPad + b6 + s(1.4), swTop + s(2.6) + b6 * 0.72, wC - 12, 'SIZE & WEIGHT');

    let swy = swTop + s(8.4);
    const swRow = (label: string, value: string, highlight = false) => {
      const rowH = s(4);
      if (highlight) { F(PALE); pdf.rect(xC, swy - rowH * 0.72, wC, rowH, 'F'); }
      TF(Math.max(4.4, s(4.8)), 'bold'); TX(INK);
      pdf.text(label, xC + cPad, swy);
      TF(Math.max(5, s(5.4)), 'bold'); TX(NAVY);
      pdf.text(value, xC + wC - cPad, swy, { align: 'right' });
      swy += rowH;
    };
    swRow('PIECES', String(pieces));
    swRow('WEIGHT', `${(parcel.weight || 0).toFixed(3)} KGS`, true);
    swRow('DIMENSIONS', `${pL}x${pW}x${pH} cm`);
    swRow('CHARGEABLE WT', `${chargeWt.toFixed(2)} KGS`);

    // Vertical barcode strip — fully reserved inside the page, never overhangs
    if (opts.verticalStrip) {
      const stripX = xA + UW + STRIP_GAP;
      D(LINE, 0.25); pdf.roundedRect(stripX, boxTop, STRIP_W, gridH, 1, 1);
      await addBarcodeVertical(pdf, refNumber, stripX + 0.8, boxTop + s(2), STRIP_W - 1.6, gridH - s(4));
    }

    return boxTop + gridH;
  };

  // ══════════════════════════════════════════════════════════════════════
  // PAGE 1 — full detail sheet (SENDER COPY) + standard trading conditions
  // ══════════════════════════════════════════════════════════════════════
  let bottom1 = await drawAwbGrid(6, 1, { topRightMode: 'warning', verticalStrip: false });

  // "SENDER COPY" dashed caption bar
  bottom1 += 2.5;
  pdf.setLineDashPattern([1.2, 1], 0);
  D(LINE, 0.3); pdf.line(M, bottom1, M + FULL_UW, bottom1);
  pdf.setLineDashPattern([], 0);
  TF(7.5, 'bold'); TX(NAVY);
  pdf.text('SENDER COPY', PW / 2, bottom1 + 4.6, { align: 'center' });
  bottom1 += 7.5;
  D(LINE, 0.3); pdf.line(M, bottom1, M + FULL_UW, bottom1);
  bottom1 += 3;

  // ── STANDARD TRADING CONDITION ───────────────────────────────────────
  TF(7.5, 'bold'); TX(NAVY);
  pdf.text('STANDARD TRADING CONDITION', PW / 2, bottom1 + 3.6, { align: 'center' });
  bottom1 += 7.5;
  TF(5.6, 'normal'); TX(INK);
  const intro = pdf.splitTextToSize(
    'By tendering goods for transport by SKY XPRESS WORLDWIDE EXPRESS the Consignor agrees to the following conditions:',
    FULL_UW
  ) as string[];
  intro.forEach((ln) => { pdf.text(ln, M, bottom1); bottom1 += 3; });
  bottom1 += 1;

  const termsLines = [
    '1. DEFINITIONS: "Sky Xpress" means Sky Xpress Worldwide Express. "Consignor" or "Shipper" means the sender. "Consignee" means the person to whom the goods are consigned.',
    '2. CONSIGNMENT NOTE: Each consignment shall be correctly addressed and accompanied by the Sky Xpress form of Consignment Note which the Consignor shall properly complete. The Consignor is responsible for the correctness of information provided.',
    '3. SUB-CONTRACTING: Sky Xpress may sub-contract all or any part of the carriage and may engage agents or sub-contractors on any terms.',
    '4. COMMON CARRIER: The company is not a common carrier and will only carry goods on these conditions.',
    '5. LIABILITY: Sky Xpress shall not be liable for any loss, damage, or delays except where directly caused by proven negligence. Maximum liability is limited to USD 100 per shipment unless additional insurance is purchased in advance.',
    '6. PROHIBITED ITEMS: Consignor warrants goods do not contain dangerous, hazardous, or prohibited items including narcotics, weapons, explosives, antiques, liquids, or items prohibited by IATA or local laws. Consignor is fully responsible.',
    '7. CUSTOMS & DUTIES: Any customs duties, taxes, or charges levied at destination shall be paid by the Consignee. If Consignee refuses payment, Consignor shall be liable for all costs.',
    '8. GOVERNING LAW: These conditions are governed by the laws of Pakistan. Any disputes shall be subject to the exclusive jurisdiction of Pakistani courts.',
  ];
  TF(5.4, 'normal');
  termsLines.forEach((line) => {
    const ls = pdf.splitTextToSize(line, FULL_UW) as string[];
    ls.forEach((l) => { pdf.text(l, M, bottom1); bottom1 += 2.8; });
    bottom1 += 0.5;
  });

  // ══════════════════════════════════════════════════════════════════════
  // PAGE 2 — two smaller label copies: "PIECE x OF y" copy + "ACCOUNTS COPY"
  // Drawn at a reduced scale so both fit comfortably on one page with a
  // clear cut line, and the vertical barcode strip has dedicated, always-
  // visible space instead of overflowing the page margin.
  // ══════════════════════════════════════════════════════════════════════
  pdf.addPage();

  const LABEL_SCALE = 0.82;
  const copy1Y = 6;
  const bottomA = await drawAwbGrid(copy1Y, LABEL_SCALE, { topRightMode: 'piece', verticalStrip: true });
  TF(6.5, 'bold'); TX(NAVY);
  pdf.text(`PIECE 1 OF ${pieces}`, M, bottomA + 4.4);

  // dashed cut line
  const cutY = bottomA + 8;
  pdf.setLineDashPattern([1.5, 1.5], 0);
  D(MID, 0.3); pdf.line(M, cutY, M + FULL_UW, cutY);
  pdf.setLineDashPattern([], 0);
  TF(5.4, 'normal'); TX(MID);
  pdf.text('✂  CUT HERE', PW / 2, cutY - 1.3, { align: 'center' });

  const copy2Y = cutY + 4;
  const bottomB = await drawAwbGrid(copy2Y, LABEL_SCALE, { topRightMode: 'none', verticalStrip: false });
  TF(6.5, 'bold'); TX(NAVY);
  pdf.text('ACCOUNTS COPY', M, bottomB + 4.4);

  handlePDFOutput(pdf, `AWB-Sender-Copy-${refNumber}.pdf`, mode);
};

// Generate all 3 bills at once
export const generateAllBills = async (parcel: ParcelData): Promise<void> => {
  await generatePaymentInvoice(parcel);
  setTimeout(async () => await generateAirwayBillVerification(parcel), 500);
  setTimeout(async () => await generateAirwayBillWithPayment(parcel), 1000);
};
