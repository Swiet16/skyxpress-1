import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Search,
  Plus,
  Package,
  Eye,
  Edit,
  FileText,
  Trash2,
  Paperclip,
  FileSpreadsheet,
  CheckSquare,
  X,
} from "lucide-react";
import { ParcelForm } from "./ParcelForm";
import { ParcelDetails } from "./ParcelDetails";
import { ParcelAttachmentsDialog } from "./ParcelAttachments";

interface Parcel {
  id: string;
  tracking_id: string;
  reference_id?: string;
  sender_name: string;
  sender_phone: string;
  sender_city?: string;
  sender_country?: string;
  receiver_name: string;
  receiver_phone: string;
  receiver_address?: string;
  receiver_city?: string;
  receiver_state?: string;
  receiver_postal_code?: string;
  receiver_country?: string;
  parcel_type: string;
  weight: number;
  length: number;
  width: number;
  height: number;
  total_price: number;
  currency: string;
  current_status: string;
  from_country: string;
  to_country: string;
  service_type?: string;
  created_at: string | null;
}

interface Country {
  code: string;
  name: string;
}

type EditableField = "reference_id" | "tracking_id";

const statusColors: Record<string, string> = {
  created: "bg-yellow-100 text-yellow-800",
  picked_up: "bg-blue-100 text-blue-800",
  in_transit: "bg-purple-100 text-purple-800",
  customs: "bg-orange-100 text-orange-800",
  out_for_delivery: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

// ─── Excel Manifest Generator ────────────────────────────────────────────────

function generateManifestExcel(selected: Parcel[], countryMap: Record<string, string>) {
  const wb = XLSX.utils.book_new();
  const ws: XLSX.WorkSheet = {};

  // ── Helper to write a styled cell ──────────────────────────────────────────
  const C = (r: number, c: number, v: unknown, bold = false, bg?: string, align?: string, border = false) => {
    const addr = XLSX.utils.encode_cell({ r, c });
    ws[addr] = {
      v,
      t: typeof v === "number" ? "n" : "s",
      s: {
        font: { name: "Arial", sz: 10, bold },
        fill: bg ? { fgColor: { rgb: bg }, patternType: "solid" } : { patternType: "none" },
        alignment: {
          horizontal: align ?? "center",
          vertical: "center",
          wrapText: true,
        },
        border: border
          ? {
              top: { style: "thin", color: { rgb: "000000" } },
              bottom: { style: "thin", color: { rgb: "000000" } },
              left: { style: "thin", color: { rgb: "000000" } },
              right: { style: "thin", color: { rgb: "000000" } },
            }
          : {},
      },
    };
  };

  // ── Row 0: empty top row (matches template blank row) ──────────────────────
  // Row 1 in file = index 0

  // ── Row 1: Column Headers ──────────────────────────────────────────────────
  const HDR_BG = "1F3864";  // dark navy (matches template)
  const HEADERS = [
    "SR",
    "HAWB",
    "SHIPPER",
    "CITY",
    "COUNTRY",
    "Consignee Name",
    "Consignee Address",
    "CITY",
    "POST CODE",
    "COUNTRY",
    "CONTACT",
    "BAG",
    "PKGS",
    "Wt KGS",
    "VALUE $",
    "Description",
    "TRACKING I'D",
    "SERVICE",
    "LABEL",
  ];

  HEADERS.forEach((h, c) => {
    const addr = XLSX.utils.encode_cell({ r: 1, c });
    ws[addr] = {
      v: h,
      t: "s",
      s: {
        font: { name: "Arial", sz: 10, bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: HDR_BG }, patternType: "solid" },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: {
          top: { style: "medium", color: { rgb: "FFFFFF" } },
          bottom: { style: "medium", color: { rgb: "FFFFFF" } },
          left: { style: "thin", color: { rgb: "FFFFFF" } },
          right: { style: "thin", color: { rgb: "FFFFFF" } },
        },
      },
    };
  });

  // ── Data Rows ──────────────────────────────────────────────────────────────
  const ROW_BG_EVEN = "DCE6F1"; // light blue stripe
  const ROW_BG_ODD  = "FFFFFF";

  selected.forEach((p, idx) => {
    const r = idx + 2; // data starts at row index 2
    const bg = idx % 2 === 0 ? ROW_BG_EVEN : ROW_BG_ODD;
    const bd = true;

    const fromCountry = countryMap[p.from_country] || p.from_country || "";
    const toCountry   = countryMap[p.to_country]   || p.to_country   || "";
    const consigneeAddr = [p.receiver_address, p.receiver_city, p.receiver_state]
      .filter(Boolean).join(", ");

    const row: (string | number)[] = [
      idx + 1,                                     // SR
      p.reference_id || p.tracking_id || "",       // HAWB
      p.sender_name  || "",                         // SHIPPER
      p.sender_city  || "",                         // CITY (origin)
      fromCountry,                                  // COUNTRY (origin)
      p.receiver_name || "",                        // Consignee Name
      consigneeAddr || "",                          // Consignee Address
      p.receiver_city || "",                        // CITY (dest)
      p.receiver_postal_code || "",                // POST CODE
      toCountry,                                    // COUNTRY (dest)
      p.receiver_phone || "",                       // CONTACT
      "",                                           // BAG
      1,                                            // PKGS
      p.weight ?? 0,                               // Wt KGS
      p.total_price ?? 0,                          // VALUE $
      p.parcel_type || "",                          // Description
      p.tracking_id || "",                          // TRACKING I'D
      (p.service_type || "standard").toUpperCase(), // SERVICE
      "LABEL PASTED",                               // LABEL
    ];

    row.forEach((v, c) => C(r, c, v, false, bg, c === 6 ? "left" : "center", bd));
  });

  // ── Totals Row ─────────────────────────────────────────────────────────────
  const totRow = selected.length + 2;
  const totalWeight = selected.reduce((s, p) => s + (p.weight ?? 0), 0);
  const totalValue  = selected.reduce((s, p) => s + (p.total_price ?? 0), 0);
  const totalPkgs   = selected.length;
  const TOT_BG      = "F4B942"; // amber total row

  const totLabels: (string | number)[] = [
    "TOTAL", "", "", "", "", "", "", "", "", "", "",
    "", totalPkgs, +totalWeight.toFixed(2), +totalValue.toFixed(2), "", "", "", "",
  ];
  totLabels.forEach((v, c) => {
    const addr = XLSX.utils.encode_cell({ r: totRow, c });
    ws[addr] = {
      v,
      t: typeof v === "number" ? "n" : "s",
      s: {
        font: { name: "Arial", sz: 10, bold: true },
        fill: { fgColor: { rgb: TOT_BG }, patternType: "solid" },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "medium", color: { rgb: "000000" } },
          bottom: { style: "medium", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } },
        },
      },
    };
  });

  // ── Sheet range ────────────────────────────────────────────────────────────
  ws["!ref"] = XLSX.utils.encode_range({ r: 0, c: 0 }, { r: totRow, c: HEADERS.length - 1 });

  // ── Column widths (mirroring the template) ─────────────────────────────────
  ws["!cols"] = [
    { wch: 5  }, // SR
    { wch: 12 }, // HAWB
    { wch: 18 }, // SHIPPER
    { wch: 12 }, // CITY
    { wch: 18 }, // COUNTRY
    { wch: 20 }, // Consignee Name
    { wch: 30 }, // Consignee Address
    { wch: 12 }, // CITY
    { wch: 10 }, // POST CODE
    { wch: 22 }, // COUNTRY
    { wch: 14 }, // CONTACT
    { wch: 8  }, // BAG
    { wch: 6  }, // PKGS
    { wch: 8  }, // Wt KGS
    { wch: 10 }, // VALUE $
    { wch: 28 }, // Description
    { wch: 20 }, // TRACKING I'D
    { wch: 12 }, // SERVICE
    { wch: 14 }, // LABEL
  ];

  // ── Row heights ────────────────────────────────────────────────────────────
  ws["!rows"] = [
    { hpt: 6 },   // row 0 top spacer
    { hpt: 30 },  // row 1 header
    ...selected.map(() => ({ hpt: 22 })),
    { hpt: 22 },  // totals row
  ];

  const sheetName = "DMMY";
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Download
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  XLSX.writeFile(wb, `Manifest_${dateStr}_${selected.length}pkgs.xlsx`);
}

// ─── Component ────────────────────────────────────────────────────────────────

export const ParcelManagement = () => {
  const [parcels, setParcels]               = useState<Parcel[]>([]);
  const [searchQuery, setSearchQuery]       = useState("");
  const [loading, setLoading]               = useState(true);
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditForm, setShowEditForm]     = useState(false);
  const [editingParcel, setEditingParcel]   = useState<Parcel | null>(null);
  const [showAttachments, setShowAttachments] = useState(false);
  const [attachmentsParcel, setAttachmentsParcel] = useState<Parcel | null>(null);
  const { toast } = useToast();

  // Multi-select for manifest export
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Country code -> full name lookup
  const [countryMap, setCountryMap] = useState<Record<string, string>>({});

  // Inline editing state for Reference ID / Tracking ID cells
  const [editingCell, setEditingCell] = useState<{ id: string; field: EditableField } | null>(null);
  const [editValue, setEditValue]     = useState("");
  const [savingCell, setSavingCell]   = useState(false);
  const isSavingRef = useRef(false);

  useEffect(() => {
    fetchParcels();
    fetchCountries();
  }, []);

  const fetchParcels = async () => {
    try {
      const { data, error } = await supabase
        .from("parcels")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setParcels(data || []);
    } catch (error: any) {
      console.error("Error fetching parcels:", error);
      toast({ title: "Error", description: "Failed to load parcels", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchCountries = async () => {
    const { data, error } = await supabase.from("countries").select("code, name");
    if (error) { console.error("Error fetching countries:", error); return; }
    const map: Record<string, string> = {};
    (data as Country[] || []).forEach((c) => { map[c.code] = c.name; });
    setCountryMap(map);
  };

  const getCountryName = (code: string) => {
    if (!code) return "—";
    return countryMap[code] || code;
  };

  // ── Selection helpers ──────────────────────────────────────────────────────
  const filteredParcels = parcels.filter((parcel) => {
    const query = searchQuery.toLowerCase();
    return (
      parcel.tracking_id.toLowerCase().includes(query) ||
      (parcel.reference_id || "").toLowerCase().includes(query) ||
      parcel.sender_name.toLowerCase().includes(query) ||
      parcel.receiver_name.toLowerCase().includes(query) ||
      parcel.sender_phone.toLowerCase().includes(query) ||
      parcel.receiver_phone.toLowerCase().includes(query)
    );
  });

  const allSelected    = filteredParcels.length > 0 && filteredParcels.every((p) => selectedIds.has(p.id));
  const someSelected   = filteredParcels.some((p) => selectedIds.has(p.id));
  // Derive from full dataset so hidden-by-filter parcels are still exported
  const selectedParcels = parcels.filter((p) => selectedIds.has(p.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredParcels.forEach((p) => next.delete(p.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredParcels.forEach((p) => next.add(p.id));
        return next;
      });
    }
  };

  const toggleParcel = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleExportManifest = () => {
    if (selectedParcels.length === 0) return;
    generateManifestExcel(selectedParcels, countryMap);
    toast({
      title: "Manifest exported",
      description: `Excel manifest created for ${selectedParcels.length} parcel${selectedParcels.length > 1 ? "s" : ""}`,
    });
  };

  // ── CRUD helpers ───────────────────────────────────────────────────────────
  const handleParcelCreated = () => {
    fetchParcels();
    setShowCreateForm(false);
    toast({ title: "Success", description: "Parcel created successfully" });
  };

  const handleParcelUpdated = () => {
    fetchParcels();
    setShowEditForm(false);
    setEditingParcel(null);
    toast({ title: "Success", description: "Parcel updated successfully" });
  };

  const handleEditClick = (parcel: Parcel) => {
    setEditingParcel(parcel);
    setShowEditForm(true);
  };

  const handleAttachmentsClick = (parcel: Parcel) => {
    setAttachmentsParcel(parcel);
    setShowAttachments(true);
  };

  const handleDeleteParcel = async (parcelId: string, trackingId: string) => {
    if (!window.confirm(`Are you sure you want to delete parcel ${trackingId}?`)) return;
    try {
      const { error } = await supabase.from("parcels").delete().eq("id", parcelId);
      if (error) throw error;
      toast({ title: "Success", description: `Parcel ${trackingId} deleted successfully` });
      fetchParcels();
    } catch (error: any) {
      console.error("Error deleting parcel:", error);
      toast({ title: "Error", description: error.message || "Failed to delete parcel", variant: "destructive" });
    }
  };

  // ── Inline cell editing ────────────────────────────────────────────────────
  const startEditingCell = (parcel: Parcel, field: EditableField) => {
    if (savingCell) return;
    setEditingCell({ id: parcel.id, field });
    setEditValue((parcel[field] as string) || "");
  };

  const cancelEditingCell = () => { setEditingCell(null); setEditValue(""); };

  const friendlyFieldName = (field: EditableField) =>
    field === "tracking_id" ? "Tracking ID" : "Reference ID";

  const saveEditingCell = async () => {
    if (!editingCell || isSavingRef.current) return;
    isSavingRef.current = true;
    const { id, field } = editingCell;
    const trimmed = editValue.trim();

    if (field === "tracking_id" && !trimmed) {
      toast({ title: "Error", description: "Tracking ID cannot be empty", variant: "destructive" });
      isSavingRef.current = false;
      return;
    }

    const previousValue = parcels.find((p) => p.id === id)?.[field] || "";
    if (trimmed === previousValue) { isSavingRef.current = false; cancelEditingCell(); return; }

    setSavingCell(true);
    try {
      const { error } = await supabase
        .from("parcels")
        // @ts-ignore – dynamic field key is intentional
        .update({ [field]: field === "reference_id" ? (trimmed || null) : trimmed })
        .eq("id", id);
      if (error) throw error;
      setParcels((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: trimmed } : p)));
      toast({ title: "Saved", description: `${friendlyFieldName(field)} updated` });
    } catch (error: any) {
      const isDuplicate = error?.code === "23505";
      toast({
        title: "Error",
        description: isDuplicate
          ? `That ${friendlyFieldName(field)} is already in use.`
          : error.message || "Failed to update",
        variant: "destructive",
      });
    } finally {
      setSavingCell(false);
      setEditingCell(null);
      setEditValue("");
      isSavingRef.current = false;
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); saveEditingCell(); }
    else if (e.key === "Escape") { e.preventDefault(); cancelEditingCell(); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Parcel Management
            </CardTitle>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Manifest export — visible when ≥1 parcel selected */}
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
                  <span className="text-sm font-medium text-blue-700">
                    {selectedIds.size} parcel{selectedIds.size > 1 ? "s" : ""} selected
                  </span>
                  <Button
                    size="sm"
                    variant="default"
                    className="bg-green-600 hover:bg-green-700 text-white h-7 px-3 text-xs font-semibold gap-1.5"
                    onClick={handleExportManifest}
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    Export Manifest
                  </Button>
                  <button
                    onClick={clearSelection}
                    className="text-blue-400 hover:text-blue-600 transition-colors"
                    title="Clear selection"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Parcel
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Parcel</DialogTitle>
                  </DialogHeader>
                  <ParcelForm onSuccess={handleParcelCreated} />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Search + select-all strip */}
          <div className="flex items-center gap-3 mt-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by tracking ID, reference ID, name, or phone…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {filteredParcels.length > 0 && (
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
              >
                <CheckSquare className="h-4 w-4" />
                {allSelected ? "Deselect all" : "Select all"}
              </button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {/* Selection info bar */}
          {someSelected && (
            <div className="mb-3 flex items-center gap-2 text-sm text-blue-700 bg-blue-50 rounded-md px-3 py-2">
              <FileSpreadsheet className="h-4 w-4" />
              <span>
                <strong>{selectedIds.size}</strong> parcel{selectedIds.size > 1 ? "s" : ""} selected
                {" — click "}
                <strong>Export Manifest</strong> above to download the Excel manifest file.
              </span>
            </div>
          )}

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {/* Checkbox column */}
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all"
                      className={someSelected && !allSelected ? "opacity-50" : ""}
                    />
                  </TableHead>
                  <TableHead>Reference ID</TableHead>
                  <TableHead>Tracking ID</TableHead>
                  <TableHead>Sender</TableHead>
                  <TableHead>Receiver</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParcels.map((parcel) => {
                  const isSelected = selectedIds.has(parcel.id);
                  return (
                    <TableRow
                      key={parcel.id}
                      className={isSelected ? "bg-blue-50/60 hover:bg-blue-50" : ""}
                    >
                      {/* Checkbox */}
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleParcel(parcel.id)}
                          aria-label={`Select ${parcel.tracking_id}`}
                        />
                      </TableCell>

                      {/* Reference ID — inline editable */}
                      <TableCell>
                        {editingCell?.id === parcel.id && editingCell.field === "reference_id" ? (
                          <Input
                            autoFocus
                            value={editValue}
                            disabled={savingCell}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={saveEditingCell}
                            onKeyDown={handleEditKeyDown}
                            className="h-8 font-mono w-32"
                          />
                        ) : (
                          <div
                            className="font-mono font-semibold text-blue-600 cursor-pointer hover:underline decoration-dashed underline-offset-4"
                            onClick={() => startEditingCell(parcel, "reference_id")}
                            title="Click to edit"
                          >
                            {parcel.reference_id || "N/A"}
                          </div>
                        )}
                      </TableCell>

                      {/* Tracking ID — inline editable */}
                      <TableCell>
                        {editingCell?.id === parcel.id && editingCell.field === "tracking_id" ? (
                          <Input
                            autoFocus
                            value={editValue}
                            disabled={savingCell}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={saveEditingCell}
                            onKeyDown={handleEditKeyDown}
                            className="h-8 font-mono w-32"
                          />
                        ) : (
                          <div
                            className="font-mono font-semibold text-primary cursor-pointer hover:underline decoration-dashed underline-offset-4"
                            onClick={() => startEditingCell(parcel, "tracking_id")}
                            title="Click to edit"
                          >
                            {parcel.tracking_id}
                          </div>
                        )}
                      </TableCell>

                      <TableCell>
                        <div>
                          <div className="font-medium">{parcel.sender_name}</div>
                          <div className="text-sm text-muted-foreground">{parcel.sender_phone}</div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div>
                          <div className="font-medium">{parcel.receiver_name}</div>
                          <div className="text-sm text-muted-foreground">{parcel.receiver_phone}</div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="text-sm">
                          {getCountryName(parcel.from_country)} → {getCountryName(parcel.to_country)}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="text-sm">
                          <div>{parcel.parcel_type}</div>
                          <div className="text-muted-foreground">
                            {parcel.weight}kg • {parcel.length}×{parcel.width}×{parcel.height}cm
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="font-semibold">
                          {parcel.currency} {parcel.total_price?.toFixed(2)}
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge className={statusColors[parcel.current_status] || "bg-gray-100 text-gray-800"}>
                          {parcel.current_status.replace("_", " ").toUpperCase()}
                        </Badge>
                      </TableCell>

                      <TableCell>{parcel.created_at ? new Date(parcel.created_at).toLocaleDateString() : "—"}</TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setSelectedParcel(parcel); setShowDetailsModal(true); }}
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEditClick(parcel)} title="Edit">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAttachmentsClick(parcel)}
                            title="Attachments"
                          >
                            <Paperclip className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Export single manifest"
                            onClick={() => {
                              generateManifestExcel([parcel], countryMap);
                              toast({ title: "Manifest exported", description: `Manifest for ${parcel.tracking_id} downloaded` });
                            }}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteParcel(parcel.id, parcel.tracking_id)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {filteredParcels.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No parcels found</p>
              </div>
            )}
          </div>

          {/* Bottom summary when parcels are selected */}
          {selectedIds.size > 0 && (
            <div className="mt-4 flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg px-4 py-3">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-5 w-5" />
                <div>
                  <div className="font-semibold text-sm">
                    {selectedIds.size} parcel{selectedIds.size > 1 ? "s" : ""} selected for manifest
                  </div>
                  <div className="text-blue-200 text-xs">
                    Total weight: {selectedParcels.reduce((s, p) => s + (p.weight ?? 0), 0).toFixed(2)} kg
                    {" · "}
                    Total value: {selectedParcels[0]?.currency ?? ""}{" "}
                    {selectedParcels.reduce((s, p) => s + (p.total_price ?? 0), 0).toFixed(2)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={clearSelection} className="text-blue-200 hover:text-white text-sm underline">
                  Clear
                </button>
                <Button
                  size="sm"
                  className="bg-white text-blue-700 hover:bg-blue-50 font-semibold gap-1.5"
                  onClick={handleExportManifest}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Download Excel Manifest
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Parcel Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Parcel Details</DialogTitle>
          </DialogHeader>
          {selectedParcel && (
            <ParcelDetails
              parcel={selectedParcel}
              onUpdate={fetchParcels}
              onClose={() => setShowDetailsModal(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Parcel Modal */}
      <Dialog
        open={showEditForm}
        onOpenChange={(open) => { setShowEditForm(open); if (!open) setEditingParcel(null); }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Parcel — {editingParcel?.tracking_id}</DialogTitle>
          </DialogHeader>
          {editingParcel && <ParcelForm parcel={editingParcel} onSuccess={handleParcelUpdated} />}
        </DialogContent>
      </Dialog>

      {/* Attachments Modal */}
      <ParcelAttachmentsDialog
        parcel={
          attachmentsParcel
            ? { id: attachmentsParcel.id, tracking_id: attachmentsParcel.tracking_id }
            : null
        }
        open={showAttachments}
        onOpenChange={(open) => { setShowAttachments(open); if (!open) setAttachmentsParcel(null); }}
      />
    </div>
  );
};
