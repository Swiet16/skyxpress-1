import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  FileDown,
  Printer,
  Package,
  Pencil,
  Eye,
  ChevronRight,
  PlusCircle,
  Trash2,
} from "lucide-react";
import jsPDF from "jspdf";
import logoUrl from "@/assets/skyxpress_logo.png";

// ── types ─────────────────────────────────────────────────────────────────────
interface Parcel {
  id: string;
  tracking_id: string;
  sender_name: string;
  sender_address: string;
  sender_phone: string;
  sender_email: string;
  receiver_name: string;
  receiver_address: string;
  receiver_phone: string;
  from_country: string;
  to_country: string;
  weight: number;
  height: number;
  length: number;
  width: number;
  service_type: string;
  parcel_type: string;
  current_status: string;
  total_price: number;
  currency: string;
  created_at: string;
  special_instructions: string | null;
  declared_value: number | null;
}

interface ManifestItem {
  id: string;
  description: string;
  pieces: number;
  weight: number;
  value: number;
}

interface ManifestData {
  manifestDate: string;
  referenceNo: string;
  trackingNo: string;
  shipperName: string;
  shipperCnic: string;
  shipperAddress: string;
  shipperPhone: string;
  shipperEmail: string;
  shipperCountry: string;
  consigneeName: string;
  consigneeAddress: string;
  consigneePhone: string;
  consigneeCountry: string;
  serviceType: string;
  declaredValue: string;
  currency: string;
  specialInstructions: string;
  items: ManifestItem[];
}

const emptyManifest = (): ManifestData => ({
  manifestDate: new Date().toISOString().split("T")[0],
  referenceNo: "",
  trackingNo: "",
  shipperName: "",
  shipperCnic: "",
  shipperAddress: "",
  shipperPhone: "",
  shipperEmail: "",
  shipperCountry: "",
  consigneeName: "",
  consigneeAddress: "",
  consigneePhone: "",
  consigneeCountry: "",
  serviceType: "",
  declaredValue: "",
  currency: "USD",
  specialInstructions: "",
  items: [{ id: "1", description: "", pieces: 1, weight: 0, value: 0 }],
});

// ── helpers ───────────────────────────────────────────────────────────────────
function totalPieces(items: ManifestItem[]) {
  return items.reduce((s, i) => s + (i.pieces || 0), 0);
}
function totalWeight(items: ManifestItem[]) {
  return items.reduce((s, i) => s + (i.weight || 0), 0).toFixed(2);
}
function totalValue(items: ManifestItem[]) {
  return items.reduce((s, i) => s + (i.value || 0), 0).toFixed(2);
}

// ── PDF generation ────────────────────────────────────────────────────────────
async function generateManifestPDF(data: ManifestData) {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const margin = 14;
  const colR = W / 2 + 2;

  // colours
  const orange: [number, number, number] = [230, 88, 30];
  const blue: [number, number, number] = [30, 80, 200];
  const darkBg: [number, number, number] = [18, 30, 60];
  const lightGray: [number, number, number] = [245, 246, 250];
  const midGray: [number, number, number] = [180, 186, 200];

  // ── header band ────────────────────────────────────────────────────────────
  pdf.setFillColor(...darkBg);
  pdf.rect(0, 0, W, 38, "F");

  // orange accent strip
  pdf.setFillColor(...orange);
  pdf.rect(0, 38, W, 3, "F");

  // logo
  try {
    const img = new Image();
    img.src = logoUrl;
    await new Promise((res) => { img.onload = res; img.onerror = res; });
    pdf.addImage(img, "PNG", margin, 4, 52, 28);
  } catch (_) { /* skip logo if unavailable */ }

  // title block
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text("AIR WAYBILL / SHIPMENT MANIFEST", W - margin, 17, { align: "right" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(...midGray);
  pdf.text("SkyXpress International Courier & Cargo", W - margin, 24, { align: "right" });
  pdf.text("skyxpress.site", W - margin, 30, { align: "right" });

  let y = 48;

  // ── reference bar ──────────────────────────────────────────────────────────
  pdf.setFillColor(...lightGray);
  pdf.roundedRect(margin, y, W - margin * 2, 14, 2, 2, "F");

  const fields: [string, string, number][] = [
    ["Manifest Date", data.manifestDate, margin + 4],
    ["Reference No", data.referenceNo || "—", 80],
    ["Tracking No", data.trackingNo || "—", 130],
  ];
  fields.forEach(([label, val, x]) => {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.5);
    pdf.setTextColor(...blue);
    pdf.text(label.toUpperCase(), x, y + 5);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(20, 20, 40);
    pdf.text(val, x, y + 11);
  });

  y += 20;

  // ── shipper / consignee columns ────────────────────────────────────────────
  const sectionHeader = (label: string, x: number, w: number, yy: number) => {
    pdf.setFillColor(...blue);
    pdf.rect(x, yy, w, 7, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.text(label, x + 3, yy + 5);
  };

  const colW = (W - margin * 2) / 2 - 2;
  sectionHeader("SHIPPER / SENDER", margin, colW, y);
  sectionHeader("CONSIGNEE / RECEIVER", colR, colW, y);
  y += 9;

  const rowField = (label: string, val: string, x: number, w: number, yy: number) => {
    pdf.setTextColor(...blue);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6);
    pdf.text(label, x + 2, yy + 4);
    pdf.setTextColor(30, 30, 50);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    const wrapped = pdf.splitTextToSize(val || "—", w - 4);
    pdf.text(wrapped[0], x + 2, yy + 9);
    pdf.setDrawColor(...midGray);
    pdf.setLineWidth(0.2);
    pdf.line(x + 2, yy + 11, x + w - 2, yy + 11);
    return 14;
  };

  const shipFields: [string, string][] = [
    ["Full Name", data.shipperName],
    ["CNIC / ID No", data.shipperCnic],
    ["Address", data.shipperAddress],
    ["Phone", data.shipperPhone],
    ["Country", data.shipperCountry],
  ];
  const conFields: [string, string][] = [
    ["Full Name", data.consigneeName],
    ["", ""],
    ["Address", data.consigneeAddress],
    ["Phone", data.consigneePhone],
    ["Country", data.consigneeCountry],
  ];

  const startY = y;
  shipFields.forEach(([lbl, val], i) => {
    rowField(lbl, val, margin, colW, startY + i * 14);
  });
  conFields.forEach(([lbl, val], i) => {
    if (lbl) rowField(lbl, val, colR, colW, startY + i * 14);
  });

  y = startY + shipFields.length * 14 + 6;

  // ── items table ────────────────────────────────────────────────────────────
  sectionHeader("SHIPMENT DETAILS", margin, W - margin * 2, y);
  y += 9;

  // table header
  pdf.setFillColor(235, 238, 248);
  pdf.rect(margin, y, W - margin * 2, 7, "F");
  const cols = [
    { label: "Description / Contents", x: margin + 2, w: 80 },
    { label: "Pieces", x: margin + 84, w: 20 },
    { label: "Weight (kg)", x: margin + 106, w: 28 },
    { label: "Declared Value", x: margin + 136, w: 46 },
  ];
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);
  pdf.setTextColor(...blue);
  cols.forEach((c) => pdf.text(c.label, c.x, y + 5));
  y += 8;

  // table rows
  data.items.forEach((item, idx) => {
    const bg: [number, number, number] = idx % 2 === 0 ? [255, 255, 255] : lightGray;
    pdf.setFillColor(...bg);
    pdf.rect(margin, y, W - margin * 2, 7, "F");
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(30, 30, 50);
    pdf.text(pdf.splitTextToSize(item.description || "—", 76)[0], margin + 2, y + 5);
    pdf.text(String(item.pieces || 0), margin + 84, y + 5);
    pdf.text(String((item.weight || 0).toFixed(2)), margin + 106, y + 5);
    pdf.text(`${data.currency} ${(item.value || 0).toFixed(2)}`, margin + 136, y + 5);
    y += 8;
  });

  // totals row
  pdf.setFillColor(...orange);
  pdf.rect(margin, y, W - margin * 2, 8, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(255, 255, 255);
  pdf.text("TOTALS", margin + 2, y + 5.5);
  pdf.text(String(totalPieces(data.items)), margin + 84, y + 5.5);
  pdf.text(totalWeight(data.items), margin + 106, y + 5.5);
  pdf.text(`${data.currency} ${totalValue(data.items)}`, margin + 136, y + 5.5);
  y += 12;

  // ── service & instructions ─────────────────────────────────────────────────
  sectionHeader("SERVICE INFORMATION", margin, W - margin * 2, y);
  y += 9;

  const si: [string, string, number, number][] = [
    ["Service Type", data.serviceType || "—", margin, 55],
    ["Declared Value", data.declaredValue ? `${data.currency} ${data.declaredValue}` : "—", margin + 58, 55],
    ["Currency", data.currency, margin + 116, 30],
  ];
  si.forEach(([lbl, val, x, w]) => rowField(lbl, val, x, w, y));
  y += 16;

  if (data.specialInstructions) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.5);
    pdf.setTextColor(...blue);
    pdf.text("SPECIAL INSTRUCTIONS", margin + 2, y + 4);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(30, 30, 50);
    const lines = pdf.splitTextToSize(data.specialInstructions, W - margin * 2 - 4);
    pdf.text(lines.slice(0, 2), margin + 2, y + 10);
    y += 10 + lines.slice(0, 2).length * 5;
  }

  y += 4;

  // ── signature boxes ────────────────────────────────────────────────────────
  const sigW = (W - margin * 2) / 2 - 2;
  const drawSigBox = (label: string, x: number) => {
    pdf.setFillColor(...lightGray);
    pdf.roundedRect(x, y, sigW, 22, 2, 2, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    pdf.setTextColor(...blue);
    pdf.text(label, x + 3, y + 6);
    pdf.setDrawColor(...orange);
    pdf.setLineWidth(0.4);
    pdf.line(x + 4, y + 17, x + sigW - 4, y + 17);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.5);
    pdf.setTextColor(...midGray);
    pdf.text("Signature & Date", x + 3, y + 21);
  };
  drawSigBox("SHIPPER'S SIGNATURE", margin);
  drawSigBox("CARRIER'S SIGNATURE", colR);
  y += 26;

  // ── footer ─────────────────────────────────────────────────────────────────
  pdf.setFillColor(...darkBg);
  pdf.rect(0, 282, W, 15, "F");
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6.5);
  pdf.setTextColor(...midGray);
  pdf.text(
    "SkyXpress International Courier & Cargo  •  skyxpress.site  •  This document is computer generated",
    W / 2, 289,
    { align: "center" }
  );
  pdf.setTextColor(...orange);
  pdf.text(`Generated: ${new Date().toLocaleString()}`, W / 2, 293, { align: "center" });

  pdf.save(`SkyXpress_Manifest_${data.trackingNo || data.referenceNo || "draft"}.pdf`);
}

// ── main component ────────────────────────────────────────────────────────────
export default function Manifest() {
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [manifest, setManifest] = useState<ManifestData>(emptyManifest());
  const [editMode, setEditMode] = useState(true);
  const [loadingParcels, setLoadingParcels] = useState(true);
  const [generating, setGenerating] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // fetch all parcels
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("parcels")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error) setParcels((data as Parcel[]) || []);
      setLoadingParcels(false);
    })();
  }, []);

  const filtered = parcels.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.tracking_id?.toLowerCase().includes(q) ||
      p.sender_name?.toLowerCase().includes(q) ||
      p.receiver_name?.toLowerCase().includes(q)
    );
  });

  const selectParcel = (p: Parcel) => {
    setSelectedId(p.id);
    setManifest({
      manifestDate: new Date().toISOString().split("T")[0],
      referenceNo: p.tracking_id,
      trackingNo: p.tracking_id,
      shipperName: p.sender_name,
      shipperCnic: "",
      shipperAddress: p.sender_address,
      shipperPhone: p.sender_phone,
      shipperEmail: p.sender_email,
      shipperCountry: p.from_country,
      consigneeName: p.receiver_name,
      consigneeAddress: p.receiver_address,
      consigneePhone: p.receiver_phone,
      consigneeCountry: p.to_country,
      serviceType: p.service_type,
      declaredValue: p.declared_value ? String(p.declared_value) : "",
      currency: p.currency || "USD",
      specialInstructions: p.special_instructions || "",
      items: [
        {
          id: "1",
          description: p.parcel_type || "General Cargo",
          pieces: 1,
          weight: p.weight,
          value: p.declared_value || p.total_price || 0,
        },
      ],
    });
    setEditMode(true);
  };

  const setField = (key: keyof ManifestData, val: string) =>
    setManifest((m) => ({ ...m, [key]: val }));

  const setItemField = (id: string, key: keyof ManifestItem, val: string | number) =>
    setManifest((m) => ({
      ...m,
      items: m.items.map((it) => (it.id === id ? { ...it, [key]: val } : it)),
    }));

  const addItem = () =>
    setManifest((m) => ({
      ...m,
      items: [
        ...m.items,
        { id: Date.now().toString(), description: "", pieces: 1, weight: 0, value: 0 },
      ],
    }));

  const removeItem = (id: string) =>
    setManifest((m) => ({
      ...m,
      items: m.items.filter((it) => it.id !== id),
    }));

  const handleGeneratePDF = async () => {
    setGenerating(true);
    try {
      await generateManifestPDF(manifest);
      toast({ title: "PDF Generated", description: "Your manifest has been downloaded." });
    } catch (e) {
      toast({ title: "Error", description: "Failed to generate PDF.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  // ── field component ────────────────────────────────────────────────────────
  const Field = ({
    label, value, onChange, placeholder, type = "text", half = false,
  }: {
    label: string; value: string; onChange: (v: string) => void;
    placeholder?: string; type?: string; half?: boolean;
  }) => (
    <div className={half ? "space-y-1" : "space-y-1"}>
      <Label className="text-xs font-semibold text-blue-700 uppercase tracking-wide">{label}</Label>
      {editMode ? (
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || label}
          className="h-8 text-sm border-slate-200 focus:border-blue-400"
        />
      ) : (
        <div className="min-h-[32px] px-2 py-1.5 text-sm text-slate-800 border-b border-slate-200">
          {value || <span className="text-slate-400">—</span>}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl">
        {/* Page title */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-1 h-8 bg-gradient-to-b from-orange-500 to-blue-600 rounded-full" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Shipment Manifest</h1>
            <p className="text-sm text-slate-500">Select a parcel and generate a branded manifest / air waybill</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
          {/* ── LEFT: parcel selector ── */}
          <aside className="space-y-3">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-blue-800 to-blue-600 px-4 py-3 flex items-center gap-2">
                <Package className="h-4 w-4 text-white/80" />
                <span className="text-white font-semibold text-sm">Select Parcel</span>
              </div>
              <div className="p-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="Search tracking / name…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 h-8 text-sm"
                  />
                </div>
              </div>

              <div className="max-h-[calc(100vh-340px)] overflow-y-auto divide-y divide-slate-100">
                {loadingParcels ? (
                  <div className="p-4 text-center text-sm text-slate-400">Loading parcels…</div>
                ) : filtered.length === 0 ? (
                  <div className="p-4 text-center text-sm text-slate-400">No parcels found</div>
                ) : (
                  filtered.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => selectParcel(p)}
                      className={`w-full text-left px-3 py-3 hover:bg-blue-50 transition-colors flex items-center justify-between gap-2 group ${
                        selectedId === p.id ? "bg-blue-50 border-l-2 border-blue-600" : ""
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-blue-700 font-mono truncate">{p.tracking_id}</p>
                        <p className="text-sm font-medium text-slate-800 truncate">{p.sender_name}</p>
                        <p className="text-xs text-slate-500 truncate">→ {p.receiver_name}</p>
                        <div className="flex gap-1 mt-1">
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-slate-300 text-slate-500">
                            {p.from_country} → {p.to_country}
                          </Badge>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-400 flex-shrink-0" />
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Start fresh */}
            <Button
              variant="outline"
              size="sm"
              className="w-full border-dashed border-slate-300 text-slate-500 hover:text-blue-600 hover:border-blue-400"
              onClick={() => { setSelectedId(null); setManifest(emptyManifest()); setEditMode(true); }}
            >
              <PlusCircle className="h-3.5 w-3.5 mr-1.5" /> New blank manifest
            </Button>
          </aside>

          {/* ── RIGHT: manifest document ── */}
          <section className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditMode(true)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    editMode ? "bg-blue-600 text-white shadow" : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
                <button
                  onClick={() => setEditMode(false)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    !editMode ? "bg-blue-600 text-white shadow" : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  <Eye className="h-3.5 w-3.5" /> Preview
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.print()}
                  className="border-slate-200 text-slate-600 hover:text-blue-600"
                >
                  <Printer className="h-3.5 w-3.5 mr-1.5" /> Print
                </Button>
                <Button
                  size="sm"
                  onClick={handleGeneratePDF}
                  disabled={generating}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-sm"
                >
                  <FileDown className="h-3.5 w-3.5 mr-1.5" />
                  {generating ? "Generating…" : "Download PDF"}
                </Button>
              </div>
            </div>

            {/* Manifest document */}
            <div ref={printRef} className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden print:shadow-none">
              {/* Header */}
              <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 px-6 py-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <img src={logoUrl} alt="SkyXpress" className="h-14 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>
                <div className="text-right">
                  <p className="text-white font-bold text-lg tracking-wide">AIR WAYBILL</p>
                  <p className="text-blue-300 text-xs font-medium">SHIPMENT MANIFEST</p>
                  <p className="text-slate-400 text-[10px] mt-0.5">skyxpress.site</p>
                </div>
              </div>
              <div className="h-1 bg-gradient-to-r from-orange-500 via-orange-400 to-blue-600" />

              <div className="p-6 space-y-5">
                {/* Reference bar */}
                <div className="grid grid-cols-3 gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
                  {[
                    { label: "Manifest Date", key: "manifestDate" as const, type: "date" },
                    { label: "Reference No", key: "referenceNo" as const },
                    { label: "Tracking No", key: "trackingNo" as const },
                  ].map(({ label, key, type }) => (
                    <Field
                      key={key}
                      label={label}
                      value={manifest[key] as string}
                      onChange={(v) => setField(key, v)}
                      type={type}
                    />
                  ))}
                </div>

                {/* Shipper / Consignee */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Shipper */}
                  <div className="rounded-xl border border-slate-100 overflow-hidden">
                    <div className="bg-blue-700 px-4 py-2">
                      <span className="text-white font-bold text-xs uppercase tracking-widest">Shipper / Sender</span>
                    </div>
                    <div className="p-4 space-y-3">
                      <Field label="Full Name" value={manifest.shipperName} onChange={(v) => setField("shipperName", v)} />
                      <Field label="CNIC / Passport / ID No" value={manifest.shipperCnic} onChange={(v) => setField("shipperCnic", v)} placeholder="e.g. 42101-1234567-8" />
                      <Field label="Address" value={manifest.shipperAddress} onChange={(v) => setField("shipperAddress", v)} />
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Phone" value={manifest.shipperPhone} onChange={(v) => setField("shipperPhone", v)} />
                        <Field label="Country" value={manifest.shipperCountry} onChange={(v) => setField("shipperCountry", v)} />
                      </div>
                    </div>
                  </div>

                  {/* Consignee */}
                  <div className="rounded-xl border border-slate-100 overflow-hidden">
                    <div className="bg-orange-500 px-4 py-2">
                      <span className="text-white font-bold text-xs uppercase tracking-widest">Consignee / Receiver</span>
                    </div>
                    <div className="p-4 space-y-3">
                      <Field label="Full Name" value={manifest.consigneeName} onChange={(v) => setField("consigneeName", v)} />
                      <div className="min-h-[32px]" /> {/* spacer to align with CNIC row */}
                      <Field label="Address" value={manifest.consigneeAddress} onChange={(v) => setField("consigneeAddress", v)} />
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Phone" value={manifest.consigneePhone} onChange={(v) => setField("consigneePhone", v)} />
                        <Field label="Country" value={manifest.consigneeCountry} onChange={(v) => setField("consigneeCountry", v)} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items table */}
                <div className="rounded-xl border border-slate-100 overflow-hidden">
                  <div className="bg-slate-800 px-4 py-2 flex items-center justify-between">
                    <span className="text-white font-bold text-xs uppercase tracking-widest">Shipment Details / Items</span>
                    {editMode && (
                      <button onClick={addItem} className="flex items-center gap-1 text-blue-300 hover:text-white text-xs font-medium transition-colors">
                        <PlusCircle className="h-3.5 w-3.5" /> Add Item
                      </button>
                    )}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="px-3 py-2 text-left text-xs font-bold text-blue-700 uppercase tracking-wide w-[45%]">Description / Contents</th>
                          <th className="px-3 py-2 text-center text-xs font-bold text-blue-700 uppercase tracking-wide">Pieces</th>
                          <th className="px-3 py-2 text-center text-xs font-bold text-blue-700 uppercase tracking-wide">Weight (kg)</th>
                          <th className="px-3 py-2 text-right text-xs font-bold text-blue-700 uppercase tracking-wide">Value</th>
                          {editMode && <th className="w-8" />}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {manifest.items.map((item, idx) => (
                          <tr key={item.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                            <td className="px-3 py-2">
                              {editMode ? (
                                <Input value={item.description} onChange={(e) => setItemField(item.id, "description", e.target.value)} placeholder="e.g. Electronics, Clothing…" className="h-7 text-sm border-slate-200" />
                              ) : <span className="text-slate-800">{item.description || "—"}</span>}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {editMode ? (
                                <Input type="number" min={1} value={item.pieces} onChange={(e) => setItemField(item.id, "pieces", Number(e.target.value))} className="h-7 text-sm text-center w-16 mx-auto border-slate-200" />
                              ) : <span className="font-semibold text-slate-800">{item.pieces}</span>}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {editMode ? (
                                <Input type="number" min={0} step={0.01} value={item.weight} onChange={(e) => setItemField(item.id, "weight", Number(e.target.value))} className="h-7 text-sm text-center w-20 mx-auto border-slate-200" />
                              ) : <span className="text-slate-800">{item.weight} kg</span>}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {editMode ? (
                                <Input type="number" min={0} step={0.01} value={item.value} onChange={(e) => setItemField(item.id, "value", Number(e.target.value))} className="h-7 text-sm text-right w-24 ml-auto border-slate-200" />
                              ) : <span className="text-slate-800">{manifest.currency} {(item.value || 0).toFixed(2)}</span>}
                            </td>
                            {editMode && (
                              <td className="px-2 py-2">
                                {manifest.items.length > 1 && (
                                  <button onClick={() => removeItem(item.id)} className="text-slate-300 hover:text-red-400 transition-colors">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                          <td className="px-3 py-2 font-bold text-sm">TOTALS</td>
                          <td className="px-3 py-2 font-bold text-center">{totalPieces(manifest.items)}</td>
                          <td className="px-3 py-2 font-bold text-center">{totalWeight(manifest.items)} kg</td>
                          <td className="px-3 py-2 font-bold text-right">{manifest.currency} {totalValue(manifest.items)}</td>
                          {editMode && <td />}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Service info */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Service Type</Label>
                    {editMode ? (
                      <Select value={manifest.serviceType} onValueChange={(v) => setField("serviceType", v)}>
                        <SelectTrigger className="h-8 text-sm border-slate-200">
                          <SelectValue placeholder="Select service" />
                        </SelectTrigger>
                        <SelectContent>
                          {["Express", "Standard", "Economy", "Same Day", "Next Day", "Freight"].map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="min-h-[32px] px-2 py-1.5 text-sm text-slate-800 border-b border-slate-200">
                        {manifest.serviceType || <span className="text-slate-400">—</span>}
                      </div>
                    )}
                  </div>
                  <Field label="Declared Value" value={manifest.declaredValue} onChange={(v) => setField("declaredValue", v)} type="number" placeholder="0.00" />
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Currency</Label>
                    {editMode ? (
                      <Select value={manifest.currency} onValueChange={(v) => setField("currency", v)}>
                        <SelectTrigger className="h-8 text-sm border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["USD", "EUR", "GBP", "PKR", "AED", "SAR", "CAD", "AUD"].map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="min-h-[32px] px-2 py-1.5 text-sm text-slate-800 border-b border-slate-200">{manifest.currency}</div>
                    )}
                  </div>
                </div>

                {/* Special instructions */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Special Instructions</Label>
                  {editMode ? (
                    <Textarea
                      value={manifest.specialInstructions}
                      onChange={(e) => setField("specialInstructions", e.target.value)}
                      placeholder="Fragile items, handling instructions, customs declarations…"
                      rows={2}
                      className="text-sm border-slate-200 resize-none"
                    />
                  ) : (
                    <div className="min-h-[60px] px-3 py-2 text-sm text-slate-800 border border-slate-100 rounded-lg bg-slate-50">
                      {manifest.specialInstructions || <span className="text-slate-400">None</span>}
                    </div>
                  )}
                </div>

                {/* Signature area */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  {["Shipper's Signature & Date", "Carrier's Signature & Date"].map((label) => (
                    <div key={label} className="border border-dashed border-slate-200 rounded-xl p-4 bg-slate-50/50">
                      <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-6">{label}</p>
                      <div className="border-b border-slate-300 mt-2" />
                      <p className="text-xs text-slate-400 mt-1">Authorized signature</p>
                    </div>
                  ))}
                </div>

                {/* Manifest footer */}
                <div className="bg-gradient-to-r from-slate-900 to-blue-950 rounded-xl px-5 py-3 flex items-center justify-between">
                  <span className="text-slate-400 text-xs">SkyXpress International Courier & Cargo</span>
                  <span className="text-orange-400 text-xs font-semibold">skyxpress.site</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
