// @ts-nocheck
import { useState, useEffect, useRef } from "react";
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { ParcelForm } from "./ParcelForm";
import { ParcelDetails } from "./ParcelDetails";
import { ParcelAttachmentsDialog } from "./ParcelAttachments";
import { SkyXpressAWBInvoice } from "./SkyXpressAWBInvoice";
import { exportManifestToExcel } from "@/utils/manifestExport";

interface Parcel {
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
  parcel_type: string;
  weight: number;
  pieces?: number;
  dim_weight_override?: string;
  length: number;
  width: number;
  height: number;
  total_price: number;
  currency: string;
  service_type?: string;
  current_status: string;
  from_country: string;
  to_country: string;
  created_at: string;
  items?: Array<{ description: string; quantity: number; unit_price: number; total?: number }>;
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

export const ParcelManagement = () => {
  const PAGE_SIZE = 10;
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingParcel, setEditingParcel] = useState<Parcel | null>(null);
  const [showAttachments, setShowAttachments] = useState(false);
  const [attachmentsParcel, setAttachmentsParcel] = useState<Parcel | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceParcel, setInvoiceParcel] = useState<Parcel | null>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);

  // ── Manifest selection ──────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exportingManifest, setExportingManifest] = useState(false);

  const { toast } = useToast();

  // Country code -> full name lookup
  const [countryMap, setCountryMap] = useState<Record<string, string>>({});

  // Inline editing
  const [editingCell, setEditingCell] = useState<{ id: string; field: EditableField } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingCell, setSavingCell] = useState(false);
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
      toast({ title: "Error", description: "Failed to load parcels", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchCountries = async () => {
    const { data, error } = await supabase.from("countries").select("code, name");
    if (error) return;
    const map: Record<string, string> = {};
    (data as Country[] || []).forEach((c) => { map[c.code] = c.name; });
    setCountryMap(map);
  };

  const getCountryName = (code: string) => {
    if (!code) return "—";
    return countryMap[code] || code;
  };

  // ── Selection helpers ─────────────────────────────────────────────────
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
  const totalPages = Math.max(1, Math.ceil(filteredParcels.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedParcels = filteredParcels.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  const allFilteredSelected =
    filteredParcels.length > 0 &&
    filteredParcels.every((p) => selectedIds.has(p.id));
  const someFilteredSelected =
    !allFilteredSelected && filteredParcels.some((p) => selectedIds.has(p.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
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

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectedCount = selectedIds.size;

  // ── Manifest export ──────────────────────────────────────────────────
  const handleExportManifest = async () => {
    const toExport = parcels.filter((p) => selectedIds.has(p.id));
    if (toExport.length === 0) {
      toast({ title: "No parcels selected", description: "Select at least one parcel to export.", variant: "destructive" });
      return;
    }

    setExportingManifest(true);
    try {
      // Fetch full item data for each selected parcel
      const ids = toExport.map((p) => p.id);
      const { data, error } = await supabase
        .from("parcels")
        .select("*")
        .in("id", ids)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const enriched = (data || toExport).map((row: any) => {
        const rawItems = Array.isArray(row.items) ? row.items : [];
        return {
          ...row,
          items: rawItems.map((item: any) => ({
            description: item.description || item.item_description || item.name || "",
            quantity: Number(item.quantity || item.qty || 1),
            unit_price: Number(item.unit_price || item.value || item.price || 0),
            total: Number(item.total || item.total_amount || 0),
          })),
        };
      });

      const dateStr = new Date().toISOString().slice(0, 10);
      exportManifestToExcel(enriched, countryMap, `SkyXpress_Manifest_${dateStr}.xlsx`);

      toast({
        title: "Manifest exported ✓",
        description: `${toExport.length} parcel${toExport.length !== 1 ? "s" : ""} exported to Excel.`,
      });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message || "Could not generate manifest.", variant: "destructive" });
    } finally {
      setExportingManifest(false);
    }
  };

  // ── CRUD helpers ─────────────────────────────────────────────────────
  const handleParcelCreated = () => { fetchParcels(); setShowCreateForm(false); toast({ title: "Success", description: "Parcel created successfully" }); };
  const handleParcelUpdated = () => { fetchParcels(); setShowEditForm(false); setEditingParcel(null); toast({ title: "Success", description: "Parcel updated successfully" }); };
  const handleEditClick = (parcel: Parcel) => { setEditingParcel(parcel); setShowEditForm(true); };
  const handleAttachmentsClick = (parcel: Parcel) => { setAttachmentsParcel(parcel); setShowAttachments(true); };

  const handleInvoiceClick = async (parcel: Parcel) => {
    setLoadingInvoice(true);
    try {
      const { data, error } = await supabase.from("parcels").select("*").eq("id", parcel.id).single();
      if (error) throw error;
      const rawItems = Array.isArray(data.items) ? data.items : [];
      const items = rawItems.map((item: any) => ({
        description: item.description || item.item_description || item.name || "",
        quantity: Number(item.quantity || item.qty || 1),
        unit_price: Number(item.unit_price || item.value || item.price || 0),
        total: Number(item.total || item.total_amount || 0) || Number(item.quantity || 1) * Number(item.unit_price || item.value || 0),
      }));
      setInvoiceParcel({ ...data, items });
      setShowInvoice(true);
    } catch {
      setInvoiceParcel(parcel);
      setShowInvoice(true);
    } finally {
      setLoadingInvoice(false);
    }
  };

  const handleDeleteParcel = async (parcelId: string, trackingId: string) => {
    if (!window.confirm(`Are you sure you want to delete parcel ${trackingId}?`)) return;
    try {
      const { error } = await supabase.from("parcels").delete().eq("id", parcelId);
      if (error) throw error;
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(parcelId); return next; });
      toast({ title: "Success", description: `Parcel ${trackingId} deleted successfully` });
      fetchParcels();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete parcel", variant: "destructive" });
    }
  };

  // ── Inline editing ───────────────────────────────────────────────────
  const startEditingCell = (parcel: Parcel, field: EditableField) => {
    if (savingCell) return;
    setEditingCell({ id: parcel.id, field });
    setEditValue((parcel[field] as string) || "");
  };
  const cancelEditingCell = () => { setEditingCell(null); setEditValue(""); };
  const friendlyFieldName = (field: EditableField) => field === "tracking_id" ? "Tracking ID" : "Reference ID";

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
      const { error } = await supabase.from("parcels").update({ [field]: field === "reference_id" ? (trimmed || null) : trimmed }).eq("id", id);
      if (error) throw error;
      setParcels((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: trimmed } : p)));
      toast({ title: "Saved", description: `${friendlyFieldName(field)} updated` });
    } catch (error: any) {
      const isDuplicate = error?.code === "23505";
      toast({ title: "Error", description: isDuplicate ? `That ${friendlyFieldName(field)} is already in use.` : error.message || "Failed to update", variant: "destructive" });
    } finally {
      setSavingCell(false); setEditingCell(null); setEditValue(""); isSavingRef.current = false;
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
              {/* Manifest export button — prominent when parcels are selected */}
              {selectedCount > 0 && (
                <Button
                  variant="default"
                  className="bg-orange-500 hover:bg-orange-600 text-white gap-2 shadow-md animate-in fade-in slide-in-from-right-2 duration-200"
                  onClick={handleExportManifest}
                  disabled={exportingManifest}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  {exportingManifest
                    ? "Exporting…"
                    : `Export Manifest (${selectedCount})`}
                </Button>
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

          {/* Search + selection summary */}
          <div className="flex items-center gap-4 mt-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by tracking ID, reference ID, name, or phone…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {selectedCount > 0 && (
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {selectedCount} selected
                <button
                  className="ml-2 text-primary underline-offset-2 hover:underline"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Clear
                </button>
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {/* Checkbox column */}
                  <TableHead className="w-10 pr-0">
                    <Checkbox
                      checked={allFilteredSelected}
                      // indeterminate state via data-state
                      data-state={someFilteredSelected ? "indeterminate" : allFilteredSelected ? "checked" : "unchecked"}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all"
                      className="border-primary"
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
                {paginatedParcels.map((parcel) => {
                  const isSelected = selectedIds.has(parcel.id);
                  return (
                    <TableRow
                      key={parcel.id}
                      className={isSelected ? "bg-blue-50 hover:bg-blue-100" : undefined}
                    >
                      {/* Checkbox */}
                      <TableCell className="pr-0">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(parcel.id)}
                          aria-label={`Select parcel ${parcel.tracking_id}`}
                          className="border-primary"
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
                        <div className="font-medium">{parcel.sender_name}</div>
                        <div className="text-sm text-muted-foreground">{parcel.sender_phone}</div>
                      </TableCell>

                      <TableCell>
                        <div className="font-medium">{parcel.receiver_name}</div>
                        <div className="text-sm text-muted-foreground">{parcel.receiver_phone}</div>
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
                          {parcel.current_status.replace(/_/g, " ").toUpperCase()}
                        </Badge>
                      </TableCell>

                      <TableCell>{new Date(parcel.created_at).toLocaleDateString()}</TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost" size="sm"
                            onClick={() => { setSelectedParcel(parcel); setShowDetailsModal(true); }}
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEditClick(parcel)} title="Edit">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleAttachmentsClick(parcel)} title="Attachments">
                            <Paperclip className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost" size="sm"
                            onClick={() => handleInvoiceClick(parcel)}
                            disabled={loadingInvoice}
                            title="Generate AWB / Invoice"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost" size="sm"
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
                <Package className="h-12 w-12 mx-auto text-muted-foreground opacity-40 mb-3" />
                <p className="text-muted-foreground">No parcels found</p>
              </div>
            )}
          </div>

          {filteredParcels.length > 0 && (
            <div className="mt-4 flex flex-col gap-3 border-t pt-4 text-sm sm:flex-row sm:items-center sm:justify-between">
              <p className="text-muted-foreground">
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                {Math.min(currentPage * PAGE_SIZE, filteredParcels.length)} of {filteredParcels.length} parcels
              </p>
              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>
                <span className="min-w-20 text-center text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Bottom manifest action bar — appears when parcels are selected */}
          {selectedCount > 0 && (
            <div className="mt-4 flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center gap-2 text-sm font-medium text-orange-800">
                <CheckSquare className="h-4 w-4" />
                {selectedCount} parcel{selectedCount !== 1 ? "s" : ""} selected for manifest
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-orange-300 text-orange-700 hover:bg-orange-100"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Clear selection
                </Button>
                <Button
                  size="sm"
                  className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
                  onClick={handleExportManifest}
                  disabled={exportingManifest}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  {exportingManifest ? "Exporting…" : "Export Manifest Excel"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Parcel Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Parcel Details</DialogTitle></DialogHeader>
          {selectedParcel && (
            <ParcelDetails parcel={selectedParcel} onUpdate={fetchParcels} onClose={() => setShowDetailsModal(false)} />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Parcel Modal */}
      <Dialog open={showEditForm} onOpenChange={(open) => { setShowEditForm(open); if (!open) setEditingParcel(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Parcel — {editingParcel?.tracking_id}</DialogTitle></DialogHeader>
          {editingParcel && <ParcelForm parcel={editingParcel} onSuccess={handleParcelUpdated} />}
        </DialogContent>
      </Dialog>

      {/* Attachments Modal */}
      <ParcelAttachmentsDialog
        parcel={attachmentsParcel ? { id: attachmentsParcel.id, tracking_id: attachmentsParcel.tracking_id } : null}
        open={showAttachments}
        onOpenChange={(open) => { setShowAttachments(open); if (!open) setAttachmentsParcel(null); }}
      />

      {/* AWB / Invoice Modal */}
      {invoiceParcel && (
        <SkyXpressAWBInvoice
          open={showInvoice}
          onClose={() => { setShowInvoice(false); setInvoiceParcel(null); }}
          parcel={invoiceParcel}
        />
      )}
    </div>
  );
};
