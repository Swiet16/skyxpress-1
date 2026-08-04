// @ts-nocheck
import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X, FileDown } from "lucide-react";
import skyxpressLogo from "@/assets/skyxpress_logo.png";

/* ─── helpers ─────────────────────────────────────── */

/** Return "DOX" if parcel is a document, otherwise "NON DOX" */
function getDoxLabel(parcelType: string): "DOX" | "NON DOX" {
  const t = (parcelType || "").toLowerCase();
  return t === "document" || t === "doc" || t === "dox" ? "DOX" : "NON DOX";
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

/* ─── Barcode sub-component ──────────────────────── */
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
      // silent fallback — barcode renders as empty
    }
  }, [value, height]);
  return <svg ref={svgRef} style={{ width: "100%", display: "block" }} />;
}

/* ─── Label component ────────────────────────────── */
interface Parcel {
  tracking_id: string;
  reference_id?: string;
  sender_name: string;
  sender_company?: string;
  sender_address?: string;
  sender_address_2?: string;
  sender_address_3?: string;
  sender_city?: string;
  sender_country?: string;
  receiver_name: string;
  receiver_company?: string;
  receiver_address?: string;
  receiver_address_2?: string;
  receiver_city?: string;
  receiver_state?: string;
  receiver_postal_code?: string;
  receiver_country?: string;
  parcel_type: string;
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

export function ShippingLabel({ parcel, open, onClose, countryMap = {} }: ShippingLabelProps) {
  if (!parcel) return null;

  const dox = getDoxLabel(parcel.parcel_type);
  const origin = originCode(parcel.sender_city, parcel.from_country);
  const refCode = parcel.reference_id || parcel.tracking_id;
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

  /* ─── Receiver address lines ─── */
  const rcvLines = [
    parcel.receiver_company && parcel.receiver_company !== parcel.receiver_name
      ? parcel.receiver_company : null,
    parcel.receiver_address,
    parcel.receiver_address_2,
    [parcel.receiver_postal_code, parcel.receiver_city, parcel.receiver_state]
      .filter(Boolean).join(" ") || null,
    getCountry(parcel.receiver_country || ""),
  ].filter(Boolean) as string[];

  /* ─── Sender address lines ─── */
  const sndLines = [
    parcel.sender_company && parcel.sender_company !== parcel.sender_name
      ? parcel.sender_company : null,
    parcel.sender_address,
    parcel.sender_address_2,
    parcel.sender_address_3,
    [parcel.sender_city, getCountry(parcel.sender_country || parcel.from_country || "")]
      .filter(Boolean).join(", ") || null,
  ].filter(Boolean) as string[];

  const handlePrint = () => { window.print(); };

  const handleSavePDF = async () => {
    const { default: jsPDF } = await import("jspdf");

    const W = 105, H = 185;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [W, H] });
    const pad = 4;

    // ── helpers ──────────────────────────────────────────────────────────
    const fillRect = (x: number, y: number, w: number, h: number, r: number, g: number, b: number) => {
      doc.setFillColor(r, g, b); doc.rect(x, y, w, h, "F");
    };
    const hline = (y: number, lw = 0.3, r = 0, g = 0, b = 0) => {
      doc.setDrawColor(r, g, b); doc.setLineWidth(lw); doc.line(0, y, W, y);
    };
    const txt = (s: string, x: number, y: number, opts?: any) => doc.text(s, x, y, opts);
    const setFont = (style: string, size: number, r = 0, g = 0, b = 0) => {
      doc.setFont("helvetica", style); doc.setFontSize(size); doc.setTextColor(r, g, b);
    };

    // ── logo (fetch → base64) ─────────────────────────────────────────────
    let logoDataUrl: string | null = null;
    try {
      const resp = await fetch(skyxpressLogo);
      const blob = await resp.blob();
      logoDataUrl = await new Promise<string>((res) => {
        const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(blob);
      });
    } catch { /* skip logo if fetch fails */ }

    // ── barcodes (canvas → base64) ────────────────────────────────────────
    const makeBarcodeUrl = (value: string) => {
      const c = document.createElement("canvas");
      try {
        JsBarcode(c, value, { format: "CODE128", height: 60, displayValue: false, margin: 2, background: "#fff", lineColor: "#000" });
      } catch { /* silent */ }
      return c.toDataURL("image/png");
    };
    const refBarcodeUrl = makeBarcodeUrl(refCode || "000000");
    const trkBarcodeUrl = makeBarcodeUrl(trackCode || "000000");

    // ── outer border ──────────────────────────────────────────────────────
    doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.4); doc.rect(0, 0, W, H);

    // ════════════════════════════════════════════════════════════════════
    // HEADER  (0 → 24)
    // ════════════════════════════════════════════════════════════════════
    const hdrH = 24;
    const doxW = dox === "DOX" ? 18 : 22;
    const logoW = 26;
    const mainW = W - doxW - logoW;

    // DOX / NON DOX badge
    fillRect(mainW, 0, doxW, hdrH, 0, 0, 0);
    setFont("bold", dox === "DOX" ? 13 : 9, 255, 255, 255);
    txt(dox, mainW + doxW / 2, hdrH / 2 + 2, { align: "center" });

    // Logo
    if (logoDataUrl) {
      doc.addImage(logoDataUrl, "PNG", mainW + doxW + 1, 1.5, logoW - 2, hdrH - 3);
    }

    // EXPRESS WORLDWIDE
    setFont("bold", 13, 0, 0, 0);
    txt("EXPRESS WORLDWIDE", pad, 8);

    // Service type mini-badge
    setFont("bold", 7, 255, 255, 255);
    const stW = Math.min(doc.getTextWidth(serviceType) + 5, mainW - pad - 2);
    fillRect(pad, 10.5, stW, 5, 26, 26, 46);
    txt(serviceType, pad + 2.5, 14.7);

    // Date
    setFont("normal", 6.5, 90, 90, 90);
    txt(labelDate(createdDate), pad, 21);

    hline(hdrH, 0.6);
    let y = hdrH;

    // ════════════════════════════════════════════════════════════════════
    // FROM / ORIGIN  (hdrH → +24)
    // ════════════════════════════════════════════════════════════════════
    const fromH = 24;

    setFont("bold", 7, 60, 60, 60);
    txt("FROM:", pad, y + 5);
    setFont("bold", 9, 0, 0, 0);
    txt(parcel.sender_name, pad, y + 10);

    setFont("normal", 7.5, 30, 30, 30);
    let fy = y + 14;
    for (const ln of sndLines.slice(0, 4)) { txt(ln, pad, fy); fy += 3.5; }

    // Origin code
    setFont("normal", 6.5, 90, 90, 90);
    txt("Origin:", W - 19, y + 5);
    setFont("bold", 18, 0, 0, 0);
    txt(origin, W - 19, y + 19);

    hline(y + fromH, 0.3, 150, 150, 150);
    y += fromH;

    // ════════════════════════════════════════════════════════════════════
    // TO / CONTACT  (y → +28)
    // ════════════════════════════════════════════════════════════════════
    const toH = 28;
    hline(y, 0.6);

    setFont("bold", 7, 60, 60, 60);
    txt("TO:", pad, y + 5);
    setFont("bold", 9, 0, 0, 0);
    txt(parcel.receiver_name, pad, y + 10);

    setFont("normal", 7.5, 30, 30, 30);
    let ty = y + 14;
    for (const ln of rcvLines.slice(0, 5)) { txt(ln, pad, ty); ty += 3.5; }

    // Contact
    const ctxX = W - 30;
    setFont("normal", 6.5, 90, 90, 90);
    txt("Contact:", ctxX, y + 5);
    setFont("bold", 7.5, 0, 0, 0);
    txt(parcel.receiver_name, ctxX, y + 10);
    if (parcel.receiver_phone) {
      setFont("normal", 7.5, 30, 30, 30);
      txt(parcel.receiver_phone, ctxX, y + 14.5);
    }

    hline(y + toH, 0.5);
    y += toH;

    // ════════════════════════════════════════════════════════════════════
    // SERVICE TYPE BAR (black)
    // ════════════════════════════════════════════════════════════════════
    const barH = 8;
    fillRect(0, y, W, barH, 0, 0, 0);
    setFont("bold", 11, 255, 255, 255);
    txt(serviceType, pad, y + barH - 1.5);
    y += barH;

    // ════════════════════════════════════════════════════════════════════
    // REF / DAY / TIME
    // ════════════════════════════════════════════════════════════════════
    const refH = 10;
    setFont("normal", 8, 0, 0, 0);
    txt(`Ref: ${refCode}`, pad, y + 6.5);

    setFont("bold", 6.5, 80, 80, 80);
    txt("Day", W - 38, y + 3.5, { align: "center" });
    setFont("normal", 7, 0, 0, 0);
    txt(dayStr, W - 38, y + 8, { align: "center" });

    setFont("bold", 6.5, 80, 80, 80);
    txt("Time", W - 14, y + 3.5, { align: "center" });
    setFont("normal", 7, 0, 0, 0);
    txt(timeStr, W - 14, y + 8, { align: "center" });

    hline(y + refH, 0.2, 200, 200, 200);
    y += refH;

    // ════════════════════════════════════════════════════════════════════
    // WEIGHT / PIECES
    // ════════════════════════════════════════════════════════════════════
    const wH = 14;
    setFont("normal", 6.5, 90, 90, 90);
    txt("Pce/Shpt", W - 68, y + wH - 2);

    setFont("normal", 6.5, 90, 90, 90);
    txt("Weight", W - 42, y + 4, { align: "center" });
    setFont("bold", 14, 0, 0, 0);
    txt(`${weightKg} kg`, W - 42, y + 12, { align: "center" });

    setFont("normal", 6.5, 90, 90, 90);
    txt("Piece", W - 16, y + 4, { align: "center" });
    setFont("bold", 14, 0, 0, 0);
    txt(`1/${pieces}`, W - 16, y + 12, { align: "center" });

    hline(y + wH, 0.2, 200, 200, 200);
    y += wH + 3;

    // ════════════════════════════════════════════════════════════════════
    // BARCODES
    // ════════════════════════════════════════════════════════════════════
    const bcW = 62, bcH = 16;

    // Upper — reference ID
    doc.addImage(refBarcodeUrl, "PNG", pad, y, bcW, bcH);
    setFont("normal", 7, 0, 0, 0);
    txt(refCode, pad + bcW / 2, y + bcH + 3.5, { align: "center" });

    // Contents (right of upper barcode)
    const cxX = pad + bcW + 4;
    setFont("bold", 6.5, 60, 60, 60);
    txt("Contents:", cxX, y + 4);
    setFont("normal", 6.5, 30, 30, 30);
    const wrapped = doc.splitTextToSize(contentsText.toUpperCase().slice(0, 80), W - cxX - pad);
    doc.text(wrapped, cxX, y + 8);

    y += bcH + 8;

    // Lower — tracking ID
    doc.addImage(trkBarcodeUrl, "PNG", pad, y, bcW, bcH);
    setFont("normal", 7, 0, 0, 0);
    txt(trackCode, pad + bcW / 2, y + bcH + 3.5, { align: "center" });

    // ── save ─────────────────────────────────────────────────────────────
    doc.save(`SkyXpress_Label_${trackCode}.pdf`);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent
        className="max-w-2xl p-0 overflow-hidden bg-white"
        style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Shipping Label — {parcel.tracking_id}</DialogTitle>
        </DialogHeader>

        {/* Print controls — hidden when printing */}
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

        {/* ══════════ LABEL BODY ══════════ */}
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

          {/* ── Header row ── */}
          <div style={{ display: "flex", alignItems: "stretch", borderBottom: "2px solid #000" }}>
            {/* EXPRESS WORLDWIDE + service type + date */}
            <div style={{ flex: 1, padding: "8px 10px" }}>
              <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 0.5, lineHeight: 1.1 }}>
                EXPRESS WORLDWIDE
              </div>
              {/* Service type — styled accent line */}
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
              {/* Date — clean, no SKYXPRESS */}
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

            {/* Logo */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              borderLeft: "2px solid #000", padding: "4px 10px",
            }}>
              <img
                src={skyxpressLogo}
                alt="SkyXpress"
                style={{ height: 52, objectFit: "contain", maxWidth: 120 }}
              />
            </div>
          </div>

          {/* ── From / Origin row ── */}
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
            <div style={{ textAlign: "right", minWidth: 60 }}>
              <div style={{ fontSize: 9, color: "#333", marginBottom: 2 }}>Origin:</div>
              <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: 1 }}>{origin}</div>
            </div>
          </div>

          {/* ── To / Contact row ── */}
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

          {/* ── Service type bar (black) ── */}
          <div style={{
            background: "#000", color: "#fff",
            padding: "5px 10px",
            fontSize: 16, fontWeight: 900, letterSpacing: 1,
          }}>
            {serviceType}
          </div>

          {/* ── Ref / Day / Time row ── */}
          <div style={{ display: "flex", alignItems: "center", padding: "4px 10px", borderBottom: "1px solid #ccc" }}>
            <div style={{ flex: 1, fontSize: 10 }}>
              Ref: {refCode}
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

          {/* ── Weight / Pieces row ── */}
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

          {/* ── Barcodes section ── */}
          <div style={{ padding: "8px 10px 4px" }}>
            {/* Upper barcode — reference ID */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <Barcode value={refCode || "000000"} height={48} />
                <div style={{ textAlign: "center", fontSize: 9, marginTop: 2, letterSpacing: 0.5 }}>
                  {refCode}
                </div>
              </div>
              <div style={{ minWidth: 110, textAlign: "right", fontSize: 9, paddingTop: 4 }}>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>Contents:</div>
                <div style={{ color: "#333", wordBreak: "break-word", textTransform: "uppercase" }}>
                  {contentsText.slice(0, 80)}
                </div>
              </div>
            </div>

            {/* Lower barcode — tracking ID */}
            <div style={{ marginTop: 8 }}>
              <Barcode value={trackCode || "000000"} height={48} />
              <div style={{ textAlign: "center", fontSize: 9, marginTop: 2, letterSpacing: 0.5 }}>
                {trackCode}
              </div>
            </div>
          </div>

        </div>
        {/* ══════════ END LABEL ══════════ */}

      </DialogContent>

      {/* ── Print styles ── */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #shipping-label-print,
          #shipping-label-print * { visibility: visible !important; }
          #shipping-label-print {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </Dialog>
  );
}
