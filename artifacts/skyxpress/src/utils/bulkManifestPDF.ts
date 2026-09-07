// @ts-nocheck
// ─────────────────────────────────────────────────────────────────────────────
// bulkManifestPDF.ts
//
// Generates a printable PDF for a single manifest (multi-AWB).
// Replaces a previous version that mistakenly printed `reference_id` inside
// the "Tracking ID" column.
//
// FIX: the "Tracking ID" column now reads `tracking_id` from each parcel.
// `reference_id` is shown in its own dedicated column so neither value is
// lost or confused.
//
// Public API (unchanged from the previous version):
//   generateBulkManifestPDF(entry, countryMap): Promise<void>
//
//   entry       — the full ManifestStockEntry object
//   countryMap  — Record<country_code, country_name> from Supabase `countries`
// ─────────────────────────────────────────────────────────────────────────────
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Parcel = Record<string, any>;
type ManifestEntry = Record<string, any> & {
  parcels?: Parcel[];
  manifestId: string;
};

const SLATE_900: [number, number, number] = [30, 41, 59];    // #1E293B
const SLATE_800: [number, number, number] = [15, 23, 42];    // #0F172A
const BLUE_900:  [number, number, number] = [30, 58, 138];   // #1E3A8A
const ORANGE_500:[number, number, number] = [249, 115, 22]; // #F97316
const ORANGE_100:[number, number, number] = [255, 237, 213];// #FFEDD5
const SLATE_50:  [number, number, number] = [248, 250, 252]; // #F8FAFC
const SLATE_200: [number, number, number] = [226, 232, 240]; // #E2E8F0
const SLATE_500: [number, number, number] = [100, 116, 139]; // #64748B
const SLATE_700: [number, number, number] = [51, 65, 85];    // #334155
const GREEN_700: [number, number, number] = [21, 128, 61];    // #15803D
const WHITE:     [number, number, number] = [255, 255, 255];

const num = (v: any, fallback = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const statusLabel = (raw: any): string => {
  if (!raw) return "—";
  return String(raw).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

const countryName = (code: any, countryMap: Record<string, string>): string => {
  if (!code) return "—";
  const c = String(code).toUpperCase();
  return countryMap[c] || String(code);
};

const routeStr = (p: Parcel, countryMap: Record<string, string>): string => {
  const from = countryName(p.from_country ?? p.sender_country, countryMap);
  const to   = countryName(p.to_country   ?? p.receiver_country, countryMap);
  return `${from} → ${to}`;
};

// Column definitions for the parcels table.
// FIX: the "Tracking ID" column now reads from `tracking_id` (not reference_id).
const PARCEL_COLUMNS: { header: string; align: "left" | "right" | "center"; width: number; render: (p: Parcel, idx: number, countryMap: Record<string, string>) => string }[] = [
  { header: "#",            align: "center", width: 6,  render: (_p, i) => String(i + 1) },
  { header: "Tracking ID",  align: "left",   width: 32, render: (p) => String(p.tracking_id || "—") }, // ← FIX: real tracking_id
  { header: "Reference ID", align: "left",   width: 24, render: (p) => String(p.reference_id || "—") }, // kept in own column
  { header: "Shipper",      align: "left",   width: 28, render: (p) => String(p.sender_name || "—") },
  { header: "Receiver",     align: "left",   width: 28, render: (p) => String(p.receiver_name || "—") },
  { header: "Route",        align: "left",   width: 32, render: (p, _i, cm) => routeStr(p, cm) },
  { header: "Pkgs",         align: "right",  width: 10, render: (p) => String(num(p.pieces, 1)) },
  { header: "Weight",       align: "right",  width: 16, render: (p) => `${num(p.weight).toFixed(2)} kg` },
  { header: "Value",        align: "right",  width: 18, render: (p) => `${num(p.total_price ?? p.value).toFixed(2)} ${p.currency || ""}`.trim() },
  { header: "Service",      align: "left",   width: 16, render: (p) => String(p.service_type || "—") },
  { header: "Status",       align: "left",   width: 18, render: (p) => statusLabel(p.current_status) },
];

function drawHeaderBand(doc: jsPDF, entry: ManifestEntry, countryMap: Record<string, string>): number {
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;

  // Top accent bar
  doc.setFillColor(...SLATE_900);
  doc.rect(0, 0, pageW, 28, "F");

  doc.setFillColor(...ORANGE_500);
  doc.rect(0, 28, pageW, 3, "F");

  // Brand block (left)
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("SKYXPRESS", margin, 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(220, 220, 220);
  doc.text("Manifest Stock  ·  Bulk AWB Manifest", margin, 21);

  // Manifest ID block (right)
  doc.setTextColor(...ORANGE_100);
  doc.setFontSize(8);
  doc.text("MANIFEST ID", pageW - margin, 11, { align: "right" });

  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(String(entry.manifestId || "—"), pageW - margin, 19, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(220, 220, 220);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageW - margin, 24, { align: "right" });

  // Info chips strip — left half manifest info, right half route summary
  let y = 42;
  const chipH = 9;

  const infoChips: [string, string][] = [
    ["Date",         entry.manifestDate ? String(entry.manifestDate) : "—"],
    ["Flight No",    String(entry.flightNo || "—")],
    ["Run No",       String(entry.runNumber || "—")],
    ["Service",      String(entry.service || entry.serviceType || "—")],
    ["Forwarder",    String(entry.forwarder || "—")],
    ["Origin Hub",   String(entry.originHub || "—")],
    ["Dest Hub",     String(entry.destinationHub || "—")],
    ["Bags",         String(entry.noOfBags ?? "—")],
    ["Total AWBs",   String(entry.parcels?.length || 0)],
  ];

  const chipW = (pageW - margin * 2) / 3;
  infoChips.forEach((chip, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = margin + col * chipW;
    const cy = y + row * (chipH + 4);

    doc.setFillColor(...SLATE_50);
    doc.roundedRect(x, cy, chipW - 4, chipH, 1.5, 1.5, "F");

    doc.setTextColor(...SLATE_500);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.text(String(chip[0]).toUpperCase(), x + 3, cy + 3.5);

    doc.setTextColor(...SLATE_800);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    const val = String(chip[1]);
    const truncated = doc.splitTextToSize(val, chipW - 10)[0] || "";
    doc.text(truncated, x + 3, cy + 7.5);
  });

  const chipsHeight = Math.ceil(infoChips.length / 3) * (chipH + 4);
  y += chipsHeight + 4;

  // Route summary band
  const routeBandH = 22;
  doc.setFillColor(...BLUE_900);
  doc.roundedRect(margin, y, pageW - margin * 2, routeBandH, 2, 2, "F");

  const routeLeft = entry.originHub || entry.fromCountry || "—";
  const routeRight = entry.destinationHub || entry.toCountry || "—";

  doc.setTextColor(180, 200, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("FROM", margin + 6, y + 6);

  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  const routeLeftTxt = doc.splitTextToSize(String(routeLeft), (pageW - margin * 2) / 2 - 14)[0] || "";
  doc.text(routeLeftTxt, margin + 6, y + 14);

  doc.setTextColor(...ORANGE_500);
  doc.setFontSize(14);
  doc.text("\u2708", pageW / 2, y + 13, { align: "center" });

  doc.setTextColor(180, 200, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("TO", pageW - margin - 6, y + 6, { align: "right" });

  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  const routeRightTxt = doc.splitTextToSize(String(routeRight), (pageW - margin * 2) / 2 - 14)[0] || "";
  doc.text(routeRightTxt, pageW - margin - 6, y + 14, { align: "right" });

  y += routeBandH + 6;

  return y;
}

function drawFooter(doc: jsPDF) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;

  doc.setDrawColor(...SLATE_200);
  doc.setLineWidth(0.3);
  doc.line(margin, pageH - 14, pageW - margin, pageH - 14);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(...SLATE_500);
  doc.text("Generated by SkyXpress Manifest Stock", margin, pageH - 9);

  const pageStr = `Page ${doc.getCurrentPageInfo().pageNumber} of ${doc.getNumberOfPages()}`;
  doc.text(pageStr, pageW - margin, pageH - 9, { align: "right" });

  doc.text("Confidential", pageW / 2, pageH - 9, { align: "center" });
}

function triggerDownload(doc: jsPDF, filename: string) {
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5_000);
}

// ── Public function ──────────────────────────────────────────────────────────
export async function generateBulkManifestPDF(
  entry: ManifestEntry,
  countryMap: Record<string, string> = {},
): Promise<void> {
  const parcels = Array.isArray(entry.parcels) ? entry.parcels : [];
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  // Header band (returns the y position where the table should start)
  const tableStartY = drawHeaderBand(doc, entry, countryMap);

  // ── Parcels table (the main content) ───────────────────────────────────────
  // FIX: the "Tracking ID" column reads `tracking_id`, NOT `reference_id`.
  const head: string[][] = [PARCEL_COLUMNS.map((c) => c.header)];
  const body: string[][] = parcels.map((p, i) =>
    PARCEL_COLUMNS.map((c) => c.render(p, i, countryMap))
  );

  // Compute column widths as proportions of the available page width
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  const tableW = pageW - margin * 2;
  const totalWidthUnits = PARCEL_COLUMNS.reduce((s, c) => s + c.width, 0);
  const colStyles: { columnWidth: number }[] = PARCEL_COLUMNS.map((c) => ({
    columnWidth: (c.width / totalWidthUnits) * tableW,
  }));

  // Totals row appended at the end (drawn as a distinct styled footer row)
  const totalPieces = parcels.reduce((s, p) => s + num(p.pieces, 1), 0);
  const totalWeight = parcels.reduce((s, p) => s + num(p.weight), 0);
  const totalValue  = parcels.reduce((s, p) => s + num(p.total_price ?? p.value), 0);
  const currency    = parcels[0]?.currency || "USD";

  // Build totals row: empty for # / Tracking / Ref / Shipper / Receiver / Route
  const totalsRow: string[] = PARCEL_COLUMNS.map((c, idx) => {
    if (idx === 0) return "TOTALS";
    if (c.header === "Pkgs")    return String(totalPieces);
    if (c.header === "Weight")   return `${totalWeight.toFixed(2)} kg`;
    if (c.header === "Value")   return `${currency} ${totalValue.toFixed(2)}`;
    return "";
  });

  const finalBody = parcels.length > 0 ? [...body, totalsRow] : [];

  // @ts-ignore — jspdf-autotable types vary across versions
  autoTable(doc, {
    startY: tableStartY,
    head,
    body: finalBody,
    margin: { left: margin, right: margin, top: 6, bottom: 18 },
    tableWidth: tableW,
    columnStyles: colStyles as any,
    headStyles: {
      fillColor: SLATE_800,
      textColor: WHITE,
      fontStyle: "bold",
      fontSize: 8,
      halign: "left" as const,
      lineColor: SLATE_200,
      lineWidth: 0.2,
      cellPadding: { top: 3, bottom: 3, left: 2.5, right: 2.5 } as any,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: SLATE_700,
      lineColor: SLATE_200,
      lineWidth: 0.15,
      cellPadding: { top: 2.2, bottom: 2.2, left: 2.5, right: 2.5 } as any,
    },
    alternateRowStyles: {
      fillColor: SLATE_50,
    },
    // Style the totals row (last row) with a distinct background + bold
    didParseCell: (data: any) => {
      if (data.section !== "body") return;
      if (parcels.length > 0 && data.row.index === parcels.length) {
        // Totals row
        data.cell.styles.fillColor = ORANGE_100;
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.textColor = SLATE_800;
      }
      // Right-align numeric columns
      const colDef = PARCEL_COLUMNS[data.column.index];
      if (colDef && colDef.align === "right") {
        data.cell.styles.halign = "right" as const;
      } else if (colDef && colDef.align === "center") {
        data.cell.styles.halign = "center" as const;
      }
      // Highlight the Tracking ID column with bold blue text so it stands out
      if (colDef && colDef.header === "Tracking ID") {
        data.cell.styles.fontStyle = "bold";
        if (data.section === "body" && !(parcels.length > 0 && data.row.index === parcels.length)) {
          data.cell.styles.textColor = BLUE_900;
        }
      }
    },
    willDrawPage: (data: any) => {
      // Re-draw the header band on every page so multi-page PDFs stay readable
      drawHeaderBand(doc, entry, countryMap);
    },
    didDrawPage: (data: any) => {
      drawFooter(doc);
    },
  });

  // Empty state — if there are no parcels, drop a friendly note
  if (parcels.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(11);
    doc.setTextColor(...SLATE_500);
    doc.text(
      "No parcels attached to this manifest yet.",
      doc.internal.pageSize.getWidth() / 2,
      tableStartY + 24,
      { align: "center" }
    );
  }

  const filename = `SkyXpress_Manifest_${entry.manifestId}.pdf`;
  triggerDownload(doc, filename);
}

export default generateBulkManifestPDF;
