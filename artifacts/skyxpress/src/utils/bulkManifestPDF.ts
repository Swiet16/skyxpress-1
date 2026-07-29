// @ts-nocheck
// Bulk manifest PDF generator — styled with SkyXpress branding + manifest ID
import jsPDF from "jspdf";
import logoUrl from "@/assets/skyxpress_logo.png";
import type { ManifestStockEntry } from "./manifestStorage";

type RGB = [number, number, number];

const NAVY:    RGB = [18, 42, 100];
const ORANGE:  RGB = [230, 88, 30];
const BLUE:    RGB = [30, 80, 200];
const WHITE:   RGB = [255, 255, 255];
const LGRAY:   RGB = [245, 246, 250];
const MGRAY:   RGB = [180, 186, 200];
const DARK:    RGB = [20, 20, 40];
const ALTROW:  RGB = [235, 242, 255];

function getCountryDisplay(code: string, countryMap: Record<string, string>): string {
  if (!code) return "";
  return countryMap[code] || code;
}

export async function generateBulkManifestPDF(
  entry: ManifestStockEntry,
  countryMap: Record<string, string>
): Promise<void> {
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = 297, H = 210, M = 12;

  // ── Header ────────────────────────────────────────────────────────────────
  pdf.setFillColor(...NAVY); pdf.rect(0, 0, W, 32, "F");
  pdf.setFillColor(...ORANGE); pdf.rect(0, 32, W, 2.5, "F");

  // Logo
  try {
    const img = new Image(); img.src = logoUrl;
    await new Promise((res) => { img.onload = res; img.onerror = res; });
    pdf.addImage(img, "PNG", M, 3, 46, 24);
  } catch (_) {}

  // Title block
  pdf.setTextColor(...WHITE); pdf.setFont("helvetica", "bold"); pdf.setFontSize(17);
  pdf.text("SHIPMENT MANIFEST", W / 2, 14, { align: "center" });
  pdf.setFontSize(9); pdf.setFont("helvetica", "normal"); pdf.setTextColor(...MGRAY);
  pdf.text("SkyXpress International Courier & Cargo  •  skyxpress.site", W / 2, 20, { align: "center" });

  // Manifest ID — prominent badge style on the right
  const midX = W - M - 60;
  pdf.setFillColor(...ORANGE); pdf.roundedRect(midX, 6, 65, 20, 3, 3, "F");
  pdf.setTextColor(...WHITE); pdf.setFont("helvetica", "bold"); pdf.setFontSize(7.5);
  pdf.text("MANIFEST ID", midX + 32.5, 12.5, { align: "center" });
  pdf.setFontSize(14);
  pdf.text(entry.manifestId, midX + 32.5, 22, { align: "center" });

  let y = 40;

  // ── Summary strip ─────────────────────────────────────────────────────────
  pdf.setFillColor(...LGRAY); pdf.roundedRect(M, y, W - M * 2, 14, 2, 2, "F");
  const dateStr = new Date(entry.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const summaryFields: [string, string, number][] = [
    ["Generated", dateStr, M + 3],
    ["Total Parcels", String(entry.parcelCount), M + 52],
    ["Total Pieces", String(entry.totalPieces), M + 100],
    ["Total Weight", `${entry.totalWeight.toFixed(2)} kg`, M + 145],
    ["Total Value", `${entry.currency} ${entry.totalValue.toFixed(2)}`, M + 195],
    ["Service", entry.serviceType, M + 248],
  ];
  summaryFields.forEach(([lbl, val, x]) => {
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(6); pdf.setTextColor(...BLUE);
    pdf.text(lbl.toUpperCase(), x, y + 5);
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(8.5); pdf.setTextColor(...DARK);
    pdf.text(val, x, y + 11.5);
  });
  y += 19;

  // ── Table header ──────────────────────────────────────────────────────────
  const cols: [string, number, number][] = [
    ["#",              M,      8],
    ["HAWB / REF",     M + 9,  28],
    ["SHIPPER",        M + 38, 35],
    ["CONSIGNEE",      M + 74, 35],
    ["FROM",           M + 110, 22],
    ["TO",             M + 133, 22],
    ["PKG TYPE",       M + 156, 24],
    ["PCS",            M + 181, 10],
    ["WT (kg)",        M + 192, 16],
    ["VALUE",          M + 209, 20],
    ["SERVICE",        M + 230, 22],
    ["STATUS",         M + 253, 28],
  ];

  const rowH = 7;
  pdf.setFillColor(...NAVY); pdf.rect(M, y, W - M * 2, rowH + 1, "F");
  cols.forEach(([label, x]) => {
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(6.5); pdf.setTextColor(...WHITE);
    pdf.text(label, x + 1, y + 5.5);
  });
  y += rowH + 1;

  // ── Data rows ─────────────────────────────────────────────────────────────
  const maxRows = Math.min(entry.parcels.length, 22); // fit on one page
  for (let i = 0; i < maxRows; i++) {
    const p = entry.parcels[i];
    const isAlt = i % 2 === 1;
    if (isAlt) { pdf.setFillColor(...ALTROW); pdf.rect(M, y, W - M * 2, rowH, "F"); }

    pdf.setFont("helvetica", "normal"); pdf.setFontSize(7); pdf.setTextColor(...DARK);

    const desc = (v: string, x: number, maxW: number) => {
      const lines = pdf.splitTextToSize(v || "—", maxW) as string[];
      pdf.text(lines[0], x + 1, y + 5);
    };

    desc(String(i + 1),                                            M,       7);
    desc(p.reference_id || p.tracking_id || "",                    M + 9,   27);
    desc(p.sender_name || "",                                       M + 38,  34);
    desc(p.receiver_name || "",                                     M + 74,  34);
    desc(getCountryDisplay(p.from_country, countryMap),             M + 110, 21);
    desc(getCountryDisplay(p.to_country, countryMap),               M + 133, 21);
    desc(p.parcel_type || "",                                       M + 156, 23);
    desc(String(p.pieces ?? 1),                                     M + 181, 9);
    desc(Number(p.weight ?? 0).toFixed(2),                          M + 192, 15);
    desc(`${p.currency || ""} ${Number(p.total_price ?? 0).toFixed(2)}`, M + 209, 19);
    desc(p.service_type || "",                                      M + 230, 21);

    // Status badge
    const st = (p.current_status || "").replace(/_/g, " ").toUpperCase();
    const stColors: Record<string, RGB> = {
      "DELIVERED": [22, 163, 74], "IN TRANSIT": [37, 99, 235], "PENDING": [202, 138, 4],
      "CREATED": [202, 138, 4], "CANCELLED": [220, 38, 38], "OUT FOR DELIVERY": [99, 102, 241],
    };
    const stC: RGB = stColors[st] || [100, 116, 139];
    pdf.setFillColor(...stC);
    pdf.roundedRect(M + 253, y + 1.5, 28, rowH - 3, 1.5, 1.5, "F");
    pdf.setTextColor(...WHITE); pdf.setFont("helvetica", "bold"); pdf.setFontSize(5.5);
    pdf.text(st, M + 267, y + 5.5, { align: "center" });

    // Thin separator
    pdf.setDrawColor(220, 225, 235); pdf.setLineWidth(0.15);
    pdf.line(M, y + rowH, M + W - M * 2, y + rowH);
    y += rowH;
  }

  if (entry.parcels.length > maxRows) {
    pdf.setFont("helvetica", "italic"); pdf.setFontSize(7); pdf.setTextColor(...MGRAY);
    pdf.text(`… and ${entry.parcels.length - maxRows} more parcels (see Excel export for full list)`, M + 2, y + 5);
    y += 8;
  }

  // ── Totals row ─────────────────────────────────────────────────────────────
  pdf.setFillColor(...ORANGE); pdf.rect(M, y, W - M * 2, rowH + 1, "F");
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(8); pdf.setTextColor(...WHITE);
  pdf.text("TOTALS", M + 2, y + 5.5);
  pdf.text(String(entry.totalPieces), M + 182, y + 5.5);
  pdf.text(`${entry.totalWeight.toFixed(2)} kg`, M + 193, y + 5.5);
  pdf.text(`${entry.currency} ${entry.totalValue.toFixed(2)}`, M + 210, y + 5.5);
  y += rowH + 5;

  // ── Signature strip ────────────────────────────────────────────────────────
  const sigW = (W - M * 2) / 3 - 4;
  [
    ["PREPARED BY", "Authorized Signatory"],
    ["VERIFIED BY", "Supervisor"],
    ["CARRIER'S SIGNATURE", "Agent / Carrier"],
  ].forEach(([title, sub], i) => {
    const x = M + i * (sigW + 4);
    pdf.setFillColor(...LGRAY); pdf.roundedRect(x, y, sigW, 18, 2, 2, "F");
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(6.5); pdf.setTextColor(...BLUE);
    pdf.text(title, x + 3, y + 6);
    pdf.setDrawColor(...ORANGE); pdf.setLineWidth(0.4);
    pdf.line(x + 4, y + 13, x + sigW - 4, y + 13);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(6); pdf.setTextColor(...MGRAY);
    pdf.text(sub, x + 3, y + 17);
  });

  // ── Footer ─────────────────────────────────────────────────────────────────
  pdf.setFillColor(...NAVY); pdf.rect(0, H - 10, W, 10, "F");
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(6.5); pdf.setTextColor(...MGRAY);
  pdf.text(
    `SkyXpress International Courier & Cargo  •  Manifest ID: ${entry.manifestId}  •  Generated: ${new Date().toLocaleString()}`,
    W / 2, H - 4, { align: "center" }
  );

  pdf.save(`SkyXpress_Manifest_${entry.manifestId}.pdf`);
}
