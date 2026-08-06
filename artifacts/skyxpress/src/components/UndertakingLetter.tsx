// @ts-nocheck
import { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import skyxpressLogo from "@/assets/skyxpress_logo.png";

interface UndertakingLetterProps {
  open: boolean;
  onClose: () => void;
  parcel: {
    reference_id?: string;
    tracking_id: string;
    sender_name?: string;
    sender_cnic?: string;
    created_at?: string;
  } | null;
}

export const UndertakingLetter = ({ open, onClose, parcel }: UndertakingLetterProps) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!parcel) return null;

  const awbNumber = parcel.reference_id?.trim() || parcel.tracking_id;

  const dateStr = parcel.created_at
    ? new Date(parcel.created_at).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });

  const handlePrint = () => {
    const letterEl = printRef.current;
    if (!letterEl) return;

    const printWindow = window.open("", "_blank", "width=800,height=900");
    if (!printWindow) return;

    // Build document safely via DOM APIs — no string interpolation of user data
    const doc = printWindow.document;
    doc.write("<!DOCTYPE html><html><head></head><body></body></html>");
    doc.close();

    // Title set via textContent — no XSS risk
    doc.title = "Undertaking Letter";

    const meta = doc.createElement("meta");
    meta.setAttribute("charset", "utf-8");
    doc.head.appendChild(meta);

    // Carry over all styles from the host document
    const styleContent = Array.from(document.querySelectorAll("style"))
      .map((el) => el.textContent || "")
      .join("\n");

    const styleEl = doc.createElement("style");
    styleEl.textContent = styleContent;
    doc.head.appendChild(styleEl);

    const printStyle = doc.createElement("style");
    printStyle.textContent = `
      @page { margin: 20mm; size: A4; }
      html, body { margin: 0; padding: 0; background: #fff; }
      body { font-family: Arial, sans-serif; font-size: 13px; color: #1a1a1a; }
      #undertaking-letter-print { max-width: 720px; margin: 0 auto; padding: 24px; }
    `;
    doc.head.appendChild(printStyle);

    // Clone the rendered React node — no innerHTML injection
    const clone = doc.importNode(letterEl, true);
    doc.body.appendChild(clone);

    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }, 400);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b flex-row items-center justify-between">
          <DialogTitle className="text-base font-bold">
            Undertaking Letter — AWB# {awbNumber}
          </DialogTitle>
          <div className="flex items-center gap-2 pr-8">
            <Button
              size="sm"
              className="gap-2 bg-blue-700 hover:bg-blue-800 text-white"
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4" />
              Print / Save PDF
            </Button>
          </div>
        </DialogHeader>

        {/* ── Printable letter body ─────────────────────────────── */}
        <div
          id="undertaking-letter-print"
          ref={printRef}
          className="px-8 py-7 bg-white text-[13px] text-gray-900"
          style={{ fontFamily: "Arial, sans-serif" }}
        >
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-[#1a3a6b] pb-4 mb-5">
            <img src={skyxpressLogo} alt="SkyXpress" className="h-14 object-contain" />
            <div className="text-right text-[11px] text-gray-500 leading-snug">
              <strong className="text-[13px] text-[#1a3a6b] block font-bold">
                SkyXpress International Courier Cargo
              </strong>
              International Freight &amp; Logistics
            </div>
          </div>

          {/* Title */}
          <p className="text-center text-[16px] font-bold uppercase tracking-widest text-[#1a3a6b] mb-1">
            Undertaking
          </p>
          <p className="text-center text-[13px] text-gray-600 mb-5">
            To Whom It May Concern
          </p>

          {/* AWB box + Date row */}
          <div className="flex items-start justify-between mb-5 flex-wrap gap-4">
            <div className="inline-block border-2 border-[#1a3a6b] bg-blue-50 rounded-md px-5 py-2">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">AWB #</p>
              <p className="text-[20px] font-bold text-[#1a3a6b] font-mono tracking-widest leading-tight">
                {awbNumber}
              </p>
            </div>
            <div className="text-[12px] text-gray-500 text-right">
              <span className="font-semibold text-gray-700">Date:</span> {dateStr}
            </div>
          </div>

          {/* Body */}
          <p className="leading-[1.85] text-[13px] text-gray-800 mb-4 text-justify">
            I hereby declare that my shipment booked under{" "}
            <strong className="font-bold text-[#1a3a6b]">AWB # {awbNumber}</strong> delivered at your
            Operations office does not contain any contraband material. If any contraband material
            (Narcotics, arms, explosives, antiques, currency, prohibited items, etc.) is discovered
            from this shipment during inspection or which may be against the export policy order of the
            Government of Pakistan, I shall be held responsible.
          </p>

          {/* Warning box */}
          <div className="border-l-4 border-red-600 bg-red-50 px-4 py-3 my-5 rounded-r-md text-[12px] text-red-800 leading-relaxed">
            <strong>SkyXpress International Courier Cargo</strong> strictly prohibits the shipping of
            contraband, narcotics, drugs, or any illicit goods. SkyXpress maintains a zero-tolerance
            policy and holds absolutely no connection, association, or legal liability regarding any
            illegal items found in shipments. The sender/shipper assumes full legal responsibility and
            consequences for the contents of the package. In the event of any suspicious or prohibited
            contraband being discovered by authorities, SkyXpress will fully cooperate with law
            enforcement and accepts no claim or liability.
          </div>

          <p className="text-[13px] text-gray-800 mb-6">Yours Sincerely,</p>

          {/* Signature fields */}
          <div className="grid grid-cols-2 gap-8 mt-2">
            <div>
              <div className="mb-5">
                <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">
                  Shipper Name
                </p>
                <p className="border-b border-gray-400 pb-1 font-semibold text-gray-800 min-h-[22px]">
                  {parcel.sender_name || ""}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">
                  CNIC / NTN # of Shipper
                </p>
                <p className="border-b border-gray-400 pb-1 font-semibold text-gray-800 min-h-[22px]">
                  {parcel.sender_cnic || ""}
                </p>
              </div>
            </div>
            <div>
              <div className="mb-5">
                <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Signature</p>
                <p className="border-b border-gray-400 pb-1 min-h-[22px]" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">
                  Thumb Impression
                </p>
                <div className="border border-dashed border-gray-300 h-16 w-20 flex items-center justify-center rounded text-[10px] text-gray-300">
                  Thumb
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 border-t border-gray-200 pt-3 text-center text-[10px] text-gray-400">
            SkyXpress International Courier Cargo &nbsp;·&nbsp; This document is auto-generated and
            linked to shipment reference.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
