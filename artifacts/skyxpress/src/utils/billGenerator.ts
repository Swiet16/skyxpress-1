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

// ===== 3. AIRWAY BILL with Payment (Sender Copy) — 2-page premium design =====
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

  // ─────────────────────────────────────────────────────────────────────────
  // PREMIUM 2-PAGE REDESIGN
  //   Page 1 – Full AWB details + terms (navy / crimson / gold palette)
  //   Page 2 – Two physical label copies (Copy 1: barcode LEFT strip;
  //             Copy 2: barcode CENTRED) separated by a scissor cut-line
  // ─────────────────────────────────────────────────────────────────────────
  const pdf = new jsPDF('p', 'mm', 'a4');
  const PW = pdf.internal.pageSize.getWidth();   // 210 mm
  const PH = pdf.internal.pageSize.getHeight();  // 297 mm
  const M  = 8;                                  // horizontal margin
  const UW = PW - M * 2;                         // 194 mm usable width

  // ── palette ──────────────────────────────────────────────────────────────
  const NAVY    = [27,  42,  74 ] as const;
  const CRIMSON = [196, 18,  48 ] as const;
  const GOLD    = [184, 134, 11 ] as const;
  const SILVER  = [230, 232, 238] as const;
  const WHITE   = [255, 255, 255] as const;
  const OFFWH   = [248, 250, 255] as const;
  const DARK    = [30,  30,  30 ] as const;
  const MID     = [80,  80,  80 ] as const;

  // ── tiny helpers ─────────────────────────────────────────────────────────
  const F  = (r: number, g: number, b: number)           => pdf.setFillColor(r, g, b);
  const D  = (r: number, g: number, b: number, w = 0.25) => { pdf.setDrawColor(r, g, b); pdf.setLineWidth(w); };
  const TX = (r: number, g: number, b: number)           => pdf.setTextColor(r, g, b);
  const TF = (size: number, style: 'normal'|'bold'|'italic' = 'normal') => {
    pdf.setFontSize(size); pdf.setFont('helvetica', style);
  };
  const hLine = (y: number, x0 = M, x1 = M + UW, w = 0.25) => {
    D(...NAVY, w); pdf.line(x0, y, x1, y);
  };

  // ── parcel fields ─────────────────────────────────────────────────────────
  const refNumber      = safeText(parcel.reference_id || parcel.tracking_id, '000000000');
  const bookingDate    = parcel.created_at
    ? new Date(parcel.created_at).toLocaleDateString('en-GB')
    : new Date().toLocaleDateString('en-GB');
  const destination    = codeToCountryName(safeText(parcel.receiver_country, 'United Kingdom'));
  const service        = safeText(parcel.service_type, 'STANDARD').toUpperCase();
  const senderCurrency = parcel.currency || 'USD';
  const pL = parcel.length || 12;
  const pW = parcel.width  || 12;
  const pH = parcel.height || 16;
  const calcDW   = parseFloat(((pL * pW * pH) / 5000).toFixed(2));
  const dimWt    = parcel.dim_weight_override != null ? parcel.dim_weight_override : calcDW;
  const dimWtStr = Number(dimWt).toFixed(2);
  const dimLabel = parcel.dim_weight_override != null ? `${dimWtStr} KG*` : `${dimWtStr} KG`;
  const actWt    = parcel.weight || 5;
  const chargeWt = Math.max(parseFloat(dimWtStr), actWt);
  const pieces   = parcel.pieces || 1;
  const docType  = (parcel.document_type || 'DOCUMENT').toUpperCase();
  const freightPkr   = parcel.amount_override != null ? parcel.amount_override : (parcel.freight_amount_pkr || 0);
  const freightLabel = `PKR ${Number(freightPkr).toLocaleString()}${parcel.amount_override != null ? ' (override)' : ''}`;

  const items        = parcel.items?.length ? parcel.items : [{ description: 'General Goods', quantity: 1, unit_price: parcel.total_price || 0 }];
  const itemRowH     = items.length >= 7 ? 7 : 9;
  const itemFontSz   = items.length >= 7 ? 6 : 7.5;
  let   grandTotal   = 0;
  items.forEach((it: any) => { grandTotal += (it.quantity || 1) * (it.unit_price || 0); });

  // ════════════════════════════════════════════════════════════════════════
  // PAGE 1 — PREMIUM AWB
  // ════════════════════════════════════════════════════════════════════════

  // ── outer border (double-line, crimson) ──────────────────────────────────
  D(...CRIMSON, 1.2); pdf.rect(3, 3, PW - 6, PH - 6);
  D(...CRIMSON, 0.4); pdf.rect(5, 5, PW - 10, PH - 10);

  // ── HEADER BAND (full bleed navy, 0–27 mm) ───────────────────────────────
  F(...NAVY); pdf.rect(0, 0, PW, 27, 'F');

  // gold accent stripe (diagonal-ish: a thin rectangle rotated)
  F(...GOLD); pdf.rect(0, 24, PW, 1.5, 'F');

  // Logo — left
  await addLogo(pdf, M + 1, 2, 46, 21);

  // Centre title
  TF(17, 'bold'); TX(...WHITE);
  pdf.text('AIRWAY BILL', PW / 2, 12, { align: 'center' });
  TF(7, 'bold'); TX(...GOLD);
  pdf.text('SENDER COPY  ·  WITH PAYMENT', PW / 2, 19, { align: 'center' });

  // Right: ref box (crimson inset)
  const rBoxX = PW - 62;
  F(...CRIMSON); pdf.rect(rBoxX, 2, 54, 21, 'F');
  D(...GOLD, 0.5); pdf.rect(rBoxX, 2, 54, 21);
  TF(5.5, 'bold'); TX(...GOLD);
  pdf.text('TRACKING REFERENCE', rBoxX + 27, 6.5, { align: 'center' });
  TF(12, 'bold'); TX(...WHITE);
  pdf.text(refNumber, rBoxX + 27, 14, { align: 'center' });
  TF(5.5, 'normal'); TX(...SILVER);
  pdf.text(`Date: ${bookingDate}`, rBoxX + 27, 19, { align: 'center' });

  // ── BARCODE STRIP (27–42 mm) ─────────────────────────────────────────────
  F(...OFFWH); pdf.rect(0, 27, PW, 15, 'F');
  D(...NAVY, 0.3); pdf.line(0, 27, PW, 27); pdf.line(0, 42, PW, 42);
  await addBarcode(pdf, refNumber, M, 28.5, UW, 10);
  TF(6.5, 'bold'); TX(...NAVY);
  pdf.text(refNumber, PW / 2, 40.5, { align: 'center' });

  let yPos = 44;

  // ── "SHIPMENT PARTIES" section bar ───────────────────────────────────────
  F(...NAVY); pdf.rect(M, yPos, UW, 5.5, 'F');
  TF(7.5, 'bold'); TX(...WHITE);
  pdf.text('SHIPMENT PARTIES', M + 2, yPos + 4);
  TF(6.5, 'normal'); TX(...GOLD);
  pdf.text(`REF: ${refNumber}`, M + UW - 2, yPos + 4, { align: 'right' });

  yPos += 5.5;

  // ── SHIPPER / RECEIVER two-column boxes ──────────────────────────────────
  const colW = (UW - 2) / 2;
  const pad  = 2;
  const fw   = colW - pad * 2;
  const lg   = 3.8;
  const cg   = 3.2;

  const hasSenderExtra   = !!(parcel.sender_address_2 || parcel.sender_address_3);
  const hasReceiverExtra = !!(parcel.receiver_address_2 || parcel.receiver_address_3);
  const sFS = hasSenderExtra ? 7 : 7.5;
  const sLG = hasSenderExtra ? 3.6 : 4;
  const rFS = hasReceiverExtra ? 7 : 7.5;
  const rLG = hasReceiverExtra ? 3.6 : 4;

  const sAddrH = measureWrappedAddressHeight(pdf,
    [parcel.sender_address, parcel.sender_address_2, parcel.sender_address_3,
     `${safeText(parcel.sender_city,'')}, ${codeToCountryName(safeText(parcel.sender_country,'Pakistan'))}`],
    fw, sFS, sLG - 0.8);
  const sContentH = sLG * 3 + sAddrH + sLG * 2;

  const rAddrH = measureWrappedAddressHeight(pdf,
    [parcel.receiver_address, parcel.receiver_address_2, parcel.receiver_address_3,
     `${safeText(parcel.receiver_city,'')}, ${safeText(parcel.receiver_state,'')}`.replace(/^,\s*|,\s*$/g,''),
     codeToCountryName(safeText(parcel.receiver_country,'United Kingdom'))],
    fw, rFS, rLG - 0.8);
  const pExtra = measureExtraWrapLines(pdf, safeText(parcel.receiver_postal_code,'N/A'), fw - 20);
  const phExtra= measureExtraWrapLines(pdf, safeText(parcel.receiver_phone,'N/A'),        fw - 12);
  const emExtra= measureExtraWrapLines(pdf, safeText(parcel.receiver_email,'N/A'),        fw - 12);
  const rContentH = rLG * 2 + rAddrH + cg + pExtra*cg + cg + phExtra*cg + cg + emExtra*cg;

  const boxH = Math.max(50, sContentH + 18, rContentH + 18);
  const shipBoxTop = yPos;

  // left box background
  F(...OFFWH); D(...SILVER, 0.25);
  pdf.rect(M, yPos, colW, boxH, 'FD');
  // right box background
  pdf.rect(M + colW + 2, yPos, colW, boxH, 'FD');

  // SHIPPER header
  F(...CRIMSON); pdf.rect(M, yPos, colW, 6, 'F');
  TF(8.5, 'bold'); TX(...WHITE);
  pdf.text('✈  SHIPPER', M + 3, yPos + 4.5);
  TF(6, 'normal'); TX(...GOLD);
  pdf.text(`From: ${codeToCountryName(safeText(parcel.sender_country,'Pakistan'))}`, M + colW - 2, yPos + 4.5, { align: 'right' });

  let sY = yPos + 10;
  const writeS = (label: string, val: string, bold = false) => {
    if (!val || val === 'N/A') return;
    TF(6.5, 'bold'); TX(...NAVY); pdf.text(label, M + pad, sY);
    TF(sFS, bold ? 'bold' : 'normal'); TX(...DARK);
    const lx = M + pad + pdf.getTextWidth(label) + 1;
    const ls = pdf.splitTextToSize(val, fw - (lx - M - pad)) as string[];
    pdf.text(ls[0] ?? '', lx, sY);
    sY += sLG;
  };
  writeS('Name:',    safeText(parcel.sender_name,    ''), true);
  writeS('Company:', safeText(parcel.sender_company, ''));
  TF(6.5, 'bold'); TX(...NAVY); pdf.text('Address:', M + pad, sY); sY += sLG - 0.8;
  TF(sFS, 'normal'); TX(...DARK);
  const sAddrParts = [parcel.sender_address, parcel.sender_address_2, parcel.sender_address_3,
    `${safeText(parcel.sender_city,'')}, ${codeToCountryName(safeText(parcel.sender_country,'Pakistan'))}`]
    .map(p => p == null ? '' : String(p).trim()).filter(Boolean);
  sAddrParts.forEach(p => {
    const ls = pdf.splitTextToSize(p, fw) as string[];
    ls.forEach((l: string) => { pdf.text(l, M + pad, sY); sY += sLG - 0.8; });
  });
  sY += 0.5;
  writeS('Phone:', safeText(parcel.sender_phone, ''));
  writeS('CNIC:',  safeText(parcel.sender_cnic,  ''));

  // RECEIVER header
  const rBoxX2 = M + colW + 2;
  F(...NAVY); pdf.rect(rBoxX2, yPos, colW, 6, 'F');
  TF(8.5, 'bold'); TX(...WHITE);
  pdf.text('✈  RECEIVER', rBoxX2 + 3, yPos + 4.5);
  TF(6, 'normal'); TX(...GOLD);
  pdf.text(`To: ${destination}`, rBoxX2 + colW - 2, yPos + 4.5, { align: 'right' });

  let rY = yPos + 10;
  const writeR = (label: string, val: string, bold = false) => {
    if (!val || val === 'N/A') return;
    TF(6.5, 'bold'); TX(...NAVY); pdf.text(label, rBoxX2 + pad, rY);
    TF(rFS, bold ? 'bold' : 'normal'); TX(...DARK);
    const lx = rBoxX2 + pad + pdf.getTextWidth(label) + 1;
    const ls = pdf.splitTextToSize(val, fw - (lx - rBoxX2 - pad)) as string[];
    pdf.text(ls[0] ?? '', lx, rY);
    rY += rLG;
  };
  writeR('Name:',    safeText(parcel.receiver_name,    ''), true);
  writeR('Company:', safeText(parcel.receiver_company, ''));
  TF(6.5, 'bold'); TX(...NAVY); pdf.text('Address:', rBoxX2 + pad, rY); rY += rLG - 0.8;
  TF(rFS, 'normal'); TX(...DARK);
  const rAddrParts = [parcel.receiver_address, parcel.receiver_address_2, parcel.receiver_address_3,
    `${safeText(parcel.receiver_city,'')}, ${safeText(parcel.receiver_state,'')}`.replace(/^,\s*|,\s*$/g,''),
    codeToCountryName(safeText(parcel.receiver_country,'United Kingdom'))]
    .map(p => p == null ? '' : String(p).trim()).filter(Boolean);
  rAddrParts.forEach(p => {
    const ls = pdf.splitTextToSize(p, fw) as string[];
    ls.forEach((l: string) => { pdf.text(l, rBoxX2 + pad, rY); rY += rLG - 0.8; });
  });
  rY += 0.5;
  const writeRMulti = (label: string, val: string, indent: number) => {
    TF(6.5, 'bold'); TX(...NAVY); pdf.text(label, rBoxX2 + pad, rY);
    TF(rFS, 'normal'); TX(...DARK);
    const ls = pdf.splitTextToSize(val, fw - indent) as string[];
    ls.forEach((l: string, i: number) => pdf.text(l, rBoxX2 + pad + indent, rY + i * cg));
    rY += ls.length * cg;
  };
  if (safeText(parcel.receiver_postal_code,'')) writeRMulti('Post Code:', safeText(parcel.receiver_postal_code,''), 19);
  if (safeText(parcel.receiver_phone,''))       writeRMulti('Phone:',     safeText(parcel.receiver_phone,''),        14);
  if (safeText(parcel.receiver_email,''))       writeRMulti('Email:',     safeText(parcel.receiver_email,''),        12);

  yPos = shipBoxTop + boxH + 4;

  // ── ITEMS / CONTENTS section ──────────────────────────────────────────────
  F(...CRIMSON); pdf.rect(M, yPos, UW, 5.5, 'F');
  TF(7.5, 'bold'); TX(...WHITE);
  pdf.text('CONTENTS / ITEMS', M + 2, yPos + 4);
  TF(6.5, 'normal'); TX(...GOLD);
  pdf.text(`Currency: ${senderCurrency}`, M + UW - 2, yPos + 4, { align: 'right' });

  yPos += 5.5;

  // table header row
  F(...OFFWH); D(...SILVER, 0.2);
  pdf.rect(M, yPos, UW, 6, 'FD');
  TF(6, 'bold'); TX(...NAVY);
  const colDesc = M + 2, colQty = M + 100, colUnit = M + 122, colTotal = M + 153;
  pdf.text('DESCRIPTION',        colDesc,  yPos + 4);
  pdf.text('QTY',                colQty,   yPos + 4);
  pdf.text('UNIT PRICE',         colUnit,  yPos + 4);
  pdf.text(`TOTAL (${senderCurrency})`, colTotal, yPos + 4);
  // column dividers
  D(...SILVER, 0.2);
  [colQty, colUnit, colTotal].forEach(x => pdf.line(x - 2, yPos, x - 2, yPos + 6));

  yPos += 6;

  items.forEach((item: any, idx: number) => {
    const qty  = item.quantity  || 1;
    const up   = item.unit_price || 0;
    const tot  = qty * up;
    const rowBg: [number,number,number] = idx % 2 === 0 ? [255,255,255] : [245,247,255];
    F(...rowBg); D(...SILVER, 0.15);
    pdf.rect(M, yPos, UW, itemRowH, 'FD');
    [colQty, colUnit, colTotal].forEach(x => { D(...SILVER, 0.15); pdf.line(x - 2, yPos, x - 2, yPos + itemRowH); });
    TF(itemFontSz, 'normal'); TX(...DARK);
    const descLines = pdf.splitTextToSize(safeText(item.description, 'General Goods'), colQty - colDesc - 4) as string[];
    pdf.text(descLines[0] ?? '', colDesc, yPos + itemRowH / 2 + 1.5);
    pdf.text(String(qty),                 colQty,   yPos + itemRowH / 2 + 1.5);
    pdf.text(up.toFixed(2),               colUnit,  yPos + itemRowH / 2 + 1.5);
    pdf.text(tot.toFixed(2),              colTotal, yPos + itemRowH / 2 + 1.5);
    yPos += itemRowH;
  });

  // grand total row
  F(...NAVY); pdf.rect(M, yPos, UW, 8, 'F');
  TF(8, 'bold'); TX(...WHITE);
  pdf.text(`TOTAL VALUE:`, colDesc, yPos + 5.5);
  TX(...GOLD);
  pdf.text(`${grandTotal.toFixed(2)} ${senderCurrency}`, M + UW - 2, yPos + 5.5, { align: 'right' });

  yPos += 11;

  // ── SHIPMENT DETAILS grid ────────────────────────────────────────────────
  F(...NAVY); pdf.rect(M, yPos, UW, 5.5, 'F');
  TF(7.5, 'bold'); TX(...WHITE);
  pdf.text('SHIPMENT DETAILS', M + 2, yPos + 4);

  yPos += 5.5;

  F(...OFFWH); D(...SILVER, 0.2);
  pdf.rect(M, yPos, UW, 20, 'FD');

  // 4-column grid: DATE | DIMENSIONS | PIECES | WEIGHT
  const gc = UW / 4;
  const detailCell = (label: string, val: string, cx: number) => {
    TF(5.5, 'bold'); TX(...NAVY);
    pdf.text(label, M + cx + 1, yPos + 4.5);
    TF(8, 'bold'); TX(...DARK);
    pdf.text(val, M + cx + 1, yPos + 11);
    TF(5, 'normal'); TX(...MID);
  };
  detailCell('BOOKING DATE',              bookingDate,                       0);
  detailCell('DIMENSIONS (L×W×H)',        `${pL}×${pW}×${pH} cm`,           gc);
  detailCell('PIECES',                    String(pieces),                   gc * 2);
  detailCell('ACTUAL WEIGHT',             `${actWt} KG`,                    gc * 3);
  // vertical dividers
  D(...SILVER, 0.2);
  [gc, gc*2, gc*3].forEach(x => pdf.line(M + x, yPos, M + x, yPos + 20));

  // row 2
  yPos += 12;
  detailCell('DIM WEIGHT',  dimLabel,               0);
  detailCell('CHARGEABLE',  `${chargeWt} KG`,      gc);
  detailCell('TYPE',        docType,               gc * 2);
  detailCell('SERVICE',     service,               gc * 3);

  yPos += 12;

  // ── PAYMENT BOX ───────────────────────────────────────────────────────────
  // Gold border, crimson fill
  F(255, 245, 240); D(...CRIMSON, 0.6);
  pdf.rect(M, yPos, UW, 14, 'FD');
  // left accent stripe
  F(...CRIMSON); pdf.rect(M, yPos, 4, 14, 'F');
  TF(7, 'bold'); TX(...CRIMSON);
  pdf.text('SHIPMENT FREIGHT', M + 6, yPos + 5);
  TF(16, 'bold'); TX(...NAVY);
  pdf.text(freightLabel, M + 6, yPos + 12);
  TF(6.5, 'italic'); TX(...MID);
  pdf.text('Payment to be collected from sender  |  Booking Office: Sky Office', M + UW - 2, yPos + 12, { align: 'right' });

  yPos += 18;

  // ── DISCLAIMER ───────────────────────────────────────────────────────────
  TF(5.5, 'italic'); TX(110, 110, 110);
  const discText = 'I/WE HEREBY DECLARE AND UNDERTAKE THAT THE ABOVE PARTICULARS ARE TRUE AND CORRECT. THERE IS NOTHING DANGEROUS, ANTIQUES, NARCOTICS, LIQUID OR ANYTHING LIKELY TO CAUSE DAMAGE. IF ANYTHING FOUND I/WE WILL BE FULLY RESPONSIBLE. ANY TAXES AT DESTINATION WILL BE PAID BY THE CONSIGNEE. MAXIMUM LIABILITY LIMITED TO USD 100.';
  const discLines = pdf.splitTextToSize(discText, UW) as string[];
  pdf.text(discLines, M, yPos);
  yPos += discLines.length * 2.8 + 2;

  // ── SENDER COPY label bar ─────────────────────────────────────────────────
  F(...GOLD); pdf.rect(M, yPos, UW, 5.5, 'F');
  TF(7.5, 'bold'); TX(...NAVY);
  pdf.text('SENDER COPY', M + 2, yPos + 4);
  pdf.text('© 2025 Sky Xpress Worldwide Express — All Rights Reserved', M + UW - 2, yPos + 4, { align: 'right' });
  yPos += 6;

  // ── TERMS & CONDITIONS (fills the remaining space) ────────────────────────
  const termsTop = yPos;
  const termsBot = PH - 14;
  const termsH   = termsBot - termsTop;
  F(252, 252, 255); D(...NAVY, 0.25);
  pdf.rect(M, termsTop, UW, termsH, 'FD');

  TF(7, 'bold'); TX(...NAVY);
  pdf.text('STANDARD TRADING CONDITIONS', PW / 2, termsTop + 5, { align: 'center' });
  D(...GOLD, 0.5); pdf.line(M + 30, termsTop + 6.5, M + UW - 30, termsTop + 6.5);

  const termsLines = [
    'By tendering goods for transport by SKY XPRESS WORLDWIDE EXPRESS, the Consignor agrees to the following conditions:',
    '',
    '1. DEFINITIONS: "SKY XPRESS" means Sky Xpress Worldwide Express. "Consignor" or "Shipper" means the sender. "Consignee" means the person to whom the goods are consigned.',
    '',
    '2. CONSIGNMENT NOTE: Each consignment shall be correctly addressed and accompanied by the SKY XPRESS form of Consignment Note which the Consignor shall properly complete. The Consignor is responsible for the correctness of information provided.',
    '',
    '3. SUB-CONTRACTING: SKY XPRESS may sub-contract all or any part of the carriage and may engage agents or sub-contractors on any terms.',
    '',
    '4. COMMON CARRIER: The company is not a common carrier and will only carry goods on these conditions.',
    '',
    '5. LIABILITY: SKY XPRESS shall not be liable for any loss, damage, or delays except where directly caused by proven negligence. Maximum liability is limited to USD 100 per shipment unless additional insurance is purchased in advance.',
    '',
    '6. PROHIBITED ITEMS: Consignor warrants goods do not contain dangerous, hazardous, or prohibited items including narcotics, weapons, explosives, antiques, liquids, or items prohibited by IATA or local laws. Consignor is fully responsible.',
    '',
    '7. CUSTOMS & DUTIES: Any customs duties, taxes, or charges levied at destination shall be paid by the Consignee. If Consignee refuses payment, Consignor shall be liable for all costs.',
    '',
    '8. GOVERNING LAW: These conditions are governed by the laws of Pakistan. Any disputes shall be subject to the exclusive jurisdiction of Pakistani courts.',
  ];

  const lineH  = Math.min(2.6, (termsH - 14) / 40);
  let ty = termsTop + 10;
  TF(5.5, 'normal'); TX(...DARK);
  termsLines.forEach(line => {
    if (!line) { ty += lineH * 0.4; return; }
    const ls = pdf.splitTextToSize(line, UW - 6) as string[];
    ls.forEach((l: string) => { pdf.text(l, M + 3, ty); ty += lineH; });
  });

  // ── PAGE 1 FOOTER ─────────────────────────────────────────────────────────
  D(...CRIMSON, 0.5); pdf.line(M, PH - 10, M + UW, PH - 10);
  TF(6, 'normal'); TX(...MID);
  pdf.text('Phone: (042) 37255473  |  Mobile: 0321 4710522  |  WhatsApp: 0326 9422411  |  Email: skyxpress786@gmail.com', PW / 2, PH - 7, { align: 'center' });
  TF(5.5, 'bold'); TX(...NAVY);
  pdf.text(`AWB REF: ${refNumber}  |  Page 1 of 2`, PW / 2, PH - 4, { align: 'center' });

  // ════════════════════════════════════════════════════════════════════════
  // PAGE 2 — TWO LABEL COPIES
  // ════════════════════════════════════════════════════════════════════════
  pdf.addPage();

  const COPY_H  = 135;    // each label copy height (mm)
  const GAP     = 8;      // gap between the two copies (for cut-line)
  const copy1Y  = 5;
  const copy2Y  = copy1Y + COPY_H + GAP;

  // ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈
  // COPY 1 — barcode in LEFT STRIP, content on right
  // Navy outer border, crimson header, gold detail strip
  // ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈
  {
    const C1X = M, C1Y = copy1Y, C1W = UW, C1H = COPY_H;
    const STRIP_W = 40; // left barcode strip width
    const CONTENT_X = C1X + STRIP_W + 3;
    const CONTENT_W = C1W - STRIP_W - 3;

    // outer border (navy double)
    D(...NAVY, 1.0); pdf.rect(C1X, C1Y, C1W, C1H);
    D(...NAVY, 0.3); pdf.rect(C1X + 1, C1Y + 1, C1W - 2, C1H - 2);

    // ── Left navy barcode strip ────────────────────────────────────────────
    F(...NAVY); pdf.rect(C1X, C1Y, STRIP_W, C1H, 'F');

    // Barcode in the strip (horizontal, top portion)
    await addBarcode(pdf, refNumber, C1X + 2, C1Y + 2, STRIP_W - 4, 14);

    // Tracking ref below barcode (rotated text)
    TF(5.5, 'bold'); TX(...GOLD);
    pdf.text(refNumber, C1X + STRIP_W / 2, C1Y + 19, { align: 'center' });

    // "COPY 1" vertical text
    TF(9, 'bold'); TX(...WHITE);
    pdf.text('COPY  1', C1X + STRIP_W / 2, C1Y + 45, { align: 'center', angle: 90 });

    // Service + date vertical labels
    TF(6, 'bold'); TX(...GOLD);
    pdf.text(service, C1X + STRIP_W / 2, C1Y + 72, { align: 'center', angle: 90 });
    TF(5.5, 'normal'); TX(...SILVER);
    pdf.text(bookingDate, C1X + STRIP_W / 2, C1Y + 92, { align: 'center', angle: 90 });

    // Weight big in strip bottom area
    TF(14, 'bold'); TX(...WHITE);
    pdf.text(`${actWt}`, C1X + STRIP_W / 2, C1Y + C1H - 22, { align: 'center' });
    TF(5.5, 'bold'); TX(...GOLD);
    pdf.text('KG', C1X + STRIP_W / 2, C1Y + C1H - 15, { align: 'center' });
    pdf.text('WEIGHT', C1X + STRIP_W / 2, C1Y + C1H - 10, { align: 'center' });

    // strip bottom line
    D(...GOLD, 0.4); pdf.line(C1X, C1Y + C1H - 6, C1X + STRIP_W, C1Y + C1H - 6);
    TF(5, 'italic'); TX(180, 160, 50);
    pdf.text('SKY XPRESS', C1X + STRIP_W / 2, C1Y + C1H - 3, { align: 'center' });

    // vertical divider between strip and content
    D(...GOLD, 0.5); pdf.line(C1X + STRIP_W + 1.5, C1Y, C1X + STRIP_W + 1.5, C1Y + C1H);

    // ── Right content area ─────────────────────────────────────────────────
    // Crimson header in content area
    F(...CRIMSON); pdf.rect(CONTENT_X, C1Y, CONTENT_W, 10, 'F');
    TF(9, 'bold'); TX(...WHITE);
    pdf.text('AIRWAY BILL', CONTENT_X + 2, C1Y + 5);
    TF(6, 'normal'); TX(...GOLD);
    pdf.text(`Ref: ${refNumber}`, CONTENT_X + CONTENT_W - 2, C1Y + 5, { align: 'right' });
    TF(5.5, 'normal'); TX(...SILVER);
    pdf.text('SENDER COPY WITH PAYMENT', CONTENT_X + 2, C1Y + 8.5);

    // Logo in header
    await addLogo(pdf, CONTENT_X + CONTENT_W - 38, C1Y + 0.5, 36, 9);

    // Shipper / Receiver two sub-columns in content area
    const halfCW = (CONTENT_W - 3) / 2;
    const shipCX = CONTENT_X;
    const recvCX = CONTENT_X + halfCW + 3;

    F(...OFFWH); D(...SILVER, 0.2);
    pdf.rect(shipCX, C1Y + 10, halfCW, 65, 'FD');
    pdf.rect(recvCX, C1Y + 10, halfCW, 65, 'FD');

    // Shipper sub-header
    F(...NAVY); pdf.rect(shipCX, C1Y + 10, halfCW, 5, 'F');
    TF(6.5, 'bold'); TX(...WHITE); pdf.text('SHIPPER', shipCX + 2, C1Y + 14);

    TF(6.5, 'bold'); TX(...NAVY);
    let c1sY = C1Y + 19;
    const c1WriteS = (lbl: string, val: string) => {
      if (!val || val === 'N/A') return;
      pdf.text(lbl, shipCX + 2, c1sY); TF(6, 'normal'); TX(...DARK);
      const ls = pdf.splitTextToSize(val, halfCW - pdf.getTextWidth(lbl) - 4) as string[];
      pdf.text(ls[0] ?? '', shipCX + 2 + pdf.getTextWidth(lbl) + 1, c1sY);
      TF(6.5, 'bold'); TX(...NAVY); c1sY += 4;
    };
    c1WriteS('Name:', safeText(parcel.sender_name, ''));
    c1WriteS('Co.:',  safeText(parcel.sender_company, ''));
    TF(6, 'normal'); TX(...DARK);
    [parcel.sender_address, parcel.sender_address_2, parcel.sender_address_3,
     `${safeText(parcel.sender_city,'')}, ${codeToCountryName(safeText(parcel.sender_country,'Pakistan'))}`]
      .map(p => p == null ? '' : String(p).trim()).filter(Boolean)
      .slice(0, 4).forEach(p => {
        const ls = pdf.splitTextToSize(p, halfCW - 4) as string[];
        pdf.text(ls[0] ?? '', shipCX + 2, c1sY); c1sY += 3.5;
      });
    TF(6.5, 'bold'); TX(...NAVY);
    c1WriteS('Ph.:', safeText(parcel.sender_phone, ''));
    c1WriteS('CNIC:', safeText(parcel.sender_cnic, ''));

    // Receiver sub-header
    F(...CRIMSON); pdf.rect(recvCX, C1Y + 10, halfCW, 5, 'F');
    TF(6.5, 'bold'); TX(...WHITE); pdf.text('RECEIVER', recvCX + 2, C1Y + 14);

    TF(6.5, 'bold'); TX(...NAVY);
    let c1rY = C1Y + 19;
    const c1WriteR = (lbl: string, val: string) => {
      if (!val || val === 'N/A') return;
      pdf.text(lbl, recvCX + 2, c1rY); TF(6, 'normal'); TX(...DARK);
      const ls = pdf.splitTextToSize(val, halfCW - pdf.getTextWidth(lbl) - 4) as string[];
      pdf.text(ls[0] ?? '', recvCX + 2 + pdf.getTextWidth(lbl) + 1, c1rY);
      TF(6.5, 'bold'); TX(...NAVY); c1rY += 4;
    };
    c1WriteR('Name:', safeText(parcel.receiver_name, ''));
    c1WriteR('Co.:',  safeText(parcel.receiver_company, ''));
    TF(6, 'normal'); TX(...DARK);
    [parcel.receiver_address, parcel.receiver_address_2, parcel.receiver_address_3,
     `${safeText(parcel.receiver_city,'')}, ${safeText(parcel.receiver_state,'')}`.replace(/^,\s*|,\s*$/g,''),
     codeToCountryName(safeText(parcel.receiver_country,'United Kingdom'))]
      .map(p => p == null ? '' : String(p).trim()).filter(Boolean)
      .slice(0, 5).forEach(p => {
        const ls = pdf.splitTextToSize(p, halfCW - 4) as string[];
        pdf.text(ls[0] ?? '', recvCX + 2, c1rY); c1rY += 3.5;
      });
    TF(6.5, 'bold'); TX(...NAVY);
    c1WriteR('Post:', safeText(parcel.receiver_postal_code, ''));
    c1WriteR('Ph.:',  safeText(parcel.receiver_phone, ''));

    // ── Gold detail strip (bottom of content area) ──────────────────────────
    const detailStripY = C1Y + 77;
    F(...GOLD); pdf.rect(CONTENT_X, detailStripY, CONTENT_W, 6, 'F');
    TF(5.5, 'bold'); TX(...NAVY);
    const detW = CONTENT_W / 5;
    ['WEIGHT', 'DIM WT', 'CHARGEABLE', 'PIECES', 'TYPE'].forEach((lbl, i) => {
      pdf.text(lbl, CONTENT_X + detW * i + detW / 2, detailStripY + 3.8, { align: 'center' });
    });

    F(...OFFWH); D(...GOLD, 0.3);
    pdf.rect(CONTENT_X, detailStripY + 6, CONTENT_W, 8, 'FD');
    TF(7, 'bold'); TX(...DARK);
    [`${actWt} KG`, dimLabel, `${chargeWt} KG`, String(pieces), docType].forEach((val, i) => {
      pdf.text(val, CONTENT_X + detW * i + detW / 2, detailStripY + 11.5, { align: 'center' });
    });
    [1,2,3,4].forEach(i => { D(...GOLD, 0.2); pdf.line(CONTENT_X + detW*i, detailStripY+6, CONTENT_X + detW*i, detailStripY+14); });

    // ── Payment row ────────────────────────────────────────────────────────
    const payY = detailStripY + 15;
    F(...NAVY); pdf.rect(CONTENT_X, payY, CONTENT_W, 12, 'F');
    TF(6, 'bold'); TX(...GOLD);
    pdf.text('FREIGHT AMOUNT:', CONTENT_X + 2, payY + 5);
    TF(12, 'bold'); TX(...WHITE);
    pdf.text(freightLabel, CONTENT_X + 2, payY + 10.5);
    TF(5.5, 'italic'); TX(...SILVER);
    pdf.text('(Sender pays)', CONTENT_X + CONTENT_W - 2, payY + 10.5, { align: 'right' });

    // ── Disclaimer + destination ────────────────────────────────────────────
    const c1DiscY = payY + 14;
    TF(5, 'italic'); TX(100, 100, 100);
    pdf.text('I/WE DECLARE THE ABOVE PARTICULARS ARE TRUE & CORRECT. NOTHING DANGEROUS. MAX LIABILITY USD 100.', CONTENT_X + 1, c1DiscY, { maxWidth: CONTENT_W - 2 });

    // Destination badge
    F(...CRIMSON); pdf.rect(CONTENT_X, C1Y + C1H - 14, CONTENT_W, 14, 'F');
    TF(6, 'bold'); TX(...GOLD); pdf.text('DESTINATION', CONTENT_X + 2, C1Y + C1H - 8);
    TF(11, 'bold'); TX(...WHITE); pdf.text(destination.toUpperCase(), CONTENT_X + 2, C1Y + C1H - 3);
    TF(6, 'normal'); TX(...SILVER);
    pdf.text(`Service: ${service}  |  Date: ${bookingDate}`, CONTENT_X + CONTENT_W - 2, C1Y + C1H - 3, { align: 'right' });
  }

  // ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈
  // CUT LINE between copies
  // ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈
  {
    const cutY = copy1Y + COPY_H + GAP / 2;
    pdf.setLineDashPattern([3, 2], 0);
    D(150, 150, 150, 0.4); pdf.line(M, cutY, M + UW, cutY);
    pdf.setLineDashPattern([], 0);
    // scissors icon text
    TF(7, 'normal'); TX(130, 130, 130);
    pdf.text('✂  CUT HERE', PW / 2, cutY - 1.5, { align: 'center' });
    // page label
    TF(5.5, 'bold'); TX(...NAVY);
    pdf.text(`REF: ${refNumber}  |  Page 2 of 2`, PW / 2, cutY + 3, { align: 'center' });
  }

  // ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈
  // COPY 2 — barcode CENTRED, different visual treatment
  // Crimson outer border, navy header, two-column top then full barcode centre
  // ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈
  {
    const C2X = M, C2Y = copy2Y, C2W = UW, C2H = COPY_H;

    // outer border (crimson double)
    D(...CRIMSON, 1.0); pdf.rect(C2X, C2Y, C2W, C2H);
    D(...GOLD, 0.4);    pdf.rect(C2X + 1, C2Y + 1, C2W - 2, C2H - 2);

    // ── HEADER (crimson) ────────────────────────────────────────────────────
    F(...CRIMSON); pdf.rect(C2X, C2Y, C2W, 12, 'F');

    // Logo in header
    await addLogo(pdf, C2X + 2, C2Y + 1, 40, 10);

    TF(10, 'bold'); TX(...WHITE);
    pdf.text('AIRWAY BILL', PW / 2, C2Y + 6, { align: 'center' });
    TF(5.5, 'normal'); TX(...GOLD);
    pdf.text('SENDER COPY  ·  WITH PAYMENT  ·  COPY 2', PW / 2, C2Y + 10, { align: 'center' });

    // Ref badge top-right
    F(...NAVY); pdf.rect(C2X + C2W - 42, C2Y + 1, 40, 10, 'F');
    TF(5.5, 'bold'); TX(...GOLD);
    pdf.text('REF #', C2X + C2W - 22, C2Y + 4.5, { align: 'center' });
    TF(8, 'bold'); TX(...WHITE);
    pdf.text(refNumber, C2X + C2W - 22, C2Y + 9.5, { align: 'center' });

    // ── Two-column address section ──────────────────────────────────────────
    const addrH   = 48;
    const halfW2  = (C2W - 3) / 2;
    const shipCX2 = C2X;
    const recvCX2 = C2X + halfW2 + 3;

    F(...OFFWH); D(...SILVER, 0.2);
    pdf.rect(shipCX2, C2Y + 12, halfW2, addrH, 'FD');
    pdf.rect(recvCX2, C2Y + 12, halfW2, addrH, 'FD');

    // Shipper header
    F(...NAVY); pdf.rect(shipCX2, C2Y + 12, halfW2, 5, 'F');
    TF(6.5, 'bold'); TX(...WHITE);
    pdf.text('SHIPPER', shipCX2 + 2, C2Y + 16);
    TF(5.5, 'normal'); TX(...GOLD);
    pdf.text(codeToCountryName(safeText(parcel.sender_country,'Pakistan')), shipCX2 + halfW2 - 2, C2Y + 16, { align: 'right' });

    let c2sY = C2Y + 21;
    const c2WriteS = (lbl: string, val: string) => {
      if (!val || val === 'N/A') return;
      TF(6, 'bold'); TX(...NAVY); pdf.text(lbl, shipCX2 + 2, c2sY);
      TF(6, 'normal'); TX(...DARK);
      const ls = pdf.splitTextToSize(val, halfW2 - pdf.getTextWidth(lbl) - 5) as string[];
      pdf.text(ls[0] ?? '', shipCX2 + 2 + pdf.getTextWidth(lbl) + 1, c2sY);
      c2sY += 3.8;
    };
    c2WriteS('Name:', safeText(parcel.sender_name, ''));
    c2WriteS('Co.:',  safeText(parcel.sender_company, ''));
    TF(6, 'normal'); TX(...DARK);
    [parcel.sender_address, `${safeText(parcel.sender_city,'')}, ${codeToCountryName(safeText(parcel.sender_country,'Pakistan'))}`]
      .map(p => p == null ? '' : String(p).trim()).filter(Boolean)
      .slice(0, 3).forEach(p => { const ls = pdf.splitTextToSize(p, halfW2 - 4) as string[]; pdf.text(ls[0]??'', shipCX2 + 2, c2sY); c2sY += 3.5; });
    TF(6, 'bold'); TX(...NAVY);
    c2WriteS('Ph.:', safeText(parcel.sender_phone, ''));
    c2WriteS('CNIC:', safeText(parcel.sender_cnic, ''));

    // Receiver header
    F(...CRIMSON); pdf.rect(recvCX2, C2Y + 12, halfW2, 5, 'F');
    TF(6.5, 'bold'); TX(...WHITE);
    pdf.text('RECEIVER', recvCX2 + 2, C2Y + 16);
    TF(5.5, 'normal'); TX(...GOLD);
    pdf.text(destination, recvCX2 + halfW2 - 2, C2Y + 16, { align: 'right' });

    let c2rY = C2Y + 21;
    const c2WriteR = (lbl: string, val: string) => {
      if (!val || val === 'N/A') return;
      TF(6, 'bold'); TX(...NAVY); pdf.text(lbl, recvCX2 + 2, c2rY);
      TF(6, 'normal'); TX(...DARK);
      const ls = pdf.splitTextToSize(val, halfW2 - pdf.getTextWidth(lbl) - 5) as string[];
      pdf.text(ls[0] ?? '', recvCX2 + 2 + pdf.getTextWidth(lbl) + 1, c2rY);
      c2rY += 3.8;
    };
    c2WriteR('Name:', safeText(parcel.receiver_name, ''));
    c2WriteR('Co.:',  safeText(parcel.receiver_company, ''));
    TF(6, 'normal'); TX(...DARK);
    [parcel.receiver_address,
     `${safeText(parcel.receiver_city,'')}, ${safeText(parcel.receiver_state,'')}`.replace(/^,\s*|,\s*$/g,''),
     codeToCountryName(safeText(parcel.receiver_country,'United Kingdom'))]
      .map(p => p == null ? '' : String(p).trim()).filter(Boolean)
      .slice(0, 3).forEach(p => { const ls = pdf.splitTextToSize(p, halfW2 - 4) as string[]; pdf.text(ls[0]??'', recvCX2 + 2, c2rY); c2rY += 3.5; });
    TF(6, 'bold'); TX(...NAVY);
    c2WriteR('Post:', safeText(parcel.receiver_postal_code, ''));
    c2WriteR('Ph.:',  safeText(parcel.receiver_phone, ''));

    // ── CENTRED BARCODE section ─────────────────────────────────────────────
    const bcSectionY = C2Y + 12 + addrH + 2;
    F(...NAVY); pdf.rect(C2X, bcSectionY, C2W, 5, 'F');
    TF(6.5, 'bold'); TX(...GOLD);
    pdf.text('▶  TRACKING BARCODE', C2X + 2, bcSectionY + 3.5);
    TF(6, 'normal'); TX(...SILVER);
    pdf.text(`AWB REF: ${refNumber}`, C2X + C2W - 2, bcSectionY + 3.5, { align: 'right' });

    // Barcode full-width centred
    const bcBgY = bcSectionY + 5;
    F(240, 244, 255); pdf.rect(C2X, bcBgY, C2W, 18, 'F');
    D(...NAVY, 0.2); pdf.rect(C2X, bcBgY, C2W, 18);
    await addBarcode(pdf, refNumber, C2X + 10, bcBgY + 2, C2W - 20, 12);
    TF(7.5, 'bold'); TX(...NAVY);
    pdf.text(refNumber, PW / 2, bcBgY + 16, { align: 'center' });

    // ── DETAILS strip ───────────────────────────────────────────────────────
    const detailY2 = bcBgY + 20;
    F(...GOLD); pdf.rect(C2X, detailY2, C2W, 6, 'F');
    TF(5.5, 'bold'); TX(...NAVY);
    const det2W = C2W / 6;
    ['WEIGHT','DIM WT','CHARGEABLE','PIECES','TYPE','SERVICE'].forEach((lbl, i) => {
      pdf.text(lbl, C2X + det2W*i + det2W/2, detailY2 + 3.8, { align: 'center' });
    });

    F(...OFFWH); D(...GOLD, 0.3);
    pdf.rect(C2X, detailY2 + 6, C2W, 8, 'FD');
    TF(7, 'bold'); TX(...DARK);
    [`${actWt} KG`, dimLabel, `${chargeWt} KG`, String(pieces), docType, service].forEach((val, i) => {
      pdf.text(val, C2X + det2W*i + det2W/2, detailY2 + 11.5, { align: 'center' });
    });
    [1,2,3,4,5].forEach(i => { D(...GOLD, 0.2); pdf.line(C2X + det2W*i, detailY2+6, C2X + det2W*i, detailY2+14); });

    // ── Payment + label footer ──────────────────────────────────────────────
    const pay2Y = detailY2 + 16;
    // payment block left
    F(255, 245, 240); D(...CRIMSON, 0.4);
    pdf.rect(C2X, pay2Y, C2W * 0.6, 14, 'FD');
    F(...CRIMSON); pdf.rect(C2X, pay2Y, 4, 14, 'F');
    TF(6, 'bold'); TX(...CRIMSON);
    pdf.text('FREIGHT AMOUNT', C2X + 6, pay2Y + 5);
    TF(14, 'bold'); TX(...NAVY);
    pdf.text(freightLabel, C2X + 6, pay2Y + 12);

    // destination badge right
    F(...NAVY); pdf.rect(C2X + C2W * 0.62, pay2Y, C2W * 0.38, 14, 'F');
    TF(5.5, 'bold'); TX(...GOLD);
    pdf.text('TO DESTINATION', C2X + C2W * 0.62 + 2, pay2Y + 4.5);
    TF(9, 'bold'); TX(...WHITE);
    pdf.text(destination.toUpperCase(), C2X + C2W * 0.62 + 2, pay2Y + 10.5);

    // ── Bottom disclaimer + copy label ──────────────────────────────────────
    const c2DiscY = pay2Y + 16;
    TF(5, 'italic'); TX(110, 110, 110);
    pdf.text('I/WE DECLARE THE ABOVE PARTICULARS ARE TRUE & CORRECT. NOTHING DANGEROUS/PROHIBITED. MAX LIABILITY USD 100. CONSIGNEE PAYS ALL DESTINATION DUTIES.', C2X + 2, c2DiscY, { maxWidth: C2W - 4 });

    // Copy footer bar
    F(...CRIMSON); pdf.rect(C2X, C2Y + C2H - 7, C2W, 7, 'F');
    TF(7, 'bold'); TX(...WHITE);
    pdf.text(`COPY 2  ·  Booking Office: Sky Office  ·  ${bookingDate}`, C2X + 2, C2Y + C2H - 3);
    TF(6, 'normal'); TX(...GOLD);
    pdf.text('skyxpress786@gmail.com  |  0321 4710522', C2X + C2W - 2, C2Y + C2H - 3, { align: 'right' });
  }

  handlePDFOutput(pdf, `AWB-Sender-Copy-${refNumber}.pdf`, mode);
};

// Generate all 3 bills at once
export const generateAllBills = async (parcel: ParcelData): Promise<void> => {
  await generatePaymentInvoice(parcel);
  setTimeout(async () => await generateAirwayBillVerification(parcel), 500);
  setTimeout(async () => await generateAirwayBillWithPayment(parcel), 1000);
};
