import { useState, useEffect, useRef, useCallback } from "react";
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
  Save,
  CheckCircle2,
  AlertCircle,
  X,
  ScanSearch,
  ArrowLeft,
} from "lucide-react";
import jsPDF from "jspdf";
import logoUrl from "@/assets/skyxpress_logo.png";

// ── Types ─────────────────────────────────────────────────────────────────────
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

interface SavedManifest extends ManifestData {
  id: string;
  parcel_id: string;
  parcel?: Parcel;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
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

const fromParcel = (p: Parcel): ManifestData => ({
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
  items: [{ id: "1", description: p.parcel_type || "General Cargo", pieces: 1, weight: p.weight, value: p.declared_value || p.total_price || 0 }],
});

const dbToManifest = (row: any): ManifestData => ({
  manifestDate: row.manifest_date || new Date().toISOString().split("T")[0],
  referenceNo: row.reference_no || "",
  trackingNo: row.tracking_no || "",
  shipperName: row.shipper_name || "",
  shipperCnic: row.shipper_cnic || "",
  shipperAddress: row.shipper_address || "",
  shipperPhone: row.shipper_phone || "",
  shipperEmail: row.shipper_email || "",
  shipperCountry: row.shipper_country || "",
  consigneeName: row.consignee_name || "",
  consigneeAddress: row.consignee_address || "",
  consigneePhone: row.consignee_phone || "",
  consigneeCountry: row.consignee_country || "",
  serviceType: row.service_type || "",
  declaredValue: row.declared_value ? String(row.declared_value) : "",
  currency: row.currency || "USD",
  specialInstructions: row.special_instructions || "",
  items: Array.isArray(row.items) && row.items.length > 0
    ? row.items.map((it: any, i: number) => ({ id: String(i + 1), ...it }))
    : [{ id: "1", description: "", pieces: 1, weight: 0, value: 0 }],
});

const manifestToDb = (data: ManifestData, parcelId: string, userId: string | undefined) => ({
  parcel_id: parcelId,
  manifest_date: data.manifestDate,
  reference_no: data.referenceNo,
  tracking_no: data.trackingNo,
  shipper_name: data.shipperName,
  shipper_cnic: data.shipperCnic,
  shipper_address: data.shipperAddress,
  shipper_phone: data.shipperPhone,
  shipper_email: data.shipperEmail,
  shipper_country: data.shipperCountry,
  consignee_name: data.consigneeName,
  consignee_address: data.consigneeAddress,
  consignee_phone: data.consigneePhone,
  consignee_country: data.consigneeCountry,
  service_type: data.serviceType,
  declared_value: data.declaredValue ? parseFloat(data.declaredValue) : null,
  currency: data.currency,
  special_instructions: data.specialInstructions,
  items: data.items.map(({ id: _id, ...rest }) => rest),
  created_by: userId,
});

function totalPieces(items: ManifestItem[]) { return items.reduce((s, i) => s + (i.pieces || 0), 0); }
function totalWeight(items: ManifestItem[]) { return items.reduce((s, i) => s + (i.weight || 0), 0).toFixed(2); }
function totalValue(items: ManifestItem[]) { return items.reduce((s, i) => s + (i.value || 0), 0).toFixed(2); }

// ── PDF ───────────────────────────────────────────────────────────────────────
async function generateManifestPDF(data: ManifestData) {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210, margin = 14, colR = W / 2 + 2;
  const orange: [number,number,number] = [230,88,30], blue: [number,number,number] = [30,80,200];
  const darkBg: [number,number,number] = [18,30,60], lightGray: [number,number,number] = [245,246,250];
  const midGray: [number,number,number] = [180,186,200];

  pdf.setFillColor(...darkBg); pdf.rect(0, 0, W, 38, "F");
  pdf.setFillColor(...orange); pdf.rect(0, 38, W, 3, "F");
  try {
    const img = new Image(); img.src = logoUrl;
    await new Promise((res) => { img.onload = res; img.onerror = res; });
    pdf.addImage(img, "PNG", margin, 4, 52, 28);
  } catch (_) {}
  pdf.setTextColor(255,255,255); pdf.setFont("helvetica","bold"); pdf.setFontSize(16);
  pdf.text("AIR WAYBILL / SHIPMENT MANIFEST", W - margin, 17, { align: "right" });
  pdf.setFont("helvetica","normal"); pdf.setFontSize(8); pdf.setTextColor(...midGray);
  pdf.text("SkyXpress International Courier & Cargo", W - margin, 24, { align: "right" });
  pdf.text("skyxpress.site", W - margin, 30, { align: "right" });

  let y = 48;
  pdf.setFillColor(...lightGray); pdf.roundedRect(margin, y, W - margin * 2, 14, 2, 2, "F");
  const refFields: [string,string,number][] = [["Manifest Date",data.manifestDate,margin+4],["Reference No",data.referenceNo||"—",80],["Tracking No",data.trackingNo||"—",130]];
  refFields.forEach(([lbl,val,x]) => {
    pdf.setFont("helvetica","bold"); pdf.setFontSize(6.5); pdf.setTextColor(...blue); pdf.text(lbl.toUpperCase(), x, y+5);
    pdf.setFont("helvetica","bold"); pdf.setFontSize(9); pdf.setTextColor(20,20,40); pdf.text(val, x, y+11);
  });
  y += 20;

  const sectionHeader = (lbl: string, x: number, w: number, yy: number) => {
    pdf.setFillColor(...blue); pdf.rect(x, yy, w, 7, "F");
    pdf.setTextColor(255,255,255); pdf.setFont("helvetica","bold"); pdf.setFontSize(8);
    pdf.text(lbl, x+3, yy+5);
  };
  const colW = (W - margin*2)/2 - 2;
  sectionHeader("SHIPPER / SENDER", margin, colW, y);
  sectionHeader("CONSIGNEE / RECEIVER", colR, colW, y);
  y += 9;
  const rowField = (lbl: string, val: string, x: number, w: number, yy: number) => {
    pdf.setTextColor(...blue); pdf.setFont("helvetica","bold"); pdf.setFontSize(6);
    pdf.text(lbl, x+2, yy+4);
    pdf.setTextColor(30,30,50); pdf.setFont("helvetica","normal"); pdf.setFontSize(8.5);
    pdf.text((pdf.splitTextToSize(val||"—", w-4) as string[])[0], x+2, yy+9);
    pdf.setDrawColor(...midGray); pdf.setLineWidth(0.2); pdf.line(x+2, yy+11, x+w-2, yy+11);
    return 14;
  };
  const startY = y;
  [["Full Name",data.shipperName],["CNIC / ID No",data.shipperCnic],["Address",data.shipperAddress],["Phone",data.shipperPhone],["Country",data.shipperCountry]].forEach(([l,v],i)=>rowField(l,v,margin,colW,startY+i*14));
  [["Full Name",data.consigneeName],["",""],["Address",data.consigneeAddress],["Phone",data.consigneePhone],["Country",data.consigneeCountry]].forEach(([l,v],i)=>{ if(l) rowField(l,v,colR,colW,startY+i*14); });
  y = startY + 5*14 + 6;

  sectionHeader("SHIPMENT DETAILS", margin, W-margin*2, y); y += 9;
  pdf.setFillColor(235,238,248); pdf.rect(margin, y, W-margin*2, 7, "F");
  pdf.setFont("helvetica","bold"); pdf.setFontSize(7); pdf.setTextColor(...blue);
  [[`Description / Contents`,margin+2],[`Pieces`,margin+84],[`Weight (kg)`,margin+106],[`Declared Value`,margin+136]].forEach(([l,x])=>pdf.text(String(l), Number(x), y+5));
  y += 8;
  data.items.forEach((item,idx)=>{
    const bg: [number,number,number] = idx%2===0?[255,255,255]:lightGray;
    pdf.setFillColor(...bg); pdf.rect(margin, y, W-margin*2, 7, "F");
    pdf.setFont("helvetica","normal"); pdf.setFontSize(8); pdf.setTextColor(30,30,50);
    pdf.text((pdf.splitTextToSize(item.description||"—",76) as string[])[0], margin+2, y+5);
    pdf.text(String(item.pieces||0), margin+84, y+5);
    pdf.text(String((item.weight||0).toFixed(2)), margin+106, y+5);
    pdf.text(`${data.currency} ${(item.value||0).toFixed(2)}`, margin+136, y+5);
    y += 8;
  });
  pdf.setFillColor(...orange); pdf.rect(margin, y, W-margin*2, 8, "F");
  pdf.setFont("helvetica","bold"); pdf.setFontSize(8); pdf.setTextColor(255,255,255);
  pdf.text("TOTALS", margin+2, y+5.5); pdf.text(String(totalPieces(data.items)), margin+84, y+5.5);
  pdf.text(totalWeight(data.items), margin+106, y+5.5); pdf.text(`${data.currency} ${totalValue(data.items)}`, margin+136, y+5.5);
  y += 12;

  sectionHeader("SERVICE INFORMATION", margin, W-margin*2, y); y += 9;
  [[`Service Type`,data.serviceType||"—",margin,55],[`Declared Value`,data.declaredValue?`${data.currency} ${data.declaredValue}`:"—",margin+58,55],[`Currency`,data.currency,margin+116,30]].forEach(([l,v,x,w])=>rowField(String(l),String(v),Number(x),Number(w),y));
  y += 16;
  if (data.specialInstructions) {
    pdf.setFont("helvetica","bold"); pdf.setFontSize(6.5); pdf.setTextColor(...blue); pdf.text("SPECIAL INSTRUCTIONS", margin+2, y+4);
    pdf.setFont("helvetica","normal"); pdf.setFontSize(8); pdf.setTextColor(30,30,50);
    const lines = (pdf.splitTextToSize(data.specialInstructions, W-margin*2-4) as string[]).slice(0,2);
    pdf.text(lines, margin+2, y+10); y += 10 + lines.length*5;
  }
  y += 4;
  const sigW = (W-margin*2)/2-2;
  ["SHIPPER'S SIGNATURE","CARRIER'S SIGNATURE"].forEach((lbl,i)=>{
    const x = i===0?margin:colR;
    pdf.setFillColor(...lightGray); pdf.roundedRect(x, y, sigW, 22, 2, 2, "F");
    pdf.setFont("helvetica","bold"); pdf.setFontSize(7); pdf.setTextColor(...blue); pdf.text(lbl, x+3, y+6);
    pdf.setDrawColor(...orange); pdf.setLineWidth(0.4); pdf.line(x+4, y+17, x+sigW-4, y+17);
    pdf.setFont("helvetica","normal"); pdf.setFontSize(6.5); pdf.setTextColor(...midGray); pdf.text("Signature & Date", x+3, y+21);
  });
  y += 26;
  pdf.setFillColor(...darkBg); pdf.rect(0, 282, W, 15, "F");
  pdf.setFont("helvetica","normal"); pdf.setFontSize(6.5); pdf.setTextColor(...midGray);
  pdf.text("SkyXpress International Courier & Cargo  •  skyxpress.site  •  This document is computer generated", W/2, 289, { align:"center" });
  pdf.setTextColor(...orange); pdf.text(`Generated: ${new Date().toLocaleString()}`, W/2, 293, { align:"center" });
  pdf.save(`SkyXpress_Manifest_${data.trackingNo||data.referenceNo||"draft"}.pdf`);
}

// ── Main Component ────────────────────────────────────────────────────────────
type View = "editor" | "search-results";

export default function Manifest() {
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [manifest, setManifest] = useState<ManifestData>(emptyManifest());
  const [editMode, setEditMode] = useState(true);
  const [loadingParcels, setLoadingParcels] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [tableError, setTableError] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();

  // Reference search
  const [view, setView] = useState<View>("editor");
  const [refSearch, setRefSearch] = useState("");
  const [refResults, setRefResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id));
  }, []);

  // Fetch all parcels
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
    return p.tracking_id?.toLowerCase().includes(q) || p.sender_name?.toLowerCase().includes(q) || p.receiver_name?.toLowerCase().includes(q);
  });

  // Load saved manifest for a parcel, or fall back to parcel data
  const selectParcel = useCallback(async (p: Parcel) => {
    setSelectedId(p.id);
    setSaved(false);
    setTableError(false);

    // Try to load existing saved manifest
    try {
      const { data, error } = await (supabase as any)
        .from("manifests")
        .select("*")
        .eq("parcel_id", p.id)
        .maybeSingle();

      if (error?.code === "42P01") {
        // Table doesn't exist yet
        setTableError(true);
        setManifest(fromParcel(p));
        return;
      }

      if (data) {
        setManifest(dbToManifest(data));
        setSaved(true);
        toast({ title: "Manifest loaded", description: `Saved manifest found for ${p.tracking_id}` });
      } else {
        setManifest(fromParcel(p));
      }
    } catch {
      setManifest(fromParcel(p));
    }
  }, [toast]);

  // Save manifest to Supabase
  const handleSave = async () => {
    if (!selectedId) {
      toast({ title: "No parcel selected", description: "Select a parcel first", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = manifestToDb(manifest, selectedId, currentUserId);
      const { error } = await (supabase as any)
        .from("manifests")
        .upsert(payload, { onConflict: "parcel_id" });

      if (error?.code === "42P01") {
        setTableError(true);
        toast({ title: "Table not found", description: "Run the manifests SQL in your Supabase dashboard first", variant: "destructive" });
        return;
      }
      if (error) throw error;

      setSaved(true);
      toast({ title: "Manifest saved ✓", description: `Reference: ${manifest.referenceNo || manifest.trackingNo}` });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Search by reference ID / CNIC / tracking
  const handleRefSearch = async () => {
    if (!refSearch.trim()) return;
    setSearching(true);
    setView("search-results");
    try {
      const q = refSearch.trim();
      const { data, error } = await (supabase as any)
        .from("manifests")
        .select(`
          *,
          parcel:parcel_id (
            tracking_id, sender_name, receiver_name,
            from_country, to_country, weight,
            current_status, service_type, total_price, currency,
            sender_address, receiver_address, sender_phone, receiver_phone
          )
        `)
        .or(`reference_no.ilike.%${q}%,tracking_no.ilike.%${q}%,shipper_cnic.ilike.%${q}%,shipper_name.ilike.%${q}%`);

      if (error?.code === "42P01") {
        setTableError(true);
        setRefResults([]);
        return;
      }
      if (error) throw error;
      setRefResults(data || []);
    } catch (e: any) {
      toast({ title: "Search failed", description: e.message, variant: "destructive" });
    } finally {
      setSearching(false);
    }
  };

  const setField = (key: keyof ManifestData, val: string) => {
    setManifest((m) => ({ ...m, [key]: val }));
    setSaved(false);
  };
  const setItemField = (id: string, key: keyof ManifestItem, val: string | number) => {
    setManifest((m) => ({ ...m, items: m.items.map((it) => it.id === id ? { ...it, [key]: val } : it) }));
    setSaved(false);
  };
  const addItem = () => setManifest((m) => ({ ...m, items: [...m.items, { id: Date.now().toString(), description: "", pieces: 1, weight: 0, value: 0 }] }));
  const removeItem = (id: string) => setManifest((m) => ({ ...m, items: m.items.filter((it) => it.id !== id) }));

  const handleGeneratePDF = async () => {
    setGenerating(true);
    try { await generateManifestPDF(manifest); toast({ title: "PDF downloaded" }); }
    catch { toast({ title: "PDF failed", variant: "destructive" }); }
    finally { setGenerating(false); }
  };

  // ── Field component ────────────────────────────────────────────────────────
  const Field = ({ label, value, onChange, placeholder, type = "text" }: {
    label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
  }) => (
    <div className="space-y-1">
      <Label className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">{label}</Label>
      {editMode ? (
        <Input type={type} value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || label} className="h-8 text-sm border-slate-200 focus:border-blue-400" />
      ) : (
        <div className="min-h-[32px] px-2 py-1.5 text-sm text-slate-800 border-b border-slate-200">
          {value || <span className="text-slate-300">—</span>}
        </div>
      )}
    </div>
  );

  // ── Status badge for parcel ────────────────────────────────────────────────
  const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
      delivered: "bg-green-100 text-green-700",
      pending: "bg-yellow-100 text-yellow-700",
      in_transit: "bg-blue-100 text-blue-700",
      cancelled: "bg-red-100 text-red-700",
    };
    return <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${colors[status] || "bg-slate-100 text-slate-600"}`}>{status?.replace(/_/g, " ")}</span>;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl">

        {/* Page title + Reference search */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-2 flex-1">
            <div className="w-1 h-8 bg-gradient-to-b from-orange-500 to-blue-600 rounded-full" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Shipment Manifest</h1>
              <p className="text-xs text-slate-500">Select a parcel → fill shipper details → save & download PDF</p>
            </div>
          </div>

          {/* Reference / CNIC search bar */}
          <div className="flex gap-2 items-center">
            <div className="relative">
              <ScanSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by Reference, Tracking or CNIC…"
                value={refSearch}
                onChange={(e) => setRefSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRefSearch()}
                className="pl-9 h-9 w-72 text-sm bg-white border-slate-200 shadow-sm"
              />
            </div>
            <Button size="sm" onClick={handleRefSearch} disabled={searching}
              className="bg-blue-700 hover:bg-blue-800 text-white h-9">
              {searching ? "…" : "Find"}
            </Button>
          </div>
        </div>

        {/* Table missing warning */}
        {tableError && (
          <div className="mb-4 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Manifests table not found in Supabase</p>
              <p className="text-xs text-amber-700 mt-0.5">Go to <strong>Supabase → SQL Editor</strong> and run the <code>manifests</code> table SQL provided earlier. Once created, saving and searching will work.</p>
            </div>
          </div>
        )}

        {/* ── SEARCH RESULTS VIEW ── */}
        {view === "search-results" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setView("editor")} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 transition-colors">
                <ArrowLeft className="h-4 w-4" /> Back to Editor
              </button>
              <span className="text-slate-300">|</span>
              <span className="text-sm text-slate-600">
                {searching ? "Searching…" : `${refResults.length} result${refResults.length !== 1 ? "s" : ""} for "${refSearch}"`}
              </span>
            </div>

            {!searching && refResults.length === 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
                <ScanSearch className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No manifests found</p>
                <p className="text-sm text-slate-400 mt-1">Try a different reference number, tracking ID, or CNIC</p>
              </div>
            )}

            <div className="space-y-4">
              {refResults.map((row) => (
                <div key={row.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  {/* Result header */}
                  <div className="bg-gradient-to-r from-slate-900 to-blue-950 px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={logoUrl} alt="SkyXpress" className="h-7 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      <div>
                        <p className="text-white font-bold text-sm">Shipment Manifest</p>
                        <p className="text-blue-300 text-xs font-mono">{row.reference_no || row.tracking_no}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setManifest(dbToManifest(row)); setSelectedId(row.parcel_id); setSaved(true); setView("editor"); }}
                        className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5">
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button onClick={() => generateManifestPDF(dbToManifest(row))}
                        className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5">
                        <FileDown className="h-3.5 w-3.5" /> PDF
                      </button>
                    </div>
                  </div>
                  <div className="h-0.5 bg-gradient-to-r from-orange-500 to-blue-600" />

                  <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Shipper info */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-blue-700 uppercase tracking-widest">Shipper / Sender</p>
                      <p className="font-bold text-slate-900 text-base">{row.shipper_name || "—"}</p>
                      {row.shipper_cnic && (
                        <div className="inline-flex items-center gap-1.5 bg-orange-50 border border-orange-100 rounded-lg px-2.5 py-1">
                          <span className="text-[10px] font-bold text-orange-600 uppercase">CNIC</span>
                          <span className="text-sm font-mono text-orange-800 font-semibold">{row.shipper_cnic}</span>
                        </div>
                      )}
                      <p className="text-sm text-slate-600">{row.shipper_address || "—"}</p>
                      <p className="text-sm text-slate-500">{row.shipper_phone} {row.shipper_country && `• ${row.shipper_country}`}</p>
                    </div>

                    {/* Parcel / route info */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-blue-700 uppercase tracking-widest">Parcel Details</p>
                      {row.parcel && (
                        <>
                          <p className="font-mono text-sm font-bold text-blue-700">{row.parcel.tracking_id}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <StatusBadge status={row.parcel.current_status} />
                            <span className="text-xs text-slate-500">{row.parcel.service_type}</span>
                          </div>
                          <p className="text-sm text-slate-700">
                            <span className="font-medium">{row.parcel.from_country}</span>
                            <span className="text-slate-400 mx-1">→</span>
                            <span className="font-medium">{row.parcel.to_country}</span>
                          </p>
                          <p className="text-sm text-slate-500">Weight: {row.parcel.weight} kg</p>
                          <p className="text-sm text-slate-500">To: {row.parcel.receiver_name}</p>
                        </>
                      )}
                    </div>

                    {/* Items summary */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-blue-700 uppercase tracking-widest">Shipment Items</p>
                      <div className="space-y-1.5">
                        {(Array.isArray(row.items) ? row.items : []).map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-sm border-b border-slate-50 pb-1">
                            <span className="text-slate-700 truncate flex-1 mr-2">{item.description || "Item"}</span>
                            <span className="text-slate-500 text-xs whitespace-nowrap">{item.pieces}pc · {item.weight}kg</span>
                          </div>
                        ))}
                      </div>
                      <div className="bg-orange-50 rounded-lg px-3 py-2 flex justify-between items-center mt-2">
                        <span className="text-xs font-bold text-orange-700">TOTAL</span>
                        <span className="text-sm font-bold text-orange-800">
                          {(Array.isArray(row.items) ? row.items : []).reduce((s: number, i: any) => s + (i.pieces || 0), 0)} pcs ·{" "}
                          {(Array.isArray(row.items) ? row.items : []).reduce((s: number, i: any) => s + (i.weight || 0), 0).toFixed(2)} kg
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">Manifest date: {row.manifest_date}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── EDITOR VIEW ── */}
        {view === "editor" && (
          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">

            {/* LEFT: parcel selector */}
            <aside className="space-y-3">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-blue-800 to-blue-600 px-4 py-3 flex items-center gap-2">
                  <Package className="h-4 w-4 text-white/80" />
                  <span className="text-white font-semibold text-sm">Select Parcel</span>
                </div>
                <div className="p-3">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input placeholder="Search tracking / name…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
                  </div>
                </div>
                <div className="max-h-[calc(100vh-380px)] overflow-y-auto divide-y divide-slate-100">
                  {loadingParcels ? (
                    <div className="p-4 text-center text-sm text-slate-400">Loading…</div>
                  ) : filtered.length === 0 ? (
                    <div className="p-4 text-center text-sm text-slate-400">No parcels found</div>
                  ) : filtered.map((p) => (
                    <button key={p.id} onClick={() => selectParcel(p)}
                      className={`w-full text-left px-3 py-3 hover:bg-blue-50 transition-colors flex items-center justify-between gap-2 group ${selectedId === p.id ? "bg-blue-50 border-l-2 border-blue-600" : ""}`}>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-blue-700 font-mono truncate">{p.tracking_id}</p>
                        <p className="text-sm font-medium text-slate-800 truncate">{p.sender_name}</p>
                        <p className="text-xs text-slate-500 truncate">→ {p.receiver_name}</p>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-slate-200 text-slate-500">{p.from_country} → {p.to_country}</Badge>
                          <StatusBadge status={p.current_status} />
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-400 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={() => { setSelectedId(null); setManifest(emptyManifest()); setSaved(false); setEditMode(true); }}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-dashed border-slate-300 rounded-xl text-slate-500 hover:text-blue-600 hover:border-blue-400 text-sm transition-colors">
                <PlusCircle className="h-3.5 w-3.5" /> New blank manifest
              </button>
            </aside>

            {/* RIGHT: manifest document */}
            <section className="space-y-4">
              {/* Toolbar */}
              <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3 flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  {[{val:true,icon:<Pencil className="h-3.5 w-3.5"/>,label:"Edit"},{val:false,icon:<Eye className="h-3.5 w-3.5"/>,label:"Preview"}].map(({val,icon,label})=>(
                    <button key={String(val)} onClick={() => setEditMode(val)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${editMode===val?"bg-blue-600 text-white shadow":"text-slate-500 hover:bg-slate-100"}`}>
                      {icon} {label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  {/* Save status indicator */}
                  {saved && (
                    <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Saved
                    </span>
                  )}
                  <Button size="sm" onClick={handleSave} disabled={saving || !selectedId}
                    className={`h-8 ${saved ? "bg-green-600 hover:bg-green-700" : "bg-blue-700 hover:bg-blue-800"} text-white`}>
                    <Save className="h-3.5 w-3.5 mr-1.5" />
                    {saving ? "Saving…" : saved ? "Saved" : "Save Manifest"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => window.print()} className="h-8 border-slate-200">
                    <Printer className="h-3.5 w-3.5 mr-1.5" /> Print
                  </Button>
                  <Button size="sm" onClick={handleGeneratePDF} disabled={generating}
                    className="h-8 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-sm">
                    <FileDown className="h-3.5 w-3.5 mr-1.5" />
                    {generating ? "…" : "PDF"}
                  </Button>
                </div>
              </div>

              {/* No parcel selected hint */}
              {!selectedId && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center gap-3">
                  <Package className="h-5 w-5 text-blue-400 flex-shrink-0" />
                  <p className="text-sm text-blue-700">Select a parcel on the left — its details will auto-fill the manifest. You can then edit the shipper CNIC and items before saving.</p>
                </div>
              )}

              {/* Manifest document */}
              <div ref={printRef} className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden print:shadow-none">
                {/* Header */}
                <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 px-6 py-5 flex items-center justify-between">
                  <img src={logoUrl} alt="SkyXpress" className="h-14 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <div className="text-right">
                    <p className="text-white font-bold text-lg tracking-wide">AIR WAYBILL</p>
                    <p className="text-blue-300 text-xs font-medium tracking-widest">SHIPMENT MANIFEST</p>
                    <p className="text-slate-400 text-[10px] mt-0.5">skyxpress.site</p>
                  </div>
                </div>
                <div className="h-1 bg-gradient-to-r from-orange-500 via-orange-400 to-blue-600" />

                <div className="p-6 space-y-5">
                  {/* Reference bar */}
                  <div className="grid grid-cols-3 gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
                    {[{label:"Manifest Date",key:"manifestDate" as const,type:"date"},{label:"Reference No",key:"referenceNo" as const},{label:"Tracking No",key:"trackingNo" as const}].map(({label,key,type})=>(
                      <Field key={key} label={label} value={manifest[key] as string} onChange={(v)=>setField(key,v)} type={type} />
                    ))}
                  </div>

                  {/* Shipper / Consignee */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-slate-100 overflow-hidden">
                      <div className="bg-blue-700 px-4 py-2">
                        <span className="text-white font-bold text-xs uppercase tracking-widest">Shipper / Sender</span>
                      </div>
                      <div className="p-4 space-y-3">
                        <Field label="Full Name" value={manifest.shipperName} onChange={(v)=>setField("shipperName",v)} />
                        <Field label="CNIC / Passport / ID No" value={manifest.shipperCnic} onChange={(v)=>setField("shipperCnic",v)} placeholder="e.g. 42101-1234567-8" />
                        <Field label="Address" value={manifest.shipperAddress} onChange={(v)=>setField("shipperAddress",v)} />
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Phone" value={manifest.shipperPhone} onChange={(v)=>setField("shipperPhone",v)} />
                          <Field label="Country" value={manifest.shipperCountry} onChange={(v)=>setField("shipperCountry",v)} />
                        </div>
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-100 overflow-hidden">
                      <div className="bg-orange-500 px-4 py-2">
                        <span className="text-white font-bold text-xs uppercase tracking-widest">Consignee / Receiver</span>
                      </div>
                      <div className="p-4 space-y-3">
                        <Field label="Full Name" value={manifest.consigneeName} onChange={(v)=>setField("consigneeName",v)} />
                        <div className="h-8" />
                        <Field label="Address" value={manifest.consigneeAddress} onChange={(v)=>setField("consigneeAddress",v)} />
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Phone" value={manifest.consigneePhone} onChange={(v)=>setField("consigneePhone",v)} />
                          <Field label="Country" value={manifest.consigneeCountry} onChange={(v)=>setField("consigneeCountry",v)} />
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
                                {editMode ? <Input value={item.description} onChange={(e)=>setItemField(item.id,"description",e.target.value)} placeholder="e.g. Electronics, Clothing…" className="h-7 text-sm border-slate-200" /> : <span className="text-slate-800">{item.description||"—"}</span>}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {editMode ? <Input type="number" min={1} value={item.pieces} onChange={(e)=>setItemField(item.id,"pieces",Number(e.target.value))} className="h-7 text-sm text-center w-16 mx-auto border-slate-200" /> : <span className="font-semibold">{item.pieces}</span>}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {editMode ? <Input type="number" min={0} step={0.01} value={item.weight} onChange={(e)=>setItemField(item.id,"weight",Number(e.target.value))} className="h-7 text-sm text-center w-20 mx-auto border-slate-200" /> : <span>{item.weight} kg</span>}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {editMode ? <Input type="number" min={0} step={0.01} value={item.value} onChange={(e)=>setItemField(item.id,"value",Number(e.target.value))} className="h-7 text-sm text-right w-24 ml-auto border-slate-200" /> : <span>{manifest.currency} {(item.value||0).toFixed(2)}</span>}
                              </td>
                              {editMode && (
                                <td className="px-2 py-2">
                                  {manifest.items.length > 1 && (
                                    <button onClick={()=>removeItem(item.id)} className="text-slate-300 hover:text-red-400 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
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
                      <Label className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Service Type</Label>
                      {editMode ? (
                        <Select value={manifest.serviceType} onValueChange={(v)=>setField("serviceType",v)}>
                          <SelectTrigger className="h-8 text-sm border-slate-200"><SelectValue placeholder="Select service" /></SelectTrigger>
                          <SelectContent>{["Express","Standard","Economy","Same Day","Next Day","Freight"].map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                      ) : <div className="min-h-[32px] px-2 py-1.5 text-sm text-slate-800 border-b border-slate-200">{manifest.serviceType||<span className="text-slate-300">—</span>}</div>}
                    </div>
                    <Field label="Declared Value" value={manifest.declaredValue} onChange={(v)=>setField("declaredValue",v)} type="number" placeholder="0.00" />
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Currency</Label>
                      {editMode ? (
                        <Select value={manifest.currency} onValueChange={(v)=>setField("currency",v)}>
                          <SelectTrigger className="h-8 text-sm border-slate-200"><SelectValue /></SelectTrigger>
                          <SelectContent>{["USD","EUR","GBP","PKR","AED","SAR","CAD","AUD"].map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                        </Select>
                      ) : <div className="min-h-[32px] px-2 py-1.5 text-sm border-b border-slate-200">{manifest.currency}</div>}
                    </div>
                  </div>

                  {/* Special instructions */}
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Special Instructions</Label>
                    {editMode ? (
                      <Textarea value={manifest.specialInstructions} onChange={(e)=>setField("specialInstructions",e.target.value)}
                        placeholder="Fragile items, handling instructions, customs declarations…" rows={2} className="text-sm border-slate-200 resize-none" />
                    ) : (
                      <div className="min-h-[60px] px-3 py-2 text-sm text-slate-800 border border-slate-100 rounded-lg bg-slate-50">
                        {manifest.specialInstructions||<span className="text-slate-400">None</span>}
                      </div>
                    )}
                  </div>

                  {/* Signature area */}
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    {["Shipper's Signature & Date","Carrier's Signature & Date"].map(label=>(
                      <div key={label} className="border border-dashed border-slate-200 rounded-xl p-4 bg-slate-50/50">
                        <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-6">{label}</p>
                        <div className="border-b border-slate-300 mt-2" />
                        <p className="text-xs text-slate-400 mt-1">Authorized signature</p>
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="bg-gradient-to-r from-slate-900 to-blue-950 rounded-xl px-5 py-3 flex items-center justify-between">
                    <span className="text-slate-400 text-xs">SkyXpress International Courier & Cargo</span>
                    <span className="text-orange-400 text-xs font-semibold">skyxpress.site</span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
