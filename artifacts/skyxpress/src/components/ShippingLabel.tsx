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

    // Build the document safely using DOM APIs â€” no string interpolation of user data
    const doc = printWindow.document;

    // Collect styles from the current document
    const styleContent = Array.from(document.querySelectorAll("style"))
      .map((el) => el.textContent || "")
      .join("\n");

    doc.write("<!DOCTYPE html><html><head></head><body></body></html>");
    doc.close();

    // Set title safely via textContent (no XSS risk)
    doc.title = `Shipping Label â€” ${parcel.tracking_id}`;

    // Charset meta
    const meta = doc.createElement("meta");
    meta.setAttribute("charset", "utf-8");
    doc.head.appendChild(meta);

    // Inline styles from main document
    const styleEl = doc.createElement("style");
    styleEl.textContent = styleContent;
    doc.head.appendChild(styleEl);

    // ── A4 LANDSCAPE geometry ──
    // A4 landscape = 297 × 210 mm. With a 10 mm margin each side we get a
    // usable printable area of 277 × 190 mm — wide and short, which fits the
    // label's natural aspect ratio far better than portrait did (the label
    // is wider than it is tall, so portrait was leaving big empty bands at
    // top & bottom).
    //
    // The label is designed at 560 px on screen. We scale it so its width
    // maps to roughly 250 mm of the 277 mm usable width — that leaves a
    // comfortable breathing room on the sides and lets the label sit
    // roughly centered on the landscape page. Vertical centring is handled
    // by offsetting the absolutely-positioned label inside the usable area.
    const LABEL_W = 560;
    const A4_SCALE = 1.18; // 560 × 1.18 ≈ 661 px ≈ 175 mm wide
    const PX_PER_MM = 96 / 25.4;
    const USABLE_W_PX = (297 - 20) * PX_PER_MM; // landscape: 277 mm ≈ 1046 px
    const USABLE_H_PX = (210 - 20) * PX_PER_MM; // landscape: 190 mm ≈ 718 px

    const naturalHeight = labelEl.getBoundingClientRect().height || labelEl.scrollHeight;
    const scaledW = LABEL_W * A4_SCALE;
    const scaledH = naturalHeight * A4_SCALE;
    // Center the label both horizontally and vertically inside the usable area
    const offsetX = Math.max(0, (USABLE_W_PX - scaledW) / 2);
    const offsetY = Math.max(0, (USABLE_H_PX - scaledH) / 2);

    const printStyle = doc.createElement("style");
    printStyle.textContent = `
      @page { margin: 10mm; size: A4 landscape; }
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
    // positioned, scaled label is centered inside it instead of clipped.
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
    const { default: jsPDF } = await import("jspdf");

    // â”€â”€ constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // ── A4 LANDSCAPE layout ──
    // Use a real A4 LANDSCAPE page (297 × 210 mm) with a 10 mm margin on
    // every side, matching the print output exactly. The label itself is
    // drawn at its original 105 mm design width and then scaled to fit the
    // landscape usable area — sized by the SHORTER constraint (height) so
    // the label's full body always fits inside the 190 mm tall usable area
    // without overflowing top/bottom. PDF, on-screen preview, and printed
    // page ALL look identical.
    const PAGE_W = 297;   // landscape: long edge
    const PAGE_H = 210;   // landscape: short edge
    const MARGIN = 10;
    const USABLE_W = PAGE_W - 2 * MARGIN; // 277 mm
    const USABLE_H = PAGE_H - 2 * MARGIN; // 190 mm

    // Original design width of the label drawing code (do not change —
    // all coordinates below assume this).
    const W = 105;
    const pad = 4;
    const CONTACT_W = 34;        // right panel width for contact
    const ORIGIN_W  = 22;        // right panel width for origin
    const addrMaxW  = W - CONTACT_W - pad - 3;  // max width for address lines
    // (PDF_SCALE is recomputed below, after H is known, so the label fits BOTH
    // the landscape width AND height constraints.)
    const PDF_SCALE_GUESS = USABLE_W / W / 1.1; // initial guess for text wrapping only

    // â”€â”€ temp doc to measure text before we know final height â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Use the SCALED font size so splitTextToSize wraps at the same width
    // the real drawing will render at (otherwise wrapped lines overflow).
    const tmp = new jsPDF({ unit: "mm", format: [W, 300] });
    tmp.setFont("helvetica", "normal"); tmp.setFontSize(7.5 * PDF_SCALE_GUESS);

    // Pre-wrap address lines so we know how many rows each section needs.
    // Wrap widths are SCALED (real page mm) so wrapping matches what the
    // real doc renders at the scaled font size.
    const sndWrapped: string[] = sndLines.flatMap(ln =>
      tmp.splitTextToSize(ln, (W - ORIGIN_W - pad - 3) * PDF_SCALE_GUESS));
    const rcvWrapped: string[] = rcvLines.flatMap(ln =>
      tmp.splitTextToSize(ln, addrMaxW * PDF_SCALE_GUESS));

    const LINE_H = 3.6;
    const fromBodyH = Math.max(0, (sndWrapped.slice(0, 6).length) * LINE_H);
    const toBodyH   = Math.max(0, (rcvWrapped.slice(0, 7).length) * LINE_H);

    // hdrH bumped from 25 -> 29 to make room for the website line under the date
    const hdrH  = 29;
    const fromH = Math.max(24, 13 + fromBodyH + 3);
    const toH   = Math.max(28, 13 + toBodyH   + 3);
    const barH  = 8;
    const refH  = 11;
    const wH    = 15;
    const bcH   = 17;   // barcode image height
    const H = hdrH + fromH + toH + barH + refH + wH + 4 + (bcH + 7) * 2 + 6;

    // ── PDF_SCALE (final) ──
    // Pick the LARGEST scale that lets the label fit BOTH the usable width
    // (277 mm) AND the usable height (190 mm) of an A4 landscape page. Using
    // min() here is what guarantees the label is never cropped on either axis
    // — the height constraint is the tighter one in landscape, so the label
    // ends up sized to fill the page height and leaves comfortable horizontal
    // margins on the sides.
    const PDF_SCALE = Math.min(USABLE_W / W / 1.05, USABLE_H / H / 1.05);

    // â”€â”€ real doc â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // A4 page, all drawing is offset by MARGIN and scaled to fit nicely.
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: [PAGE_W, PAGE_H] });
    // Translate the drawing origin to (MARGIN, MARGIN) and scale uniformly
    // around that new origin so all existing (x, y) coordinates keep
    // working unchanged.
    const _scale = PDF_SCALE;
    const _originX = (USABLE_W - W * _scale) / 2 + MARGIN;
    const _originY = (USABLE_H - H * _scale) / 2 + MARGIN;
    // Helper wrappers — every fillRect/hline/txt/addImage call below uses
    // these so coordinates are transformed consistently.

    // Transform helpers: convert original-design (x, y, w, h) in mm
    // into A4 page coordinates with margin + uniform scale.
    const pdfTx = (x: number) => _originX + x * _scale;
    const pdfTy = (y: number) => _originY + y * _scale;
    const pdfTs = (v: number) => v * _scale;

    const fillRect = (x: number, y: number, w: number, h: number, r: number, g: number, b: number) => {
      doc.setFillColor(r, g, b);
      _origRect(pdfTx(x), pdfTy(y), pdfTs(w), pdfTs(h), "F");
    };
    const hline = (y: number, lw = 0.3, r = 0, g = 0, b = 0) => {
      doc.setDrawColor(r, g, b); doc.setLineWidth(lw * _scale);
      _origLine(pdfTx(0), pdfTy(y), pdfTx(W), pdfTy(y));
    };
    const txt = (s: string, x: number, y: number, opts?: any) => {
      // jsPDF text options like { align: "center" } compute alignment
      // relative to the (x, y) anchor, so transforming the anchor is enough.
      return doc.text(s, pdfTx(x), pdfTy(y), opts);
    };
    const sf = (style: string, size: number, r = 0, g = 0, b = 0) => {
      // Font size also needs to be scaled so text stays proportional
      // with the rest of the drawing.
      doc.setFont("helvetica", style); doc.setFontSize(size * _scale); doc.setTextColor(r, g, b);
    };
    // Override addImage so existing barcode addImage calls also get transformed.
    const _origAddImage = doc.addImage.bind(doc);
    doc.addImage = (data: any, format: string, x: number, y: number, w: number, h: number, alias?: any, compression?: any, rotation?: any) => {
      return _origAddImage(data, format, pdfTx(x), pdfTy(y), pdfTs(w), pdfTs(h), alias, compression, rotation);
    };
    // Bind originals so we can call them with already-transformed coords
    // from hline/fillRect (avoids double-transform via the doc.line override).
    const _origLine = doc.line.bind(doc);
    const _origRect = doc.rect.bind(doc);
    // Override line() and rect() so any direct calls elsewhere in the code
    // (e.g. the vertical divider, outer border) also get transformed.
    doc.line = (x1: number, y1: number, x2: number, y2: number, style?: string) => {
      return _origLine(pdfTx(x1), pdfTy(y1), pdfTx(x2), pdfTy(y2), style);
    };
    doc.rect = (x: number, y: number, w: number, h: number, style?: string) => {
      return _origRect(pdfTx(x), pdfTy(y), pdfTs(w), pdfTs(h), style);
    };
    // getTextWidth depends on current font size — already scaled via sf().
    // splitTextToSize is independent of scale (it works in mm units) so we
    // leave it alone, but its results are interpreted in design-mm, which
    // is what the original code expects.

    // â”€â”€ logo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // FIX: previously the logo was force-fit into a fixed width AND fixed height
    // box with doc.addImage(), which ignores the source image's real aspect
    // ratio and stretches/squashes it â€” this is what produced the warped,
    // "rotated-looking" logo in the PDF. Now we measure the real image
    // dimensions and contain-fit it inside the box, centered, so it always
    // keeps its correct proportions.
    let logoDataUrl: string | null = null;
    let logoAspect = 1; // width / height
    try {
      const resp = await fetch(skyxpressLogo);
      const blob = await resp.blob();
      logoDataUrl = await new Promise<string>((res, rej) => {
        const fr = new FileReader();
        fr.onload = () => res(fr.result as string);
        fr.onerror = () => rej(new Error("logo read failed"));
        fr.readAsDataURL(blob);
      });
      const img = await new Promise<HTMLImageElement>((res, rej) => {
        const im = new Image();
        im.onload = () => res(im);
        im.onerror = () => rej(new Error("logo decode failed"));
        im.src = logoDataUrl as string;
      });
      if (img.naturalWidth && img.naturalHeight) {
        logoAspect = img.naturalWidth / img.naturalHeight;
      }
    } catch { /* ok â€” falls back to no logo */ }

    // â”€â”€ barcodes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const makeBC = (val: string) => {
      const c = document.createElement("canvas");
      try { JsBarcode(c, val, { format: "CODE128", height: 80, displayValue: false, margin: 4, background: "#fff", lineColor: "#000" }); } catch { /* */ }
      return c.toDataURL("image/png");
    };
    const barcodeRef = parcel.reference_id || parcel.tracking_id;
    const refBC = makeBC(barcodeRef || "000000");
    const trkBC = makeBC(trackCode || "000000");

    // â”€â”€ outer border â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    doc.setDrawColor(0); doc.setLineWidth(0.4 * _scale); doc.rect(0, 0, W, H);

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // HEADER
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    const doxW  = dox === "DOX" ? 18 : 22;
    const logoW = 26;
    const mainW = W - doxW - logoW;

    fillRect(mainW, 0, doxW, hdrH, 0, 0, 0);
    sf("bold", dox === "DOX" ? 13 : 9, 255, 255, 255);
    txt(dox, mainW + doxW / 2, hdrH / 2 + 2, { align: "center" });

    if (logoDataUrl) {
      // contain-fit the logo inside its box, preserving aspect ratio
      const boxW = logoW - 2;
      const boxH = hdrH - 4;
      let drawW = boxW;
      let drawH = boxW / logoAspect;
      if (drawH > boxH) {
        drawH = boxH;
        drawW = boxH * logoAspect;
      }
      const offX = mainW + doxW + 1 + (boxW - drawW) / 2;
      const offY = 2 + (boxH - drawH) / 2;
      doc.addImage(logoDataUrl, "PNG", offX, offY, drawW, drawH);
    }

    sf("bold", 13, 0, 0, 0);
    txt("EXPRESS WORLDWIDE", pad, 8);

    // service type badge
    sf("bold", 7, 255, 255, 255);
    const stBadgeW = Math.min((doc.getTextWidth(serviceType) / _scale) + 5, mainW - pad - 2);
    fillRect(pad, 11, stBadgeW, 5, 26, 26, 46);
    txt(serviceType, pad + 2.5, 15);

    sf("normal", 6.5, 90, 90, 90);
    txt(labelDate(createdDate), pad, hdrH - 6);

    // small website line under EXPRESS WORLDWIDE
    sf("normal", 6, 0, 51, 160);
    txt(WEBSITE, pad, hdrH - 2);

    hline(hdrH, 0.6);
    let y = hdrH;

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // FROM / ORIGIN
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    sf("bold", 7, 60, 60, 60);
    txt("FROM:", pad, y + 5);
    sf("bold", 9.5, 0, 0, 0);
    txt(parcel.sender_name, pad, y + 10.5);

    sf("normal", 7.5, 30, 30, 30);
    let fy = y + 15;
    for (const ln of sndWrapped.slice(0, 6)) { txt(ln, pad, fy); fy += LINE_H; }

    sf("normal", 6.5, 90, 90, 90);
    txt("Contact:", W - ORIGIN_W + 1, y + 5);
    sf("bold", 8, 0, 0, 0);
    // Wrap at the SCALED width (in real page mm) so wrapped lines fit
    // the rendered box; then draw at the transformed anchor.
    const sndNameLines = doc.splitTextToSize(parcel.sender_name, (ORIGIN_W - 2) * _scale);
    doc.text(sndNameLines, pdfTx(W - ORIGIN_W + 1), pdfTy(y + 10));
    if (parcel.sender_phone) {
      sf("normal", 8, 30, 30, 30);
      txt(parcel.sender_phone, W - ORIGIN_W + 1, y + 10 + sndNameLines.length * LINE_H + 1);
    }

    hline(y + fromH, 0.3, 160, 160, 160);
    y += fromH;

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // TO / CONTACT
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    hline(y, 0.6);
    const cxLeft = W - CONTACT_W;

    sf("bold", 7, 60, 60, 60);
    txt("TO:", pad, y + 5);
    sf("bold", 9.5, 0, 0, 0);
    txt(parcel.receiver_name, pad, y + 10.5);

    sf("normal", 7.5, 30, 30, 30);
    let ty = y + 15;
    for (const ln of rcvWrapped.slice(0, 7)) { txt(ln, pad, ty); ty += LINE_H; }

    // vertical divider between address and contact
    doc.setDrawColor(200); doc.setLineWidth(0.2 * _scale);
    doc.line(cxLeft - 1, y, cxLeft - 1, y + toH);

    sf("normal", 6.5, 90, 90, 90);
    txt("Contact:", cxLeft + 1, y + 5);
    sf("bold", 8, 0, 0, 0);
    // wrap contact name if too long
    const cNameLines = doc.splitTextToSize(parcel.receiver_name, (CONTACT_W - 2) * _scale);
    doc.text(cNameLines, pdfTx(cxLeft + 1), pdfTy(y + 10.5));
    if (parcel.receiver_phone) {
      sf("normal", 8, 30, 30, 30);
      txt(parcel.receiver_phone, cxLeft + 1, y + 10.5 + cNameLines.length * LINE_H + 1);
    }

    hline(y + toH, 0.5);
    y += toH;

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // SERVICE TYPE BAR
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    fillRect(0, y, W, barH, 0, 0, 0);
    sf("bold", 11, 255, 255, 255);
    txt(serviceType, pad, y + barH - 2);
    y += barH;

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // REF / DAY / TIME
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    sf("normal", 8, 0, 0, 0);
    txt(`CNIC Shipper: ${cnicCode}`, pad, y + 7);

    // day column
    sf("bold", 6.5, 80, 80, 80);
    txt("Day", W - 36, y + 3.5, { align: "center" });
    sf("normal", 7, 0, 0, 0);
    txt(dayStr, W - 36, y + 8.5, { align: "center" });

    // time column
    sf("bold", 6.5, 80, 80, 80);
    txt("Time", W - 14, y + 3.5, { align: "center" });
    sf("normal", 7, 0, 0, 0);
    txt(timeStr, W - 14, y + 8.5, { align: "center" });

    hline(y + refH, 0.2, 200, 200, 200);
    y += refH;

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // WEIGHT / PIECES  â€” labels on top, values below
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    const colW = (W - pad) / 3;

    // Pce/Shpt  |  Weight  |  Piece
    sf("normal", 6.5, 90, 90, 90);
    txt("Pce/Shpt", pad + colW * 0 + 2, y + 5, { align: "left" });
    txt("Weight",   pad + colW * 1 + colW / 2, y + 5, { align: "center" });
    txt("Piece",    pad + colW * 2 + colW / 2, y + 5, { align: "center" });

    sf("bold", 15, 0, 0, 0);
    txt(`${weightKg} kg`, pad + colW * 1 + colW / 2, y + 13, { align: "center" });
    txt(`1/${pieces}`,    pad + colW * 2 + colW / 2, y + 13, { align: "center" });

    hline(y + wH, 0.2, 200, 200, 200);
    y += wH + 4;

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // BARCODES
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    const cntX  = pad + 65 + 3;   // contents start x
    const bcW   = 63;             // barcode image width

    // Upper â€” reference ID
    doc.addImage(refBC, "PNG", pad, y, bcW, bcH);
    sf("normal", 7, 0, 0, 0);
    txt(barcodeRef, pad + bcW / 2, y + bcH + 3.5, { align: "center" });

    sf("bold", 6.5, 60, 60, 60);
    txt("Contents:", cntX, y + 5);
    sf("normal", 6.5, 30, 30, 30);
    const cntWrapped = doc.splitTextToSize(contentsText.toUpperCase().slice(0, 80), (W - cntX - pad) * _scale);
    doc.text(cntWrapped, pdfTx(cntX), pdfTy(y + 9.5));

    y += bcH + 8;

    // Lower â€” tracking ID (full width for prominence)
    doc.addImage(trkBC, "PNG", pad, y, W - pad * 2, bcH);
    sf("normal", 7, 0, 0, 0);
    txt(trackCode, W / 2, y + bcH + 3.5, { align: "center" });

    // â”€â”€ save â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

      {/* â”€â”€ Print styles â”€â”€ */}
      <style>{`
        @media print {
          @page { margin: 10mm; size: A4 landscape; }
          body * { visibility: hidden !important; }
          #shipping-label-print,
          #shipping-label-print * { visibility: visible !important; }
          /* Scale the 560px label so it sits nicely inside the 277mm
             usable area of an A4 LANDSCAPE sheet with a 10mm page margin —
             matches the Save-PDF output exactly. transform-origin top
             center keeps it horizontally centered on the page. */
          #shipping-label-print {
            position: relative !important;
            top: 0 !important;
            left: 0 !important;
            width: 560px !important;
            max-width: 560px !important;
            border: 1px solid #000 !important;
            padding: 0 !important;
            margin: 0 auto !important;
            transform: scale(1.18) !important;
            transform-origin: top center !important;
          }
        }
      `}</style>
    </Dialog>
  );
}
