// @ts-nocheck
import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
  FileSpreadsheet, FileDown, Trash2, Search, ClipboardList, Package,
  Weight, DollarSign, Calendar, RefreshCw, Lock, Unlock, Copy,
  Plane, MapPin, Clock, Building2, Database, Plus, X, CheckCircle2,
  ChevronDown, FileText, History, Download, Tag, Zap, Truck, Home,
  RotateCcw, Square, CheckSquare, ListChecks, Check, ChevronsUpDown,
  Archive, Box, Edit2, User, AlertCircle, UploadCloud,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  loadManifestStockDB, saveManifestToStockDB, updateManifestInStockDB,
  deleteManifestFromStockDB, saveManifestHistory, loadManifestHistory,
  fetchLicenses, createLicense,
  type ManifestStockEntry, type ManifestHistoryEntry,
} from "@/utils/manifestStorage";
import { exportManifestToExcel } from "@/utils/manifestExport";
import { generateBulkManifestPDF } from "@/utils/bulkManifestPDF";
import { supabase } from "@/integrations/supabase/client";

// ── Constants ─────────────────────────────────────────────────────────────────
const ORIGIN_HUBS = [
  "GRT - GUJRAT", "LHE - LAHORE", "KHI - KARACHI", "ISB - ISLAMABAD",
  "MUL - MULTAN", "FSD - FAISALABAD", "PEW - PESHAWAR", "QTA - QUETTA",
  "HYD - HYDERABAD", "SKT - SIALKOT", "GUJ - GUJRANWALA", "BHW - BAHAWALPUR",
  "ABT - ABBOTTABAD", "MGW - MARDAN", "SWL - SWAT", "SHW - SAHIWAL",
  "RYK - RAHIM YAR KHAN", "SKP - SARGODHA", "CHW - CHINIOT", "JGW - JHANG",
  "MFD - MIANWALI", "CTD - CHARSADDA", "HAR - HARIPUR", "NWS - NOWSHERA",
  "DGK - DERA GHAZI KHAN", "ZAH - ZHOB", "TUR - TURBAT", "SUI - SUI",
  "AZK - AZAD KASHMIR", "MZD - MUZAFFARABAD", "MND - MIRPUR", "BBN - ABBOTTABAD",
  "LRK - LARKANA", "SKD - SUKKUR", "NWB - NAWABSHAH", "MRI - MIRPURKHAS",
  "TND - TANDO ALLAHYAR", "JBO - JACOBABAD", "SHD - SHIKARPUR",
];
const DEST_HUBS = [
  // Europe
  "UK - LONDON HUB", "UK BRANCH - MCS UK", "SCOTLAND - GLASGOW HUB",
  "IRELAND - DUBLIN HUB", "FRANCE - PARIS HUB", "GERMANY - FRANKFURT HUB",
  "SPAIN - MCS ESP", "ITALY - MCS ITA", "NETHERLANDS - AMSTERDAM HUB",
  "BELGIUM - BRUSSELS HUB", "SWITZERLAND - ZURICH HUB", "AUSTRIA - VIENNA HUB",
  "SWEDEN - STOCKHOLM HUB", "NORWAY - OSLO HUB", "DENMARK - COPENHAGEN HUB",
  "FINLAND - HELSINKI HUB", "PORTUGAL - LISBON HUB", "GREECE - ATHENS HUB",
  "TURKEY - ISTANBUL HUB", "POLAND - WARSAW HUB", "CZECH REPUBLIC - PRAGUE HUB",
  "HUNGARY - BUDAPEST HUB", "ROMANIA - BUCHAREST HUB", "BULGARIA - SOFIA HUB",
  "CROATIA - ZAGREB HUB", "SERBIA - BELGRADE HUB", "SLOVAKIA - BRATISLAVA HUB",
  "UKRAINE - KYIV HUB", "RUSSIA - MOSCOW HUB", "MALTA - VALLETTA HUB",
  "CYPRUS - NICOSIA HUB", "LUXEMBOURG - LUX HUB", "ESTONIA - TALLINN HUB",
  "LATVIA - RIGA HUB", "LITHUANIA - VILNIUS HUB", "ICELAND - REYKJAVIK HUB",
  // Americas
  "USA BRANCH - MCS USA", "USA - NEW YORK HUB", "USA - LOS ANGELES HUB",
  "USA - CHICAGO HUB", "USA - HOUSTON HUB", "USA - MIAMI HUB",
  "USA - DALLAS HUB", "USA - ATLANTA HUB", "USA - WASHINGTON DC HUB",
  "CANADA - MCS CAN", "CANADA - TORONTO HUB", "CANADA - VANCOUVER HUB",
  "CANADA - MONTREAL HUB", "CANADA - CALGARY HUB",
  "MEXICO - MEXICO CITY HUB", "BRAZIL - SAO PAULO HUB", "BRAZIL - RIO HUB",
  "ARGENTINA - BUENOS AIRES HUB", "CHILE - SANTIAGO HUB",
  "COLOMBIA - BOGOTA HUB", "PERU - LIMA HUB", "VENEZUELA - CARACAS HUB",
  "ECUADOR - QUITO HUB", "BOLIVIA - LA PAZ HUB", "URUGUAY - MONTEVIDEO HUB",
  "PARAGUAY - ASUNCION HUB", "PANAMA - PANAMA CITY HUB",
  "COSTA RICA - SAN JOSE HUB", "GUATEMALA - GUATEMALA CITY HUB",
  "JAMAICA - KINGSTON HUB", "TRINIDAD - PORT OF SPAIN HUB",
  "BAHAMAS - NASSAU HUB", "BARBADOS - BRIDGETOWN HUB",
  // Middle East
  "UAE - MCS UAE", "UAE - DUBAI HUB", "UAE - ABU DHABI HUB",
  "SAUDI - MCS SAU", "SAUDI - RIYADH HUB", "SAUDI - JEDDAH HUB",
  "SAUDI - DAMMAM HUB", "KUWAIT - KUWAIT CITY HUB", "QATAR - DOHA HUB",
  "BAHRAIN - MANAMA HUB", "OMAN - MUSCAT HUB", "JORDAN - AMMAN HUB",
  "IRAQ - BAGHDAD HUB", "IRAN - TEHRAN HUB", "LEBANON - BEIRUT HUB",
  "SYRIA - DAMASCUS HUB", "ISRAEL - TEL AVIV HUB", "YEMEN - SANAA HUB",
  // Asia Pacific
  "AUSTRALIA - MCS AUS", "AUSTRALIA - SYDNEY HUB", "AUSTRALIA - MELBOURNE HUB",
  "AUSTRALIA - BRISBANE HUB", "AUSTRALIA - PERTH HUB",
  "NEW ZEALAND - AUCKLAND HUB", "NEW ZEALAND - WELLINGTON HUB",
  "CHINA - BEIJING HUB", "CHINA - SHANGHAI HUB", "CHINA - GUANGZHOU HUB",
  "CHINA - SHENZHEN HUB", "HONG KONG - HK HUB",
  "JAPAN - TOKYO HUB", "JAPAN - OSAKA HUB",
  "SOUTH KOREA - SEOUL HUB", "TAIWAN - TAIPEI HUB",
  "SINGAPORE - SINGAPORE HUB", "MALAYSIA - KUALA LUMPUR HUB",
  "THAILAND - BANGKOK HUB", "INDONESIA - JAKARTA HUB",
  "PHILIPPINES - MANILA HUB", "VIETNAM - HO CHI MINH HUB",
  "VIETNAM - HANOI HUB", "CAMBODIA - PHNOM PENH HUB",
  "MYANMAR - YANGON HUB", "BANGLADESH - DHAKA HUB",
  "SRI LANKA - COLOMBO HUB", "INDIA - NEW DELHI HUB",
  "INDIA - MUMBAI HUB", "INDIA - BANGALORE HUB", "INDIA - CHENNAI HUB",
  "NEPAL - KATHMANDU HUB", "MALDIVES - MALE HUB",
  "AFGHANISTAN - KABUL HUB", "TAJIKISTAN - DUSHANBE HUB",
  "UZBEKISTAN - TASHKENT HUB", "KAZAKHSTAN - ALMATY HUB",
  "KYRGYZSTAN - BISHKEK HUB", "TURKMENISTAN - ASHGABAT HUB",
  "AZERBAIJAN - BAKU HUB", "GEORGIA - TBILISI HUB",
  "ARMENIA - YEREVAN HUB",
  // Africa
  "SOUTH AFRICA - JOHANNESBURG HUB", "SOUTH AFRICA - CAPE TOWN HUB",
  "NIGERIA - LAGOS HUB", "NIGERIA - ABUJA HUB",
  "KENYA - NAIROBI HUB", "ETHIOPIA - ADDIS ABABA HUB",
  "GHANA - ACCRA HUB", "TANZANIA - DAR ES SALAAM HUB",
  "UGANDA - KAMPALA HUB", "ZAMBIA - LUSAKA HUB",
  "ZIMBABWE - HARARE HUB", "EGYPT - CAIRO HUB", "EGYPT - ALEXANDRIA HUB",
  "MOROCCO - CASABLANCA HUB", "MOROCCO - RABAT HUB",
  "TUNISIA - TUNIS HUB", "ALGERIA - ALGIERS HUB",
  "LIBYA - TRIPOLI HUB", "SUDAN - KHARTOUM HUB",
  "SENEGAL - DAKAR HUB", "IVORY COAST - ABIDJAN HUB",
  "CAMEROON - DOUALA HUB", "ANGOLA - LUANDA HUB",
  "MOZAMBIQUE - MAPUTO HUB", "MAURITIUS - PORT LOUIS HUB",
  "RWANDA - KIGALI HUB", "BOTSWANA - GABORONE HUB",
  "NAMIBIA - WINDHOEK HUB", "MALAWI - LILONGWE HUB",
];
const SERVICES = [
  "Express", "Standard", "Economy", "Same Day", "Next Day", "Overnight", "Priority",
  "Freight", "Cargo", "DHL PK", "UPS PK", "SKYNET", "DPD UK",
  "DHL via UK", "UPS via Belfast", "UPS Saver",
];
const BAG_TYPES  = ["Standard Bag", "Heavy Duty Bag", "Cardboard Box", "Wooden Crate", "Pallet", "Sack", "Drum", "Tube/Roll"];
const BAG_SIZES  = ["Extra Small (XS)", "Small (S)", "Medium (M)", "Large (L)", "Extra Large (XL)", "XXL", "Custom"];
const SEAL_TYPES = ["Plastic Seal", "Metal Seal", "Zip Tie", "Tamper Tape", "No Seal"];

const statusColors: Record<string, string> = {
  delivered:        "bg-green-100 text-green-800 border-green-200",
  in_transit:       "bg-blue-100 text-blue-800 border-blue-200",
  created:          "bg-yellow-100 text-yellow-800 border-yellow-200",
  picked_up:        "bg-blue-100 text-blue-800 border-blue-200",
  customs:          "bg-orange-100 text-orange-800 border-orange-200",
  out_for_delivery: "bg-indigo-100 text-indigo-800 border-indigo-200",
  cancelled:        "bg-red-100 text-red-800 border-red-200",
  processing:       "bg-purple-100 text-purple-800 border-purple-200",
};

export const MANIFEST_STATUSES = [
  { value: "pending",          label: "Pending",          icon: "⏳", tw: "bg-amber-400 text-white border-amber-500",     dot: "bg-amber-300"   },
  { value: "picked_up",        label: "Picked Up",        icon: "📦", tw: "bg-violet-500 text-white border-violet-600",   dot: "bg-violet-400"  },
  { value: "in_transit",       label: "In Transit",       icon: "✈️",  tw: "bg-blue-600 text-white border-blue-700",       dot: "bg-blue-400"    },
  { value: "out_for_delivery", label: "Out for Delivery", icon: "🚚", tw: "bg-orange-500 text-white border-orange-600",   dot: "bg-orange-400"  },
  { value: "delivered",        label: "Delivered",        icon: "✅", tw: "bg-green-600 text-white border-green-700",     dot: "bg-green-400"   },
  { value: "returned",         label: "Returned",         icon: "↩️",  tw: "bg-red-500 text-white border-red-600",         dot: "bg-red-400"     },
] as const;

// ── Sample CSV template columns ───────────────────────────────────────────────
const CSV_SAMPLE_HEADERS = [
  "tracking_id", "hawb_no", "sender_name", "sender_phone", "sender_city", "sender_country",
  "receiver_name", "receiver_phone", "receiver_address", "receiver_city",
  "receiver_postal_code", "receiver_country", "weight", "pieces", "value",
  "currency", "service_type", "parcel_type", "description",
];
const CSV_SAMPLE_ROW = [
  "TRK123456789", "HAWB001", "John Smith", "+923001234567", "Lahore", "PK",
  "Jane Doe", "+447911123456", "10 Baker Street", "London",
  "W1U 3FB", "GB", "2.5", "1", "150.00",
  "GBP", "Express", "Documents", "Personal documents",
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function downloadSampleCSV() {
  const rows = [CSV_SAMPLE_HEADERS, CSV_SAMPLE_ROW];
  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "SkyXpress_Import_Sample.csv"; a.click();
  URL.revokeObjectURL(url);
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = ""; let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuote = !inQuote; continue; }
    if (ch === "," && !inQuote) { result.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  result.push(cur.trim());
  return result;
}

function csvToParcel(row: string[], headers: string[]): any {
  const map: Record<string, string> = {};
  headers.forEach((h, i) => { map[h.trim().toLowerCase()] = row[i] || ""; });
  return {
    id:                   crypto.randomUUID(),
    tracking_id:          map.tracking_id || map.hawb_no || `IMP-${Date.now()}`,
    reference_id:         map.hawb_no || "",
    sender_name:          map.sender_name || "",
    sender_phone:         map.sender_phone || "",
    sender_city:          map.sender_city || "",
    sender_country:       map.sender_country || "",
    receiver_name:        map.receiver_name || "",
    receiver_phone:       map.receiver_phone || "",
    receiver_address:     map.receiver_address || "",
    receiver_city:        map.receiver_city || "",
    receiver_postal_code: map.receiver_postal_code || "",
    receiver_country:     map.receiver_country || "",
    from_country:         map.sender_country || "",
    to_country:           map.receiver_country || "",
    weight:               parseFloat(map.weight) || 0,
    pieces:               parseInt(map.pieces) || 1,
    total_price:          parseFloat(map.value) || 0,
    currency:             map.currency || "USD",
    service_type:         map.service_type || "Standard",
    parcel_type:          map.parcel_type || "Parcel",
    current_status:       "processing",
    created_at:           new Date().toISOString(),
    items:                map.description ? [{ description: map.description, quantity: 1, unit_price: parseFloat(map.value) || 0 }] : [],
  };
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ManifestStatusBadge({ status, size = "sm" }: { status?: string; size?: "sm" | "xs" }) {
  if (!status) return <span className="text-slate-300 text-xs">—</span>;
  const s = MANIFEST_STATUSES.find((x) => x.value === status);
  if (!s) return <span className="text-xs text-slate-500 capitalize">{status.replace(/_/g, " ")}</span>;
  const base = size === "xs"
    ? "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border tracking-wide"
    : "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border tracking-wide";
  return (
    <span className={`${base} ${s.tw}`}>
      <span className="text-[11px] leading-none">{s.icon}</span>
      {s.label}
    </span>
  );
}

// Searchable combobox — replaces plain <Select> for hubs
function SearchableSelect({
  value, onChange, options, placeholder, disabled, className = "",
}: {
  value: string; onChange: (v: string) => void; options: string[];
  placeholder?: string; disabled?: boolean; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = query.length > 0
    ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase()))
    : options;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          disabled={disabled}
          className={`flex h-8 w-full items-center justify-between rounded border border-slate-200 bg-white px-2 text-sm text-left focus:outline-none focus:border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        >
          <span className={value ? "text-slate-800 truncate" : "text-slate-400"}>
            {value || placeholder || "Select…"}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 text-slate-400 flex-shrink-0 ml-1" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 z-[9999]" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search…"
            value={query}
            onValueChange={setQuery}
            className="h-8 text-sm"
          />
          <CommandList className="max-h-60">
            {filtered.length === 0 && <CommandEmpty>No results found.</CommandEmpty>}
            <CommandGroup>
              {filtered.map((opt) => (
                <CommandItem
                  key={opt}
                  value={opt}
                  onSelect={() => { onChange(opt); setOpen(false); setQuery(""); }}
                  className="text-xs cursor-pointer"
                >
                  <Check className={`h-3.5 w-3.5 mr-2 flex-shrink-0 ${value === opt ? "opacity-100 text-blue-600" : "opacity-0"}`} />
                  {opt}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Editable combobox — can type a custom value OR pick from list (for License)
function EditableCombobox({
  value, onChange, options, placeholder, disabled, className = "",
}: {
  value: string; onChange: (v: string) => void; options: string[];
  placeholder?: string; disabled?: boolean; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [inputVal, setInputVal] = useState(value || "");
  const filtered = inputVal.length > 0
    ? options.filter((o) => o.toLowerCase().includes(inputVal.toLowerCase()))
    : options;

  useEffect(() => { setInputVal(value || ""); }, [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Input
            value={inputVal}
            disabled={disabled}
            placeholder={placeholder || "Type or select…"}
            className={`h-8 text-sm border-slate-200 pr-7 ${className}`}
            onChange={(e) => {
              setInputVal(e.target.value);
              onChange(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
          />
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={() => setOpen((o) => !o)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <ChevronsUpDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0 z-[9999]" align="start">
        <Command shouldFilter={false}>
          <CommandList className="max-h-48">
            {filtered.length === 0 ? (
              <CommandEmpty className="py-3 text-xs text-slate-500">
                Press Enter or type to use "{inputVal}"
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {filtered.map((opt) => (
                  <CommandItem
                    key={opt}
                    value={opt}
                    onSelect={() => { onChange(opt); setInputVal(opt); setOpen(false); }}
                    className="text-xs cursor-pointer"
                  >
                    <Check className={`h-3.5 w-3.5 mr-2 flex-shrink-0 ${value === opt ? "opacity-100 text-blue-600" : "opacity-0"}`} />
                    {opt}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

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
        <div className="h-8 px-2 flex items-center text-sm bg-slate-50 border border-slate-200 rounded text-slate-700 font-medium truncate">
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

// ── Bagging Dialog ─────────────────────────────────────────────────────────────
function BaggingDialog({ open, onClose, onSave, initialData, disabled }: {
  open: boolean; onClose: () => void;
  onSave: (data: any) => void;
  initialData?: any; disabled?: boolean;
}) {
  const [bags, setBags] = useState<any[]>(
    initialData?.bags?.length > 0 ? initialData.bags : [
      { bagType: "Standard Bag", bagSize: "Medium (M)", quantity: 1, sealType: "Plastic Seal", sealNumber: "", notes: "" },
    ]
  );

  const addBag = () => setBags((b) => [...b, { bagType: "Standard Bag", bagSize: "Medium (M)", quantity: 1, sealType: "Plastic Seal", sealNumber: "", notes: "" }]);
  const removeBag = (i: number) => setBags((b) => b.filter((_, idx) => idx !== i));
  const updateBag = (i: number, key: string, val: any) =>
    setBags((b) => b.map((item, idx) => idx === i ? { ...item, [key]: val } : item));

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Box className="h-5 w-5 text-blue-600" />
            Bagging / Boxing Details
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {bags.map((bag, i) => (
            <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Bag / Box #{i + 1}</span>
                {bags.length > 1 && !disabled && (
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400 hover:text-red-600"
                    onClick={() => removeBag(i)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Bag / Box Type</Label>
                  <Select value={bag.bagType} onValueChange={(v) => updateBag(i, "bagType", v)} disabled={disabled}>
                    <SelectTrigger className="h-8 text-sm border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BAG_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Size</Label>
                  <Select value={bag.bagSize} onValueChange={(v) => updateBag(i, "bagSize", v)} disabled={disabled}>
                    <SelectTrigger className="h-8 text-sm border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BAG_SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Qty</Label>
                  <Input type="number" min={1} value={bag.quantity} disabled={disabled}
                    className="h-8 text-sm border-slate-200"
                    onChange={(e) => updateBag(i, "quantity", parseInt(e.target.value) || 1)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Seal Type</Label>
                  <Select value={bag.sealType} onValueChange={(v) => updateBag(i, "sealType", v)} disabled={disabled}>
                    <SelectTrigger className="h-8 text-sm border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SEAL_TYPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Seal Number</Label>
                  <Input value={bag.sealNumber} disabled={disabled} placeholder="e.g. SL-00123"
                    className="h-8 text-sm border-slate-200"
                    onChange={(e) => updateBag(i, "sealNumber", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Notes</Label>
                  <Input value={bag.notes} disabled={disabled} placeholder="Optional notes"
                    className="h-8 text-sm border-slate-200"
                    onChange={(e) => updateBag(i, "notes", e.target.value)} />
                </div>
              </div>
            </div>
          ))}
          {!disabled && (
            <Button variant="outline" size="sm" className="w-full border-dashed border-slate-300 text-slate-500 gap-2"
              onClick={addBag}>
              <Plus className="h-3.5 w-3.5" /> Add Another Bag / Box
            </Button>
          )}
        </div>
        {/* Summary */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2 flex items-center gap-4">
          <Box className="h-4 w-4 text-blue-600" />
          <div className="flex gap-6 text-xs">
            <span><span className="font-bold text-slate-700">{bags.length}</span> <span className="text-slate-500">types</span></span>
            <span><span className="font-bold text-slate-700">{bags.reduce((s, b) => s + (b.quantity || 0), 0)}</span> <span className="text-slate-500">total bags</span></span>
          </div>
        </div>
        <div className="flex gap-3 justify-end pt-1">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          {!disabled && (
            <Button size="sm" className="bg-blue-700 hover:bg-blue-800 text-white gap-1.5"
              onClick={() => { onSave({ bags }); onClose(); }}>
              <CheckCircle2 className="h-3.5 w-3.5" /> Save Bagging Info
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Manifest History Dialog ────────────────────────────────────────────────────
function ManifestHistoryDialog({ open, onClose, manifestId }: {
  open: boolean; onClose: () => void; manifestId: string;
}) {
  const [history, setHistory] = useState<ManifestHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !manifestId) return;
    setLoading(true);
    loadManifestHistory(manifestId).then((h) => { setHistory(h); setLoading(false); });
  }, [open, manifestId]);

  const FIELD_LABELS: Record<string, string> = {
    manifestStatus: "Status", isLocked: "Locked", flightNo: "Flight No",
    originHub: "Origin Hub", destinationHub: "Destination Hub",
    service: "Service", forwarder: "Forwarder", license: "License",
    manifestDate: "Date", runNumber: "Run No", noOfBags: "Bags",
    vendorWeight: "Vendor Wt", arrivalDate: "Arrival Date",
    bookingFromDate: "Booking From", bookingTillDate: "Booking Till",
    masterNo: "Master No", remark: "Remark", company: "Company",
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-blue-600" />
            Manifest History
            <Badge className="bg-blue-100 text-blue-700 text-xs">{manifestId}</Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-3">
          {loading ? (
            <div className="py-16 text-center">
              <RefreshCw className="h-6 w-6 animate-spin text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Loading history…</p>
            </div>
          ) : history.length === 0 ? (
            <div className="py-16 text-center">
              <History className="h-10 w-10 text-slate-200 mx-auto mb-3" />
              <p className="font-semibold text-slate-500">No history yet</p>
              <p className="text-xs text-slate-400 mt-1">History is recorded each time you save a manifest.</p>
            </div>
          ) : (
            history.map((entry, idx) => {
              const snap = entry.snapshot || {};
              const changedFields = Object.keys(snap).filter((k) => k !== "parcels" && k !== "trackingIds" && k !== "trackingEvents");
              return (
                <div key={entry.id} className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-gradient-to-r from-slate-800 to-blue-900 px-4 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        #{history.length - idx}
                      </div>
                      <div>
                        <p className="text-white text-xs font-semibold">
                          {new Date(entry.changedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                          {" "}
                          {new Date(entry.changedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                        <p className="text-blue-300 text-[10px]">by {entry.changedBy}</p>
                      </div>
                    </div>
                    {entry.changeNote && (
                      <span className="text-blue-200 text-[10px] italic">{entry.changeNote}</span>
                    )}
                  </div>
                  <div className="p-3">
                    {changedFields.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Parcels / tracking updated</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {changedFields.map((k) => (
                          <div key={k} className="bg-slate-50 border border-slate-100 rounded px-2 py-1">
                            <p className="text-[9px] text-slate-400 uppercase font-bold">{FIELD_LABELS[k] || k}</p>
                            <p className="text-xs text-slate-700 font-medium">
                              {k === "isLocked" ? (snap[k] ? "Locked" : "Unlocked") : String(snap[k] ?? "—")}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="flex justify-end pt-1">
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export const ManifestStock = () => {
  const [entries, setEntries]         = useState<ManifestStockEntry[]>([]);
  const [search, setSearch]           = useState("");
  const [selected, setSelected]       = useState<ManifestStockEntry | null>(null);
  const [editing, setEditing]         = useState<ManifestStockEntry | null>(null);
  const [countryMap, setCountryMap]   = useState<Record<string, string>>({});
  const [downloading, setDownloading] = useState<string | null>(null);
  const [saving, setSaving]           = useState(false);
  const [awbSearch, setAwbSearch]     = useState("");
  const [csvFile, setCsvFile]         = useState<File | null>(null);
  const [importing, setImporting]     = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus]   = useState<string>("");
  const [showBulkDialog, setShowBulkDialog]   = useState(false);
  const [showBagging, setShowBagging]         = useState(false);
  const [showHistory, setShowHistory]         = useState(false);
  const [currentUser, setCurrentUser]         = useState<{ email: string; name: string } | null>(null);
  const [licenses, setLicenses]               = useState<string[]>([]);
  const [addingLicense, setAddingLicense]     = useState(false);
  const [newLicenseCode, setNewLicenseCode]   = useState("");
  const [savingLicense, setSavingLicense]     = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // ── Auth user ──────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data?.session?.user;
      if (u) {
        const name = u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split("@")[0] || "Admin";
        setCurrentUser({ email: u.email || "", name });
      }
    });
  }, []);

  const reload = useCallback(async () => {
    const data = await loadManifestStockDB();
    setEntries(data);
  }, []);

  useEffect(() => {
    reload();
    fetchLicenses().then(setLicenses);
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
    setEditing({
      ...entry,
      // Auto-fill createdByUser if empty
      createdByUser: entry.createdByUser || currentUser?.name || "",
    });
  };

  const closeDetail = () => {
    setSelected(null);
    setEditing(null);
    setAwbSearch("");
    setCsvFile(null);
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const userLabel = currentUser?.email || currentUser?.name || "admin";
      await updateManifestInStockDB(editing.manifestId, editing);
      // Save history snapshot (without parcels to keep it lightweight)
      const { parcels: _, trackingIds: __, ...snap } = editing;
      await saveManifestHistory(editing.manifestId, snap, userLabel);
      await reload();
      setSelected(editing);
      toast({ title: "Manifest updated ✓", description: `Manifest ${editing.manifestId} saved.` });
    } finally {
      setSaving(false);
    }
  };

  const handleClone = async () => {
    if (!editing) return;
    const clone: ManifestStockEntry = {
      ...editing,
      manifestId: editing.manifestId + "-COPY",
      createdAt: new Date().toISOString(),
      isLocked: false,
    };
    await saveManifestToStockDB(clone);
    await reload();
    toast({ title: "Cloned", description: `Created ${clone.manifestId}` });
    closeDetail();
  };

  const handleLockToggle = async () => {
    if (!editing) return;
    const locked = !editing.isLocked;
    setEditing((e) => e ? { ...e, isLocked: locked } : e);
    await updateManifestInStockDB(editing.manifestId, { isLocked: locked });
    await reload();
    toast({ title: locked ? "Manifest locked 🔒" : "Manifest unlocked 🔓" });
  };

  const handleDelete = async (manifestId: string) => {
    if (!window.confirm(`Delete manifest ${manifestId}? This cannot be undone.`)) return;
    await deleteManifestFromStockDB(manifestId);
    await reload();
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


  const setEditField = (key: keyof ManifestStockEntry, val: any) =>
    setEditing((e) => e ? { ...e, [key]: val } : e);

  // ── CSV Import ──────────────────────────────────────────────────────────────
  const handleCSVImport = async () => {
    if (!csvFile || !editing) return;
    setImporting(true);
    try {
      const text = await csvFile.text();
      const lines = text.split("\n").filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        toast({ title: "CSV error", description: "File must have a header row + at least one data row.", variant: "destructive" });
        return;
      }
      const headers = parseCSVLine(lines[0]);
      const newParcels = lines.slice(1).map((line) => csvToParcel(parseCSVLine(line), headers));
      const merged = [...editing.parcels, ...newParcels];
      const updatedEntry = {
        ...editing,
        parcels: merged,
        parcelCount: merged.length,
        trackingIds: merged.map((p) => p.tracking_id),
        totalWeight: Math.round(merged.reduce((s, p) => s + Number(p.weight || 0), 0) * 100) / 100,
        totalValue: Math.round(merged.reduce((s, p) => s + Number(p.total_price || 0), 0) * 100) / 100,
      };
      setEditing(updatedEntry);
      setCsvFile(null);
      if (csvInputRef.current) csvInputRef.current.value = "";
      toast({ title: `Imported ${newParcels.length} AWB${newParcels.length !== 1 ? "s" : ""} ✓`, description: "Click Update Manifest to save." });
    } catch (e: any) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  // ── Selection helpers ──────────────────────────────────────────────────────
  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const toggleSelectAll = () =>
    setSelectedIds((prev) => prev.size === filtered.length ? new Set() : new Set(filtered.map((e) => e.manifestId)));

  const handleBulkStatusApply = async () => {
    if (!bulkStatus || selectedIds.size === 0) return;
    await Promise.all([...selectedIds].map((id) => updateManifestInStockDB(id, { manifestStatus: bulkStatus })));
    await reload();
    const label = MANIFEST_STATUSES.find((s) => s.value === bulkStatus)?.label || bulkStatus;
    const count = selectedIds.size;
    setSelectedIds(new Set());
    setShowBulkDialog(false);
    toast({ title: `Status updated ✓`, description: `${count} manifest(s) → ${label}` });
    setBulkStatus("");
  };

  const handleSingleStatus = async (manifestId: string, status: string) => {
    await updateManifestInStockDB(manifestId, { manifestStatus: status });
    await reload();
    if (editing?.manifestId === manifestId) setEditing((e) => e ? { ...e, manifestStatus: status } : e);
    const label = MANIFEST_STATUSES.find((s) => s.value === status)?.label || status;
    toast({ title: "Status updated ✓", description: `${manifestId} → ${label}` });
  };

  const filtered = entries.filter((e) => {
    const q = search.toLowerCase();
    return (
      e.manifestId.toLowerCase().includes(q) ||
      e.trackingIds.some((id) => id.toLowerCase().includes(q)) ||
      (e.serviceType || "").toLowerCase().includes(q) ||
      (e.fromCountry || "").toLowerCase().includes(q) ||
      (e.toCountry || "").toLowerCase().includes(q) ||
      (e.flightNo || "").toLowerCase().includes(q) ||
      (e.originHub || "").toLowerCase().includes(q) ||
      (e.destinationHub || "").toLowerCase().includes(q)
    );
  });

  const filteredAwbs = editing
    ? editing.parcels.filter((p) => {
        const q = awbSearch.toLowerCase();
        return !q || p.tracking_id.toLowerCase().includes(q) || (p.sender_name || "").toLowerCase().includes(q);
      })
    : [];

  const computedActual = editing ? editing.parcels.reduce((s, p) => s + Number(p.weight ?? 0), 0).toFixed(2) : "0.00";
  const computedPcs    = editing ? editing.parcels.reduce((s, p) => s + (p.pieces ?? 1), 0) : 0;
  const computedAwb    = editing ? editing.parcels.length : 0;

  return (
    <div className="space-y-5">

      {/* ── Stats ────────────────────────────────────────────────────────────── */}
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

      {/* ── List Card ────────────────────────────────────────────────────────── */}
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
              <Button variant="outline" size="sm" onClick={reload} className="gap-2 border-slate-300">
                <RefreshCw className="h-3.5 w-3.5" /> Refresh
              </Button>
            </div>
          </div>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search manifest ID, tracking, flight, hub, destination…"
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
            <>
              {selectedIds.size > 0 && (
                <div className="mb-3 flex items-center gap-3 bg-gradient-to-r from-blue-700 to-blue-900 rounded-xl px-4 py-3 flex-wrap shadow-md">
                  <ListChecks className="h-4 w-4 text-blue-200" />
                  <span className="text-white text-sm font-semibold">{selectedIds.size} manifest{selectedIds.size > 1 ? "s" : ""} selected</span>
                  <div className="flex items-center gap-2 ml-auto flex-wrap">
                    <span className="text-blue-200 text-xs font-medium">Set status:</span>
                    {MANIFEST_STATUSES.map((s) => (
                      <button key={s.value}
                        onClick={() => { setBulkStatus(s.value); setShowBulkDialog(true); }}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer transition-transform hover:scale-105 active:scale-95 ${s.tw}`}>
                        <span>{s.icon}</span>{s.label}
                      </button>
                    ))}
                    <button onClick={() => setSelectedIds(new Set())} className="text-blue-300 hover:text-white text-xs underline ml-1">
                      Deselect all
                    </button>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-slate-800 to-blue-900 hover:from-slate-800 hover:to-blue-900">
                      <TableHead className="text-white w-10 py-3">
                        <Checkbox
                          checked={filtered.length > 0 && selectedIds.size === filtered.length}
                          onCheckedChange={toggleSelectAll}
                          className="border-white/40 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                        />
                      </TableHead>
                      {["Manifest ID","Date","Parcels","Route","Destination Hub","Weight","Service","Flight","Status","Lock","Actions"].map(h => (
                        <TableHead key={h} className="text-white font-bold text-xs py-3">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((entry, i) => (
                      <TableRow key={entry.manifestId}
                        className={`cursor-pointer transition-colors ${selectedIds.has(entry.manifestId) ? "bg-blue-50 ring-1 ring-blue-300" : i % 2 === 0 ? "bg-white hover:bg-blue-50/50" : "bg-slate-50/40 hover:bg-blue-50/50"}`}
                        onClick={() => openDetail(entry)}>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(entry.manifestId)}
                            onCheckedChange={() => toggleSelect(entry.manifestId)}
                            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                          />
                        </TableCell>
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
                          <div className="text-xs text-slate-600 max-w-[120px] truncate" title={entry.destinationHub}>
                            {entry.destinationHub || <span className="text-slate-300">—</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-slate-800">{entry.totalWeight.toFixed(2)}</span>
                          <span className="text-xs text-muted-foreground ml-1">kg</span>
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
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Select
                            value={entry.manifestStatus || ""}
                            onValueChange={(v) => handleSingleStatus(entry.manifestId, v)}>
                            <SelectTrigger className="h-7 w-[150px] text-[11px] border-slate-200 bg-white px-2 py-0">
                              <SelectValue placeholder="Set status…">
                                {entry.manifestStatus
                                  ? <ManifestStatusBadge status={entry.manifestStatus} size="xs" />
                                  : <span className="text-slate-400 text-[11px]">Set status…</span>}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {MANIFEST_STATUSES.map((s) => (
                                <SelectItem key={s.value} value={s.value}>
                                  <span className="flex items-center gap-2">
                                    <span>{s.icon}</span><span>{s.label}</span>
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
            </>
          )}
        </CardContent>
      </Card>

      {/* ── MANIFEST DETAIL Sheet ─────────────────────────────────────────────── */}
      <Sheet open={!!selected} onOpenChange={(o) => { if (!o) closeDetail(); }}>
        <SheetContent side="right" className="w-full sm:max-w-5xl p-0 overflow-hidden flex flex-col">
          {editing && (
            <>
              {/* Top header */}
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
                  {currentUser && (
                    <span className="hidden sm:flex items-center gap-1 text-blue-300 text-[11px]">
                      <User className="h-3 w-3" />{currentUser.email}
                    </span>
                  )}
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
                  <Button size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                    onClick={() => handleExcelDownload(editing)} disabled={downloading === editing.manifestId + "-xls"}>
                    <FileSpreadsheet className="h-3 w-3" /> Excel
                  </Button>
                  <Button size="sm"
                    className="h-7 text-xs bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white gap-1.5"
                    onClick={() => handlePDFDownload(editing)} disabled={downloading === editing.manifestId + "-pdf"}>
                    <FileDown className="h-3 w-3" /> PDF
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-white/60 hover:text-white hover:bg-white/10" onClick={closeDetail}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Sub-header: tabs + actions */}
              <div className="bg-slate-100 border-b border-slate-200 flex-shrink-0">
                <Tabs defaultValue="entry" className="w-full">
                  <div className="flex items-center justify-between px-4 pt-0">
                    <TabsList className="h-9 bg-transparent gap-0 rounded-none border-0 p-0">
                      {[
                        { value: "entry",    label: "Entry",    icon: ClipboardList },
                        { value: "tracking", label: "Add Tracking Events", icon: MapPin },
                        { value: "billing",  label: "Billing",  icon: DollarSign },
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
                        className="h-7 text-[11px] border-slate-300 text-slate-600 gap-1"
                        onClick={() => setShowHistory(true)}>
                        <History className="h-3 w-3" /> History
                      </Button>
                    </div>
                  </div>

                  {/* Scrollable content */}
                  <div className="overflow-y-auto flex-1" style={{ maxHeight: "calc(100vh - 160px)" }}>

                    {/* ══ ENTRY TAB ══════════════════════════════════════════ */}
                    <TabsContent value="entry" className="m-0 p-4 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                        {/* LEFT column — Manifest Info */}
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
                          {/* Created By — auto-filled from auth user */}
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1">
                              <User className="h-3 w-3" /> Created By
                            </Label>
                            <div className="h-8 px-2 flex items-center gap-2 text-sm bg-blue-50 border border-blue-100 rounded text-blue-700 font-medium">
                              <User className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
                              <span className="truncate">{currentUser?.email || editing.createdByUser || "—"}</span>
                            </div>
                            {currentUser?.name && currentUser.name !== currentUser?.email && (
                              <p className="text-[10px] text-slate-400 mt-0.5">{currentUser.name}</p>
                            )}
                          </div>

                          {/* Manifest Status picker */}
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1">
                              <Tag className="h-3 w-3" /> Manifest Status
                            </Label>
                            <div className="grid grid-cols-1 gap-1.5">
                              {MANIFEST_STATUSES.map((s) => {
                                const active = (editing.manifestStatus || "") === s.value;
                                return (
                                  <button key={s.value} disabled={editing.isLocked}
                                    onClick={() => {
                                      setEditField("manifestStatus", s.value);
                                      handleSingleStatus(editing.manifestId, s.value);
                                    }}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border-2 transition-all text-left
                                      ${active
                                        ? `${s.tw} border-transparent shadow-md scale-[1.02]`
                                        : "bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50"
                                      }
                                      ${editing.isLocked ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
                                    <span className="text-base leading-none">{s.icon}</span>
                                    <span>{s.label}</span>
                                    {active && <CheckCircle2 className="h-3.5 w-3.5 ml-auto opacity-80" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* MIDDLE column — Flight & Shipment */}
                        <div className="space-y-3 bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-1.5">Flight & Shipment</p>
                          <div className="grid grid-cols-2 gap-3">
                            <Field label="Date" type="date" value={editing.manifestDate}
                              onChange={(v) => setEditField("manifestDate", v)} disabled={editing.isLocked} />
                            <Field label="Time" type="time" value={editing.manifestTime}
                              onChange={(v) => setEditField("manifestTime", v)} disabled={editing.isLocked} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Run Number</Label>
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

                          {/* License — select from DB + inline create */}
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">License</Label>
                            {!addingLicense ? (
                              <div className="flex gap-1.5">
                                <select
                                  value={editing.license ?? ""}
                                  disabled={editing.isLocked}
                                  onChange={(e) => setEditField("license", e.target.value)}
                                  className="h-8 flex-1 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <option value="">— Select license —</option>
                                  {licenses.map((opt) => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                                {!editing.isLocked && (
                                  <Button
                                    type="button" size="sm" variant="outline"
                                    className="h-8 px-2 border-blue-200 text-blue-600 hover:bg-blue-50"
                                    onClick={() => { setAddingLicense(true); setNewLicenseCode(""); }}
                                    title="Add new license"
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            ) : (
                              <div className="flex gap-1.5">
                                <Input
                                  autoFocus
                                  value={newLicenseCode}
                                  onChange={(e) => setNewLicenseCode(e.target.value.toUpperCase())}
                                  placeholder="e.g. MCS-ISB-03"
                                  className="h-8 flex-1 text-sm border-blue-300 focus-visible:ring-blue-500"
                                  onKeyDown={async (e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      if (!newLicenseCode.trim()) return;
                                      setSavingLicense(true);
                                      try {
                                        const saved = await createLicense(newLicenseCode);
                                        const updated = await fetchLicenses();
                                        setLicenses(updated);
                                        setEditField("license", saved);
                                        setAddingLicense(false);
                                        toast({ title: "License saved", description: saved });
                                      } catch (err: any) {
                                        toast({ title: "Error", description: err.message, variant: "destructive" });
                                      } finally { setSavingLicense(false); }
                                    }
                                    if (e.key === "Escape") { setAddingLicense(false); setNewLicenseCode(""); }
                                  }}
                                />
                                <Button
                                  type="button" size="sm"
                                  disabled={savingLicense || !newLicenseCode.trim()}
                                  className="h-8 px-2 bg-blue-600 hover:bg-blue-700 text-white"
                                  onClick={async () => {
                                    if (!newLicenseCode.trim()) return;
                                    setSavingLicense(true);
                                    try {
                                      const saved = await createLicense(newLicenseCode);
                                      const updated = await fetchLicenses();
                                      setLicenses(updated);
                                      setEditField("license", saved);
                                      setAddingLicense(false);
                                      toast({ title: "License saved", description: saved });
                                    } catch (err: any) {
                                      toast({ title: "Error", description: err.message, variant: "destructive" });
                                    } finally { setSavingLicense(false); }
                                  }}
                                >
                                  {savingLicense ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                </Button>
                                <Button
                                  type="button" size="sm" variant="outline"
                                  className="h-8 px-2 border-slate-200 text-slate-500"
                                  onClick={() => { setAddingLicense(false); setNewLicenseCode(""); }}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
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
                              ? editing.totalVolumetricWt : computedActual
                          } readOnly />
                          <div className="grid grid-cols-2 gap-3">
                            <Field label="No. of AWB" value={computedAwb} readOnly />
                            <Field label="No. of PCS" value={computedPcs} readOnly />
                          </div>
                        </div>

                        {/* RIGHT column — Hubs & Files */}
                        <div className="space-y-3 bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-1.5">Hubs & Files</p>

                          {/* Origin Hub — searchable */}
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                              Origin Hub <span className="text-red-500">*</span>
                            </Label>
                            <SearchableSelect
                              value={editing.originHub ?? ""}
                              onChange={(v) => setEditField("originHub", v)}
                              options={ORIGIN_HUBS}
                              placeholder="Search origin hub…"
                              disabled={editing.isLocked}
                            />
                          </div>

                          {/* Destination Hub — searchable, worldwide */}
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                              Destination Hub <span className="text-slate-400 font-normal normal-case">(worldwide)</span>
                            </Label>
                            <SearchableSelect
                              value={editing.destinationHub ?? ""}
                              onChange={(v) => setEditField("destinationHub", v)}
                              options={DEST_HUBS}
                              placeholder="Search destination worldwide…"
                              disabled={editing.isLocked}
                            />
                          </div>

                          {/* EDI Excel File upload */}
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">EDI Excel File</Label>
                            <p className="text-[10px] text-orange-600 font-semibold">(UPLOAD EXCEL FILE ONLY)</p>
                            <label className="block">
                              <div className="h-8 px-3 flex items-center justify-between border border-slate-200 rounded text-sm cursor-pointer hover:border-blue-400 bg-white text-slate-500">
                                <span className="truncate text-xs">{csvFile?.name || "Choose Excel file…"}</span>
                                <UploadCloud className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                              </div>
                              <input type="file" accept=".xlsx,.xls" className="hidden"
                                onChange={(e) => setCsvFile(e.target.files?.[0] || null)} />
                            </label>
                          </div>

                          <Separator />

                          {/* Route summary */}
                          <div className="bg-gradient-to-br from-blue-50 to-slate-50 rounded-xl border border-blue-100 p-3 space-y-2">
                            <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Route Summary</p>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] text-slate-500">FROM</p>
                                <p className="text-sm font-bold text-slate-800 truncate">{editing.originHub || editing.fromCountry || "—"}</p>
                              </div>
                              <Plane className="h-4 w-4 text-orange-500 flex-shrink-0" />
                              <div className="flex-1 min-w-0 text-right">
                                <p className="text-[10px] text-slate-500">TO</p>
                                <p className="text-sm font-bold text-slate-800 truncate">{editing.destinationHub || editing.toCountry || "—"}</p>
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
                          <table className="w-full text-xs min-w-[640px]">
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
                              {filteredAwbs.length === 0 && (
                                <tr>
                                  <td colSpan={8} className="px-3 py-8 text-center text-slate-400 text-xs">
                                    {awbSearch ? "No AWBs match search" : "No AWBs in this manifest"}
                                  </td>
                                </tr>
                              )}
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

                        <Button size="sm" className="h-8 text-xs bg-blue-700 hover:bg-blue-800 text-white gap-1.5"
                          onClick={handleSave} disabled={saving || editing.isLocked}>
                          <CheckCircle2 className="h-3.5 w-3.5" /> Update Manifest
                        </Button>

                        {/* Bagging button */}
                        <Button size="sm" variant="outline"
                          className="h-8 text-xs border-orange-500 text-orange-400 hover:text-orange-200 hover:bg-orange-500/20 gap-1.5"
                          onClick={() => setShowBagging(true)}>
                          <Box className="h-3.5 w-3.5" /> Bagging
                          {editing.baggingInfo?.bags?.length > 0 && (
                            <span className="bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                              {editing.baggingInfo.bags.length}
                            </span>
                          )}
                        </Button>

                        {/* CSV Import section */}
                        <div className="flex items-center gap-2 ml-auto flex-wrap">
                          <span className="text-slate-400 text-xs font-medium">CSV Import <span className="text-red-400">*</span></span>
                          <label className="cursor-pointer">
                            <div className="h-8 px-3 flex items-center gap-2 bg-slate-800 border border-slate-600 rounded text-slate-300 text-xs hover:border-slate-400 transition-colors max-w-[150px]">
                              <span className="truncate">{csvFile?.name || "No file chosen"}</span>
                            </div>
                            <input
                              ref={csvInputRef}
                              type="file"
                              accept=".csv"
                              className="hidden"
                              onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                            />
                          </label>
                          <Button size="sm"
                            className={`h-8 text-xs gap-1.5 ${csvFile ? "bg-blue-600 hover:bg-blue-500" : "bg-slate-700 hover:bg-slate-600"} text-white`}
                            disabled={!csvFile || importing || editing.isLocked}
                            onClick={handleCSVImport}>
                            {importing ? <RefreshCw className="h-3 w-3 animate-spin" /> : <UploadCloud className="h-3 w-3" />}
                            {importing ? "Importing…" : "Import"}
                          </Button>
                          <Button size="sm" variant="outline"
                            className="h-8 text-xs border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700 gap-1"
                            onClick={downloadSampleCSV}>
                            <Download className="h-3.5 w-3.5" /> Sample
                          </Button>
                        </div>
                      </div>
                    </TabsContent>

                    {/* ══ TRACKING EVENTS TAB ═══════════════════════════════ */}
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

                    {/* ══ BILLING TAB ════════════════════════════════════════ */}
                    <TabsContent value="billing" className="m-0 p-4 space-y-4">
                      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 space-y-4">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-1.5 flex items-center gap-2">
                          <DollarSign className="h-3.5 w-3.5 text-blue-600" /> Billing Summary
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {[
                            { label: "Total AWBs",       value: String(computedAwb) },
                            { label: "Total Pieces",      value: String(computedPcs) },
                            { label: "Total Actual Wt",  value: `${computedActual} kg` },
                            { label: "Total Volumetric", value: `${editing.totalVolumetricWt ?? 0} kg` },
                            { label: "Total Chargeable", value: `${editing.totalVolumetricWt && Number(editing.totalVolumetricWt) > Number(computedActual) ? editing.totalVolumetricWt : computedActual} kg` },
                            { label: "Total Value",      value: `${editing.currency} ${editing.totalValue.toFixed(2)}` },
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

      {/* ── Bagging Dialog ────────────────────────────────────────────────────── */}
      {editing && (
        <BaggingDialog
          open={showBagging}
          onClose={() => setShowBagging(false)}
          initialData={editing.baggingInfo}
          disabled={editing.isLocked}
          onSave={(data) => {
            setEditField("baggingInfo", data);
            toast({ title: "Bagging info saved ✓", description: `${data.bags.length} bag type(s) recorded. Click Update Manifest.` });
          }}
        />
      )}

      {/* ── Manifest History Dialog ───────────────────────────────────────────── */}
      {editing && (
        <ManifestHistoryDialog
          open={showHistory}
          onClose={() => setShowHistory(false)}
          manifestId={editing.manifestId}
        />
      )}

      {/* ── Bulk Status Confirm Dialog ────────────────────────────────────────── */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-blue-600" />
              Bulk Status Update
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-600">
              Update <strong>{selectedIds.size}</strong> selected manifest{selectedIds.size > 1 ? "s" : ""} to:
            </p>
            {bulkStatus && (
              <div className="flex justify-center">
                <ManifestStatusBadge status={bulkStatus} />
              </div>
            )}
            <p className="text-xs text-slate-500 text-center">This will overwrite the current status of all selected manifests.</p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowBulkDialog(false)}>Cancel</Button>
              <Button size="sm" className="bg-blue-700 hover:bg-blue-800 text-white gap-1.5" onClick={handleBulkStatusApply}>
                <CheckCircle2 className="h-3.5 w-3.5" /> Apply to {selectedIds.size} Manifest{selectedIds.size > 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>


    </div>
  );
};
