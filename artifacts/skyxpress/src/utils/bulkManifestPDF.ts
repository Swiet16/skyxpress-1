// @ts-nocheck
// Bulk Manifest PDF — premium redesign with SkyXpress branding
import jsPDF from "jspdf";
import logoUrl from "@/assets/skyxpress_logo.png";
import type { ManifestStockEntry } from "./manifestStorage";

// ── Brand palette ─────────────────────────────────────────────────────────────
type RGB = [number, number, number];
const NAVY:    RGB = [15, 35, 85];
const NAVY2:   RGB = [22, 52, 120];
const ORANGE:  RGB = [226, 84, 20];
const ORANGE2: RGB = [245, 115, 50];
const WHITE:   RGB = [255, 255, 255];
const OFFWHITE:RGB = [248, 249, 252];
const LGRAY:   RGB = [237, 240, 248];
const MGRAY:   RGB = [160, 170, 195];
const DARK:    RGB = [18, 22, 45];
const ALT:     RGB = [242, 245, 255];

// Status colour map — AWB-level statuses
const ST_COLORS: Record<string, { bg: RGB; text: RGB }> = {
  "DELIVERED":        { bg: [16, 150, 72],   text: WHITE },
  "IN TRANSIT":       { bg: [37, 99, 235],   text: WHITE },
  "PICKED UP":        { bg: [99, 102, 241],  text: WHITE },
  "PROCESSING":       { bg: [202, 138, 4],   text: WHITE },
  "CREATED":          { bg: [202, 138, 4],   text: WHITE },
  "OUT FOR DELIVERY": { bg: [99, 102, 241],  text: WHITE },
  "CUSTOMS":          { bg: [234, 88, 12],   text: WHITE },
  "CANCELLED":        { bg: [220, 38, 38],   text: WHITE },
  "CUSTOM HOLD":      { bg: [220, 38, 38],   text: WHITE },
};

// Manifest-level status styles for PDF
const MANIFEST_STATUS_STYLES: Record<string, { bg: RGB; text: RGB; label: string; icon: string }> = {
  live:             { bg: [16, 185, 129],  text: WHITE, label: "LIVE",             icon: "⚡" },
  pending:          { bg: [245, 158, 11],  text: WHITE, label: "PENDING",          icon: "⏳" },
  picked_up:        { bg: [139, 92, 246],  text: WHITE, label: "PICKED UP",        icon: "📦" },
  in_transit:       { bg: [37, 99, 235],   text: WHITE, label: "IN TRANSIT",       icon: "✈" },
  out_for_delivery: { bg: [249, 115, 22],  text: WHITE, label: "OUT FOR DELIVERY", icon: "🚚" },
  delivered:        { bg: [22, 163, 74],   text: WHITE, label: "DELIVERED",        icon: "✓" },
  returned:         { bg: [239, 68, 68],   text: WHITE, label: "RETURNED",         icon: "↩" },
};

function cc(pdf: jsPDF, r: RGB) { pdf.setFillColor(r[0], r[1], r[2]); }
function tc(pdf: jsPDF, r: RGB) { pdf.setTextColor(r[0], r[1], r[2]); }
function dc(pdf: jsPDF, r: RGB) { pdf.setDrawColor(r[0], r[1], r[2]); }

function country(code: string, map: Record<string, string>) {
  return map[code] || code || "—";
}

function label(pdf: jsPDF, text: string, x: number, y: number, maxW: number) {
  const lines = pdf.splitTextToSize(text || "—", maxW) as string[];
  pdf.text(lines[0], x, y);
}

export async function generateBulkManifestPDF(
  entry: ManifestStockEntry,
  countryMap: Record<string, string>
): Promise<void> {
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const PW = 297, PH = 210;
  const ML = 10, MR = 10; // margins
  const CW = PW - ML - MR; // content width = 277

  // ═══════════════════════════════════════════════════════════════════════════
  // HEADER
  // ═══════════════════════════════════════════════════════════════════════════

  // Navy base
  cc(pdf, NAVY); pdf.rect(0, 0, PW, 36, "F");
  // Subtle lighter stripe on top
  cc(pdf, NAVY2); pdf.rect(0, 0, PW, 5, "F");
  // Orange accent bar at bottom of header
  cc(pdf, ORANGE); pdf.rect(0, 36, PW, 3, "F");

  // Logo (left)
  try {
    const img = new Image(); img.src = logoUrl;
    await new Promise(res => { img.onload = res; img.onerror = res; });
    pdf.addImage(img, "PNG", ML, 3, 44, 22);
  } catch (_) {}

  // Center title block
  tc(pdf, WHITE);
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(19);
  pdf.text("SHIPMENT MANIFEST", PW / 2, 16, { align: "center" });
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(8);
  tc(pdf, MGRAY);
  pdf.text("SkyXpress International Courier & Cargo  ·  skyxpress.site", PW / 2, 23, { align: "center" });

  // Manifest ID badge (right)
  const bW = 62, bH = 26, bX = PW - MR - bW, bY = 4;
  cc(pdf, ORANGE); pdf.roundedRect(bX, bY, bW, bH, 3, 3, "F");
  // inner dark stripe for label
  cc(pdf, [190, 60, 10]); pdf.roundedRect(bX, bY, bW, 9, 3, 3, "F");
  cc(pdf, [190, 60, 10]); pdf.rect(bX, bY + 6, bW, 3, "F"); // square bottom corners of label
  tc(pdf, WHITE);
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(6);
  pdf.text("MANIFEST ID", bX + bW / 2, bY + 6, { align: "center" });
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.text(entry.manifestId, bX + bW / 2, bY + 20, { align: "center" });

  // Manifest status badge — rendered right below the manifest ID badge
  const mStatus = (entry as any).manifestStatus as string | undefined;
  if (mStatus && MANIFEST_STATUS_STYLES[mStatus]) {
    const ms = MANIFEST_STATUS_STYLES[mStatus];
    const sbW = bW, sbH = 12, sbX = bX, sbY = bY + bH + 2;
    cc(pdf, ms.bg); pdf.roundedRect(sbX, sbY, sbW, sbH, 2, 2, "F");
    // Subtle left stripe / icon band
    cc(pdf, [ms.bg[0] * 0.8, ms.bg[1] * 0.8, ms.bg[2] * 0.8] as RGB);
    pdf.roundedRect(sbX, sbY, 10, sbH, 2, 2, "F");
    pdf.rect(sbX + 8, sbY, 4, sbH, "F");
    // Icon
    tc(pdf, WHITE);
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(7);
    pdf.text(ms.icon, sbX + 5, sbY + 7.5, { align: "center" });
    // Label
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(7.5);
    pdf.text(ms.label, sbX + sbW / 2 + 2, sbY + 7.5, { align: "center" });
  }

  let y = 43;

  // ═══════════════════════════════════════════════════════════════════════════
  // SUMMARY STATS — 6 cards in a row
  // ═══════════════════════════════════════════════════════════════════════════
  const dateStr = new Date(entry.createdAt).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
  // Normalise service type: underscores → spaces, comma-separated → newline-friendly
  const svcRaw = entry.serviceType.replace(/_/g, " ");

  const stats = [
    { label: "GENERATED",     value: dateStr },
    { label: "TOTAL PARCELS", value: String(entry.parcelCount) },
    { label: "TOTAL PIECES",  value: String(entry.totalPieces) },
    { label: "TOTAL WEIGHT",  value: `${entry.totalWeight.toFixed(2)} kg` },
    { label: "TOTAL VALUE",   value: `${entry.currency} ${entry.totalValue.toFixed(2)}` },
    { label: "SERVICE TYPE",  value: svcRaw, wrap: true },
  ];

  const cardW = (CW - 5 * 2) / 6; // 6 cards with 2mm gaps
  const cardH = 16; // slightly taller to accommodate 2-line service

  stats.forEach((s: any, i) => {
    const cx = ML + i * (cardW + 2);
    cc(pdf, LGRAY); pdf.roundedRect(cx, y, cardW, cardH, 1.5, 1.5, "F");
    cc(pdf, ORANGE); pdf.rect(cx, y, cardW, 1.5, "F");

    // Label
    tc(pdf, ORANGE);
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(5.5);
    pdf.text(s.label, cx + cardW / 2, y + 6, { align: "center" });

    // Value — wrap long service types across 2 lines at smaller font
    tc(pdf, DARK);
    if (s.wrap) {
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(6.5);
      const lines = pdf.splitTextToSize(s.value, cardW - 2) as string[];
      const maxLines = lines.slice(0, 2);
      const lineH = 4;
      const startY = y + 10 + (maxLines.length === 1 ? 2 : 0);
      maxLines.forEach((line, li) => {
        pdf.text(line, cx + cardW / 2, startY + li * lineH, { align: "center" });
      });
    } else {
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(8.5);
      pdf.text(s.value, cx + cardW / 2, y + 12.5, { align: "center" });
    }
  });
  y += cardH + 5;

  // ═══════════════════════════════════════════════════════════════════════════
  // TABLE
  // ═══════════════════════════════════════════════════════════════════════════

  // Column definitions: [label, x-offset from ML, width]
  const cols: [string, number, number][] = [
    ["#",          0,    6],
    ["HAWB / REF", 7,   25],
    ["SHIPPER",    33,  32],
    ["CONSIGNEE",  66,  32],
    ["FROM",       99,  22],
    ["TO",         122, 22],
    ["PKG",        145, 18],
    ["PCS",        164, 9],
    ["WT (kg)",    174, 16],
    ["VALUE",      191, 22],
    ["SERVICE",    214, 26],
    ["STATUS",     241, 36],
  ];

  const ROW_H = 7;

  // Header row
  cc(pdf, NAVY);
  pdf.rect(ML, y, CW, ROW_H + 1, "F");
  cols.forEach(([lbl, ox]) => {
    tc(pdf, WHITE);
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(6);
    pdf.text(lbl, ML + ox + 1, y + 5.5);
  });
  y += ROW_H + 1;

  // Data rows
  const maxRows = Math.min(entry.parcels.length, 20);
  for (let i = 0; i < maxRows; i++) {
    const p = entry.parcels[i];
    const isAlt = i % 2 === 1;

    // Row background
    if (isAlt) { cc(pdf, ALT); pdf.rect(ML, y, CW, ROW_H, "F"); }

    // Row separator
    dc(pdf, [220, 225, 240]); pdf.setLineWidth(0.12);
    pdf.line(ML, y + ROW_H, ML + CW, y + ROW_H);

    tc(pdf, DARK);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(6.8);

    const row = (v: string, ox: number, w: number) => {
      const lines = pdf.splitTextToSize(v || "—", w - 1) as string[];
      pdf.text(lines[0], ML + ox + 1, y + 5);
    };

    pdf.setFont("helvetica", "normal"); pdf.setFontSize(6.8);
    row(String(i + 1),                                   0,   5);
    row(p.reference_id || p.tracking_id || "",           7,   24);
    row(p.sender_name || "",                              33,  31);
    row(p.receiver_name || "",                            66,  31);
    row(country(p.from_country, countryMap),              99,  21);
    row(country(p.to_country,   countryMap),              122, 21);
    row(p.parcel_type || "",                              145, 17);
    row(String(p.pieces ?? 1),                            164, 8);
    row(Number(p.weight ?? 0).toFixed(2),                 174, 15);
    row(`${p.currency || ""} ${Number(p.total_price ?? 0).toFixed(2)}`, 191, 21);

    // SERVICE — smaller font, truncate long names
    const svc = (p.service_type || "").replace(/_/g, " ");
    const svcShort = svc.length > 13 ? svc.slice(0, 12) + "…" : svc;
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(5.8);
    tc(pdf, DARK);
    pdf.text(svcShort, ML + 214 + 1, y + 5);

    // STATUS badge — compact
    const raw = (p.current_status || "").replace(/_/g, " ").toUpperCase();
    const rawShort = raw.length > 12 ? raw.slice(0, 11) + "…" : raw;
    const stC = ST_COLORS[raw] || { bg: [100, 116, 139] as RGB, text: WHITE };
    cc(pdf, stC.bg as RGB);
    pdf.roundedRect(ML + 241 + 1, y + 1.3, 34, ROW_H - 2.6, 1.5, 1.5, "F");
    tc(pdf, stC.text as RGB);
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(5);
    pdf.text(rawShort, ML + 241 + 18, y + 5.1, { align: "center" });

    y += ROW_H;
  }

  // Overflow note
  if (entry.parcels.length > maxRows) {
    tc(pdf, MGRAY); pdf.setFont("helvetica", "italic"); pdf.setFontSize(6.5);
    pdf.text(
      `… ${entry.parcels.length - maxRows} additional parcels — see Excel export for full list.`,
      ML + 2, y + 5
    );
    y += 7;
  }

  // ── Totals row ─────────────────────────────────────────────────────────────
  cc(pdf, ORANGE); pdf.rect(ML, y, CW, ROW_H + 1.5, "F");
  tc(pdf, WHITE); pdf.setFont("helvetica", "bold"); pdf.setFontSize(8);
  pdf.text("TOTALS", ML + 2, y + 6);
  pdf.text(String(entry.totalPieces),                        ML + 165, y + 6);
  pdf.text(`${entry.totalWeight.toFixed(2)} kg`,             ML + 175, y + 6);
  pdf.text(`${entry.currency} ${entry.totalValue.toFixed(2)}`, ML + 192, y + 6);
  y += ROW_H + 6;

  // ═══════════════════════════════════════════════════════════════════════════
  // SIGNATURE STRIP
  // ═══════════════════════════════════════════════════════════════════════════
  const remaining = PH - 14 - y; // space before footer
  const sigH = Math.min(remaining - 2, 20);
  if (sigH > 10) {
    const sigW = (CW - 8) / 3;
    const sigs = [
      { title: "PREPARED BY",        sub: "Authorized Signatory" },
      { title: "VERIFIED BY",        sub: "Supervisor / Manager" },
      { title: "CARRIER'S SIGNATURE", sub: "Agent / Carrier" },
    ];
    sigs.forEach((s, i) => {
      const sx = ML + i * (sigW + 4);
      cc(pdf, OFFWHITE); pdf.roundedRect(sx, y, sigW, sigH, 2, 2, "F");
      dc(pdf, LGRAY); pdf.setLineWidth(0.3);
      pdf.roundedRect(sx, y, sigW, sigH, 2, 2, "S");

      tc(pdf, ORANGE); pdf.setFont("helvetica", "bold"); pdf.setFontSize(6);
      pdf.text(s.title, sx + 3, y + 6);

      dc(pdf, ORANGE); pdf.setLineWidth(0.5);
      pdf.line(sx + 4, y + sigH - 5, sx + sigW - 4, y + sigH - 5);

      tc(pdf, MGRAY); pdf.setFont("helvetica", "normal"); pdf.setFontSize(5.5);
      pdf.text(s.sub, sx + 3, y + sigH - 1.5);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FOOTER
  // ═══════════════════════════════════════════════════════════════════════════
  cc(pdf, NAVY); pdf.rect(0, PH - 10, PW, 10, "F");
  cc(pdf, ORANGE); pdf.rect(0, PH - 11, PW, 1, "F");
  tc(pdf, MGRAY); pdf.setFont("helvetica", "normal"); pdf.setFontSize(6.5);
  pdf.text(
    `SkyXpress International Courier & Cargo  ·  Manifest ID: ${entry.manifestId}  ·  Generated: ${new Date().toLocaleString()}  ·  This document is system-generated and does not require a wet signature.`,
    PW / 2, PH - 4, { align: "center" }
  );

  pdf.save(`SkyXpress_Manifest_${entry.manifestId}.pdf`);
}
