// @ts-nocheck
import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X, FileDown } from "lucide-react";
import skyxpressLogo from "@/assets/skyxpress_logo.png";

/* â”€â”€â”€ helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

/**
 * Return "DOX" if parcel is a document, otherwise "NON DOX".
 *
 * FIX: the old version only matched the exact strings "document" / "doc" / "dox".
 * If the value coming from the form/select was anything else â€” "Documents" (plural),
 * "Non-Document", "non_document", "Non Doc", etc. â€” the exact match failed and it
 * silently fell through to "NON DOX" even when "Document" was selected, and vice
 * versa. This version checks for a "non" prefix/substring FIRST (so any
 * "non-document"/"non doc"/"non_dox" variant is always NON DOX), then checks for
 * "doc"/"dox" for the DOX case. This makes it robust to plural/hyphen/underscore/
 * casing differences.
 */
function getDoxLabel(parcelType: string): "DOX" | "NON DOX" {
  const t = (parcelType || "").toLowerCase().trim();
  if (t.includes("non")) return "NON DOX";
  if (t.includes("doc") || t.includes("dox")) return "DOX";
  return "NON DOX";
}

/** Derive a 3-letter origin code from a city name. Falls back to country code. */
function originCode(city: string | undefined, countryCode: string | undefined): string {
  const CITY_MAP: Record<string, string> = {
    lahore: "LHE", karachi: "KHI", islamabad: "ISB", peshawar: "PEW",
    quetta: "UET", multan: "MUX", faisalabad: "LYP", sialkot: "SKT",
    dubai: "DXB", "abu dhabi": "AUH", london: "LHR", "new york": "JFK",
    paris: "CDG", frankfurt: "FRA", amsterdam: "AMS", madrid: "MAD",
    barcelona: "BCN", rome: "FCO", milan: "MXP", istanbul: "IST",
    doha: "DOH", "kuala lumpur": "KUL", singapore: "SIN", bangkok: "BKK",
    beijing: "PEK", shanghai: "PVG", tokyo: "NRT", seoul: "ICN",
    sydney: "SYD", toronto: "YYZ", "los angeles": "LAX", chicago: "ORD",
  };
  const key = (city || "").toLowerCase().trim();
  if (CITY_MAP[key]) return CITY_MAP[key];
  if (city && city.length >= 3) return city.slice(0, 3).toUpperCase();
  if (countryCode) return countryCode.slice(0, 3).toUpperCase();
  return "???";
}

/** Format a date as DD MMM YYYY */
function labelDate(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    timeZone: "Asia/Karachi",
  }).toUpperCase();
}

/* â”€â”€â”€ Barcode sub-component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function Barcode({ value, height = 50 }: { value: string; height?: number }) {
  const svgRef = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!svgRef.current || !value) return;
    try {
      JsBarcode(svgRef.current, value, {
        format: "CODE128",
        height,
        displayValue: false,
        margin: 0,
        background: "#fff",
        lineColor: "#000",
      });
    } catch {
      // silent fallback â€” barcode renders as empty
    }
  }, [value, height]);
  return <svg ref={svgRef} style={{ width: "100%", display: "block" }} />;
}

/* â”€â”€â”€ Label component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
interface Parcel {
  tracking_id: string;
  reference_id?: string;
  sender_name: string;
  sender_cnic?: string;
  sender_company?: string;
  sender_address?: string;
  sender_address_2?: string;
  sender_address_3?: string;
  sender_city?: string;
  sender_country?: string;
  sender_phone?: string;
  receiver_name: string;
  receiver_company?: string;
  receiver_address?: string;
  receiver_address_2?: string;
  receiver_city?: string;
  receiver_state?: string;
  receiver_postal_code?: string;
  receiver_country?: string;
  receiver_phone?: string;
  parcel_type: string;
  document_type?: string;
  weight: number;
  pieces?: number;
  service_type?: string;
  from_country: string;
  to_country: string;
  created_at?: string;
  items?: Array<{ description: string }>;
}

interface ShippingLabelProps {
  parcel: Parcel | null;
  open: boolean;
  onClose: () => void;
  countryMap?: Record<string, string>;
}

const WEBSITE = "www.skyxpress.site";

export function ShippingLabel({ parcel, open, onClose, countryMap = {} }: ShippingLabelProps) {
  if (!parcel) return null;

  // FIX: DOX/NON DOX must come from `document_type` (the Document / Non-Document
  // toggle in the Shipment step), NOT `parcel_type` (which is the physical
  // package type â€” box/envelope/pallet/other, set in the Package step). The
  // old code read parcel.parcel_type here, so selecting "Document" never had
  // any effect on the label â€” it was checking the wrong field entirely.
  const dox = getDoxLabel(parcel.document_type ?? parcel.parcel_type);
  const origin = originCode(parcel.sender_city, parcel.from_country);
  const cnicCode = parcel.sender_cnic || "N/A";
  const trackCode = parcel.tracking_id;
  const serviceType = (parcel.service_type || "EXPRESS WORLDWIDE").toUpperCase();
  const pieces = parcel.pieces ?? 1;
  const weightKg = Number(parcel.weight || 0).toFixed(1);

  // Day + Time from created_at (or now)
  const createdDate = parcel.created_at ? new Date(parcel.created_at) : new Date();
  const dayStr = createdDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Karachi" });
  const timeStr = createdDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Karachi" });
  const contentsText = Array.isArray(parcel.items) && parcel.items.length > 0
    ? parcel.items.map((i) => i.description).filter(Boolean).join(", ")
    : parcel.parcel_type || "GENERAL CARGO";

  const getCountry = (code: string) => countryMap[code] || code || "";

  /* â”€â”€â”€ Receiver address lines â”€â”€â”€ */
  const rcvLines = [
    parcel.receiver_company && parcel.receiver_company !== parcel.receiver_name
      ? parcel.receiver_company : null,
    parcel.receiver_address,
    parcel.receiver_address_2,
    [parcel.receiver_postal_code, parcel.receiver_city, parcel.receiver_state]
      .filter(Boolean).join(" ") || null,
    getCountry(parcel.receiver_country || ""),
  ].filter(Boolean) as string[];

  /* â”€â”€â”€ Sender address lines â”€â”€â”€ */
  const sndLines = [
    parcel.sender_company && parcel.sender_company !== parcel.sender_name
      ? parcel.sender_company : null,
    parcel.sender_address,
    parcel.sender_address_2,
    parcel.sender_address_3,
    [parcel.sender_city, getCountry(parcel.sender_country || parcel.from_country || "")]
      .filter(Boolean).join(", ") || null,
  ].filter(Boolean) as string[];

  const handlePrint = () => {
    const labelEl = document.getElementById("shipping-label-print");
    if (!labelEl) return;

    const printWindow = window.open("", "_blank", "width=700,height=900");
    if (!printWindow) return;

    // Build the document safely using DOM APIs — no string interpolation of user data
    const doc = printWindow.document;

    // Collect styles from the current document
    const styleContent = Array.from(document.querySelectorAll("style"))
      .map((el) => el.textContent || "")
      .join("\n");

    doc.write("<!DOCTYPE html><html><head></head><body></body></html>");
    doc.close();

    // Set title safely via textContent (no XSS risk)
    doc.title = `Shipping Label — ${parcel.tracking_id}`;

    // Charset meta
    const meta = doc.createElement("meta");
    meta.setAttribute("charset", "utf-8");
    doc.head.appendChild(meta);

    // Inline styles from main document
    const styleEl = doc.createElement("style");
    styleEl.textContent = styleContent;
    doc.head.appendChild(styleEl);

    // ── A4 PORTRAIT geometry ──
    // A4 portrait = 210 × 297 mm. With a 10 mm margin each side we get a
    // usable printable area of 190 × 277 mm — tall and narrow.
    //
    // The label is designed at 560 px on screen. We scale it so its width
    // maps to roughly 175 mm of the 190 mm usable width.
    //
    // The label is positioned at the BOTTOM of the portrait page (not
    // centered) per the user's explicit request — "the label will be set
    // at the lower side of paper, not the mid of paper".
    const LABEL_W = 560;
    const A4_SCALE = 1.18;
    const PX_PER_MM = 96 / 25.4;
    const USABLE_W_PX = (210 - 20) * PX_PER_MM; // portrait: 190 mm ≈ 718 px
    const USABLE_H_PX = (297 - 20) * PX_PER_MM; // portrait: 277 mm ≈ 1046 px

    const naturalHeight = labelEl.getBoundingClientRect().height || labelEl.scrollHeight;
    const scaledW = LABEL_W * A4_SCALE;
    const scaledH = naturalHeight * A4_SCALE;
    // Horizontally CENTERED, vertically at the BOTTOM (small padding from bottom edge)
    const offsetX = Math.max(0, (USABLE_W_PX - scaledW) / 2);
    const BOTTOM_PADDING_PX = 5; // tiny gap so the label doesn't touch the bottom margin
    const offsetY = Math.max(0, USABLE_H_PX - scaledH - BOTTOM_PADDING_PX);

    const printStyle = doc.createElement("style");
    printStyle.textContent = `
      @page { margin: 10mm; size: A4 portrait; }
      html, body { margin: 0; padding: 0; background: #fff; }
      #print-wrapper {
        position: relative;
        width: ${USABLE_W_PX}px;
        height: ${USABLE_H_PX}px;
        margin: 0 auto;
      }
      #shipping-label-print {
        width: ${LABEL_W}px !important;
        max-width: ${LABEL_W}px !important;
        border: 1px solid #000 !important;
        font-family: Arial, Helvetica, sans-serif !important;
        font-size: 11px !important;
        line-height: 1.3 !important;
        background: #fff !important;
        color: #000 !important;
        box-sizing: border-box !important;
        transform: scale(${A4_SCALE}) !important;
        transform-origin: top left !important;
        position: absolute !important;
        top: ${offsetY / A4_SCALE}px !important;
        left: ${offsetX / A4_SCALE}px !important;
      }
    `;
    doc.head.appendChild(printStyle);

    // Wrapper reserves the real usable area on the page so the absolutely-
    // positioned, scaled label is placed at the BOTTOM inside it.
    const wrapper = doc.createElement("div");
    wrapper.id = "print-wrapper";

    // Clone the label node into the print window (no innerHTML string injection)
    const clone = doc.importNode(labelEl, true);
    wrapper.appendChild(clone);
    doc.body.appendChild(wrapper);

    // Wait for images/barcodes to render before printing
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const handleSavePDF = async () => {
    const labelEl = document.getElementById("shipping-label-print");
    if (!labelEl) return;

    const [{ default: jsPDF }, html2canvasMod] = await Promise.all([
      import("jspdf"),
      import("html2canvas").catch(() => ({ default: null as any })),
    ]);
    const html2canvas = html2canvasMod?.default;

    // ── A4 PORTRAIT page ──
    // 210 × 297 mm with a 10 mm margin on every side → usable 190 × 277 mm.
    // The label image is placed at the BOTTOM of the page (not centered)
    // per the user's explicit request — "the label will be set at the
    // lower side of paper, not the mid of paper".
    const PAGE_W = 210;
    const PAGE_H = 297;
    const MARGIN = 10;
    const USABLE_W = PAGE_W - 2 * MARGIN; // 190 mm
    const USABLE_H = PAGE_H - 2 * MARGIN; // 277 mm

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [PAGE_W, PAGE_H] });

    if (html2canvas) {
      // ── OFF-SCREEN CLONE (hide from screen) ──
      // Clone the label into a hidden off-screen container so html2canvas
      // renders it without any visual flash on the user's screen, and so
      // the screenshot is consistent regardless of scroll position or
      // whether the popup is partially visible. The clone is removed
      // immediately after the canvas is captured.
      const offscreen = document.createElement("div");
      offscreen.style.position = "fixed";
      offscreen.style.left = "-99999px";
      offscreen.style.top = "0";
      offscreen.style.width = "560px";
      offscreen.style.background = "#ffffff";
      offscreen.style.opacity = "1";
      offscreen.style.pointerEvents = "none";
      offscreen.style.zIndex = "-1";
      const clone = labelEl.cloneNode(true) as HTMLElement;
      offscreen.appendChild(clone);
      document.body.appendChild(offscreen);

      // Small delay to let the browser lay out the off-screen clone
      // (images, SVGs, fonts) before html2canvas snapshots it.
      await new Promise((r) => setTimeout(r, 50));

      let canvas: HTMLCanvasElement;
      try {
        canvas = await html2canvas(offscreen, {
          scale: 2,
          backgroundColor: "#ffffff",
          logging: false,
          useCORS: true,
          allowTaint: false,
          width: 560,
          windowWidth: 560,
        });
      } finally {
        // Always clean up the off-screen clone, even on error
        document.body.removeChild(offscreen);
      }

      const imgData = canvas.toDataURL("image/png");

      // Fit the image inside the usable area, preserving aspect ratio.
      // The label is wider than tall, so in portrait the WIDTH is usually
      // the binding constraint — the image fills the page width and sits
      // at the bottom, leaving empty space at the top.
      const imgAspect = canvas.width / canvas.height;
      let drawW = USABLE_W;
      let drawH = drawW / imgAspect;
      if (drawH > USABLE_H) {
        drawH = USABLE_H;
        drawW = drawH * imgAspect;
      }

      // Position: horizontally CENTERED, vertically at the BOTTOM
      const x = (PAGE_W - drawW) / 2;
      const y = PAGE_H - MARGIN - drawH; // bottom-aligned with 10mm bottom margin

      doc.addImage(imgData, "PNG", x, y, drawW, drawH);
    } else {
      // ── Fallback: no html2canvas installed ──
      // If html2canvas is not available, render a simple text placeholder so
      // the user knows they need to install it:  npm install html2canvas
      doc.setFontSize(12);
      doc.text(
        "Install html2canvas to render the label: npm install html2canvas",
        PAGE_W / 2,
        PAGE_H / 2,
        { align: "center" }
      );
    }

    doc.save(`SkyXpress_Label_${trackCode}.pdf`);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent
        className="max-w-2xl p-0 overflow-hidden bg-white"
        style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Shipping Label â€” {parcel.tracking_id}</DialogTitle>
        </DialogHeader>

        {/* Print controls â€” hidden when printing */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b print:hidden">
          <span className="text-sm font-semibold text-slate-700">Shipping Label Preview</span>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSavePDF} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
              <FileDown className="h-3.5 w-3.5" />
              Save PDF
            </Button>
            <Button size="sm" onClick={handlePrint} className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
              <Printer className="h-3.5 w-3.5" />
              Print
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose} className="gap-1.5 text-slate-500">
              <X className="h-3.5 w-3.5" />
              Close
            </Button>
          </div>
        </div>

        {/* â•â•â•â•â•â•â•â•â•â• LABEL BODY â•â•â•â•â•â•â•â•â•â• */}
        <div
          id="shipping-label-print"
          className="bg-white text-black"
          style={{
            width: "100%",
            maxWidth: 560,
            margin: "0 auto",
            padding: "0 0 8px 0",
            fontSize: 11,
            lineHeight: 1.3,
            border: "1px solid #000",
          }}
        >

          {/* â”€â”€ Header row â”€â”€ */}
          <div style={{ display: "flex", alignItems: "stretch", borderBottom: "2px solid #000" }}>
            {/* EXPRESS WORLDWIDE + service type + date + website */}
            <div style={{ flex: 1, padding: "8px 10px" }}>
              <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 0.5, lineHeight: 1.1 }}>
                EXPRESS WORLDWIDE
              </div>
              {/* Service type â€” styled accent line */}
              <div style={{
                display: "inline-block",
                marginTop: 4,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: "#fff",
                background: "#1a1a2e",
                padding: "1px 7px",
                borderRadius: 2,
              }}>
                {serviceType}
              </div>
              {/* Date */}
              <div style={{
                marginTop: 4,
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: 1.5,
                color: "#444",
                textTransform: "uppercase",
              }}>
                {labelDate(createdDate)}
              </div>
              {/* Website â€” small line under the date */}
              <div style={{
                marginTop: 2,
                fontSize: 8.5,
                fontWeight: 600,
                letterSpacing: 0.3,
                color: "#0033a0",
              }}>
                {WEBSITE}
              </div>
            </div>

            {/* DOX / NON DOX badge */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "#000", color: "#fff",
              padding: "6px 14px",
              fontSize: 16, fontWeight: 900, letterSpacing: 1,
              borderLeft: "2px solid #000",
            }}>
              {dox}
            </div>

            {/* Logo â€” fixed box, image contain-fit so it can never stretch/skew */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              borderLeft: "2px solid #000", padding: "4px 10px",
              width: 110, boxSizing: "border-box", overflow: "hidden",
            }}>
              <img
                src={skyxpressLogo}
                alt="SkyXpress"
                style={{
                  maxHeight: 52,
                  maxWidth: 100,
                  width: "auto",
                  height: "auto",
                  objectFit: "contain",
                  display: "block",
                  transform: "none",
                }}
              />
            </div>
          </div>

          {/* â”€â”€ From / Origin row â”€â”€ */}
          <div style={{ display: "flex", borderBottom: "1px solid #aaa", padding: "6px 10px 6px 10px" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "#333", marginBottom: 2 }}>
                From:
              </div>
              <div style={{ fontWeight: 700 }}>{parcel.sender_name}</div>
              {sndLines.map((line, i) => (
                <div key={i} style={{ fontSize: 10, color: "#222" }}>{line}</div>
              ))}
            </div>
            <div style={{ textAlign: "right", minWidth: 70 }}>
              <div style={{ fontSize: 9, color: "#333", marginBottom: 2 }}>Contact:</div>
              <div style={{ fontSize: 11, fontWeight: 700 }}>{parcel.sender_name}</div>
              <div style={{ fontSize: 11, color: "#222", marginTop: 2 }}>{parcel.sender_phone}</div>
            </div>
          </div>

          {/* â”€â”€ To / Contact row â”€â”€ */}
          <div style={{
            display: "flex", borderBottom: "1px solid #000",
            padding: "6px 10px",
            borderTop: "1px solid #000",
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "#333", marginBottom: 2 }}>
                To:
              </div>
              <div style={{ fontWeight: 700 }}>{parcel.receiver_name}</div>
              {rcvLines.map((line, i) => (
                <div key={i} style={{ fontSize: 10, color: "#222" }}>{line}</div>
              ))}
            </div>
            <div style={{ textAlign: "right", minWidth: 90, fontSize: 9 }}>
              <div style={{ color: "#333", marginBottom: 2 }}>Contact:</div>
              <div style={{ fontSize: 10, fontWeight: 700, wordBreak: "break-word" }}>
                {parcel.receiver_name}
              </div>
              <div style={{ fontSize: 10, color: "#222", marginTop: 2 }}>
                {parcel.receiver_phone}
              </div>
            </div>
          </div>

          {/* â”€â”€ Service type bar (black) â”€â”€ */}
          <div style={{
            background: "#000", color: "#fff",
            padding: "5px 10px",
            fontSize: 16, fontWeight: 900, letterSpacing: 1,
          }}>
            {serviceType}
          </div>

          {/* â”€â”€ Ref / Day / Time row â”€â”€ */}
          <div style={{ display: "flex", alignItems: "center", padding: "4px 10px", borderBottom: "1px solid #ccc" }}>
            <div style={{ flex: 1, fontSize: 10 }}>
              CNIC Shipper: {cnicCode}
            </div>
            <div style={{ display: "flex", gap: 20, fontSize: 9, color: "#555" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 700 }}>Day</div>
                <div style={{ fontSize: 9, marginTop: 2, whiteSpace: "nowrap" }}>{dayStr}</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 700 }}>Time</div>
                <div style={{ fontSize: 9, marginTop: 2 }}>{timeStr}</div>
              </div>
            </div>
          </div>

          {/* â”€â”€ Weight / Pieces row â”€â”€ */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "flex-end",
            padding: "4px 10px 6px", gap: 24, borderBottom: "1px solid #aaa",
          }}>
            <div style={{ fontSize: 9, color: "#555" }}>Pce/Shpt</div>
            <div>
              <div style={{ fontSize: 9, color: "#555" }}>Weight</div>
              <div style={{ fontSize: 20, fontWeight: 900 }}>{weightKg} kg</div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: "#555" }}>Piece</div>
              <div style={{ fontSize: 20, fontWeight: 900 }}>1/{pieces}</div>
            </div>
          </div>

          {/* â”€â”€ Barcodes section â”€â”€ */}
          <div style={{ padding: "8px 10px 4px" }}>
            {/* Upper barcode â€” reference ID */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <Barcode value={parcel.reference_id || parcel.tracking_id || "000000"} height={48} />
                <div style={{ textAlign: "center", fontSize: 9, marginTop: 2, letterSpacing: 0.5 }}>
                  {parcel.reference_id || parcel.tracking_id}
                </div>
              </div>
              <div style={{ minWidth: 110, textAlign: "right", fontSize: 9, paddingTop: 4 }}>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>Contents:</div>
                <div style={{ color: "#333", wordBreak: "break-word", textTransform: "uppercase" }}>
                  {contentsText.slice(0, 80)}
                </div>
              </div>
            </div>

            {/* Lower barcode â€” tracking ID */}
            <div style={{ marginTop: 8 }}>
              <Barcode value={trackCode || "000000"} height={48} />
              <div style={{ textAlign: "center", fontSize: 9, marginTop: 2, letterSpacing: 0.5 }}>
                {trackCode}
              </div>
            </div>
          </div>

        </div>
        {/* â•â•â•â•â•â•â•â•â•â• END LABEL â•â•â•â•â•â•â•â•â•â• */}

      </DialogContent>

      {/* ── Print styles — Ctrl+P on the page (not the Print button) ── */}
      <style>{`
        @media print {
          @page { margin: 10mm; size: A4 portrait; }
          html, body { margin: 0; padding: 0; background: #fff !important; }
          body * { visibility: hidden !important; }
          #shipping-label-print,
          #shipping-label-print * { visibility: visible !important; }
          /* Position the label at the BOTTOM of the portrait page.
             Uses flexbox on body to push the label down, and transforms
             the 560px label to fit the page width. transform-origin bottom
             center keeps the label anchored to the bottom edge. */
          body {
            display: flex !important;
            flex-direction: column !important;
            justify-content: flex-end !important;
            min-height: 100vh !important;
          }
          #shipping-label-print {
            position: relative !important;
            width: 560px !important;
            max-width: 560px !important;
            border: 1px solid #000 !important;
            padding: 0 !important;
            margin: 0 auto 0 auto !important;
            transform: scale(1.18) !important;
            transform-origin: bottom center !important;
          }
        }
      `}</style>
    </Dialog>
  );
}
