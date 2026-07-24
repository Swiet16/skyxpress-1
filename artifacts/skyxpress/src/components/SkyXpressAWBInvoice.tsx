// @ts-nocheck
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Printer, X } from "lucide-react";
import { format } from "date-fns";

interface ParcelItem {
  description: string;
  quantity: number;
  unit_price: number;
  total?: number;
}

interface AWBInvoiceProps {
  open: boolean;
  onClose: () => void;
  parcel: {
    id: string;
    tracking_id: string;
    reference_id?: string;
    sender_name: string;
    sender_company?: string;
    sender_phone: string;
    sender_cnic?: string;
    sender_address?: string;
    sender_address_2?: string;
    sender_address_3?: string;
    sender_city?: string;
    sender_country?: string;
    receiver_name: string;
    receiver_company?: string;
    receiver_phone: string;
    receiver_address?: string;
    receiver_address_2?: string;
    receiver_city?: string;
    receiver_state?: string;
    receiver_postal_code?: string;
    receiver_country?: string;
    weight?: number;
    pieces?: number;
    dim_weight_override?: string;
    service_type?: string;
    total_price?: number;
    currency?: string;
    created_at?: string;
    items?: ParcelItem[];
    from_country?: string;
    to_country?: string;
  };
}

const URDU_DISCLAIMER =
  "ٹوٹنے والی اشیاہ کی کوئی گارنٹی نہیں ہونگی پارسل گم ہونے کی صورت زیادہ سے زیادہ 100 ڈالر کلیم کمپنی ادا کرے گی نیز انشورنس کے بغیر کاغزات کے گم ہونے کی صورت صرف بکنگ کی رقم واپس ہوگی";

const NUM_CONTENT_ROWS = 15;

// Converts a country code (e.g. "PK") to its full name (e.g. "Pakistan").
// Falls back to the original value if it isn't a recognized 2-letter code.
function getFullCountryName(value?: string): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (trimmed.length === 2 && /^[a-zA-Z]{2}$/.test(trimmed)) {
    try {
      const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
      const fullName = regionNames.of(trimmed.toUpperCase());
      if (fullName) return fullName;
    } catch {
      // Intl.DisplayNames not supported — fall through to raw value
    }
  }
  return trimmed;
}

function Value({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: "9px" }}>{children ?? ""}</span>;
}

interface InvoiceSectionProps {
  parcel: AWBInvoiceProps["parcel"];
  sectionTitle: "PERFORMA INVOICE" | "AIRWAY BILL";
  showGiftLine?: boolean;
}

function InvoiceSection({ parcel, sectionTitle, showGiftLine = false }: InvoiceSectionProps) {
  const refNum = parcel.reference_id || parcel.tracking_id || "";
  const destination = getFullCountryName(parcel.receiver_country || parcel.to_country);
  const service = parcel.service_type?.toUpperCase() || "UPS";
  const bookingDate = parcel.created_at ? format(new Date(parcel.created_at), "dd/MM/yyyy") : "";
  const dimWt = parcel.dim_weight_override || "";
  const pieces = parcel.pieces || 1;
  const weight = parcel.weight ? `${parcel.weight} KG` : "";

  // Fill contents rows up to NUM_CONTENT_ROWS
  const items: ParcelItem[] = parcel.items && parcel.items.length > 0 ? parcel.items : [];
  const rows = Array.from({ length: NUM_CONTENT_ROWS }, (_, i) => items[i] || null);

  const total = parcel.total_price ?? 0;

  const cell = {
    border: "1px solid #000",
    padding: "2px 4px",
    fontSize: "9px",
    verticalAlign: "top" as const,
  };

  const hdr = {
    ...cell,
    fontWeight: "bold" as const,
    backgroundColor: "#d0d0d0",
    fontSize: "8px",
    textAlign: "center" as const,
  };

  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        marginBottom: "0",
        tableLayout: "fixed",
      }}
    >
      {/* ── TITLE ROW (no logo — full width) ── */}
      <tbody>
        <tr>
          <td colSpan={10} style={{ ...cell, textAlign: "center", verticalAlign: "middle", padding: "6px" }}>
            <div style={{ fontWeight: "bold", fontSize: "18px", letterSpacing: "2px" }}>
              {sectionTitle}
            </div>
            {showGiftLine && (
              <div style={{ fontSize: "11px", color: "#555" }}>GIFT PERFORMA INVOICE</div>
            )}
          </td>
        </tr>

        {/* ── DESTINATION / SERVICE / REFERENCE ── */}
        <tr>
          <td style={hdr} colSpan={1}>DESTINATION</td>
          <td style={{ ...cell, width: "10%" }}><Value>{destination}</Value></td>
          <td style={hdr} colSpan={1}>SERVICE</td>
          <td style={{ ...cell, width: "10%" }}><Value>{service}</Value></td>
          <td style={hdr} colSpan={2}>REFERENCE NUMBER</td>
          <td style={{ ...cell, fontWeight: "bold" }} colSpan={4}><Value>{refNum}</Value></td>
        </tr>

        {/* ── SHIPPER / CONSIGNEE HEADER ── */}
        <tr>
          <td colSpan={5} style={{ ...hdr, backgroundColor: "#b0c4de" }}>SHIPPER DETAILS</td>
          <td colSpan={5} style={{ ...hdr, backgroundColor: "#b0c4de" }}>CONSIGNEE DETAILS</td>
        </tr>

        {/* SHIPPER : NAME */}
        <tr>
          <td style={hdr}>SHIPPER :</td>
          <td style={cell} colSpan={3}><Value>{parcel.sender_name}</Value></td>
          <td style={{ ...cell, width: "1%" }}></td>
          <td style={hdr}>NAME :</td>
          <td style={cell} colSpan={4}><Value>{parcel.receiver_name}</Value></td>
        </tr>

        {/* COMPANY : ADDRESS */}
        <tr>
          <td style={hdr}>COMPANY :</td>
          <td style={cell} colSpan={3}><Value>{parcel.sender_company}</Value></td>
          <td style={cell}></td>
          <td style={hdr}>ADDRESS :</td>
          <td style={cell} colSpan={4}><Value>{parcel.receiver_address}</Value></td>
        </tr>

        {/* ADDRESS row 1 */}
        <tr>
          <td style={hdr}>ADDRESS :</td>
          <td style={cell} colSpan={3}><Value>{parcel.sender_address}</Value></td>
          <td style={cell}></td>
          <td style={cell}></td>
          <td style={cell} colSpan={4}><Value>{parcel.receiver_address_2}</Value></td>
        </tr>

        {/* ADDRESS row 2 */}
        <tr>
          <td style={cell}></td>
          <td style={cell} colSpan={3}><Value>{parcel.sender_address_2}</Value></td>
          <td style={cell}></td>
          <td style={hdr}>CITY :</td>
          <td style={cell} colSpan={4}><Value>{parcel.receiver_city}</Value></td>
        </tr>

        {/* CITY / COUNTRY + POST */}
        <tr>
          <td style={cell}></td>
          <td style={cell} colSpan={3}><Value>{parcel.sender_city}{parcel.sender_country ? `, ${parcel.sender_country}` : ""}</Value></td>
          <td style={cell}></td>
          <td style={hdr}>COUNTRY :</td>
          <td style={cell} colSpan={2}><Value>{getFullCountryName(parcel.receiver_country)}</Value></td>
          <td style={hdr}>POST/ZONE</td>
          <td style={cell}><Value>{parcel.receiver_postal_code}</Value></td>
        </tr>

        {/* PH/MOB */}
        <tr>
          <td style={hdr}>PH/MOB :</td>
          <td style={cell} colSpan={3}><Value>{parcel.sender_phone}</Value></td>
          <td style={cell}></td>
          <td style={hdr}>PH/MOB :</td>
          <td style={cell} colSpan={4}><Value>{parcel.receiver_phone}</Value></td>
        </tr>

        {/* CNIC */}
        <tr>
          <td style={hdr}>CNIC/NTN :</td>
          <td style={cell} colSpan={3}><Value>{parcel.sender_cnic}</Value></td>
          <td style={cell} colSpan={6}></td>
        </tr>

        {/* ── BOOKING ROW ── */}
        <tr>
          <td style={hdr}>BOOKED BY</td>
          <td style={hdr} colSpan={2}>BOOKING DATE</td>
          <td style={hdr}>SHIPPERS REF</td>
          <td style={hdr}>PRODUCT</td>
          <td style={hdr} colSpan={2}>DIM WT</td>
          <td style={hdr} colSpan={2}>PIECES</td>
          <td style={hdr}>WEIGHT</td>
        </tr>
        <tr>
          <td style={cell}>Sky Office</td>
          <td style={cell} colSpan={2}><Value>{bookingDate}</Value></td>
          <td style={cell}><Value>{parcel.sender_name}</Value></td>
          <td style={cell}>WPX</td>
          <td style={cell} colSpan={2}><Value>{dimWt}</Value></td>
          <td style={cell} colSpan={2}><Value>{pieces}</Value></td>
          <td style={cell}><Value>{weight}</Value></td>
        </tr>

        {/* ── CONTENTS TABLE HEADER ── */}
        <tr>
          <td style={hdr}>SR#</td>
          <td style={{ ...hdr, width: "40%" }} colSpan={7}>CONTENTS DETAILS</td>
          <td style={hdr}>QTY</td>
          <td style={hdr}>TOTAL $</td>
        </tr>

        {/* ── CONTENTS ROWS ── */}
        {rows.map((item, i) => (
          <tr key={i} style={{ height: "16px" }}>
            <td style={{ ...cell, textAlign: "center" }}>{i + 1}</td>
            <td style={cell} colSpan={7}><Value>{item?.description}</Value></td>
            <td style={{ ...cell, textAlign: "center" }}><Value>{item?.quantity}</Value></td>
            <td style={{ ...cell, textAlign: "right" }}>
              <Value>{item ? (item.total ?? (item.quantity * item.unit_price)).toFixed(2) : ""}</Value>
            </td>
          </tr>
        ))}

        {/* ── TOTAL ROW ── */}
        <tr>
          <td colSpan={8} style={{ ...cell, textAlign: "right", fontWeight: "bold" }}>
            TOTAL $
          </td>
          <td style={{ ...cell, textAlign: "right", fontWeight: "bold" }}>
            {total.toFixed(2)}
          </td>
          <td style={cell}></td>
        </tr>

        {/* ── URDU DISCLAIMER ── */}
        <tr>
          <td
            colSpan={10}
            style={{
              ...cell,
              direction: "rtl",
              textAlign: "right",
              fontSize: "9px",
              fontFamily: "Arial, sans-serif",
              backgroundColor: "#fffde7",
              padding: "4px 6px",
            }}
          >
            {URDU_DISCLAIMER}
          </td>
        </tr>

        {/* ── DECLARATION ROW ── */}
        <tr>
          <td colSpan={7} style={{ ...cell, fontSize: "8px", lineHeight: "1.3" }}>
            I under sign Undertake full responsibility of my Parcel #
            <strong>{refNum}</strong> it does not contain any contraband
            items, Narcotics or all IATA Restricted items, and assure that
            my parcel contents, declared value and proof of payment is
            correct and true. In case of any misdeclarations or discrepancy
            and any Duty/Taxes at the destination, if not paid by the
            consignee, it would be the sole responsibility of the
            undersigned.
          </td>
          <td colSpan={3} style={{ ...cell, textAlign: "center", fontWeight: "bold", fontSize: "10px" }}>
            THUMB / SIGNATURE
            <div style={{ marginTop: "30px", borderTop: "1px solid #000", width: "80%", margin: "30px auto 0" }}></div>
          </td>
        </tr>

        {/* ── SIGNATURE LINE ── */}
        <tr>
          <td colSpan={5} style={{ ...cell, fontSize: "8px" }}>
            <strong>Shipper Signature:</strong>
            <div style={{ marginTop: "20px", borderTop: "1px solid #000", width: "60%" }}></div>
          </td>
          <td colSpan={5} style={{ ...cell, fontSize: "8px" }}>
            <strong>Sky Office Signature &amp; Stamp:</strong>
            <div style={{ marginTop: "20px", borderTop: "1px solid #000", width: "60%" }}></div>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export function SkyXpressAWBInvoice({ open, onClose, parcel }: AWBInvoiceProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open("", "_blank", "width=850,height=1100");
    if (!printWindow) return;

    // Build document using DOM APIs — never interpolate user data into document.write()
    const doc = printWindow.document;

    // <title> via textContent (safe — no HTML parsing)
    doc.title = `Performa Invoice - ${parcel.reference_id || parcel.tracking_id}`;

    // Stylesheet via createElement (no user data in CSS text)
    const style = doc.createElement("style");
    style.textContent = [
      "* { margin: 0; padding: 0; box-sizing: border-box; }",
      "body { font-family: Arial, sans-serif; background: #fff; }",
      ".print-area { width: 190mm; margin: 0 auto; }",
      "@media print {",
      "  body { margin: 0; }",
      "  .no-print { display: none !important; }",
      "  @page { size: A4 portrait; margin: 10mm; }",
      "}",
    ].join("\n");
    doc.head.appendChild(style);

    // Clone the already-rendered React tree into the print window (no re-parsing of raw HTML)
    const clone = content.cloneNode(true) as HTMLElement;
    clone.classList.add("print-area");
    doc.body.appendChild(clone);

    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-5xl w-full max-h-[95vh] overflow-y-auto p-0"
        style={{ width: "min(900px, 96vw)" }}
      >
        <DialogHeader className="flex flex-row items-center justify-between px-4 py-2 border-b sticky top-0 bg-white z-10">
          <DialogTitle className="text-sm font-semibold">
            Performa Invoice — {parcel.reference_id || parcel.tracking_id}
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handlePrint} className="flex items-center gap-1">
              <Printer className="h-4 w-4" />
              Print / Download PDF
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* ─── Printable area — single Performa Invoice only ─── */}
        <div
          ref={printRef}
          style={{ padding: "8px", backgroundColor: "#fff", fontFamily: "Arial, sans-serif" }}
        >
          <InvoiceSection parcel={parcel} sectionTitle="PERFORMA INVOICE" showGiftLine />
        </div>
      </DialogContent>
    </Dialog>
  );
}
