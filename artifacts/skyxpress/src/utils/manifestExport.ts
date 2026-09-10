// @ts-nocheck
// ─────────────────────────────────────────────────────────────────────────────
// manifestExport.ts
//
// Excel export for a manifest's parcels. Replaces a previous version that
// mistakenly printed `reference_id` inside the "Tracking ID" column.
//
// FIX: this version puts the real `tracking_id` into the "Tracking ID"
// column and keeps `reference_id` in its OWN column ("Reference ID") so
// neither value is lost or confused with the other.
//
// Public API (kept identical to the previous version so callers in
// ManifestStock.tsx don't need to change):
//   exportManifestToExcel(
//     parcels: any[],
//     countryMap: Record<string, string>,
//     filename: string,
//     manifestId: string,
//   ): Promise<void>
// ─────────────────────────────────────────────────────────────────────────────
import ExcelJS from "exceljs";

type Parcel = Record<string, any>;

const HEADER_BG   = "FF1E293B"; // slate-900
const HEADER_FG   = "FFFFFFFF";
const ACCENT_BG   = "FFF97316"; // orange-500
const BAND_BG     = "FFF8FAFC"; // slate-50
const BORDER_CLR  = "FFE2E8F0"; // slate-200
const TOTAL_BG    = "FFFED7AA"; // orange-200

const num = (v: any, fallback = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const fmtWeight = (v: any): string => `${num(v).toFixed(2)} kg`;

const statusLabel = (raw: any): string => {
  if (!raw) return "—";
  return String(raw).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

const countryName = (code: any, countryMap: Record<string, string>): string => {
  if (!code) return "—";
  const c = String(code).toUpperCase();
  return countryMap[c] || String(code);
};

const routeCell = (p: Parcel, countryMap: Record<string, string>): string =>
  `${countryName(p.from_country ?? p.sender_country, countryMap)} → ${countryName(p.to_country ?? p.receiver_country, countryMap)}`;

// Column definitions for the parcels sheet.
// `key` is the parcel field we read; `header` is the displayed label.
// FIX: the "Tracking ID" column now reads from `tracking_id` (not reference_id).
const PARCEL_COLUMNS: { key: string; header: string; width: number; align?: "left" | "right" | "center"; fmt?: (p: Parcel, countryMap: Record<string, string>, idx: number) => string }[] = [
  { key: "#",              header: "#",              width: 6,  align: "center", fmt: (_p, _cm, i) => String(i + 1) },
  { key: "tracking_id",    header: "Tracking ID",    width: 24 },                                       // ← real Tracking ID
  { key: "reference_id",  header: "Reference ID",   width: 20 },                                       // ← kept in its own column
  { key: "sender_name",    header: "Shipper",        width: 22 },
  { key: "sender_phone",   header: "Shipper Phone",  width: 16 },
  { key: "receiver_name",  header: "Receiver",       width: 22 },
  { key: "receiver_phone", header: "Receiver Phone", width: 16 },
  { key: "receiver_address", header: "Receiver Address", width: 28 },
  { key: "receiver_city",  header: "Receiver City",   width: 16 },
  { key: "receiver_postal_code", header: "Postal Code", width: 12 },
  { key: "route",          header: "Route",          width: 26, fmt: (p, cm) => routeCell(p, cm) },
  { key: "pieces",         header: "Pkgs",           width: 8,  align: "right" },
  { key: "weight",         header: "Weight",         width: 12, align: "right", fmt: (p) => fmtWeight(p.weight) },
  { key: "total_price",    header: "Value",          width: 14, align: "right", fmt: (p) => `${num(p.total_price ?? p.value).toFixed(2)} ${p.currency || ""}`.trim() },
  { key: "service_type",   header: "Service",        width: 14 },
  { key: "parcel_type",    header: "Type",           width: 14 },
  { key: "current_status", header: "Status",        width: 18, fmt: (p) => statusLabel(p.current_status) },
  { key: "items_desc",      header: "Description",   width: 32, fmt: (p) => {
      const items = Array.isArray(p.items) ? p.items : [];
      if (items.length === 0) return p.description || "";
      return items.map((it: any) => it.description || "").filter(Boolean).join("; ");
    },
  },
];

const thinBorder: Partial<ExcelJS.Borders> = {
  top:     { style: "thin", color: { argb: BORDER_CLR } },
  left:    { style: "thin", color: { argb: BORDER_CLR } },
  bottom:  { style: "thin", color: { argb: BORDER_CLR } },
  right:   { style: "thin", color: { argb: BORDER_CLR } },
};

function styleHeaderCell(cell: ExcelJS.Cell) {
  cell.font = { bold: true, color: { argb: HEADER_FG }, size: 11, name: "Calibri" };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BG } };
  cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
  cell.border = thinBorder as any;
}

function styleDataCell(cell: ExcelJS.Cell, align: "left" | "right" | "center", band: boolean) {
  cell.font = { size: 10, name: "Calibri", color: { argb: "FF1E293B" } };
  cell.alignment = { vertical: "middle", horizontal: align, wrapText: false };
  cell.border = thinBorder as any;
  if (band) {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BAND_BG } };
  }
}

function styleTotalCell(cell: ExcelJS.Cell) {
  cell.font = { bold: true, size: 11, color: { argb: "FF1E293B" }, name: "Calibri" };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTAL_BG } };
  cell.border = thinBorder as any;
  cell.alignment = { vertical: "middle", horizontal: "right" };
}

function triggerDownload(blob: Blob, filename: string) {
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
export async function exportManifestToExcel(
  parcels: Parcel[],
  countryMap: Record<string, string>,
  filename: string,
  manifestId: string,
): Promise<void> {
  const safeParcels = Array.isArray(parcels) ? parcels : [];
  const wb = new ExcelJS.Workbook();
  wb.creator = "SkyXpress Manifest Stock";
  wb.created = new Date();
  wb.modified = new Date();

  // ── Sheet 1: Manifest summary ────────────────────────────────────────────
  const summary = wb.addWorksheet("Manifest Summary", {
    properties: { tabColor: { argb: ACCENT_BG } },
    views: [{ showGridLines: false }],
  });
  summary.columns = [
    { width: 28 }, { width: 60 },
  ];

  // Title block
  summary.mergeCells("A1:B1");
  const title = summary.getCell("A1");
  title.value = "SKYXPRESS — MANIFEST STOCK";
  title.font = { bold: true, size: 18, color: { argb: HEADER_FG }, name: "Calibri" };
  title.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BG } };
  summary.getRow(1).height = 34;

  summary.mergeCells("A2:B2");
  const sub = summary.getCell("A2");
  sub.value = `Manifest ID: ${manifestId}   ·   Generated: ${new Date().toLocaleString()}`;
  sub.font = { italic: true, size: 11, color: { argb: "FF475569" }, name: "Calibri" };
  sub.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  sub.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
  summary.getRow(2).height = 22;

  // Build the summary rows as typed objects (not tuples) so strict TS mode
  // can't widen any element to `string | undefined`.
  type SummaryRow = { label: string; value: string };
  const summaryPairs: SummaryRow[] = [
    { label: "Total Parcels (AWBs)", value: String(safeParcels.length) },
    { label: "Total Pieces",        value: String(safeParcels.reduce((s, p) => s + num(p.pieces, 1), 0)) },
    { label: "Total Weight",        value: `${safeParcels.reduce((s, p) => s + num(p.weight), 0).toFixed(2)} kg` },
    { label: "Total Value",         value: safeParcels.length > 0
        ? `${safeParcels[0]?.currency || "USD"} ${safeParcels.reduce((s, p) => s + num(p.total_price ?? p.value), 0).toFixed(2)}`
        : "—" },
  ];

  let rowIdx = 4;
  for (const { label, value } of summaryPairs) {
    const lblCell = summary.getCell(`A${rowIdx}`);
    lblCell.value = label;
    lblCell.font = { bold: true, size: 11, color: { argb: "FF1E3A8A" }, name: "Calibri" };
    lblCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    lblCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FF" } };
    lblCell.border = thinBorder as any;

    const valCell = summary.getCell(`B${rowIdx}`);
    valCell.value = value;
    valCell.font = { size: 11, color: { argb: "FF1E293B" }, name: "Calibri" };
    valCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    valCell.border = thinBorder as any;
    summary.getRow(rowIdx).height = 22;
    rowIdx++;
  }

  // ── Sheet 2: Parcels (the actual AWB table) ───────────────────────────────
  const ws = wb.addWorksheet("Parcels", {
    properties: { tabColor: { argb: ACCENT_BG } },
    views: [{ showGridLines: false, state: "frozen", ySplit: 1 }],
  });

  ws.columns = PARCEL_COLUMNS.map((c) => ({
    key: c.key,
    width: c.width,
    outlineLevel: 0,
  }));

  // Header row
  const headerRow = ws.getRow(1);
  PARCEL_COLUMNS.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col.header;
    styleHeaderCell(cell);
    if (col.align) cell.alignment = { vertical: "middle", horizontal: col.align, wrapText: true };
  });
  headerRow.height = 30;

  // Data rows — FIX: Tracking ID column reads `tracking_id`, NOT `reference_id`
  safeParcels.forEach((p, idx) => {
    const r = ws.getRow(idx + 2);
    const band = idx % 2 === 1;
    PARCEL_COLUMNS.forEach((col, ci) => {
      const cell = r.getCell(ci + 1);
      let value: any;
      if (col.fmt) {
        value = col.fmt(p, countryMap, idx);
      } else {
        value = p[col.key];
        if (value === undefined || value === null || value === "") value = "—";
      }
      cell.value = value;
      styleDataCell(cell, col.align || "left", band);
    });
    r.height = 18;
    r.commit();
  });

  // Totals row
  if (safeParcels.length > 0) {
    const totalsRowIdx = safeParcels.length + 2;
    const totalsRow = ws.getRow(totalsRowIdx);

    const totalPieces = safeParcels.reduce((s, p) => s + num(p.pieces, 1), 0);
    const totalWeight = safeParcels.reduce((s, p) => s + num(p.weight), 0);
    const totalValue  = safeParcels.reduce((s, p) => s + num(p.total_price ?? p.value), 0);
    const currency    = safeParcels[0]?.currency || "USD";

    // Label spans the first 11 columns (up to and including Route)
    const labelSpan = 11;
    ws.mergeCells(totalsRowIdx, 1, totalsRowIdx, labelSpan);
    const labelCell = totalsRow.getCell(1);
    labelCell.value = `TOTALS  ·  ${safeParcels.length} AWBs`;
    labelCell.font = { bold: true, size: 11, color: { argb: "FF1E293B" }, name: "Calibri" };
    labelCell.alignment = { vertical: "middle", horizontal: "right", indent: 1 };
    labelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTAL_BG } };
    labelCell.border = thinBorder as any;

    // Pkgs column = labelSpan + 1 (col 12 → index 11)
    const piecesCell = totalsRow.getCell(labelSpan + 1);
    piecesCell.value = totalPieces;
    styleTotalCell(piecesCell);
    piecesCell.alignment = { vertical: "middle", horizontal: "right" };

    // Weight column
    const weightCell = totalsRow.getCell(labelSpan + 2);
    weightCell.value = `${totalWeight.toFixed(2)} kg`;
    styleTotalCell(weightCell);

    // Value column
    const valueCell = totalsRow.getCell(labelSpan + 3);
    valueCell.value = `${currency} ${totalValue.toFixed(2)}`;
    styleTotalCell(valueCell);

    // Remaining cells in totals row — style as total
    for (let ci = labelSpan + 4; ci <= PARCEL_COLUMNS.length; ci++) {
      const c = totalsRow.getCell(ci);
      c.value = "";
      styleTotalCell(c);
    }
    totalsRow.height = 24;
    totalsRow.commit();
  }

  // Auto-filter on the parcels table
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to:   { row: safeParcels.length + 1, column: PARCEL_COLUMNS.length },
  };

  // Page setup for printing — `pageMargins` is set via the worksheet's
  // `pageSetup.margins` field in ExcelJS, not as a separate property.
  ws.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    paperSize: 9, // A4
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
  } as any;
  ws.headerFooter = {
    oddHeader: `&L&"Calibri,Bold"&12SkyXpress Manifest&KFF1E293B&C&"Calibri,Bold"&14${manifestId}&R&"Calibri,Italic"&10&D &T`,
    oddFooter: `&L&"Calibri,Italic"&10Generated by SkyXpress Manifest Stock&C&"Calibri,Bold"&10Page &P of &N&R&"Calibri,Italic"&10Confidential`,
  };

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  triggerDownload(blob, filename || `SkyXpress_Manifest_${manifestId}.xlsx`);
}

export default exportManifestToExcel;
