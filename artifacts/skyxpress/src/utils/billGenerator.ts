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

// ─── Brand colours ───────────────────────────────────────────────────────────
const C = {
  navy:      [14,  42, 100] as [number,number,number],
  navyDark:  [ 8,  24,  60] as [number,number,number],
  orange:    [255, 107,  0] as [number,number,number],
  orangeLight:[255,237,213] as [number,number,number],
  white:     [255, 255, 255] as [number,number,number],
  offWhite:  [248, 249, 252] as [number,number,number],
  rowAlt:    [241, 245, 255] as [number,number,number],
  border:    [210, 218, 235] as [number,number,number],
  textDark:  [ 15,  23,  42] as [number,number,number],
  textMid:   [ 71,  85, 105] as [number,number,number],
  textLight: [148, 163, 184] as [number,number,number],
  crimson:   [185,  28,  28] as [number,number,number],
  crimsonLight:[254,226,226] as [number,number,number],
  green:     [ 22, 163,  74] as [number,number,number],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const safeText = (v: any, fallback = 'N/A') =>
  (v === null || v === undefined || v === '') ? fallback : String(v);

const countryNameToCode = (name: string): string => {
  const n = name.trim().toUpperCase();
  const map: Record<string, string> = {
    'UNITED KINGDOM':'GB','GREAT BRITAIN':'GB','UK':'GB','ENGLAND':'GB',
    'SCOTLAND':'GB','WALES':'GB','NORTHERN IRELAND':'GB',
    'UNITED STATES':'US','USA':'US','UNITED STATES OF AMERICA':'US',
    'PAKISTAN':'PK','UNITED ARAB EMIRATES':'AE','UAE':'AE',
    'SAUDI ARABIA':'SA','KSA':'SA','GERMANY':'DE','FRANCE':'FR',
    'ITALY':'IT','SPAIN':'ES','NETHERLANDS':'NL','HOLLAND':'NL',
    'BELGIUM':'BE','CANADA':'CA','AUSTRALIA':'AU','NEW ZEALAND':'NZ',
    'CHINA':'CN','JAPAN':'JP','INDIA':'IN','BANGLADESH':'BD',
    'SRI LANKA':'LK','NEPAL':'NP','TURKEY':'TR','TURKIYE':'TR',
    'SWEDEN':'SE','NORWAY':'NO','DENMARK':'DK','FINLAND':'FI',
    'SWITZERLAND':'CH','AUSTRIA':'AT','PORTUGAL':'PT','IRELAND':'IE',
    'POLAND':'PL','CZECH REPUBLIC':'CZ','CZECHIA':'CZ','HUNGARY':'HU',
    'GREECE':'GR','ROMANIA':'RO','QATAR':'QA','KUWAIT':'KW',
    'BAHRAIN':'BH','OMAN':'OM','JORDAN':'JO','MALAYSIA':'MY',
    'SINGAPORE':'SG','INDONESIA':'ID','THAILAND':'TH','PHILIPPINES':'PH',
    'SOUTH AFRICA':'ZA','NIGERIA':'NG','KENYA':'KE','GHANA':'GH',
    'EGYPT':'EG','MOROCCO':'MA','BRAZIL':'BR','MEXICO':'MX',
    'ARGENTINA':'AR','CHILE':'CL','RUSSIA':'RU','UKRAINE':'UA',
  };
  if (map[n]) return map[n];
  for (const [key, code] of Object.entries(map))
    if (n.includes(key) || key.includes(n)) return code;
  return n.substring(0, 2);
};

const codeToCountryName = (input: string): string => {
  if (!input) return '';
  const trimmed = String(input).trim();
  const upper = trimmed.toUpperCase();
  const aliases: Record<string,string> = { UK:'United Kingdom', USA:'United States', UAE:'United Arab Emirates', KSA:'Saudi Arabia' };
  if (aliases[upper]) return aliases[upper];
  const codeMap: Record<string,string> = {
    GB:'United Kingdom',US:'United States',PK:'Pakistan',AE:'United Arab Emirates',
    SA:'Saudi Arabia',DE:'Germany',FR:'France',IT:'Italy',ES:'Spain',
    NL:'Netherlands',BE:'Belgium',CA:'Canada',AU:'Australia',NZ:'New Zealand',
    CN:'China',JP:'Japan',IN:'India',BD:'Bangladesh',LK:'Sri Lanka',
    NP:'Nepal',TR:'Turkey',SE:'Sweden',NO:'Norway',DK:'Denmark',FI:'Finland',
    CH:'Switzerland',AT:'Austria',PT:'Portugal',IE:'Ireland',PL:'Poland',
    CZ:'Czech Republic',HU:'Hungary',GR:'Greece',RO:'Romania',QA:'Qatar',
    KW:'Kuwait',BH:'Bahrain',OM:'Oman',JO:'Jordan',MY:'Malaysia',
    SG:'Singapore',ID:'Indonesia',TH:'Thailand',PH:'Philippines',
    ZA:'South Africa',NG:'Nigeria',KE:'Kenya',GH:'Ghana',EG:'Egypt',
    MA:'Morocco',BR:'Brazil',MX:'Mexico',AR:'Argentina',CL:'Chile',
    RU:'Russia',UA:'Ukraine',
  };
  if (upper.length === 2 && codeMap[upper]) return codeMap[upper];
  return trimmed;
};

const measureWrappedAddressHeight = (pdf: jsPDF, parts: Array<string|undefined>, maxWidth: number, fontSize: number, lineGap: number): number => {
  pdf.setFontSize(fontSize);
  const cleaned = parts.map(p => (p == null ? '' : String(p).trim())).filter(Boolean);
  let totalLines = 0;
  cleaned.forEach(raw => { totalLines += (pdf.splitTextToSize(raw, maxWidth) as string[]).length; });
  return lineGap * (1 + totalLines);
};

const measureExtraWrapLines = (pdf: jsPDF, value: string, maxWidth: number): number => {
  const lines = pdf.splitTextToSize(value, maxWidth) as string[];
  return Math.max(0, lines.length - 1);
};

type OutputMode = 'download' | 'preview' | 'print';

const handlePDFOutput = (pdf: jsPDF, filename: string, mode: OutputMode = 'download') => {
  const blob = pdf.output('blob');
  const url  = URL.createObjectURL(blob);
  if (mode === 'download') {
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  } else if (mode === 'preview') {
    const w = window.open(url, '_blank');
    if (!w) window.location.href = url;
  } else {
    const w = window.open(url, '_blank');
    if (w) { w.onload = () => w.print(); }
    else {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none'; iframe.src = url;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        iframe.contentWindow?.print();
        setTimeout(() => { document.body.removeChild(iframe); URL.revokeObjectURL(url); }, 1000);
      };
    }
  }
};

const addLogo = async (pdf: jsPDF, x: number, y: number, w: number, h: number) => {
  const url = 'https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/document-uploads/skyxpress-logo-1760347926331.jpg';
  try {
    const res = await fetch(url);
    if (!res.ok) return;
    const blob = await res.blob();
    await new Promise<void>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        try { pdf.addImage(reader.result as string, 'JPEG', x, y, w, h); } catch {}
        resolve();
      };
      reader.onerror = () => resolve();
      reader.readAsDataURL(blob);
    });
  } catch { /* continue without logo */ }
};

const addBarcode = async (pdf: jsPDF, text: string, x: number, y: number, w: number, h: number) => {
  try {
    const canvas = document.createElement('canvas');
    bwipjs.toCanvas(canvas, { bcid: 'code128', text, scale: 3, height: 12, includetext: false });
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, w, h);
  } catch {
    pdf.setDrawColor(0); pdf.setLineWidth(0.3);
    pdf.rect(x, y, w, h);
    pdf.setFontSize(6); pdf.setTextColor(0);
    pdf.text(text, x + w / 2, y + h / 2, { align: 'center' });
  }
};

// ─── Shared drawing helpers ───────────────────────────────────────────────────

/** Filled rounded-ish rectangle (jsPDF only does sharp rects; we fake it) */
const fillRect = (pdf: jsPDF, x: number, y: number, w: number, h: number, rgb: [number,number,number]) => {
  pdf.setFillColor(...rgb);
  pdf.setDrawColor(...rgb);
  pdf.rect(x, y, w, h, 'F');
};

const strokeRect = (pdf: jsPDF, x: number, y: number, w: number, h: number, rgb: [number,number,number], lw = 0.3) => {
  pdf.setDrawColor(...rgb);
  pdf.setLineWidth(lw);
  pdf.rect(x, y, w, h);
};

const labelValue = (
  pdf: jsPDF, lx: number, vx: number, y: number,
  label: string, value: string,
  labelRgb: [number,number,number] = C.textMid,
  valueRgb: [number,number,number] = C.textDark,
  fontSize = 8,
) => {
  pdf.setFontSize(fontSize);
  pdf.setFont('helvetica', 'bold');   pdf.setTextColor(...labelRgb); pdf.text(label, lx, y);
  pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...valueRgb); pdf.text(value, vx, y);
};

const drawAddressBlock = (
  pdf: jsPDF,
  parts: Array<string|undefined>,
  x: number, y: number,
  maxWidth: number, fontSize: number, lineGap: number,
): number => {
  pdf.setFontSize(fontSize);
  const cleaned = parts.map(p => (p == null ? '' : String(p).trim())).filter(Boolean);
  cleaned.forEach(raw => {
    const lines = pdf.splitTextToSize(raw, maxWidth) as string[];
    lines.forEach(ln => { pdf.text(ln, x, y); y += lineGap; });
  });
  return y;
};

const CONDITIONS = [
  'By tendering goods for transport by SKY XPRESS WORLDWIDE EXPRESS, the Consignor agrees to the following conditions:',
  '1. DEFINITIONS: "SKY XPRESS" means Sky Xpress Worldwide Express. "Consignor" or "Shipper" means the sender. "Consignee" means the person to whom the goods are consigned.',
  '2. CONSIGNMENT NOTE: Each consignment shall be correctly addressed and accompanied by SKY XPRESS form of Consignment Note which the Consignor shall properly complete. The Consignor is responsible for correctness of information.',
  '3. SUB-CONTRACTING: SKY XPRESS may sub-contract all or any part and may engage agents or sub-contractors.',
  '4. COMMON CARRIER: The company is not a common carrier and will only carry goods on these conditions.',
  '5. LIABILITY: SKY XPRESS shall not be liable for any loss, damage, or delays except where directly caused by proven negligence. Maximum liability is limited to USD 100 per shipment unless additional insurance is purchased.',
  '6. PROHIBITED ITEMS: Consignor warrants goods do not contain dangerous, hazardous, or prohibited items including narcotics, weapons, explosives, antiques, liquids, or items prohibited by IATA or local laws. Consignor fully responsible.',
  '7. CUSTOMS & DUTIES: Any customs duties, taxes, or charges levied at destination shall be paid by Consignee. If Consignee refuses payment, Consignor shall be liable.',
  '8. GOVERNING LAW: These conditions governed by laws of Pakistan. Disputes subject to exclusive jurisdiction of Pakistani courts.',
];

const FOOTER_TEXT = 'Email: skyxpress786@gmail.com  |  Phone: (042) 37255473  |  Mobile: 0321 4710522  |  WhatsApp: 0326 9422411';

const drawFooter = (pdf: jsPDF, pageWidth: number, pageHeight: number) => {
  const fh = 10;
  const fy = pageHeight - fh;
  fillRect(pdf, 0, fy, pageWidth, fh, C.navy);
  pdf.setFontSize(6.5);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...C.white);
  pdf.text(FOOTER_TEXT, pageWidth / 2, fy + 6, { align: 'center' });
};

const drawConditionsBlock = (pdf: jsPDF, x: number, y: number, w: number, lineH: number): number => {
  pdf.setFontSize(5.5);
  CONDITIONS.forEach((line, i) => {
    const isHeader = i === 0;
    pdf.setFont('helvetica', isHeader ? 'italic' : 'normal');
    pdf.setTextColor(...(isHeader ? C.textMid : C.textDark));
    const lines = pdf.splitTextToSize(line, w) as string[];
    lines.forEach(ln => { pdf.text(ln, x, y); y += lineH; });
    y += isHeader ? lineH * 0.4 : lineH * 0.2;
  });
  return y;
};

const sectionHeader = (pdf: jsPDF, x: number, y: number, w: number, h: number, title: string, rgb: [number,number,number] = C.navy) => {
  fillRect(pdf, x, y, w, h, rgb);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...C.white);
  pdf.text(title, x + 4, y + h * 0.72);
  return y + h;
};


// ═══════════════════════════════════════════════════════════════════════════════
// BILL 1 — PERFORMA INVOICE (GIFT)
// ═══════════════════════════════════════════════════════════════════════════════
export const generatePaymentInvoice = async (parcel: any, mode: OutputMode = 'download'): Promise<void> => {
  const pdf  = new jsPDF('p', 'mm', 'a4');
  const PW   = pdf.internal.pageSize.getWidth();   // 210
  const PH   = pdf.internal.pageSize.getHeight();  // 297
  const M    = 10;  // margin
  const IW   = PW - M * 2; // inner width
  const refNumber = safeText(parcel.reference_id || parcel.tracking_id, '000000000');

  // ── Top banner ─────────────────────────────────────────────────────────────
  const bannerH = 28;
  fillRect(pdf, 0, 0, PW, bannerH, C.navy);

  // Logo in banner
  await addLogo(pdf, M, 2, 44, 24);

  // "PERFORMA INVOICE" title, centred
  pdf.setFontSize(15);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...C.white);
  pdf.text('PERFORMA INVOICE', PW / 2, 12, { align: 'center' });
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...C.orangeLight);
  pdf.text('FOR CUSTOMS PURPOSES ONLY — GIFT, NO COMMERCIAL VALUE', PW / 2, 18, { align: 'center' });

  // Invoice ref card top-right
  const cardX = PW - M - 58;
  const cardY = 3;
  fillRect(pdf, cardX, cardY, 58, 22, C.navyDark);
  pdf.setFontSize(7); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...C.orange);
  pdf.text('INVOICE #', cardX + 3, cardY + 6);
  pdf.setFontSize(10); pdf.setTextColor(...C.white);
  pdf.text(refNumber, cardX + 3, cardY + 12);
  const dateStr = parcel.created_at ? new Date(parcel.created_at).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');
  pdf.setFontSize(7); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...C.textLight);
  pdf.text(dateStr, cardX + 3, cardY + 18);

  let yPos = bannerH + 4;

  // ── Orange accent line ─────────────────────────────────────────────────────
  fillRect(pdf, 0, yPos, PW, 1.5, C.orange);
  yPos += 4;

  // ── Barcode row ────────────────────────────────────────────────────────────
  const bcW = 80; const bcH = 12;
  const bcX = (PW - bcW) / 2;
  await addBarcode(pdf, refNumber, bcX, yPos, bcW, bcH);
  pdf.setFontSize(6.5); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...C.textMid);
  pdf.text(refNumber, PW / 2, yPos + bcH + 4, { align: 'center' });
  yPos += bcH + 7;

  // ── Shipper / Receiver cards ───────────────────────────────────────────────
  const colW    = (IW - 4) / 2;
  const shipX   = M;
  const recvX   = M + colW + 4;

  const hasSenderExtra = !!(parcel.sender_address_2 || parcel.sender_address_3);
  const hasReceiverExtra = !!(parcel.receiver_address_2 || parcel.receiver_address_3);
  const sfSize  = hasSenderExtra ? 7.5 : 8;
  const sfGap   = hasSenderExtra ? 4   : 4.5;
  const rfSize  = hasReceiverExtra ? 7.5 : 8;
  const rfGap   = hasReceiverExtra ? 4   : 4.5;
  const cGap    = 3.5;

  const sAddrH = measureWrappedAddressHeight(pdf,
    [parcel.sender_address, parcel.sender_address_2, parcel.sender_address_3,
     `${safeText(parcel.sender_city,'')}, ${codeToCountryName(safeText(parcel.sender_country,'Pakistan'))}`],
    colW - 6, sfSize, sfGap - 1);
  const shipperBodyH = 6 + sfGap + sAddrH + sfGap + sfGap;

  const rAddrH = measureWrappedAddressHeight(pdf,
    [parcel.receiver_address, parcel.receiver_address_2, parcel.receiver_address_3,
     `${safeText(parcel.receiver_city,'')}, ${safeText(parcel.receiver_state,'')}`.replace(/^,\s*|,\s*$/g,''),
     codeToCountryName(safeText(parcel.receiver_country,'United Kingdom'))],
    colW - 6, rfSize, rfGap - 1);
  const pExtra = measureExtraWrapLines(pdf, safeText(parcel.receiver_postal_code,'N/A'), colW - 26);
  const phExtra = measureExtraWrapLines(pdf, safeText(parcel.receiver_phone,'N/A'), colW - 18);
  const emExtra = measureExtraWrapLines(pdf, safeText(parcel.receiver_email,'N/A'), colW - 16);
  const receiverBodyH = 6 + rfGap + rAddrH + cGap*(1+pExtra) + cGap*(1+phExtra) + cGap*(1+emExtra);

  const cardBodyH = Math.max(42, shipperBodyH, receiverBodyH);
  const cardTotalH = 7 + cardBodyH + 2;

  // Shipper card
  fillRect(pdf, shipX, yPos, colW, cardTotalH, C.offWhite);
  strokeRect(pdf, shipX, yPos, colW, cardTotalH, C.border, 0.3);
  // Orange left-border accent
  fillRect(pdf, shipX, yPos, 2.5, cardTotalH, C.navy);
  // Header row
  fillRect(pdf, shipX, yPos, colW, 7, C.navy);
  pdf.setFontSize(9); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...C.white);
  pdf.text('SHIPPER / SENDER', shipX + 5, yPos + 5.2);

  let sy = yPos + 11;
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(sfSize); pdf.setTextColor(...C.navy);
  pdf.text(safeText(parcel.sender_name,'N/A'), shipX + 5, sy);
  sy += sfGap;
  pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...C.textMid);
  pdf.text(safeText(parcel.sender_company,''), shipX + 5, sy);
  sy += sfGap * 0.8;
  pdf.setFontSize(sfSize); pdf.setTextColor(...C.textDark);
  sy = drawAddressBlock(pdf,
    [parcel.sender_address, parcel.sender_address_2, parcel.sender_address_3,
     `${safeText(parcel.sender_city,'')}, ${codeToCountryName(safeText(parcel.sender_country,'Pakistan'))}`],
    shipX + 5, sy, colW - 6, sfSize, sfGap - 1);
  sy += 1;
  pdf.setFontSize(sfSize);
  labelValue(pdf, shipX + 5, shipX + 18, sy, 'Tel:', safeText(parcel.sender_phone,'N/A'), C.textMid, C.textDark, sfSize);
  sy += sfGap;
  labelValue(pdf, shipX + 5, shipX + 18, sy, 'CNIC:', safeText(parcel.sender_cnic,'N/A'), C.textMid, C.textDark, sfSize);

  // Receiver card
  fillRect(pdf, recvX, yPos, colW, cardTotalH, C.offWhite);
  strokeRect(pdf, recvX, yPos, colW, cardTotalH, C.border, 0.3);
  fillRect(pdf, recvX, yPos, 2.5, cardTotalH, C.orange);
  fillRect(pdf, recvX, yPos, colW, 7, C.orange);
  pdf.setFontSize(9); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...C.white);
  pdf.text('RECEIVER / CONSIGNEE', recvX + 5, yPos + 5.2);

  let ry = yPos + 11;
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(rfSize); pdf.setTextColor(...C.orange);
  pdf.text(safeText(parcel.receiver_name,'N/A'), recvX + 5, ry);
  ry += rfGap;
  pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...C.textMid);
  pdf.text(safeText(parcel.receiver_company,''), recvX + 5, ry);
  ry += rfGap * 0.8;
  pdf.setFontSize(rfSize); pdf.setTextColor(...C.textDark);
  ry = drawAddressBlock(pdf,
    [parcel.receiver_address, parcel.receiver_address_2, parcel.receiver_address_3,
     `${safeText(parcel.receiver_city,'')}, ${safeText(parcel.receiver_state,'')}`.replace(/^,\s*|,\s*$/g,''),
     codeToCountryName(safeText(parcel.receiver_country,'United Kingdom'))],
    recvX + 5, ry, colW - 6, rfSize, rfGap - 1);
  ry += 1;
  pdf.setFontSize(7);
  labelValue(pdf, recvX+5, recvX+24, ry, 'Post Code:', safeText(parcel.receiver_postal_code,'N/A'), C.textMid, C.textDark, 7);
  { const ls = pdf.splitTextToSize(safeText(parcel.receiver_postal_code,'N/A'), colW-26) as string[];
    ry += cGap + (ls.length-1)*cGap; }
  labelValue(pdf, recvX+5, recvX+16, ry, 'Tel:', safeText(parcel.receiver_phone,'N/A'), C.textMid, C.textDark, 7);
  { const ls = pdf.splitTextToSize(safeText(parcel.receiver_phone,'N/A'), colW-18) as string[];
    ry += cGap + (ls.length-1)*cGap; }
  labelValue(pdf, recvX+5, recvX+16, ry, 'Email:', safeText(parcel.receiver_email,'N/A'), C.textMid, C.textDark, 7);

  yPos += cardTotalH + 5;

  // ── Items table ────────────────────────────────────────────────────────────
  yPos = sectionHeader(pdf, M, yPos, IW, 7, 'ITEMS / CONTENTS', C.navy);
  yPos += 1;

  // Table header row
  fillRect(pdf, M, yPos, IW, 6.5, C.rowAlt);
  strokeRect(pdf, M, yPos, IW, 6.5, C.border, 0.25);
  pdf.setFontSize(7.5); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...C.navy);
  pdf.text('DESCRIPTION', M+3, yPos+4.5);
  pdf.text('QTY', M+112, yPos+4.5);
  pdf.text('UNIT PRICE', M+128, yPos+4.5);
  pdf.text('TOTAL', PW-M-3, yPos+4.5, {align:'right'});
  yPos += 6.5;

  const items = parcel.items || [{ description: 'General Goods', quantity: 1, unit_price: parcel.total_price || 0 }];
  let grandTotal = 0;
  const iCount = items.length;
  const iRowH  = iCount >= 7 ? 7 : 9;
  const iFSize = iCount >= 7 ? 6.5 : 8;

  items.forEach((item: any, idx: number) => {
    const total = (item.quantity || 1) * (item.unit_price || 0);
    grandTotal += total;
    fillRect(pdf, M, yPos, IW, iRowH, idx % 2 === 0 ? C.white : C.offWhite);
    strokeRect(pdf, M, yPos, IW, iRowH, C.border, 0.15);
    pdf.setFont('helvetica','normal'); pdf.setFontSize(iFSize); pdf.setTextColor(...C.textDark);
    const desc = pdf.splitTextToSize(safeText(item.description,'Item'), 95) as string[];
    pdf.text(desc[0], M+3, yPos + iRowH*0.65);
    pdf.text(String(item.quantity||1), M+113, yPos+iRowH*0.65);
    pdf.text((item.unit_price||0).toFixed(2), M+130, yPos+iRowH*0.65);
    pdf.text(total.toFixed(2), PW-M-3, yPos+iRowH*0.65, {align:'right'});
    yPos += iRowH;
  });

  // Total row
  fillRect(pdf, M, yPos, IW, 10, C.navy);
  pdf.setFont('helvetica','bold'); pdf.setFontSize(10); pdf.setTextColor(...C.white);
  const currency = parcel.currency || 'USD';
  pdf.text('TOTAL VALUE:', M+4, yPos+6.8);
  pdf.setFontSize(12); pdf.setTextColor(...C.orange);
  pdf.text(`${currency} ${grandTotal.toFixed(2)}`, PW-M-4, yPos+7, {align:'right'});
  yPos += 13;

  // ── Shipment details ───────────────────────────────────────────────────────
  yPos = sectionHeader(pdf, M, yPos, IW, 7, 'SHIPMENT DETAILS', C.navyDark);
  yPos += 1;

  const L = parcel.length||12, W2 = parcel.width||12, H = parcel.height||16;
  const calcDim = parseFloat(((L*W2*H)/5000).toFixed(2));
  const dimW = parcel.dim_weight_override != null ? parcel.dim_weight_override : calcDim;
  const dimStr = Number(dimW).toFixed(2);
  const actW = parcel.weight||5;
  const chargeW = Math.max(parseFloat(dimStr), actW);
  const bookDate = parcel.created_at ? new Date(parcel.created_at).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');
  const docType = (parcel.document_type||'Non-Document').toUpperCase();

  fillRect(pdf, M, yPos, IW, 22, C.offWhite);
  strokeRect(pdf, M, yPos, IW, 22, C.border, 0.25);

  const col4W = IW / 4;
  const detailLabels = ['BOOKING DATE','DIMENSIONS','PIECES','WEIGHT'];
  const detailValues = [bookDate, `${L}×${W2}×${H} cm`, String(parcel.pieces||1), `${actW} KG`];
  detailLabels.forEach((lbl, i) => {
    const dx = M + i * col4W + 4;
    pdf.setFontSize(6.5); pdf.setFont('helvetica','bold'); pdf.setTextColor(...C.textMid);
    pdf.text(lbl, dx, yPos+5);
    pdf.setFontSize(i===3?11:9); pdf.setFont('helvetica','bold'); pdf.setTextColor(i===3?C.navy:C.textDark);
    pdf.text(detailValues[i], dx, yPos+11.5);
  });

  const row2Labels = ['DIM WEIGHT','CHARGEABLE','TYPE'];
  const row2Values = [
    `${dimStr} KG${parcel.dim_weight_override != null?' *':''}`,
    `${chargeW} KG`,
    docType,
  ];
  row2Labels.forEach((lbl, i) => {
    const dx = M + i * col4W + 4;
    pdf.setFontSize(6.5); pdf.setFont('helvetica','bold'); pdf.setTextColor(...C.textMid);
    pdf.text(lbl, dx, yPos+16);
    pdf.setFontSize(8); pdf.setFont('helvetica','normal'); pdf.setTextColor(...C.textDark);
    pdf.text(row2Values[i], dx, yPos+20.5);
  });
  yPos += 24;

  // ── Declaration ────────────────────────────────────────────────────────────
  fillRect(pdf, M, yPos, IW, 9, C.orangeLight);
  strokeRect(pdf, M, yPos, IW, 9, C.orange, 0.3);
  pdf.setFontSize(6.5); pdf.setFont('helvetica','italic'); pdf.setTextColor(...C.navy);
  pdf.text('DECLARATION: I/WE HEREBY DECLARE THAT THE ABOVE PARTICULARS ARE TRUE AND CORRECT.', M+4, yPos+4);
  pdf.text('THESE GOODS ARE SENT AS A GIFT. NO COMMERCIAL VALUE. FOR CUSTOMS PURPOSES ONLY.', M+4, yPos+7.5);
  yPos += 12;

  // ── Signature strip ────────────────────────────────────────────────────────
  fillRect(pdf, M, yPos, IW, 14, C.offWhite);
  strokeRect(pdf, M, yPos, IW, 14, C.border, 0.25);
  pdf.setFontSize(8); pdf.setFont('helvetica','bold'); pdf.setTextColor(...C.textMid);
  pdf.text('SHIPPER CNIC:', M+4, yPos+6);
  pdf.setFont('helvetica','normal'); pdf.setTextColor(...C.textDark);
  pdf.text(safeText(parcel.sender_cnic,'N/A'), M+30, yPos+6);
  strokeRect(pdf, PW-M-55, yPos+3, 53, 9, C.border, 0.3);
  pdf.setFontSize(7.5); pdf.setFont('helvetica','bold'); pdf.setTextColor(...C.textMid);
  pdf.text('SHIPPER SIGNATURE', PW-M-53, yPos+8.5);
  yPos += 17;

  // ── Conditions ─────────────────────────────────────────────────────────────
  const condY = yPos;
  const condH = PH - 10 - condY;
  fillRect(pdf, M, condY, IW, condH, C.offWhite);
  strokeRect(pdf, M, condY, IW, condH, C.border, 0.2);
  pdf.setFontSize(7.5); pdf.setFont('helvetica','bold'); pdf.setTextColor(...C.navy);
  pdf.text('STANDARD TRADING CONDITIONS', PW/2, condY+5, {align:'center'});
  fillRect(pdf, M, condY+6.5, IW, 0.5, C.orange);
  drawConditionsBlock(pdf, M+4, condY+10, IW-8, 2.3);

  // ── Footer ─────────────────────────────────────────────────────────────────
  drawFooter(pdf, PW, PH);

  handlePDFOutput(pdf, `Performa-Invoice-${refNumber}.pdf`, mode);
};


// ═══════════════════════════════════════════════════════════════════════════════
// BILL 2 — AIRWAY BILL (VERIFICATION / AIRPORT COPY) — 2 copies on one page
// ═══════════════════════════════════════════════════════════════════════════════
export const generateAirwayBillVerification = async (parcel: any, mode: OutputMode = 'download'): Promise<void> => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const PW  = pdf.internal.pageSize.getWidth();
  const PH  = pdf.internal.pageSize.getHeight();

  const refNumber   = safeText(parcel.reference_id || parcel.tracking_id, '000000000');
  const destination = codeToCountryName(safeText(parcel.receiver_country,'UK'));
  const service     = safeText(parcel.service_type,'STANDARD').toUpperCase();
  const L = parcel.length||12, W2 = parcel.width||12, H = parcel.height||16;
  const calcDim = parseFloat(((L*W2*H)/5000).toFixed(2));
  const dimW  = parcel.dim_weight_override != null ? parcel.dim_weight_override : calcDim;
  const dimStr = Number(dimW).toFixed(2);
  const actW  = parcel.weight||5;
  const chargeW = Math.max(parseFloat(dimStr), actW);
  const bookDate = parcel.created_at ? new Date(parcel.created_at).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');
  const docType  = (parcel.document_type||'Non-Document').toUpperCase();

  const hasSenderExtra = !!(parcel.sender_address_2 || parcel.sender_address_3);
  const hasReceiverExtra = !!(parcel.receiver_address_2 || parcel.receiver_address_3);
  const sfSize = hasSenderExtra ? 7 : 7.5;
  const sfGap  = hasSenderExtra ? 3.8 : 4.2;
  const rfSize = hasReceiverExtra ? 7 : 7.5;
  const rfGap  = hasReceiverExtra ? 3.8 : 4.2;
  const cGap   = 3.2;
  const colW   = (PW - 20 - 4) / 2;

  const sAddrH = measureWrappedAddressHeight(pdf,
    [parcel.sender_address, parcel.sender_address_2, parcel.sender_address_3,
     `${safeText(parcel.sender_city,'')}, ${codeToCountryName(safeText(parcel.sender_country,'Pakistan'))}`],
    colW-6, sfSize, sfGap-1);
  const rAddrH = measureWrappedAddressHeight(pdf,
    [parcel.receiver_address, parcel.receiver_address_2, parcel.receiver_address_3,
     `${safeText(parcel.receiver_city,'')}, ${safeText(parcel.receiver_state,'')}`.replace(/^,\s*|,\s*$/g,''),
     codeToCountryName(safeText(parcel.receiver_country,'UK'))],
    colW-6, rfSize, rfGap-1);
  const pExtra  = measureExtraWrapLines(pdf, safeText(parcel.receiver_postal_code,'N/A'), colW-24);
  const phExtra = measureExtraWrapLines(pdf, safeText(parcel.receiver_phone,'N/A'), colW-16);
  const emExtra = measureExtraWrapLines(pdf, safeText(parcel.receiver_email,'N/A'), colW-16);
  const shipBodyH = sfGap*2 + sAddrH + sfGap*2;
  const recvBodyH = rfGap*2 + rAddrH + cGap*(1+pExtra)+cGap*(1+phExtra)+cGap*(1+emExtra);
  const addrBoxH  = Math.max(38, shipBodyH+10, recvBodyH+10);

  // Each copy height = banner(22) + addr(addrBoxH+10) + details(30) + sig(18) + copyLabel(8) = ~88+ mm
  const copyH = 22 + addrBoxH + 10 + 30 + 18 + 8 + 4;

  const generateCopy = async (startY: number, copyLabel: string, isForward: boolean) => {
    const M2 = 10;
    const IW = PW - M2*2;

    // Outer border
    strokeRect(pdf, M2-1, startY-1, IW+2, copyH+2, isForward ? C.orange : C.navy, 0.5);

    // ── Banner ─────────────────────────────────────────────────────────────
    const bh = 22;
    fillRect(pdf, M2, startY, IW, bh, isForward ? C.orange : C.navy);
    await addLogo(pdf, M2+2, startY+1, 38, 20);

    // Title block
    pdf.setFontSize(13); pdf.setFont('helvetica','bold'); pdf.setTextColor(...C.white);
    pdf.text('AIRWAY BILL', PW/2 - 10, startY+9, {align:'center'});
    pdf.setFontSize(7.5); pdf.setFont('helvetica','normal'); pdf.setTextColor(isForward ? C.white : C.orangeLight);
    pdf.text(`DEST: ${destination}  |  SERVICE: ${service}  |  REF: ${refNumber}`, PW/2 - 10, startY+15, {align:'center'});

    // Barcode top-right of banner
    await addBarcode(pdf, refNumber, PW-M2-40, startY+3, 38, 14);

    let yy = startY + bh + 3;

    // ── Shipper / Receiver ──────────────────────────────────────────────────
    const shipX = M2; const recvX = M2 + colW + 4;

    // Shipper
    fillRect(pdf, shipX, yy, colW, addrBoxH+10, C.offWhite);
    strokeRect(pdf, shipX, yy, colW, addrBoxH+10, C.border, 0.25);
    fillRect(pdf, shipX, yy, colW, 6, isForward ? C.orange : C.navy);
    pdf.setFontSize(8); pdf.setFont('helvetica','bold'); pdf.setTextColor(...C.white);
    pdf.text('SHIPPER', shipX+3, yy+4.5);
    let sy = yy+10;
    pdf.setFont('helvetica','bold'); pdf.setFontSize(sfSize); pdf.setTextColor(isForward ? C.orange : C.navy);
    pdf.text(safeText(parcel.sender_name,'N/A'), shipX+3, sy); sy += sfGap;
    pdf.setFont('helvetica','normal'); pdf.setTextColor(...C.textMid); pdf.setFontSize(sfSize-0.5);
    pdf.text(safeText(parcel.sender_company,''), shipX+3, sy); sy += sfGap*0.8;
    pdf.setFontSize(sfSize); pdf.setTextColor(...C.textDark);
    sy = drawAddressBlock(pdf,
      [parcel.sender_address, parcel.sender_address_2, parcel.sender_address_3,
       `${safeText(parcel.sender_city,'')}, ${codeToCountryName(safeText(parcel.sender_country,'Pakistan'))}`],
      shipX+3, sy, colW-6, sfSize, sfGap-1);
    sy += 1.5;
    labelValue(pdf, shipX+3, shipX+15, sy, 'Tel:', safeText(parcel.sender_phone,'N/A'), C.textMid, C.textDark, sfSize); sy += sfGap;
    labelValue(pdf, shipX+3, shipX+15, sy, 'CNIC:', safeText(parcel.sender_cnic,'N/A'), C.textMid, C.textDark, sfSize);

    // Receiver
    fillRect(pdf, recvX, yy, colW, addrBoxH+10, C.offWhite);
    strokeRect(pdf, recvX, yy, colW, addrBoxH+10, C.border, 0.25);
    fillRect(pdf, recvX, yy, colW, 6, isForward ? C.orange : C.navy);
    pdf.setFontSize(8); pdf.setFont('helvetica','bold'); pdf.setTextColor(...C.white);
    pdf.text('RECEIVER', recvX+3, yy+4.5);
    let ry = yy+10;
    pdf.setFont('helvetica','bold'); pdf.setFontSize(rfSize); pdf.setTextColor(isForward ? C.orange : C.navy);
    pdf.text(safeText(parcel.receiver_name,'N/A'), recvX+3, ry); ry += rfGap;
    pdf.setFont('helvetica','normal'); pdf.setTextColor(...C.textMid); pdf.setFontSize(rfSize-0.5);
    pdf.text(safeText(parcel.receiver_company,''), recvX+3, ry); ry += rfGap*0.8;
    pdf.setFontSize(rfSize); pdf.setTextColor(...C.textDark);
    ry = drawAddressBlock(pdf,
      [parcel.receiver_address, parcel.receiver_address_2, parcel.receiver_address_3,
       `${safeText(parcel.receiver_city,'')}, ${safeText(parcel.receiver_state,'')}`.replace(/^,\s*|,\s*$/g,''),
       codeToCountryName(safeText(parcel.receiver_country,'UK'))],
      recvX+3, ry, colW-6, rfSize, rfGap-1);
    ry += 1.5; pdf.setFontSize(7);
    labelValue(pdf, recvX+3, recvX+22, ry, 'Post Code:', safeText(parcel.receiver_postal_code,'N/A'), C.textMid, C.textDark, 7);
    { const ls = pdf.splitTextToSize(safeText(parcel.receiver_postal_code,'N/A'), colW-24) as string[]; ry += cGap*(ls.length); }
    labelValue(pdf, recvX+3, recvX+14, ry, 'Tel:', safeText(parcel.receiver_phone,'N/A'), C.textMid, C.textDark, 7);
    { const ls = pdf.splitTextToSize(safeText(parcel.receiver_phone,'N/A'), colW-16) as string[]; ry += cGap*(ls.length); }
    labelValue(pdf, recvX+3, recvX+14, ry, 'Email:', safeText(parcel.receiver_email,'N/A'), C.textMid, C.textDark, 7);

    yy += addrBoxH + 12;

    // ── Shipment details grid ───────────────────────────────────────────────
    fillRect(pdf, M2, yy, IW, 28, C.offWhite);
    strokeRect(pdf, M2, yy, IW, 28, C.border, 0.25);

    const col4W = IW/4;
    const dLabels = ['BOOKING DATE','DIMENSIONS','PIECES','WEIGHT'];
    const dValues = [bookDate, `${L}×${W2}×${H} cm`, String(parcel.pieces||1), `${actW} KG`];
    dLabels.forEach((lbl,i) => {
      const dx = M2 + i*col4W + 3;
      pdf.setFontSize(6); pdf.setFont('helvetica','bold'); pdf.setTextColor(...C.textMid); pdf.text(lbl, dx, yy+5);
      pdf.setFontSize(i===3?10:8); pdf.setFont('helvetica','bold'); pdf.setTextColor(i===3 ? (isForward?C.orange:C.navy) : C.textDark);
      pdf.text(dValues[i], dx, yy+11);
    });
    // divider
    fillRect(pdf, M2+2, yy+14, IW-4, 0.4, C.border);
    const r2Labels = ['DIM WEIGHT','CHARGEABLE WT','TYPE','SERVICE'];
    const r2Values = [`${dimStr} KG${parcel.dim_weight_override!=null?' *':''}`, `${chargeW} KG`, docType, service];
    r2Labels.forEach((lbl,i) => {
      const dx = M2 + i*col4W + 3;
      pdf.setFontSize(6); pdf.setFont('helvetica','bold'); pdf.setTextColor(...C.textMid); pdf.text(lbl, dx, yy+19);
      pdf.setFontSize(7.5); pdf.setFont('helvetica','normal'); pdf.setTextColor(...C.textDark); pdf.text(r2Values[i], dx, yy+25);
    });

    yy += 31;

    // ── Declaration + Signature ─────────────────────────────────────────────
    fillRect(pdf, M2, yy, IW, 8, C.offWhite);
    strokeRect(pdf, M2, yy, IW, 8, C.border, 0.2);
    pdf.setFontSize(5.5); pdf.setFont('helvetica','italic'); pdf.setTextColor(...C.textMid);
    pdf.text('I/WE HEREBY DECLARE THAT THE ABOVE PARTICULARS ARE TRUE AND CORRECT. GOODS CONTAIN NOTHING DANGEROUS OR PROHIBITED. MAX LIABILITY: USD 100.', M2+3, yy+3.5, {maxWidth: IW-56});
    // Signature box
    strokeRect(pdf, PW-M2-50, yy+1, 48, 6, C.border, 0.3);
    pdf.setFontSize(6.5); pdf.setFont('helvetica','bold'); pdf.setTextColor(...C.textMid);
    pdf.text('SHIPPER SIGNATURE', PW-M2-48, yy+5);
    yy += 10;

    // ── Copy label strip ────────────────────────────────────────────────────
    fillRect(pdf, M2, yy, IW, 7, isForward ? C.orange : C.navy);
    pdf.setFontSize(8.5); pdf.setFont('helvetica','bold'); pdf.setTextColor(...C.white);
    pdf.text(copyLabel.toUpperCase(), PW/2, yy+5, {align:'center'});
  };

  const gap = 3;
  await generateCopy(4, 'ACCOUNT COPY — FOR RECORDS', false);

  // Dashed separator
  const sep = 4 + copyH + 1;
  pdf.setDrawColor(...C.border);
  pdf.setDrawColor(...C.border);
  pdf.setLineWidth(0.4);
  for (let dx = 10; dx < PW-10; dx += 4) pdf.line(dx, sep, dx+2, sep);
  pdf.setFontSize(6); pdf.setTextColor(...C.textLight);
  pdf.text('- - - CUT HERE - - -', PW/2, sep+2.5, {align:'center'});

  await generateCopy(sep + gap + 1, 'FORWARD COPY — FOR DESTINATION', true);

  drawFooter(pdf, PW, PH);
  handlePDFOutput(pdf, `AWB-Verification-${refNumber}.pdf`, mode);
};


// ═══════════════════════════════════════════════════════════════════════════════
// BILL 3 — AIRWAY BILL WITH PAYMENT (SENDER COPY)
// ═══════════════════════════════════════════════════════════════════════════════
export const generateAirwayBillWithPayment = async (parcel: any, mode: OutputMode = 'download'): Promise<void> => {
  // Fetch PKR rate
  let pkrRate = 285.0;
  try {
    const { data } = await supabase.from('pricing_config').select('currency_rates').single();
    if ((data?.currency_rates as any)?.PKR) pkrRate = (data.currency_rates as any).PKR;
  } catch {}

  const pdf = new jsPDF('p', 'mm', 'a4');
  const PW  = pdf.internal.pageSize.getWidth();
  const PH  = pdf.internal.pageSize.getHeight();
  const M   = 10;
  const IW  = PW - M*2;

  const refNumber   = safeText(parcel.reference_id || parcel.tracking_id, '000000000');
  const destination = codeToCountryName(safeText(parcel.receiver_country,'UK'));
  const service     = safeText(parcel.service_type,'STANDARD').toUpperCase();

  // ── Top banner ─────────────────────────────────────────────────────────────
  const bannerH = 30;
  fillRect(pdf, 0, 0, PW, bannerH, C.crimson);

  await addLogo(pdf, M, 2, 44, 26);

  pdf.setFontSize(14); pdf.setFont('helvetica','bold'); pdf.setTextColor(...C.white);
  pdf.text('AIRWAY BILL', PW/2 - 5, 11, {align:'center'});
  pdf.setFontSize(8); pdf.setFont('helvetica','bold'); pdf.setTextColor(...C.crimsonLight);
  pdf.text('SENDER COPY  —  WITH PAYMENT DETAILS', PW/2 - 5, 17, {align:'center'});
  pdf.setFontSize(7); pdf.setFont('helvetica','normal'); pdf.setTextColor(...C.crimsonLight);
  pdf.text(`DEST: ${destination}  |  SERVICE: ${service}`, PW/2 - 5, 23, {align:'center'});

  // Barcode card top-right
  const bcCardX = PW - M - 52;
  fillRect(pdf, bcCardX, 2, 52, 26, C.navyDark);
  await addBarcode(pdf, refNumber, bcCardX+1, 3, 50, 14);
  pdf.setFontSize(7.5); pdf.setFont('helvetica','bold'); pdf.setTextColor(...C.orange);
  pdf.text(refNumber, bcCardX+26, 21, {align:'center'});
  const dateStr = parcel.created_at ? new Date(parcel.created_at).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');
  pdf.setFontSize(6); pdf.setFont('helvetica','normal'); pdf.setTextColor(...C.textLight);
  pdf.text(dateStr, bcCardX+26, 25.5, {align:'center'});

  let yPos = bannerH + 4;
  fillRect(pdf, 0, bannerH, PW, 1.5, C.orange);

  // ── Shipper / Receiver ─────────────────────────────────────────────────────
  const hasSenderExtra  = !!(parcel.sender_address_2  || parcel.sender_address_3);
  const hasReceiverExtra = !!(parcel.receiver_address_2 || parcel.receiver_address_3);
  const sfSize = hasSenderExtra ? 7.5 : 8;
  const sfGap  = hasSenderExtra ? 4   : 4.5;
  const rfSize = hasReceiverExtra ? 7.5 : 8;
  const rfGap  = hasReceiverExtra ? 4   : 4.5;
  const cGap   = 3.5;
  const colW   = (IW - 4) / 2;
  const shipX  = M; const recvX = M + colW + 4;

  const sAddrH = measureWrappedAddressHeight(pdf,
    [parcel.sender_address, parcel.sender_address_2, parcel.sender_address_3,
     `${safeText(parcel.sender_city,'')}, ${codeToCountryName(safeText(parcel.sender_country,'Pakistan'))}`],
    colW-6, sfSize, sfGap-1);
  const rAddrH = measureWrappedAddressHeight(pdf,
    [parcel.receiver_address, parcel.receiver_address_2, parcel.receiver_address_3,
     `${safeText(parcel.receiver_city,'')}, ${safeText(parcel.receiver_state,'')}`.replace(/^,\s*|,\s*$/g,''),
     codeToCountryName(safeText(parcel.receiver_country,'UK'))],
    colW-6, rfSize, rfGap-1);
  const pExtra  = measureExtraWrapLines(pdf, safeText(parcel.receiver_postal_code,'N/A'), colW-24);
  const phExtra = measureExtraWrapLines(pdf, safeText(parcel.receiver_phone,'N/A'), colW-16);
  const emExtra = measureExtraWrapLines(pdf, safeText(parcel.receiver_email,'N/A'), colW-16);
  const sBodyH  = sfGap*2 + sAddrH + sfGap*2;
  const rBodyH  = rfGap*2 + rAddrH + cGap*(1+pExtra) + cGap*(1+phExtra) + cGap*(1+emExtra);
  const cardH   = Math.max(44, sBodyH+12, rBodyH+12);

  // Shipper card
  fillRect(pdf, shipX, yPos, colW, cardH, C.offWhite);
  strokeRect(pdf, shipX, yPos, colW, cardH, C.border, 0.3);
  fillRect(pdf, shipX, yPos, 2.5, cardH, C.crimson);
  fillRect(pdf, shipX, yPos, colW, 7, C.crimson);
  pdf.setFontSize(8.5); pdf.setFont('helvetica','bold'); pdf.setTextColor(...C.white);
  pdf.text('SHIPPER / SENDER', shipX+5, yPos+5.3);

  let sy = yPos+12;
  pdf.setFont('helvetica','bold'); pdf.setFontSize(sfSize); pdf.setTextColor(...C.crimson);
  pdf.text(safeText(parcel.sender_name,'N/A'), shipX+5, sy); sy += sfGap;
  pdf.setFont('helvetica','normal'); pdf.setTextColor(...C.textMid); pdf.setFontSize(sfSize-0.5);
  pdf.text(safeText(parcel.sender_company,''), shipX+5, sy); sy += sfGap*0.8;
  pdf.setFontSize(sfSize); pdf.setTextColor(...C.textDark);
  sy = drawAddressBlock(pdf,
    [parcel.sender_address, parcel.sender_address_2, parcel.sender_address_3,
     `${safeText(parcel.sender_city,'')}, ${codeToCountryName(safeText(parcel.sender_country,'Pakistan'))}`],
    shipX+5, sy, colW-6, sfSize, sfGap-1);
  sy += 1.5;
  labelValue(pdf, shipX+5, shipX+18, sy, 'Tel:', safeText(parcel.sender_phone,'N/A'), C.textMid, C.textDark, sfSize); sy += sfGap;
  labelValue(pdf, shipX+5, shipX+18, sy, 'CNIC:', safeText(parcel.sender_cnic,'N/A'), C.textMid, C.textDark, sfSize);

  // Receiver card
  fillRect(pdf, recvX, yPos, colW, cardH, C.offWhite);
  strokeRect(pdf, recvX, yPos, colW, cardH, C.border, 0.3);
  fillRect(pdf, recvX, yPos, 2.5, cardH, C.orange);
  fillRect(pdf, recvX, yPos, colW, 7, C.orange);
  pdf.setFontSize(8.5); pdf.setFont('helvetica','bold'); pdf.setTextColor(...C.white);
  pdf.text('RECEIVER / CONSIGNEE', recvX+5, yPos+5.3);

  let ry = yPos+12;
  pdf.setFont('helvetica','bold'); pdf.setFontSize(rfSize); pdf.setTextColor(...C.orange);
  pdf.text(safeText(parcel.receiver_name,'N/A'), recvX+5, ry); ry += rfGap;
  pdf.setFont('helvetica','normal'); pdf.setTextColor(...C.textMid); pdf.setFontSize(rfSize-0.5);
  pdf.text(safeText(parcel.receiver_company,''), recvX+5, ry); ry += rfGap*0.8;
  pdf.setFontSize(rfSize); pdf.setTextColor(...C.textDark);
  ry = drawAddressBlock(pdf,
    [parcel.receiver_address, parcel.receiver_address_2, parcel.receiver_address_3,
     `${safeText(parcel.receiver_city,'')}, ${safeText(parcel.receiver_state,'')}`.replace(/^,\s*|,\s*$/g,''),
     codeToCountryName(safeText(parcel.receiver_country,'UK'))],
    recvX+5, ry, colW-6, rfSize, rfGap-1);
  ry += 1.5; pdf.setFontSize(7);
  labelValue(pdf, recvX+5, recvX+24, ry, 'Post Code:', safeText(parcel.receiver_postal_code,'N/A'), C.textMid, C.textDark, 7);
  { const ls = pdf.splitTextToSize(safeText(parcel.receiver_postal_code,'N/A'), colW-24) as string[]; ry += cGap*(ls.length); }
  labelValue(pdf, recvX+5, recvX+16, ry, 'Tel:', safeText(parcel.receiver_phone,'N/A'), C.textMid, C.textDark, 7);
  { const ls = pdf.splitTextToSize(safeText(parcel.receiver_phone,'N/A'), colW-16) as string[]; ry += cGap*(ls.length); }
  labelValue(pdf, recvX+5, recvX+16, ry, 'Email:', safeText(parcel.receiver_email,'N/A'), C.textMid, C.textDark, 7);

  yPos += cardH + 4;

  // ── Items table ────────────────────────────────────────────────────────────
  yPos = sectionHeader(pdf, M, yPos, IW, 7, 'ITEMS / CONTENTS', C.navy);
  yPos += 1;

  fillRect(pdf, M, yPos, IW, 6.5, C.rowAlt);
  strokeRect(pdf, M, yPos, IW, 6.5, C.border, 0.2);
  pdf.setFontSize(7.5); pdf.setFont('helvetica','bold'); pdf.setTextColor(...C.navy);
  pdf.text('DESCRIPTION', M+3, yPos+4.5);
  pdf.text('QTY', M+112, yPos+4.5);
  pdf.text('UNIT PRICE', M+128, yPos+4.5);
  pdf.text('TOTAL', PW-M-3, yPos+4.5, {align:'right'});
  yPos += 6.5;

  const items = parcel.items || [{ description:'General Goods', quantity:1, unit_price:parcel.total_price||0 }];
  let grandTotal = 0;
  const iCount = items.length;
  const iRowH  = iCount >= 7 ? 7 : 9;
  const iFSize = iCount >= 7 ? 6.5 : 8;

  items.forEach((item: any, idx: number) => {
    const tot = (item.quantity||1)*(item.unit_price||0);
    grandTotal += tot;
    fillRect(pdf, M, yPos, IW, iRowH, idx%2===0 ? C.white : C.offWhite);
    strokeRect(pdf, M, yPos, IW, iRowH, C.border, 0.15);
    pdf.setFont('helvetica','normal'); pdf.setFontSize(iFSize); pdf.setTextColor(...C.textDark);
    const desc = pdf.splitTextToSize(safeText(item.description,'Item'), 95) as string[];
    pdf.text(desc[0], M+3, yPos+iRowH*0.65);
    pdf.text(String(item.quantity||1), M+113, yPos+iRowH*0.65);
    pdf.text((item.unit_price||0).toFixed(2), M+130, yPos+iRowH*0.65);
    pdf.text(tot.toFixed(2), PW-M-3, yPos+iRowH*0.65, {align:'right'});
    yPos += iRowH;
  });

  // Total row
  fillRect(pdf, M, yPos, IW, 9, C.navy);
  pdf.setFont('helvetica','bold'); pdf.setFontSize(9); pdf.setTextColor(...C.white);
  const currency = parcel.currency || 'USD';
  pdf.text(`TOTAL ${currency}:`, M+4, yPos+6);
  pdf.setFontSize(11); pdf.setTextColor(...C.orange);
  pdf.text(`${currency} ${grandTotal.toFixed(2)}`, PW-M-4, yPos+6.5, {align:'right'});
  yPos += 12;

  // ── Shipment details ───────────────────────────────────────────────────────
  const L = parcel.length||12, W2 = parcel.width||12, H = parcel.height||16;
  const calcDim = parseFloat(((L*W2*H)/5000).toFixed(2));
  const dimW  = parcel.dim_weight_override != null ? parcel.dim_weight_override : calcDim;
  const dimStr = Number(dimW).toFixed(2);
  const actW  = parcel.weight||5;
  const chargeW = Math.max(parseFloat(dimStr), actW);
  const bookDate = parcel.created_at ? new Date(parcel.created_at).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');
  const docType = (parcel.document_type||'Non-Document').toUpperCase();
  const dimLabel = parcel.dim_weight_override!=null ? `${dimStr} KG*` : `${dimStr} KG`;

  yPos = sectionHeader(pdf, M, yPos, IW, 7, 'SHIPMENT DETAILS', C.navyDark);
  yPos += 1;
  fillRect(pdf, M, yPos, IW, 22, C.offWhite);
  strokeRect(pdf, M, yPos, IW, 22, C.border, 0.25);
  const col4W = IW/4;
  ['BOOKING DATE','DIMENSIONS','PIECES','WEIGHT'].forEach((lbl, i) => {
    const dx = M + i*col4W + 3;
    const vals = [bookDate, `${L}×${W2}×${H} cm`, String(parcel.pieces||1), `${actW} KG`];
    pdf.setFontSize(6); pdf.setFont('helvetica','bold'); pdf.setTextColor(...C.textMid); pdf.text(lbl, dx, yPos+5);
    pdf.setFontSize(i===3?10:8); pdf.setFont('helvetica','bold'); pdf.setTextColor(i===3?C.crimson:C.textDark); pdf.text(vals[i], dx, yPos+11);
  });
  fillRect(pdf, M+2, yPos+14, IW-4, 0.4, C.border);
  ['DIM WEIGHT','CHARGEABLE','TYPE'].forEach((lbl, i) => {
    const dx = M + i*col4W + 3;
    const vals2 = [dimLabel, `${chargeW} KG`, docType];
    pdf.setFontSize(6); pdf.setFont('helvetica','bold'); pdf.setTextColor(...C.textMid); pdf.text(lbl, dx, yPos+17.5);
    pdf.setFontSize(7.5); pdf.setFont('helvetica','normal'); pdf.setTextColor(...C.textDark); pdf.text(vals2[i], dx, yPos+21.5);
  });
  yPos += 25;

  // ── PAYMENT AMOUNT — most important section ─────────────────────────────────
  const freightPkr = parcel.amount_override != null ? parcel.amount_override : (parcel.freight_amount_pkr||0);
  const freightLabel = `PKR ${Number(freightPkr).toLocaleString()}`;
  const isOverride = parcel.amount_override != null;

  fillRect(pdf, M, yPos, IW, 20, C.crimsonLight);
  strokeRect(pdf, M, yPos, IW, 20, C.crimson, 0.5);
  // Left accent bar
  fillRect(pdf, M, yPos, 3, 20, C.crimson);
  pdf.setFontSize(8); pdf.setFont('helvetica','bold'); pdf.setTextColor(...C.crimson);
  pdf.text('SHIPMENT FREIGHT (TO BE COLLECTED FROM SENDER)', M+7, yPos+6);
  pdf.setFontSize(18); pdf.setFont('helvetica','bold'); pdf.setTextColor(...C.crimson);
  pdf.text(freightLabel, M+7, yPos+15);
  if (isOverride) {
    pdf.setFontSize(7); pdf.setFont('helvetica','italic'); pdf.setTextColor(...C.textMid);
    pdf.text('(rate override applied)', M+7, yPos+19);
  }
  // Right: per KG rate
  if (freightPkr > 0 && actW > 0) {
    const perKg = (Number(freightPkr)/actW).toFixed(0);
    pdf.setFontSize(7); pdf.setFont('helvetica','normal'); pdf.setTextColor(...C.textMid);
    pdf.text(`PKR ${perKg}/kg`, PW-M-4, yPos+10, {align:'right'});
  }
  yPos += 23;

  // ── Disclaimer ─────────────────────────────────────────────────────────────
  fillRect(pdf, M, yPos, IW, 10, C.offWhite);
  strokeRect(pdf, M, yPos, IW, 10, C.border, 0.2);
  pdf.setFontSize(5.5); pdf.setFont('helvetica','italic'); pdf.setTextColor(...C.textMid);
  const disc = 'I/WE HEREBY DECLARE AND UNDERTAKE THAT THE ABOVE MENTIONED PARTICULARS ARE TRUE AND CORRECT. THERE IS NOTHING DANGEROUS, ANTIQUES, NARCOTICS, LIQUID OR ANYTHING LIKELY TO CAUSE DAMAGE. IF ANYTHING FOUND I/WE WILL BE FULLY RESPONSIBLE. NOTE: ANY TAXES AT DESTINATION WILL BE PAID BY CONSIGNEE. MAXIMUM LIABILITY LIMITED TO USD 100.';
  const discLines = pdf.splitTextToSize(disc, IW-6) as string[];
  discLines.forEach((ln,i) => pdf.text(ln, M+3, yPos+3.5+i*2.3));
  yPos += 13;

  // ── Conditions ─────────────────────────────────────────────────────────────
  const condH = PH - 10 - yPos;
  fillRect(pdf, M, yPos, IW, condH, C.offWhite);
  strokeRect(pdf, M, yPos, IW, condH, C.border, 0.2);
  pdf.setFontSize(7.5); pdf.setFont('helvetica','bold'); pdf.setTextColor(...C.crimson);
  pdf.text('STANDARD TRADING CONDITIONS', PW/2, yPos+5, {align:'center'});
  fillRect(pdf, M, yPos+6.5, IW, 0.5, C.crimson);
  drawConditionsBlock(pdf, M+4, yPos+10, IW-8, 2.3);

  drawFooter(pdf, PW, PH);
  handlePDFOutput(pdf, `AWB-Sender-Copy-${refNumber}.pdf`, mode);
};


// ─── Generate all 3 bills ─────────────────────────────────────────────────────
export const generateAllBills = async (parcel: ParcelData): Promise<void> => {
  await generatePaymentInvoice(parcel);
  setTimeout(async () => { await generateAirwayBillVerification(parcel); }, 600);
  setTimeout(async () => { await generateAirwayBillWithPayment(parcel); }, 1200);
};
