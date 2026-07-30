// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileSpreadsheet,
  FileDown,
  Trash2,
  Search,
  ClipboardList,
  Package,
  Weight,
  DollarSign,
  Calendar,
  RefreshCw,
  Lock,
  Unlock,
  Copy,
  MoreHorizontal,
  Plane,
  MapPin,
  Clock,
  Building2,
  Database,
  Plus,
  X,
  CheckCircle2,
  ChevronDown,
  FileText,
  History,
  Download,
} from "lucide-react";
import {
  loadManifestStock,
  deleteManifestFromStock,
  updateManifestInStock,
  type ManifestStockEntry,
} from "@/utils/manifestStorage";
import { exportManifestToExcel } from "@/utils/manifestExport";
import { generateBulkManifestPDF } from "@/utils/bulkManifestPDF";
import { supabase } from "@/integrations/supabase/client";

// ── SQL Schema ────────────────────────────────────────────────────────────────
const SQL_SCHEMA = `-- ============================================================
-- SkyXpress Manifest Tables — run in Supabase SQL Editor
-- ============================================================

-- 1. Manifest sequence counter
CREATE TABLE IF NOT EXISTS manifest_sequence (
  id         integer PRIMARY KEY DEFAULT 1,
  last_number integer NOT NULL DEFAULT 191099
);
INSERT INTO manifest_sequence (id, last_number)
VALUES (1, 191099)
ON CONFLICT (id) DO NOTHING;

-- 2. Auto-increment RPC
CREATE OR REPLACE FUNCTION increment_manifest_sequence()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE next_val integer;
BEGIN
  UPDATE manifest_sequence
  SET last_number = last_number + 1
  WHERE id = 1
  RETURNING last_number INTO next_val;
  RETURN next_val;
END; $$;

-- 3. Individual parcel manifests (AWB)
CREATE TABLE IF NOT EXISTS manifests (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  parcel_id           uuid REFERENCES parcels(id) ON DELETE CASCADE,
  manifest_date       date,
  reference_no        text,
  tracking_no         text,
  shipper_name        text,
  shipper_cnic        text,
  shipper_address     text,
  shipper_phone       text,
  shipper_email       text,
  shipper_country     text,
  consignee_name      text,
  consignee_address   text,
  consignee_phone     text,
  consignee_country   text,
  service_type        text,
  declared_value      numeric,
  currency            text DEFAULT 'USD',
  special_instructions text,
  items               jsonb DEFAULT '[]',
  created_by          uuid,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now(),
  UNIQUE(parcel_id)
);

-- 4. Bulk manifest stock (flight/shipment batches)
CREATE TABLE IF NOT EXISTS manifests_detail (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  manifest_id         text NOT NULL UNIQUE,
  booking_from_date   date,
  booking_till_date   date,
  manifest_date       date DEFAULT CURRENT_DATE,
  manifest_time       time,
  run_number          text,
  flight_no           text,
  no_of_bags          integer DEFAULT 0,
  arrival_date        date,
  arrival_time        time,
  forwarder           text,
  service             text,
  master_no           text,
  master_edi_bag_no   text,
  remark              text,
  created_by_user     text,
  company             text,
  license             text,
  vendor_weight       numeric DEFAULT 0,
  total_actual_wt     numeric DEFAULT 0,
  total_volumetric_wt numeric DEFAULT 0,
  total_chargeable_wt numeric DEFAULT 0,
  no_of_awb           integer DEFAULT 0,
  no_of_pcs           integer DEFAULT 0,
  origin_hub          text,
  destination_hub     text,
  is_locked           boolean DEFAULT false,
  parcel_count        integer DEFAULT 0,
  total_weight        numeric DEFAULT 0,
  total_value         numeric DEFAULT 0,
  currency            text DEFAULT 'USD',
  service_type        text,
  from_country        text,
  to_country          text,
  tracking_ids        text[],
  parcels             jsonb,
  tracking_events     jsonb DEFAULT '[]',
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

-- 5. Enable Row Level Security (optional)
ALTER TABLE manifests       ENABLE ROW LEVEL SECURITY;
ALTER TABLE manifests_detail ENABLE ROW LEVEL SECURITY;
ALTER TABLE manifest_sequence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON manifests
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON manifests_detail
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all" ON manifest_sequence FOR ALL USING (true);
`;

// ── Constants ─────────────────────────────────────────────────────────────────
const ORIGIN_HUBS = [
  "GRT - GUJRAT", "LHE - LAHORE", "KHI - KARACHI", "ISB - ISLAMABAD",
  "MUL - MULTAN", "FSD - FAISALABAD", "PEW - PESHAWAR", "QTA - QUETTA",
];
const DEST_HUBS = [
  "UK BRANCH - MCS UK", "USA BRANCH - MCS USA", "CANADA - MCS CAN",
  "AUSTRALIA - MCS AUS", "UAE - MCS UAE", "SAUDI - MCS SAU",
  "SPAIN - MCS ESP", "ITALY - MCS ITA",
];
const SERVICES = ["Express", "Standard", "Economy", "Same Day", "Next Day", "Freight", "Cargo"];
const LICENSES = ["Select License...", "EXP-001", "EXP-002", "IMP-001", "CARGO-001", "FREIGHT-001"];

const statusColors: Record<string, string> = {
  delivered:        "bg-green-100 text-green-800 border-green-200",
  in_transit:       "bg-blue-100 text-blue-800 border-blue-200",
  created:          "bg-yellow-100 text-yellow-800 border-yellow-200",
  picked_up:        "bg-blue-100 text-blue-800 border-blue-200",
  customs:          "bg-orange-100 text-orange-800 border-orange-200",
  out_for_delivery: "bg-indigo-100 text-indigo-800 border-indigo-200",
  cancelled:        "bg-red-100 text-red-800 border-red-200",
};

// ── Field component ───────────────────────────────────────────────────────────
function Field({
  label, value, onChange, type = "text", placeholder, disabled = false,
  className = "", readOnly = false,
}: {
  label: string; value: string | number | undefined; onChange?: (v: string) => void;
  type?: string; placeholder?: string; disabled?: boolean; className?: string; readOnly?: boolean;
}) {
  return (
    <div className={`space-y-1 ${className}`}>
      <Label className="text-[10px] font-bold text-blue-700 uppercase tracking-wider leading-none">
        {label}
      </Label>
      {readOnly || disabled ? (
        <div className="h-8 px-2 flex items-center text-sm bg-slate-50 border border-slate-200 rounded text-slate-700 font-medium">
          {value || <span className="text-slate-400">—</span>}
        </div>
      ) : (
        <Input
          type={type} value={value ?? ""} onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder || label}
          className="h-8 text-sm border-slate-200 focus:border-blue-400 bg-white"
        />
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export const ManifestStock = () => {
  const [entries, setEntries]         = useState<ManifestStockEntry[]>([]);
  const [search, setSearch]           = useState("");
  const [selected, setSelected]       = useState<ManifestStockEntry | null>(null);
  const [editing, setEditing]         = useState<ManifestStockEntry | null>(null);
  const [countryMap, setCountryMap]   = useState<Record<string, string>>({});
  const [downloading, setDownloading] = useState<string | null>(null);
  const [showSQL, setShowSQL]         = useState(false);
  const [sqlCopied, setSqlCopied]     = useState(false);
  const [saving, setSaving]           = useState(false);
  const [awbSearch, setAwbSearch]     = useState("");
  const [csvFile, setCsvFile]         = useState<File | null>(null);
  const { toast } = useToast();

  const reload = useCallback(() => setEntries(loadManifestStock()), []);

  useEffect(() => {
    reload();
    supabase.from("countries").select("code, name").then(({ data }) => {
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((c: any) => { map[c.code] = c.name; });
        setCountryMap(map);
      }
    });
  }, [reload]);

  const openDetail = (entry: ManifestStockEntry) => {
    setSelected(entry);
    setEditing({ ...entry });
  };

  const closeDetail = () => {
    setSelected(null);
    setEditing(null);
    setAwbSearch("");
  };

  const handleSave = () => {
    if (!editing) return;
    setSaving(true);
    setTimeout(() => {
      updateManifestInStock(editing.manifestId, editing);
      reload();
      setSelected(editing);
      setSaving(false);
      toast({ title: "Manifest updated ✓", description: `Manifest ${editing.manifestId} saved.` });
    }, 400);
  };

  const handleClone = () => {
    if (!editing) return;
    const clone: ManifestStockEntry = {
      ...editing,
      manifestId: editing.manifestId + "-COPY",
      createdAt: new Date().toISOString(),
      isLocked: false,
    };
    updateManifestInStock(clone.manifestId, clone);
    const stock = loadManifestStock();
    stock.unshift(clone);
    localStorage.setItem("skyxpress_manifest_stock", JSON.stringify(stock));
    reload();
    toast({ title: "Cloned", description: `Created ${clone.manifestId}` });
    closeDetail();
  };

  const handleLockToggle = () => {
    if (!editing) return;
    const locked = !editing.isLocked;
    setEditing((e) => e ? { ...e, isLocked: locked } : e);
    updateManifestInStock(editing.manifestId, { isLocked: locked });
    reload();
    toast({ title: locked ? "Manifest locked 🔒" : "Manifest unlocked 🔓" });
  };

  const handleDelete = (manifestId: string) => {
    if (!window.confirm(`Delete manifest ${manifestId}? This cannot be undone.`)) return;
    deleteManifestFromStock(manifestId);
    reload();
    if (selected?.manifestId === manifestId) closeDetail();
    toast({ title: "Manifest deleted", description: manifestId });
  };

  const handleExcelDownload = async (entry: ManifestStockEntry) => {
    setDownloading(entry.manifestId + "-xls");
    try {
      exportManifestToExcel(entry.parcels as any, countryMap, `SkyXpress_Manifest_${entry.manifestId}.xlsx`, entry.manifestId);
      toast({ title: "Excel downloaded ✓", description: entry.manifestId });
    } catch (e: any) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
    } finally { setDownloading(null); }
  };

  const handlePDFDownload = async (entry: ManifestStockEntry) => {
    setDownloading(entry.manifestId + "-pdf");
    try {
      await generateBulkManifestPDF(entry, countryMap);
      toast({ title: "PDF downloaded ✓", description: entry.manifestId });
    } catch (e: any) {
      toast({ title: "PDF failed", description: e.message, variant: "destructive" });
    } finally { setDownloading(null); }
  };

  const handleCopySQL = () => {
    navigator.clipboard.writeText(SQL_SCHEMA).then(() => {
      setSqlCopied(true);
      setTimeout(() => setSqlCopied(false), 2000);
    });
  };

  const setEditField = (key: keyof ManifestStockEntry, val: any) =>
    setEditing((e) => e ? { ...e, [key]: val } : e);

  const filtered = entries.filter((e) => {
    const q = search.toLowerCase();
    return (
      e.manifestId.toLowerCase().includes(q) ||
      e.trackingIds.some((id) => id.toLowerCase().includes(q)) ||
      (e.serviceType || "").toLowerCase().includes(q) ||
      (e.fromCountry || "").toLowerCase().includes(q) ||
      (e.toCountry || "").toLowerCase().includes(q) ||
      (e.flightNo || "").toLowerCase().includes(q) ||
      (e.originHub || "").toLowerCase().includes(q)
    );
  });

  const filteredAwbs = editing
    ? editing.parcels.filter((p) => {
        const q = awbSearch.toLowerCase();
        return !q || p.tracking_id.toLowerCase().includes(q) || (p.sender_name || "").toLowerCase().includes(q);
      })
    : [];

  // ── Totals computed from parcels ──────────────────────────────────────────
  const computedActual    = editing ? editing.parcels.reduce((s, p) => s + Number(p.weight ?? 0), 0).toFixed(2) : "0.00";
  const computedPcs       = editing ? editing.parcels.reduce((s, p) => s + (p.pieces ?? 1), 0) : 0;
  const computedAwb       = editing ? editing.parcels.length : 0;

  return (
    <div className="space-y-5">

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Manifests", value: entries.length, icon: ClipboardList, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
          { label: "Total Parcels",   value: entries.reduce((s, e) => s + e.parcelCount, 0), icon: Package, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-100" },
          { label: "Total Weight",    value: `${entries.reduce((s, e) => s + e.totalWeight, 0).toFixed(1)} kg`, icon: Weight, color: "text-green-600", bg: "bg-green-50", border: "border-green-100" },
          { label: "Total Value",     value: entries.length > 0 ? `${entries[0].currency} ${entries.reduce((s, e) => s + e.totalValue, 0).toFixed(2)}` : "—", icon: DollarSign, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-100" },
        ].map(({ label, value, icon: Icon, color, bg, border }) => (
          <Card key={label} className={`border ${border} shadow-sm`}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`${bg} p-2.5 rounded-xl border ${border}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">{label}</p>
                <p className="text-xl font-bold text-slate-800">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── List Card ──────────────────────────────────────────────────────── */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="flex items-center gap-2 text-slate-800">
              <ClipboardList className="h-5 w-5 text-blue-600" />
              Manifest Stock
              {entries.length > 0 && (
                <Badge variant="secondary" className="ml-1 bg-blue-100 text-blue-700">{entries.length}</Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowSQL(true)}
                className="gap-2 border-slate-300 text-slate-600 hover:text-blue-700 hover:border-blue-300">
                <Database className="h-3.5 w-3.5" /> SQL Setup
              </Button>
              <Button variant="outline" size="sm" onClick={reload} className="gap-2 border-slate-300">
                <RefreshCw className="h-3.5 w-3.5" /> Refresh
              </Button>
            </div>
          </div>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search manifest ID, tracking, flight, hub…"
              value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-white" />
          </div>
        </CardHeader>

        <CardContent>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <div className="rounded-full bg-slate-100 p-5">
                <ClipboardList className="h-10 w-10 text-slate-300" />
              </div>
              <div>
                <p className="font-semibold text-slate-600">No manifests found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Select parcels in Parcel Management and click "Generate Manifest"
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-slate-800 to-blue-900 hover:from-slate-800 hover:to-blue-900">
                    {["Manifest ID","Date","Parcels","Route","Weight","Value","Service","Flight","Status","Actions"].map(h => (
                      <TableHead key={h} className="text-white font-bold text-xs py-3">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((entry, i) => (
                    <TableRow key={entry.manifestId}
                      className={`cursor-pointer transition-colors ${i % 2 === 0 ? "bg-white hover:bg-blue-50/50" : "bg-slate-50/40 hover:bg-blue-50/50"}`}
                      onClick={() => openDetail(entry)}>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {entry.isLocked && <Lock className="h-3 w-3 text-slate-400 flex-shrink-0" />}
                          <span className="font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded text-sm tracking-wider border border-orange-100">
                            {entry.manifestId}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-slate-700">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {new Date(entry.createdAt).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" })}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {new Date(entry.createdAt).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Package className="h-3.5 w-3.5 text-blue-400" />
                          <span className="font-semibold text-slate-800">{entry.parcelCount}</span>
                          <span className="text-xs text-muted-foreground">AWBs</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                          {entry.trackingIds.slice(0, 2).join(", ")}{entry.trackingIds.length > 2 && ` +${entry.trackingIds.length - 2}`}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium text-slate-700">{entry.fromCountry || "—"}</div>
                        <div className="text-xs text-muted-foreground">→ {entry.toCountry || "—"}</div>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-slate-800">{entry.totalWeight.toFixed(2)}</span>
                        <span className="text-xs text-muted-foreground ml-1">kg</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">{entry.currency} </span>
                        <span className="font-semibold text-slate-800">{entry.totalValue.toFixed(2)}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs border-slate-200 text-slate-600">{entry.serviceType}</Badge>
                      </TableCell>
                      <TableCell>
                        {entry.flightNo ? (
                          <div className="flex items-center gap-1 text-xs text-slate-700">
                            <Plane className="h-3 w-3 text-blue-400" />{entry.flightNo}
                          </div>
                        ) : <span className="text-slate-300 text-xs">—</span>}
                      </TableCell>
                      <TableCell>
                        {entry.isLocked ? (
                          <Badge className="bg-slate-700 text-white text-[10px] gap-1"><Lock className="h-2.5 w-2.5" /> Locked</Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">Open</Badge>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1 justify-end">
                          <Button variant="ghost" size="sm" title="Excel"
                            className="gap-1 text-green-700 hover:bg-green-50 h-7 px-2"
                            onClick={() => handleExcelDownload(entry)}
                            disabled={downloading === entry.manifestId + "-xls"}>
                            <FileSpreadsheet className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" title="PDF"
                            className="gap-1 text-blue-700 hover:bg-blue-50 h-7 px-2"
                            onClick={() => handlePDFDownload(entry)}
                            disabled={downloading === entry.manifestId + "-pdf"}>
                            <FileDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Delete"
                            className="text-red-400 hover:text-red-600 hover:bg-red-50 h-7 px-2"
                            onClick={() => handleDelete(entry.manifestId)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── MANIFEST DETAIL Sheet ─────────────────────────────────────────── */}
      <Sheet open={!!selected} onOpenChange={(o) => { if (!o) closeDetail(); }}>
        <SheetContent side="right" className="w-full sm:max-w-5xl p-0 overflow-hidden flex flex-col">
          {editing && (
            <>
              {/* ── Top header bar ─────────────────────────────────────── */}
              <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 px-4 py-3 flex items-center justify-between flex-wrap gap-2 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-orange-400" />
                    <span className="text-white font-bold text-sm tracking-wide">MANIFEST DETAIL</span>
                  </div>
                  <span className="font-mono text-orange-400 bg-orange-500/10 border border-orange-500/30 px-2 py-0.5 rounded text-sm font-bold tracking-widest">
                    {editing.manifestId}
                  </span>
                  {editing.isLocked && <Badge className="bg-red-600 text-white text-[10px]"><Lock className="h-2.5 w-2.5 mr-1" />Locked</Badge>}
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline"
                    className="h-7 text-xs border-white/20 text-white hover:bg-white/10 bg-transparent gap-1.5"
                    onClick={handleClone}>
                    <Copy className="h-3 w-3" /> Clone
                  </Button>
                  <Button size="sm"
                    className={`h-7 text-xs gap-1.5 ${editing.isLocked ? "bg-orange-500 hover:bg-orange-600" : "bg-slate-600 hover:bg-slate-500"} text-white`}
                    onClick={handleLockToggle}>
                    {editing.isLocked ? <><Unlock className="h-3 w-3" /> Unlock</> : <><Lock className="h-3 w-3" /> Lock</>}
                  </Button>
                  <Button size="sm"
                    className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                    onClick={() => handleExcelDownload(editing)}
                    disabled={downloading === editing.manifestId + "-xls"}>
                    <FileSpreadsheet className="h-3 w-3" /> Excel
                  </Button>
                  <Button size="sm"
                    className="h-7 text-xs bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white gap-1.5"
                    onClick={() => handlePDFDownload(editing)}
                    disabled={downloading === editing.manifestId + "-pdf"}>
                    <FileDown className="h-3 w-3" /> PDF
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-white/60 hover:text-white hover:bg-white/10" onClick={closeDetail}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* ── Sub-header: tabs + action buttons ──────────────────── */}
              <div className="bg-slate-100 border-b border-slate-200 flex-shrink-0">
                <Tabs defaultValue="entry" className="w-full">
                  <div className="flex items-center justify-between px-4 pt-0">
                    <TabsList className="h-9 bg-transparent gap-0 rounded-none border-0 p-0">
                      {[
                        { value: "entry", label: "Entry", icon: ClipboardList },
                        { value: "tracking", label: "Add Tracking Event to AWBs", icon: MapPin },
                        { value: "billing", label: "Billing", icon: DollarSign },
                      ].map(({ value, label, icon: Icon }) => (
                        <TabsTrigger key={value} value={value}
                          className="h-9 px-4 rounded-none text-xs font-semibold uppercase tracking-wide border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 data-[state=active]:bg-white data-[state=active]:shadow-none text-slate-500 hover:text-slate-700 transition-none">
                          <Icon className="h-3 w-3 mr-1.5" />{label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    <div className="flex items-center gap-2">
                      <Button size="sm"
                        className="h-7 text-[11px] bg-blue-700 hover:bg-blue-800 text-white gap-1"
                        onClick={handleSave} disabled={saving || editing.isLocked}>
                        {saving ? <RefreshCw className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                        {saving ? "Saving…" : "Update Manifest"}
                      </Button>
                      <Button size="sm" variant="outline"
                        className="h-7 text-[11px] border-slate-300 text-slate-600 gap-1">
                        <History className="h-3 w-3" /> Manifest History
                      </Button>
                    </div>
                  </div>

                  {/* ── Scrollable content ─────────────────────────────── */}
                  <div className="overflow-y-auto flex-1" style={{ maxHeight: "calc(100vh - 160px)" }}>

                    {/* ══ ENTRY TAB ═══════════════════════════════════════ */}
                    <TabsContent value="entry" className="m-0 p-4 space-y-4">

                      {/* 3-column main form */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                        {/* LEFT column */}
                        <div className="space-y-3 bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-1.5">Manifest Info</p>
                          <Field label="Booking From Date" type="date" value={editing.bookingFromDate}
                            onChange={(v) => setEditField("bookingFromDate", v)} disabled={editing.isLocked} />
                          <Field label="Booking Till Date" type="date" value={editing.bookingTillDate}
                            onChange={(v) => setEditField("bookingTillDate", v)} disabled={editing.isLocked} />
                          <Field label="Manifest No." value={editing.manifestId} readOnly />
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Forwarder</Label>
                            <Input value={editing.forwarder ?? ""} onChange={(e) => setEditField("forwarder", e.target.value)}
                              placeholder="Forwarder name" className="h-8 text-sm border-slate-200" disabled={editing.isLocked} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Service</Label>
                            <Select value={editing.service ?? ""} onValueChange={(v) => setEditField("service", v)} disabled={editing.isLocked}>
                              <SelectTrigger className="h-8 text-sm border-slate-200">
                                <SelectValue placeholder="Select service" />
                              </SelectTrigger>
                              <SelectContent>
                                {SERVICES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <Field label="Master No." value={editing.masterNo}
                            onChange={(v) => setEditField("masterNo", v)} disabled={editing.isLocked} />
                          <Field label="Master EDI Bag No" value={editing.masterEdiBagNo}
                            onChange={(v) => setEditField("masterEdiBagNo", v)} disabled={editing.isLocked} />
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Remark</Label>
                            <Textarea value={editing.remark ?? ""} onChange={(e) => setEditField("remark", e.target.value)}
                              placeholder="Any remarks…" rows={2} className="text-sm border-slate-200 resize-none" disabled={editing.isLocked} />
                          </div>
                          <Field label="Created By User" value={editing.createdByUser}
                            onChange={(v) => setEditField("createdByUser", v)} disabled={editing.isLocked} />
                        </div>

                        {/* MIDDLE column */}
                        <div className="space-y-3 bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-1.5">Flight & Shipment</p>
                          <div className="grid grid-cols-2 gap-3">
                            <Field label="Date" type="date" value={editing.manifestDate}
                              onChange={(v) => setEditField("manifestDate", v)} disabled={editing.isLocked} />
                            <Field label="Time" type="time" value={editing.manifestTime}
                              onChange={(v) => setEditField("manifestTime", v)} disabled={editing.isLocked} />
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <Label className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Run Number</Label>
                            </div>
                            <Input value={editing.runNumber ?? ""} onChange={(e) => setEditField("runNumber", e.target.value)}
                              placeholder="Run number" className="h-8 text-sm border-slate-200" disabled={editing.isLocked} />
                          </div>
                          <Field label="Flight No" value={editing.flightNo}
                            onChange={(v) => setEditField("flightNo", v)} placeholder="e.g. PK-301" disabled={editing.isLocked} />
                          <Field label="No. of Bags" type="number" value={editing.noOfBags ?? ""}
                            onChange={(v) => setEditField("noOfBags", Number(v))} disabled={editing.isLocked} />
                          <div className="grid grid-cols-2 gap-3">
                            <Field label="Arrival Date" type="date" value={editing.arrivalDate}
                              onChange={(v) => setEditField("arrivalDate", v)} disabled={editing.isLocked} />
                            <Field label="Arrival Time" type="time" value={editing.arrivalTime}
                              onChange={(v) => setEditField("arrivalTime", v)} disabled={editing.isLocked} />
                          </div>
                          <Field label="Company" value={editing.company}
                            onChange={(v) => setEditField("company", v)} disabled={editing.isLocked} />
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">License</Label>
                            <Select value={editing.license ?? ""} onValueChange={(v) => setEditField("license", v)} disabled={editing.isLocked}>
                              <SelectTrigger className="h-8 text-sm border-slate-200">
                                <SelectValue placeholder="Select License…" />
                              </SelectTrigger>
                              <SelectContent>
                                {LICENSES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <Separator className="my-1" />
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Weight Summary</p>
                          <Field label="Vendor Weight (kg)" type="number" value={editing.vendorWeight ?? ""}
                            onChange={(v) => setEditField("vendorWeight", Number(v))} disabled={editing.isLocked} />
                          <Field label="Total Actual Wt (kg)" value={computedActual} readOnly />
                          <Field label="Total Volumetric Wt (kg)" type="number" value={editing.totalVolumetricWt ?? ""}
                            onChange={(v) => setEditField("totalVolumetricWt", Number(v))} disabled={editing.isLocked} />
                          <Field label="Total Chargeable Wt (kg)" value={
                            editing.totalVolumetricWt && Number(editing.totalVolumetricWt) > Number(computedActual)
                              ? editing.totalVolumetricWt
                              : computedActual
                          } readOnly />
                          <div className="grid grid-cols-2 gap-3">
                            <Field label="No. of AWB" value={computedAwb} readOnly />
                            <Field label="No. of PCS" value={computedPcs} readOnly />
                          </div>
                        </div>

                        {/* RIGHT column */}
                        <div className="space-y-3 bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-1.5">Hubs & Files</p>
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Origin Hub <span className="text-red-500">*</span></Label>
                            <Select value={editing.originHub ?? ""} onValueChange={(v) => setEditField("originHub", v)} disabled={editing.isLocked}>
                              <SelectTrigger className="h-8 text-sm border-slate-200">
                                <SelectValue placeholder="Select origin hub…" />
                              </SelectTrigger>
                              <SelectContent>
                                {ORIGIN_HUBS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Destination Hub</Label>
                            <Select value={editing.destinationHub ?? ""} onValueChange={(v) => setEditField("destinationHub", v)} disabled={editing.isLocked}>
                              <SelectTrigger className="h-8 text-sm border-slate-200">
                                <SelectValue placeholder="Select destination hub…" />
                              </SelectTrigger>
                              <SelectContent>
                                {DEST_HUBS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">EDI Excel File</Label>
                            <p className="text-[10px] text-orange-600 font-semibold">(UPLOAD EXCEL FILE ONLY)</p>
                            <div className="flex items-center gap-2">
                              <label className="flex-1">
                                <div className="h-8 px-3 flex items-center justify-between border border-slate-200 rounded text-sm cursor-pointer hover:border-blue-400 bg-white text-slate-500">
                                  <span className="truncate">{csvFile?.name || "Choose file…"}</span>
                                  <Download className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                                </div>
                                <input type="file" accept=".xlsx,.xls" className="hidden"
                                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)} />
                              </label>
                            </div>
                          </div>

                          <Separator />

                          {/* Route summary card */}
                          <div className="bg-gradient-to-br from-blue-50 to-slate-50 rounded-xl border border-blue-100 p-3 space-y-2">
                            <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Route Summary</p>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] text-slate-500">FROM</p>
                                <p className="text-sm font-bold text-slate-800 truncate">{editing.fromCountry || "—"}</p>
                              </div>
                              <Plane className="h-4 w-4 text-orange-500 flex-shrink-0" />
                              <div className="flex-1 min-w-0 text-right">
                                <p className="text-[10px] text-slate-500">TO</p>
                                <p className="text-sm font-bold text-slate-800 truncate">{editing.toCountry || "—"}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-1.5 pt-1">
                              {[
                                { label: "AWBs",   value: computedAwb },
                                { label: "Weight", value: `${computedActual} kg` },
                                { label: "Value",  value: `${editing.currency} ${editing.totalValue.toFixed(0)}` },
                              ].map(({ label, value }) => (
                                <div key={label} className="bg-white rounded-lg p-2 border border-blue-100 text-center">
                                  <p className="text-[9px] text-slate-400 uppercase">{label}</p>
                                  <p className="text-xs font-bold text-slate-700">{value}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* AWBs table */}
                      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="bg-slate-800 px-4 py-2.5 flex items-center justify-between gap-3">
                          <span className="text-white font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                            <Package className="h-3.5 w-3.5 text-orange-400" /> AWBs in this Manifest
                            <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{editing.parcels.length}</span>
                          </span>
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                            <input value={awbSearch} onChange={(e) => setAwbSearch(e.target.value)}
                              placeholder="Search AWB…" className="pl-6 h-6 text-xs bg-white/10 border border-white/20 rounded text-white placeholder-slate-400 focus:outline-none focus:border-white/40 w-40" />
                          </div>
                        </div>
                        <div className="overflow-x-auto max-h-56">
                          <table className="w-full text-xs min-w-[600px]">
                            <thead className="sticky top-0 z-10">
                              <tr className="bg-slate-50 border-b border-slate-100">
                                {["#","Tracking ID","Shipper","Receiver","Route","Pkgs","Weight","Status"].map(h => (
                                  <th key={h} className="px-3 py-2 text-left font-bold text-blue-700 uppercase tracking-wide text-[10px]">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {filteredAwbs.map((p, idx) => (
                                <tr key={p.id || idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/30"}>
                                  <td className="px-3 py-2 text-slate-400 font-mono">{idx + 1}</td>
                                  <td className="px-3 py-2 font-mono font-bold text-blue-600">{p.tracking_id}</td>
                                  <td className="px-3 py-2 text-slate-700">{p.sender_name}</td>
                                  <td className="px-3 py-2 text-slate-700">{p.receiver_name}</td>
                                  <td className="px-3 py-2 text-slate-500">
                                    {countryMap[p.from_country] || p.from_country} → {countryMap[p.to_country] || p.to_country}
                                  </td>
                                  <td className="px-3 py-2 font-semibold">{p.pieces ?? 1}</td>
                                  <td className="px-3 py-2 font-semibold">{p.weight} kg</td>
                                  <td className="px-3 py-2">
                                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${statusColors[p.current_status] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
                                      {(p.current_status || "").replace(/_/g, " ")}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Bottom action bar */}
                      <div className="bg-slate-900 rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                          <input placeholder="Search AWB…" value={awbSearch} onChange={(e) => setAwbSearch(e.target.value)}
                            className="pl-8 h-8 text-xs bg-slate-800 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 w-36" />
                        </div>
                        <Button size="sm" className="h-8 text-xs bg-blue-700 hover:bg-blue-800 text-white gap-1.5" onClick={handleSave} disabled={saving || editing.isLocked}>
                          <CheckCircle2 className="h-3.5 w-3.5" /> Update Manifest
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 text-xs border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700 gap-1.5">
                          <Package className="h-3.5 w-3.5" /> Bagging
                        </Button>
                        <div className="flex items-center gap-2 ml-auto">
                          <span className="text-slate-400 text-xs font-medium">CSV File <span className="text-red-400">*</span></span>
                          <label>
                            <div className="h-8 px-3 flex items-center gap-2 bg-slate-800 border border-slate-600 rounded text-slate-300 text-xs cursor-pointer hover:border-slate-400">
                              <span>{csvFile?.name || "No file chosen"}</span>
                            </div>
                            <input type="file" accept=".csv" className="hidden" onChange={(e) => setCsvFile(e.target.files?.[0] || null)} />
                          </label>
                          <Button size="sm" className="h-8 text-xs bg-slate-700 hover:bg-slate-600 text-white">Import</Button>
                          <Button size="sm" variant="outline" className="h-8 text-xs border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700 gap-1">
                            <Download className="h-3.5 w-3.5" /> Sample
                          </Button>
                        </div>
                      </div>
                    </TabsContent>

                    {/* ══ TRACKING EVENTS TAB ═════════════════════════════ */}
                    <TabsContent value="tracking" className="m-0 p-4 space-y-4">
                      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="bg-slate-800 px-4 py-2.5 flex items-center justify-between">
                          <span className="text-white font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-orange-400" /> Tracking Events
                          </span>
                          <Button size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1" disabled={editing.isLocked}
                            onClick={() => {
                              const newEvent = { id: Date.now().toString(), awb: "", event: "", location: "", timestamp: new Date().toISOString().slice(0, 16), notes: "" };
                              setEditField("trackingEvents", [...(editing.trackingEvents || []), newEvent]);
                            }}>
                            <Plus className="h-3 w-3" /> Add Event
                          </Button>
                        </div>
                        {(!editing.trackingEvents || editing.trackingEvents.length === 0) ? (
                          <div className="py-12 text-center">
                            <MapPin className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                            <p className="text-sm text-slate-500">No tracking events yet</p>
                            <p className="text-xs text-slate-400 mt-1">Click "Add Event" to add a tracking update for AWBs in this manifest</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-50">
                            {editing.trackingEvents.map((ev, i) => (
                              <div key={ev.id} className="p-4 grid grid-cols-2 md:grid-cols-5 gap-3 items-end hover:bg-slate-50/50">
                                <div className="space-y-1">
                                  <Label className="text-[10px] font-bold text-blue-700 uppercase tracking-wide">AWB / Tracking ID</Label>
                                  <Input value={ev.awb} placeholder="AWB number" className="h-8 text-sm" disabled={editing.isLocked}
                                    onChange={(e) => {
                                      const evs = [...editing.trackingEvents];
                                      evs[i] = { ...evs[i], awb: e.target.value };
                                      setEditField("trackingEvents", evs);
                                    }} />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-[10px] font-bold text-blue-700 uppercase tracking-wide">Event</Label>
                                  <Input value={ev.event} placeholder="e.g. In Transit" className="h-8 text-sm" disabled={editing.isLocked}
                                    onChange={(e) => {
                                      const evs = [...editing.trackingEvents];
                                      evs[i] = { ...evs[i], event: e.target.value };
                                      setEditField("trackingEvents", evs);
                                    }} />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-[10px] font-bold text-blue-700 uppercase tracking-wide">Location</Label>
                                  <Input value={ev.location} placeholder="City / Hub" className="h-8 text-sm" disabled={editing.isLocked}
                                    onChange={(e) => {
                                      const evs = [...editing.trackingEvents];
                                      evs[i] = { ...evs[i], location: e.target.value };
                                      setEditField("trackingEvents", evs);
                                    }} />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-[10px] font-bold text-blue-700 uppercase tracking-wide">Timestamp</Label>
                                  <Input type="datetime-local" value={ev.timestamp} className="h-8 text-sm" disabled={editing.isLocked}
                                    onChange={(e) => {
                                      const evs = [...editing.trackingEvents];
                                      evs[i] = { ...evs[i], timestamp: e.target.value };
                                      setEditField("trackingEvents", evs);
                                    }} />
                                </div>
                                <Button variant="ghost" size="sm" className="h-8 text-red-400 hover:text-red-600 hover:bg-red-50 self-end" disabled={editing.isLocked}
                                  onClick={() => setEditField("trackingEvents", editing.trackingEvents.filter((_, idx) => idx !== i))}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    {/* ══ BILLING TAB ═════════════════════════════════════ */}
                    <TabsContent value="billing" className="m-0 p-4 space-y-4">
                      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 space-y-4">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-1.5 flex items-center gap-2">
                          <DollarSign className="h-3.5 w-3.5 text-blue-600" /> Billing Summary
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {[
                            { label: "Total AWBs",        value: String(computedAwb) },
                            { label: "Total Pieces",       value: String(computedPcs) },
                            { label: "Total Actual Wt",   value: `${computedActual} kg` },
                            { label: "Total Volumetric",  value: `${editing.totalVolumetricWt ?? 0} kg` },
                            { label: "Total Chargeable",  value: `${editing.totalVolumetricWt && Number(editing.totalVolumetricWt) > Number(computedActual) ? editing.totalVolumetricWt : computedActual} kg` },
                            { label: "Total Value",       value: `${editing.currency} ${editing.totalValue.toFixed(2)}` },
                          ].map(({ label, value }) => (
                            <div key={label} className="bg-slate-50 rounded-xl border border-slate-100 p-3">
                              <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wide">{label}</p>
                              <p className="text-lg font-bold text-slate-800 mt-1">{value}</p>
                            </div>
                          ))}
                        </div>
                        <Separator />
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-100">
                                {["#","Tracking ID","Shipper","Weight","Value","Service","Chargeable"].map(h => (
                                  <th key={h} className="px-3 py-2 text-left text-[11px] font-bold text-blue-700 uppercase tracking-wide">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {editing.parcels.map((p, i) => (
                                <tr key={p.id || i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/30"}>
                                  <td className="px-3 py-2 text-xs text-slate-400">{i + 1}</td>
                                  <td className="px-3 py-2 font-mono text-xs font-bold text-blue-600">{p.tracking_id}</td>
                                  <td className="px-3 py-2 text-xs text-slate-700">{p.sender_name}</td>
                                  <td className="px-3 py-2 text-xs font-semibold">{p.weight} kg</td>
                                  <td className="px-3 py-2 text-xs font-semibold">{p.currency} {Number(p.total_price).toFixed(2)}</td>
                                  <td className="px-3 py-2 text-xs">{p.service_type || "—"}</td>
                                  <td className="px-3 py-2 text-xs font-bold text-blue-700">{p.weight} kg</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="bg-gradient-to-r from-orange-500 to-orange-600">
                                <td className="px-3 py-2 text-white font-bold text-xs" colSpan={3}>TOTALS</td>
                                <td className="px-3 py-2 text-white font-bold text-xs">{computedActual} kg</td>
                                <td className="px-3 py-2 text-white font-bold text-xs">{editing.currency} {editing.totalValue.toFixed(2)}</td>
                                <td></td>
                                <td className="px-3 py-2 text-white font-bold text-xs">{computedActual} kg</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    </TabsContent>

                  </div>{/* end scrollable */}
                </Tabs>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── SQL Setup Dialog ─────────────────────────────────────────────── */}
      <Dialog open={showSQL} onOpenChange={setShowSQL}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <Database className="h-5 w-5 text-blue-600" />
              SQL Database Setup
              <Badge className="bg-blue-100 text-blue-700 text-xs ml-1">Supabase SQL Editor</Badge>
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 -mt-1">
            Run this SQL in your <strong>Supabase → SQL Editor</strong> to enable manifest saving, history, and sequence IDs.
          </p>
          <div className="flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-slate-900">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-700">
              <span className="text-xs text-slate-400 font-mono">manifest_setup.sql</span>
              <Button size="sm" variant="outline"
                className={`h-7 text-xs gap-1.5 border-slate-600 ${sqlCopied ? "text-green-400 border-green-600" : "text-slate-300 hover:text-white"}`}
                onClick={handleCopySQL}>
                {sqlCopied ? <><CheckCircle2 className="h-3 w-3" /> Copied!</> : <><Copy className="h-3 w-3" /> Copy SQL</>}
              </Button>
            </div>
            <pre className="text-xs text-green-300 font-mono p-4 overflow-x-auto whitespace-pre leading-5">
              {SQL_SCHEMA}
            </pre>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setShowSQL(false)}>Close</Button>
            <Button className="bg-blue-700 hover:bg-blue-800 text-white gap-2" onClick={handleCopySQL}>
              <Copy className="h-4 w-4" />
              {sqlCopied ? "Copied!" : "Copy to Clipboard"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};
