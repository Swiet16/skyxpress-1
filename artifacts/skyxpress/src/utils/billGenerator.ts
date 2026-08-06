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
// Redesigned to mirror the layout/grid of the reference SkyNet-style AWB document:
// a numbered-box grid (1 Account/Shipper, 2 Consignee, 3 Sender Authorization, 4 POD,
// 5 Service Type/Contents, 6 Size & Weight) with a tracking-number strip and barcode
// in the centre column. All values are still driven purely by the existing ParcelData
// fields already used elsewhere in this file — no new/invented fields are introduced.
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
  const UW = PW - M * 2;                         // usable width

  // ── palette (black/red, matching the reference AWB) ─────────────────────
  const RED   = [200, 22, 30]  as const;
  const BLACK = [0, 0, 0]      as const;
  const GREY  = [235, 235, 235] as const;
  const WHITE = [255, 255, 255] as const;
  const MID   = [90, 90, 90]    as const;

  const F  = (r: number, g: number, b: number)           => pdf.setFillColor(r, g, b);
  const D  = (r: number, g: number, b: number, w = 0.25) => { pdf.setDrawColor(r, g, b); pdf.setLineWidth(w); };
  const TX = (r: number, g: number, b: number)           => pdf.setTextColor(r, g, b);
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
  const destination = codeToCountryName(safeText(parcel.receiver_country, 'United Kingdom'));
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
  // Draws one full copy of the AWB grid (used for the page-1 detail sheet
  // and both label copies on page 2). Returns the Y position of the box's
  // bottom edge.
  // ══════════════════════════════════════════════════════════════════════
  const drawAwbGrid = async (
    startY: number,
    boxH: number,
    opts: { topRightMode: 'warning' | 'piece' | 'none'; verticalStrip: boolean }
  ): Promise<number> => {
    const headerH = 20;
    let y = startY;

    // Logo (top-left)
    await addLogo(pdf, M, y, 46, 16);

    // Top-right EXP badge
    const badgeW = 26, badgeH = 16;
    const badgeX = M + UW - badgeW;
    F(...BLACK);
    pdf.rect(badgeX, y, badgeW, badgeH, 'F');
    TF(13, 'bold'); TX(...WHITE);
    pdf.text('EXP', badgeX + badgeW / 2, y + badgeH / 2 + 3, { align: 'center' });

    // Top-center notice (warning text on the detail sheet, piece counter on labels)
    if (opts.topRightMode === 'warning') {
      TF(9, 'bold'); TX(...RED);
      pdf.text('SELF-COLLECTION IS NOT', PW / 2, y + 6, { align: 'center' });
      pdf.text('AVAILABLE FOR THIS SHIPMENT', PW / 2, y + 11, { align: 'center' });
    } else if (opts.topRightMode === 'piece') {
      TF(13, 'bold'); TX(...BLACK);
      pdf.text(`${pieces}/${pieces}`, PW / 2, y + 10, { align: 'center' });
    }

    y += headerH;
    const boxTop = y;
    const gridH  = boxH - headerH;

    // ── column widths ──────────────────────────────────────────────────
    const wA = UW * 0.40; // account/shipper · sender auth · POD
    const wB = UW * 0.27; // tracking no · consignee · DAP/value · barcode
    const wC = UW - wA - wB; // customer ref · service/contents · size & weight
    const xA = M, xB = M + wA, xC = M + wA + wB;

    // outer + column border lines
    D(...BLACK, 0.5);
    pdf.rect(xA, boxTop, UW, gridH);
    pdf.line(xB, boxTop, xB, boxTop + gridH);
    pdf.line(xC, boxTop, xC, boxTop + gridH);

    const badge = (x: number, yy: number, n: string) => {
      F(...RED);
      pdf.rect(x, yy, 4.5, 4.5, 'F');
      TF(6.5, 'bold'); TX(...WHITE);
      pdf.text(n, x + 2.25, yy + 3.4, { align: 'center' });
    };

    // ══════════════ COLUMN A — Account / Shipper / Sender Auth / POD ═════
    const aPad = 2;
    let ay = boxTop + 4;
    badge(xA + aPad, ay - 3.2, '1');
    TF(6, 'bold'); TX(...BLACK);
    pdf.text('ACCOUNT NAME', xA + aPad + 6, ay);
    ay += 3.8;
    TF(7, 'bold');
    pdf.text('Sky Xpress Worldwide Express', xA + aPad, ay);
    ay += 4.5;
    D(...BLACK, 0.2); pdf.line(xA, ay, xA + wA, ay);

    // vertical "SHIPPER" label strip
    const shipperBlockTop = ay;
    const shipperBlockH = gridH * 0.33;
    TF(6, 'bold'); TX(...BLACK);
    pdf.text('SHIPPER', xA + 2.5, shipperBlockTop + shipperBlockH / 2, { align: 'center', angle: 90 });
    D(...BLACK, 0.2); pdf.line(xA + 5, shipperBlockTop, xA + 5, shipperBlockTop + shipperBlockH);

    let sy = shipperBlockTop + 3.5;
    const sx = xA + 7;
    const sw = wA - 9;
    TF(6.5, 'bold'); TX(...BLACK);
    pdf.text(safeText(parcel.sender_name, 'N/A').toUpperCase(), sx, sy, { maxWidth: sw });
    sy += 3.6;
    TF(6, 'normal');
    const senderAddrLines = pdf.splitTextToSize(
      [parcel.sender_address, parcel.sender_address_2, parcel.sender_address_3].filter(Boolean).join(', '),
      sw
    ) as string[];
    senderAddrLines.slice(0, 2).forEach((ln) => { pdf.text(ln, sx, sy); sy += 3.2; });
    pdf.text(safeText(parcel.sender_city, ''), sx, sy); sy += 3.2;
    pdf.text(codeToCountryName(safeText(parcel.sender_country, 'Pakistan')).toUpperCase(), sx, sy); sy += 3.2;
    if (safeText(parcel.sender_phone, '')) { pdf.text(safeText(parcel.sender_phone, ''), sx, sy); sy += 3.2; }
    if (safeText(parcel.sender_cnic, '')) { TF(5.8, 'normal'); pdf.text(`CNIC/NTN: ${safeText(parcel.sender_cnic, '')}`, sx, sy); }

    // 3 — Sender's Authorization & Signature
    const authTop = shipperBlockTop + shipperBlockH;
    D(...BLACK, 0.2); pdf.line(xA, authTop, xA + wA, authTop);
    badge(xA + aPad, authTop + 3, '3');
    TF(6, 'bold'); TX(...BLACK);
    pdf.text("SENDER'S AUTHORIZATION & SIGNATURE", xA + aPad + 6, authTop + 6.2, { maxWidth: wA - 12 });
    TF(5.2, 'normal');
    const authText = pdf.splitTextToSize(
      'I/We agree that the carrier\u2019s standard terms and conditions apply to this shipment and limit carrier\u2019s liability.',
      wA - 6
    ) as string[];
    let authY = authTop + 10.5;
    authText.slice(0, 3).forEach((ln) => { pdf.text(ln, xA + aPad, authY); authY += 2.9; });
    TF(5.5, 'bold');
    pdf.text(`Date: ${bookingDate} ${bookingTime}`, xA + aPad, authY + 2);

    // 4 — Proof of Delivery
    const podTop = authTop + shipperBlockH * 0.72;
    D(...BLACK, 0.2); pdf.line(xA, podTop, xA + wA, podTop);
    badge(xA + aPad, podTop + 3, '4');
    TF(6, 'bold'); TX(...BLACK);
    pdf.text('PROOF OF DELIVERY (POD)', xA + aPad + 6, podTop + 6.2);
    TF(5.5, 'normal');
    pdf.text('Receiver Signature: __________________  Date: __ /__ /__', xA + aPad, podTop + 10.5);
    pdf.text('Print Name: ______________________________', xA + aPad, podTop + 14.5);

    // ══════════════ COLUMN B — Tracking # / Consignee / DAP / Barcode ════
    const bPad = 2;
    // tracking number strip
    const trackH = 8;
    D(...BLACK, 0.2); pdf.rect(xB, boxTop, wB, trackH);
    pdf.line(xB + wB * 0.28, boxTop, xB + wB * 0.28, boxTop + trackH);
    TF(9, 'bold'); TX(...BLACK);
    pdf.text('AWB', xB + wB * 0.14, boxTop + trackH / 2 + 1.5, { align: 'center' });
    TF(9, 'bold');
    pdf.text(refNumber, xB + wB * 0.64, boxTop + trackH / 2 + 1.5, { align: 'center' });

    let by = boxTop + trackH;
    badge(xB + bPad, by + 3, '2');
    TF(6.5, 'bold'); TX(...BLACK);
    pdf.text(safeText(parcel.receiver_name, 'N/A').toUpperCase(), xB + bPad + 6, by + 4.2, { maxWidth: wB - 10 });

    // vertical "CONSIGNEE" strip
    const consigneeTop = by + 6;
    const consigneeH = gridH * 0.30;
    TF(5.8, 'bold'); TX(...BLACK);
    pdf.text('CONSIGNEE', xB + 2.5, consigneeTop + consigneeH / 2, { align: 'center', angle: 90 });
    D(...BLACK, 0.2); pdf.line(xB + 5, consigneeTop, xB + 5, consigneeTop + consigneeH);

    let cy = consigneeTop + 3.2;
    const cx = xB + 7;
    const cw = wB - 9;
    TF(6, 'normal'); TX(...BLACK);
    const recvAddrLines = pdf.splitTextToSize(
      [parcel.receiver_address, parcel.receiver_address_2, parcel.receiver_address_3].filter(Boolean).join(', '),
      cw
    ) as string[];
    recvAddrLines.slice(0, 2).forEach((ln) => { pdf.text(ln, cx, cy); cy += 3.2; });
    pdf.text(safeText(parcel.receiver_city, ''), cx, cy); cy += 3.2;
    pdf.text(`${safeText(parcel.receiver_state, '')} ${safeText(parcel.receiver_postal_code, '')}`.trim(), cx, cy); cy += 3.2;
    pdf.text(codeToCountryName(safeText(parcel.receiver_country, 'United Kingdom')).toUpperCase(), cx, cy); cy += 3.2;
    TF(5.5, 'normal');
    pdf.text(`Attn.: ${safeText(parcel.receiver_name, 'N/A')}`, cx, cy); cy += 3;
    if (safeText(parcel.receiver_phone, '')) pdf.text(safeText(parcel.receiver_phone, ''), cx, cy);

    // DAP / Declared value row
    const dapTop = consigneeTop + consigneeH;
    D(...BLACK, 0.2); pdf.rect(xB, dapTop, wB, 12);
    pdf.line(xB + wB * 0.32, dapTop, xB + wB * 0.32, dapTop + 12);
    TF(8, 'bold'); TX(...RED);
    pdf.text('** DAP **', xB + wB * 0.16, dapTop + 6.5, { align: 'center' });
    TF(5, 'bold'); TX(...BLACK);
    pdf.text('DECLARED VALUE FOR CUSTOMS', xB + wB * 0.66, dapTop + 4, { align: 'center' });
    TF(7, 'bold');
    pdf.text(declaredValueLabel, xB + wB * 0.66, dapTop + 9.5, { align: 'center' });

    // Barcode block
    const bcTop = dapTop + 12;
    const bcH = boxTop + gridH - bcTop;
    D(...BLACK, 0.2); pdf.rect(xB, bcTop, wB, bcH);
    await addBarcode(pdf, refNumber, xB + 4, bcTop + 3, wB - 8, Math.max(10, bcH - 12));
    TF(6.5, 'bold'); TX(...BLACK);
    pdf.text(`*${refNumber}*`, xB + wB / 2, bcTop + bcH - 3, { align: 'center' });

    // ══════════════ COLUMN C — References / Service / Contents / Size ═══
    const cPad = 2;
    let dy = boxTop + 4;
    TF(6, 'bold'); TX(...BLACK);
    pdf.text('CUSTOMER REFERENCE', xC + cPad, dy);
    dy += 3.6;
    TF(6.5, 'normal');
    pdf.text(safeText(parcel.reference_id, refNumber), xC + cPad, dy);
    dy += 5;
    TF(6, 'bold');
    pdf.text('ALTERNATE REFERENCE', xC + cPad, dy);
    dy += 3.6;
    TF(6.5, 'normal');
    pdf.text(safeText(parcel.tracking_id, 'N/A'), xC + cPad, dy);
    dy += 4;
    D(...BLACK, 0.2); pdf.line(xC, dy, xC + wC, dy);

    // Freight amount (this bill is specifically the "with payment" copy)
    dy += 1;
    F(...GREY); pdf.rect(xC, dy, wC, 8, 'F');
    D(...BLACK, 0.2); pdf.rect(xC, dy, wC, 8);
    TF(5.8, 'bold'); TX(...RED);
    pdf.text('FREIGHT AMOUNT (PAID BY SENDER)', xC + cPad, dy + 3.4);
    TF(8, 'bold'); TX(...BLACK);
    pdf.text(freightLabel, xC + cPad, dy + 7);
    dy += 8;
    D(...BLACK, 0.2); pdf.line(xC, dy, xC + wC, dy);

    // 5 — Service Type / Contents / Special Instructions
    dy += 2.5;
    badge(xC + cPad, dy - 3.2, '5');
    TF(6, 'bold'); TX(...BLACK);
    pdf.text('SERVICE TYPE', xC + cPad + 6, dy);
    dy += 3.6;
    TF(7, 'bold');
    const serviceLines = pdf.splitTextToSize(service, wC - 4) as string[];
    serviceLines.slice(0, 1).forEach((ln) => { pdf.text(ln, xC + cPad, dy); dy += 3.4; });
    dy += 1;
    TF(5, 'italic'); TX(...MID);
    const importantLines = pdf.splitTextToSize(
      'IMPORTANT: Attach original commercial invoices with package for customs purposes.',
      wC - 4
    ) as string[];
    importantLines.forEach((ln) => { pdf.text(ln, xC + cPad, dy); dy += 2.6; });
    dy += 1.5;
    TF(5.8, 'bold'); TX(...BLACK);
    pdf.text('FULL DESCRIPTION OF CONTENTS:-', xC + cPad, dy);
    dy += 3;
    TF(6, 'normal');
    const contentsLines = pdf.splitTextToSize(contentsDescription, wC - 4) as string[];
    contentsLines.slice(0, 2).forEach((ln) => { pdf.text(ln, xC + cPad, dy); dy += 3; });
    dy += 1;
    TF(5.8, 'bold');
    pdf.text('SPECIAL INSTRUCTIONS:-', xC + cPad, dy);
    dy += 3;
    TF(6, 'normal');
    pdf.text(safeText(parcel.document_type, 'N/A'), xC + cPad, dy);

    // 6 — Size & Weight
    const swTop = boxTop + gridH - gridH * 0.30;
    D(...BLACK, 0.2); pdf.line(xC, swTop, xC + wC, swTop);
    badge(xC + cPad, swTop + 3, '6');
    TF(6, 'bold'); TX(...BLACK);
    pdf.text('SIZE & WEIGHT', xC + cPad + 6, swTop + 4.2);

    let swy = swTop + 8;
    const swRow = (label: string, value: string, highlight = false) => {
      if (highlight) { F(...GREY); pdf.rect(xC, swy - 3, wC, 4.6, 'F'); }
      TF(5.8, 'bold'); TX(...BLACK);
      pdf.text(label, xC + cPad, swy);
      TF(6.2, 'bold');
      pdf.text(value, xC + wC - cPad, swy, { align: 'right' });
      swy += 4.6;
    };
    swRow('NO. OF PIECES', String(pieces));
    swRow('WEIGHT', `${(parcel.weight || 0).toFixed(3)} KGS`, true);
    swRow('DIMENSIONS (L×W×H)', `${pL} x ${pW} x ${pH} cm`);
    swRow('VOLUMETRIC / CHARGED WT', `${chargeWt.toFixed(2)} KGS`);

    // Vertical barcode strip on the outer right edge (piece-label copies only)
    if (opts.verticalStrip) {
      const stripW = 8;
      const stripX = M + UW + 2;
      D(...BLACK, 0.2); pdf.rect(stripX, boxTop, stripW, gridH);
      await addBarcodeVertical(pdf, refNumber, stripX + 1, boxTop + 2, stripW - 2, gridH - 4);
    }

    return boxTop + gridH;
  };

  // ══════════════════════════════════════════════════════════════════════
  // PAGE 1 — full detail sheet (SENDER COPY) + standard trading conditions
  // ══════════════════════════════════════════════════════════════════════
  let bottom1 = await drawAwbGrid(6, 158, { topRightMode: 'warning', verticalStrip: false });

  // "SENDER COPY" dashed caption bar
  bottom1 += 2;
  pdf.setLineDashPattern([1.2, 1], 0);
  D(0, 0, 0, 0.3); pdf.line(M, bottom1, M + UW, bottom1);
  pdf.setLineDashPattern([], 0);
  TF(8, 'bold'); TX(...BLACK);
  pdf.text('SENDER COPY', PW / 2, bottom1 + 5, { align: 'center' });
  bottom1 += 8;
  D(0, 0, 0, 0.3); pdf.line(M, bottom1, M + UW, bottom1);
  bottom1 += 2;

  // ── STANDARD TRADING CONDITION ───────────────────────────────────────
  TF(8, 'bold'); TX(...BLACK);
  pdf.text('STANDARD TRADING CONDITION', PW / 2, bottom1 + 4, { align: 'center' });
  bottom1 += 8;
  TF(6, 'normal'); TX(...BLACK);
  const intro = pdf.splitTextToSize(
    'By tendering goods for transport by SKY XPRESS WORLDWIDE EXPRESS the Consignor agrees to the following conditions:',
    UW
  ) as string[];
  intro.forEach((ln) => { pdf.text(ln, M, bottom1); bottom1 += 3.2; });
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
  TF(5.6, 'normal');
  termsLines.forEach((line) => {
    const ls = pdf.splitTextToSize(line, UW) as string[];
    ls.forEach((l) => { pdf.text(l, M, bottom1); bottom1 += 2.9; });
    bottom1 += 0.6;
  });

  // ══════════════════════════════════════════════════════════════════════
  // PAGE 2 — two label copies: "PIECE x OF y" copy + "ACCOUNTS COPY"
  // ══════════════════════════════════════════════════════════════════════
  pdf.addPage();

  const LABEL_H = 118;
  const copy1Y = 6;
  const bottomA = await drawAwbGrid(copy1Y, LABEL_H, { topRightMode: 'piece', verticalStrip: true });
  TF(7, 'bold'); TX(...BLACK);
  pdf.text(`PIECE 1 OF ${pieces}`, M, bottomA + 5);

  // dashed cut line
  const cutY = bottomA + 9;
  pdf.setLineDashPattern([1.5, 1.5], 0);
  D(120, 120, 120, 0.3); pdf.line(M, cutY, M + UW, cutY);
  pdf.setLineDashPattern([], 0);
  TF(6, 'normal'); TX(120, 120, 120);
  pdf.text('✂  CUT HERE', PW / 2, cutY - 1.5, { align: 'center' });

  const copy2Y = cutY + 4;
  const bottomB = await drawAwbGrid(copy2Y, LABEL_H, { topRightMode: 'none', verticalStrip: false });
  TF(7, 'bold'); TX(...BLACK);
  pdf.text('ACCOUNTS COPY', M, bottomB + 5);

  handlePDFOutput(pdf, `AWB-Sender-Copy-${refNumber}.pdf`, mode);
};

// Generate all 3 bills at once
export const generateAllBills = async (parcel: ParcelData): Promise<void> => {
  await generatePaymentInvoice(parcel);
  setTimeout(async () => await generateAirwayBillVerification(parcel), 500);
  setTimeout(async () => await generateAirwayBillWithPayment(parcel), 1000);
};
