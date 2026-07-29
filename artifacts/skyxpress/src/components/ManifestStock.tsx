// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  FileSpreadsheet, FileDown, Trash2, Search, ClipboardList,
  Package, Weight, DollarSign, Calendar, RefreshCw,
} from "lucide-react";
import {
  loadManifestStock, deleteManifestFromStock, type ManifestStockEntry,
} from "@/utils/manifestStorage";
import { exportManifestToExcel } from "@/utils/manifestExport";
import { generateBulkManifestPDF } from "@/utils/bulkManifestPDF";
import { supabase } from "@/integrations/supabase/client";

const statusColors: Record<string, string> = {
  delivered:         "bg-green-100 text-green-800",
  in_transit:        "bg-blue-100 text-blue-800",
  created:           "bg-yellow-100 text-yellow-800",
  picked_up:         "bg-blue-100 text-blue-800",
  customs:           "bg-orange-100 text-orange-800",
  out_for_delivery:  "bg-indigo-100 text-indigo-800",
  cancelled:         "bg-red-100 text-red-800",
};

export const ManifestStock = () => {
  const [entries, setEntries]           = useState<ManifestStockEntry[]>([]);
  const [search, setSearch]             = useState("");
  const [preview, setPreview]           = useState<ManifestStockEntry | null>(null);
  const [countryMap, setCountryMap]     = useState<Record<string, string>>({});
  const [downloading, setDownloading]   = useState<string | null>(null);
  const { toast } = useToast();

  const reload = useCallback(() => setEntries(loadManifestStock()), []);

  useEffect(() => {
    reload();
    // Country map for display
    supabase.from("countries").select("code, name").then(({ data }) => {
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((c: any) => { map[c.code] = c.name; });
        setCountryMap(map);
      }
    });
  }, [reload]);

  const handleDelete = (manifestId: string) => {
    if (!window.confirm(`Delete manifest ${manifestId}? This cannot be undone.`)) return;
    deleteManifestFromStock(manifestId);
    reload();
    toast({ title: "Manifest removed", description: manifestId });
  };

  const handleExcelDownload = async (entry: ManifestStockEntry) => {
    setDownloading(entry.manifestId + "-xls");
    try {
      exportManifestToExcel(
        entry.parcels as any,
        countryMap,
        `SkyXpress_Manifest_${entry.manifestId}.xlsx`,
        entry.manifestId
      );
      toast({ title: "Excel downloaded", description: entry.manifestId });
    } catch (e: any) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
    } finally {
      setDownloading(null);
    }
  };

  const handlePDFDownload = async (entry: ManifestStockEntry) => {
    setDownloading(entry.manifestId + "-pdf");
    try {
      await generateBulkManifestPDF(entry, countryMap);
      toast({ title: "PDF downloaded", description: entry.manifestId });
    } catch (e: any) {
      toast({ title: "PDF failed", description: e.message, variant: "destructive" });
    } finally {
      setDownloading(null);
    }
  };

  const filtered = entries.filter((e) => {
    const q = search.toLowerCase();
    return (
      e.manifestId.toLowerCase().includes(q) ||
      e.trackingIds.some((id) => id.toLowerCase().includes(q)) ||
      e.serviceType.toLowerCase().includes(q) ||
      e.fromCountry.toLowerCase().includes(q) ||
      e.toCountry.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Manifests",  value: entries.length,                                  icon: ClipboardList, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Total Parcels",    value: entries.reduce((s, e) => s + e.parcelCount, 0),  icon: Package,       color: "text-orange-600", bg: "bg-orange-50" },
          { label: "Total Weight",     value: `${entries.reduce((s, e) => s + e.totalWeight, 0).toFixed(1)} kg`, icon: Weight, color: "text-green-600", bg: "bg-green-50" },
          { label: "Total Value",      value: entries.length > 0 ? `${entries[0].currency} ${entries.reduce((s, e) => s + e.totalValue, 0).toFixed(2)}` : "—", icon: DollarSign, color: "text-purple-600", bg: "bg-purple-50" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="border shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`${bg} p-2.5 rounded-lg`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">{label}</p>
                <p className="text-xl font-bold">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-blue-600" />
              Manifest Stock
              {entries.length > 0 && (
                <Badge variant="secondary" className="ml-1">{entries.length}</Badge>
              )}
            </CardTitle>
            <Button variant="outline" size="sm" onClick={reload} className="gap-2">
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>

          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by manifest ID, tracking ID, route…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>

        <CardContent>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <div className="rounded-full bg-slate-100 p-5">
                <ClipboardList className="h-10 w-10 text-slate-400" />
              </div>
              <div>
                <p className="font-semibold text-slate-700">No manifests yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Select parcels in Parcel Management and click "Generate Manifest"
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="font-bold text-blue-700">Manifest ID</TableHead>
                    <TableHead className="font-bold">Date</TableHead>
                    <TableHead className="font-bold">Parcels</TableHead>
                    <TableHead className="font-bold">Route</TableHead>
                    <TableHead className="font-bold">Weight</TableHead>
                    <TableHead className="font-bold">Value</TableHead>
                    <TableHead className="font-bold">Service</TableHead>
                    <TableHead className="font-bold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((entry) => (
                    <TableRow
                      key={entry.manifestId}
                      className="cursor-pointer hover:bg-blue-50/50 transition-colors"
                      onClick={() => setPreview(entry)}
                    >
                      <TableCell>
                        <span className="font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded text-sm tracking-wider">
                          {entry.manifestId}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          {new Date(entry.createdAt).toLocaleDateString("en-GB", {
                            day: "2-digit", month: "short", year: "numeric",
                          })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(entry.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Package className="h-3.5 w-3.5 text-blue-500" />
                          <span className="font-semibold">{entry.parcelCount}</span>
                          <span className="text-muted-foreground text-xs">parcels</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 font-mono">
                          {entry.trackingIds.slice(0, 2).join(", ")}
                          {entry.trackingIds.length > 2 && ` +${entry.trackingIds.length - 2}`}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">
                          {entry.fromCountry || "—"}
                        </div>
                        <div className="text-xs text-muted-foreground">→ {entry.toCountry || "—"}</div>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">{entry.totalWeight.toFixed(2)}</span>
                        <span className="text-muted-foreground text-xs ml-1">kg</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">{entry.currency}</span>{" "}
                        <span className="font-semibold">{entry.totalValue.toFixed(2)}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{entry.serviceType}</Badge>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1 justify-end">
                          <Button
                            variant="ghost" size="sm"
                            className="gap-1.5 text-green-700 hover:text-green-800 hover:bg-green-50"
                            onClick={() => handleExcelDownload(entry)}
                            disabled={downloading === entry.manifestId + "-xls"}
                            title="Download Excel"
                          >
                            <FileSpreadsheet className="h-4 w-4" />
                            <span className="hidden sm:inline text-xs">Excel</span>
                          </Button>
                          <Button
                            variant="ghost" size="sm"
                            className="gap-1.5 text-blue-700 hover:text-blue-800 hover:bg-blue-50"
                            onClick={() => handlePDFDownload(entry)}
                            disabled={downloading === entry.manifestId + "-pdf"}
                            title="Download PDF"
                          >
                            <FileDown className="h-4 w-4" />
                            <span className="hidden sm:inline text-xs">PDF</span>
                          </Button>
                          <Button
                            variant="ghost" size="sm"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(entry.manifestId)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
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

      {/* Detail dialog */}
      <Dialog open={!!preview} onOpenChange={(o) => { if (!o) setPreview(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <ClipboardList className="h-5 w-5 text-blue-600" />
              Manifest Details
              {preview && (
                <span className="font-mono text-orange-600 bg-orange-50 px-2 py-0.5 rounded text-base tracking-wider">
                  {preview.manifestId}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {preview && (
            <div className="space-y-4">
              {/* Info grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 rounded-xl p-4 border border-slate-100 text-sm">
                {[
                  ["Generated", new Date(preview.createdAt).toLocaleString()],
                  ["Parcels", String(preview.parcelCount)],
                  ["Total Pieces", String(preview.totalPieces)],
                  ["Total Weight", `${preview.totalWeight.toFixed(2)} kg`],
                  ["Total Value", `${preview.currency} ${preview.totalValue.toFixed(2)}`],
                  ["Service", preview.serviceType],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wide">{label}</p>
                    <p className="font-semibold text-slate-800 mt-0.5">{value}</p>
                  </div>
                ))}
              </div>

              {/* Parcel table */}
              <div className="rounded-xl border border-slate-100 overflow-hidden">
                <div className="bg-slate-800 px-4 py-2">
                  <span className="text-white font-bold text-xs uppercase tracking-widest">Parcels in this manifest</span>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="text-xs">#</TableHead>
                        <TableHead className="text-xs">Tracking ID</TableHead>
                        <TableHead className="text-xs">Shipper</TableHead>
                        <TableHead className="text-xs">Receiver</TableHead>
                        <TableHead className="text-xs">Route</TableHead>
                        <TableHead className="text-xs">Weight</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.parcels.map((p: any, i: number) => (
                        <TableRow key={p.id || i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                          <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                          <TableCell className="font-mono font-semibold text-blue-600 text-xs">{p.tracking_id}</TableCell>
                          <TableCell className="text-xs">{p.sender_name}</TableCell>
                          <TableCell className="text-xs">{p.receiver_name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {countryMap[p.from_country] || p.from_country} → {countryMap[p.to_country] || p.to_country}
                          </TableCell>
                          <TableCell className="text-xs">{p.weight} kg</TableCell>
                          <TableCell>
                            <Badge className={`text-[10px] ${statusColors[p.current_status] || "bg-gray-100 text-gray-800"}`}>
                              {(p.current_status || "").replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Download buttons */}
              <div className="flex items-center gap-3 pt-1">
                <Button
                  className="gap-2 bg-green-600 hover:bg-green-700 text-white flex-1"
                  onClick={() => handleExcelDownload(preview)}
                  disabled={downloading === preview.manifestId + "-xls"}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  {downloading === preview.manifestId + "-xls" ? "Generating…" : "Download Excel"}
                </Button>
                <Button
                  className="gap-2 bg-blue-600 hover:bg-blue-700 text-white flex-1"
                  onClick={() => handlePDFDownload(preview)}
                  disabled={downloading === preview.manifestId + "-pdf"}
                >
                  <FileDown className="h-4 w-4" />
                  {downloading === preview.manifestId + "-pdf" ? "Generating…" : "Download PDF"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
