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

  const handlePrint = async () => {
    const labelEl = document.getElementById("shipping-label-print");
    if (!labelEl) return;

    // Load html2canvas for the rotated print layout
    let html2canvas: any;
    try {
      html2canvas = (await import("html2canvas")).default;
    } catch {
      alert(`html2canvas is required for the rotated print layout. Please install it: npm install html2canvas`);
      return;
    }

    // -- 1. Render label to canvas --
    const canvas = await html2canvas(labelEl, {
      scale: 2,
      backgroundColor: "#ffffff",
      logging: false,
      useCORS: true,
      allowTaint: false,
    });

    // -- 2. Rotate canvas 90 degrees clockwise --
    const rotCanvas = document.createElement("canvas");
    rotCanvas.width = canvas.height;
    rotCanvas.height = canvas.width;
    const rctx = rotCanvas.getContext("2d");
    if (!rctx) return;
    rctx.fillStyle = "#ffffff";
    rctx.fillRect(0, 0, rotCanvas.width, rotCanvas.height);
    rctx.translate(rotCanvas.width, 0);
    rctx.rotate(Math.PI / 2);
    rctx.drawImage(canvas, 0, 0);

    const imgData = rotCanvas.toDataURL("image/png");

    // -- 3. Open print window and write the image positioned at bottom --
    const printWindow = window.open("", "_blank", "width=800,height=1000");
    if (!printWindow) return;

    const doc = printWindow.document;
    doc.title = `Shipping Label - ${parcel.tracking_id}`;

    const meta = doc.createElement("meta");
    meta.setAttribute("charset", "utf-8");
    doc.head.appendChild(meta);

    const styleEl = doc.createElement("style");
    styleEl.textContent = `
      @page { margin: 10mm; size: A4 portrait; }
      html, body {
        margin: 0; padding: 0; background: #fff;
        width: 100%; height: 100%;
      }
      body {
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        align-items: center;
        box-sizing: border-box;
        padding: 10mm;
      }
      .label-wrapper {
        width: 100%;
        display: flex;
        justify-content: center;
      }
      .label-wrapper img {
        max-width: 95%;
        max-height: 65vh;
        height: auto;
        border: 1px solid #000;
      }
    `;
    doc.head.appendChild(styleEl);

    const wrapper = doc.createElement("div");
    wrapper.className = "label-wrapper";
    const img = doc.createElement("img");
    img.src = imgData;
    wrapper.appendChild(img);
    doc.body.appendChild(wrapper);

    // Wait for the image to load before printing
    img.onload = () => {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }, 300);
    };
  };

  const handleSavePDF = async () => {
    const { default: jsPDF } = await import("jspdf");

    // Load html2canvas (peer dependency - required for the rotated label
    // layout). If it's not installed, show a helpful message.
    let html2canvas: any;
    try {
      html2canvas = (await import("html2canvas")).default;
    } catch {
      alert(`html2canvas is required for the rotated label layout. Please install it: npm install html2canvas`);
      return;
    }

    const labelEl = document.getElementById("shipping-label-print");
    if (!labelEl) return;

    // -- 1. Render the label HTML to a canvas --
    // scale: 2 for high-resolution output (crisp text + barcodes)
    const canvas = await html2canvas(labelEl, {
      scale: 2,
      backgroundColor: "#ffffff",
      logging: false,
      useCORS: true,
      allowTaint: false,
    });

    // -- 2. Rotate the canvas 90 degrees clockwise --
    // The label is portrait (tall). After 90deg CW rotation it becomes
    // landscape (wide), matching the reference image layout.
    const rotCanvas = document.createElement("canvas");
    rotCanvas.width = canvas.height;
    rotCanvas.height = canvas.width;
    const rctx = rotCanvas.getContext("2d");
    if (!rctx) return;
    rctx.fillStyle = "#ffffff";
    rctx.fillRect(0, 0, rotCanvas.width, rotCanvas.height);
    rctx.translate(rotCanvas.width, 0);
    rctx.rotate(Math.PI / 2);
    rctx.drawImage(canvas, 0, 0);

    const imgData = rotCanvas.toDataURL("image/png");

    // -- 3. Create a portrait A4 PDF page --
    const PAGE_W = 210;
    const PAGE_H = 297;
    const MARGIN = 10;
    const USABLE_W = PAGE_W - 2 * MARGIN; // 190 mm
    const USABLE_H = PAGE_H - 2 * MARGIN; // 277 mm

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [PAGE_W, PAGE_H],
    });

    // -- 4. Calculate dimensions --
    // Rotated canvas: rotCanvas.width x rotCanvas.height
    // Fit the rotated (landscape) image to the usable width, but cap the
    // height at ~65% of the usable area so the upper portion stays blank
    // (matching the reference image layout).
    const imgAspect = rotCanvas.width / rotCanvas.height;
    let visualW = USABLE_W * 0.95; // 95% of usable width
    let visualH = visualW / imgAspect;

    // If the label would be too tall, scale down to fit the max height
    const MAX_LABEL_H = USABLE_H * 0.65; // ~180 mm - leaves upper 35% blank
    if (visualH > MAX_LABEL_H) {
      visualH = MAX_LABEL_H;
      visualW = visualH * imgAspect;
    }

    // -- 5. Position: centered horizontally, anchored to BOTTOM --
    const x = MARGIN + (USABLE_W - visualW) / 2;
    const y = MARGIN + USABLE_H - visualH; // bottom of usable area

    // -- 6. Draw the label image + thin black border --
    doc.addImage(imgData, "PNG", x, y, visualW, visualH);
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    doc.rect(x, y, visualW, visualH);

    // -- 7. Save --
    doc.save(`SkyXpress_Label_${trackCode}.pdf`);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent
        className="max-w-2xl p-0 overflow-y-auto overflow-x-hidden bg-white max-h-[90vh]"
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
            width: 560,
            maxWidth: 560,
            margin: "16px auto 24px",
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

      {/* â”€â”€ Print styles â”€â”€ */}
      <style>{`
        @media print {
          @page { margin: 10mm; size: A4 portrait; }
          body * { visibility: hidden !important; }
          #shipping-label-print,
          #shipping-label-print * { visibility: visible !important; }
          /* Position label at the BOTTOM of the portrait A4 page, leaving
             the upper portion blank. This is a CSS-only fallback for
             Ctrl+P. For the full rotated layout, use the Print or Save
             PDF buttons which use html2canvas + 90 degree rotation. */
          #shipping-label-print {
            position: fixed !important;
            bottom: 10mm !important;
            left: 50% !important;
            top: auto !important;
            width: 560px !important;
            max-width: 560px !important;
            border: 1px solid #000 !important;
            padding: 0 0 8px 0 !important;
            margin: 0 !important;
            transform: translateX(-50%) scale(1.15) !important;
            transform-origin: bottom center !important;
          }
        }
      `}</style>
    </Dialog>
  );
}
