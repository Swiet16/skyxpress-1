// @ts-nocheck
// Manifest Stock — Supabase-primary storage with localStorage fallback
import { supabase } from "@/integrations/supabase/client";

export interface ManifestStockParcel {
  id: string;
  tracking_id: string;
  reference_id?: string;
  sender_name: string;
  sender_company?: string;
  sender_phone: string;
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
  total_price: number;
  currency: string;
  service_type?: string;
  current_status: string;
  from_country: string;
  to_country: string;
  created_at: string;
  items?: Array<{ description: string; quantity: number; unit_price: number; total?: number }>;
}

export interface ManifestStockEntry {
  manifestId: string;      // 8-digit zero-padded e.g. "00191100"
  createdAt: string;       // ISO timestamp
  parcelCount: number;
  trackingIds: string[];
  totalWeight: number;
  totalPieces: number;
  totalValue: number;
  currency: string;
  serviceType: string;
  fromCountry: string;
  toCountry: string;
  parcels: ManifestStockParcel[];

  // ── Manifest Detail fields (optional, editable after creation) ────────────
  bookingFromDate?: string;
  bookingTillDate?: string;
  manifestDate?: string;
  manifestTime?: string;
  runNumber?: string;
  flightNo?: string;
  noOfBags?: number;
  arrivalDate?: string;
  arrivalTime?: string;
  forwarder?: string;
  service?: string;
  masterNo?: string;
  masterEdiBagNo?: string;
  remark?: string;
  createdByUser?: string;
  company?: string;
  license?: string;
  vendorWeight?: number;
  totalActualWt?: number;
  totalVolumetricWt?: number;
  totalChargeableWt?: number;
  originHub?: string;
  destinationHub?: string;
  isLocked?: boolean;
  manifestStatus?: string; // pending | picked_up | in_transit | out_for_delivery | delivered | returned
  baggingInfo?: {
    bags: Array<{
      bagType: string;
      bagSize: string;
      quantity: number;
      sealType: string;
      sealNumber: string;
      notes: string;
    }>;
  };
  trackingEvents?: Array<{
    id: string;
    awb: string;
    event: string;
    location: string;
    timestamp: string;
    notes?: string;
  }>;
}

export interface ManifestHistoryEntry {
  id: string;
  manifestId: string;
  changedAt: string;
  changedBy: string;
  snapshot: Partial<ManifestStockEntry>;
  changeNote?: string;
}

const STORAGE_KEY      = "skyxpress_manifest_stock";
const SEQ_STORAGE_KEY  = "skyxpress_manifest_seq";
const SEQ_START        = 191099; // first generated = 191100 → padded "00191100"

// ── Sequential ID generation ────────────────────────────────────────────────
export function formatManifestId(num: number): string {
  return String(num).padStart(8, "0");
}

export async function getNextManifestId(): Promise<string> {
  try {
    const { data, error } = await supabase
      .rpc("increment_manifest_sequence")
      .single();
    if (!error && data) return formatManifestId(Number(data));

    const { data: row, error: fetchErr } = await supabase
      .from("manifest_sequence")
      .select("last_number")
      .eq("id", 1)
      .single();
    if (!fetchErr && row) {
      const next = Number(row.last_number) + 1;
      await supabase.from("manifest_sequence").update({ last_number: next }).eq("id", 1);
      return formatManifestId(next);
    }
  } catch (_) {}

  const stored = parseInt(localStorage.getItem(SEQ_STORAGE_KEY) || String(SEQ_START), 10);
  const next = stored + 1;
  localStorage.setItem(SEQ_STORAGE_KEY, String(next));
  return formatManifestId(next);
}

// ── camelCase → snake_case (partial update — only maps keys present in the object) ──
function toPartialDbRow(updates: Partial<ManifestStockEntry>): Record<string, any> {
  const row: Record<string, any> = {};
  const set = (dbKey: string, val: any) => { row[dbKey] = val; };
  if ("manifestStatus"    in updates) set("manifest_status",     updates.manifestStatus    ?? null);
  if ("isLocked"          in updates) set("is_locked",           updates.isLocked          ?? false);
  if ("bookingFromDate"   in updates) set("booking_from_date",   updates.bookingFromDate   ?? null);
  if ("bookingTillDate"   in updates) set("booking_till_date",   updates.bookingTillDate   ?? null);
  if ("manifestDate"      in updates) set("manifest_date",       updates.manifestDate      ?? null);
  if ("manifestTime"      in updates) set("manifest_time",       updates.manifestTime      ?? null);
  if ("runNumber"         in updates) set("run_number",          updates.runNumber         ?? null);
  if ("flightNo"          in updates) set("flight_no",           updates.flightNo          ?? null);
  if ("noOfBags"          in updates) set("no_of_bags",          updates.noOfBags          ?? 0);
  if ("arrivalDate"       in updates) set("arrival_date",        updates.arrivalDate       ?? null);
  if ("arrivalTime"       in updates) set("arrival_time",        updates.arrivalTime       ?? null);
  if ("forwarder"         in updates) set("forwarder",           updates.forwarder         ?? null);
  if ("service"           in updates) set("service",             updates.service           ?? null);
  if ("masterNo"          in updates) set("master_no",           updates.masterNo          ?? null);
  if ("masterEdiBagNo"    in updates) set("master_edi_bag_no",   updates.masterEdiBagNo    ?? null);
  if ("remark"            in updates) set("remark",              updates.remark            ?? null);
  if ("createdByUser"     in updates) set("created_by_user",     updates.createdByUser     ?? null);
  if ("company"           in updates) set("company",             updates.company           ?? null);
  if ("license"           in updates) set("license",             updates.license           ?? null);
  if ("vendorWeight"      in updates) set("vendor_weight",       updates.vendorWeight      ?? 0);
  if ("totalActualWt"     in updates) set("total_actual_wt",     updates.totalActualWt     ?? 0);
  if ("totalVolumetricWt" in updates) set("total_volumetric_wt", updates.totalVolumetricWt ?? 0);
  if ("totalChargeableWt" in updates) set("total_chargeable_wt", updates.totalChargeableWt ?? 0);
  if ("originHub"         in updates) set("origin_hub",          updates.originHub         ?? null);
  if ("destinationHub"    in updates) set("destination_hub",     updates.destinationHub    ?? null);
  if ("parcelCount"       in updates) set("parcel_count",        updates.parcelCount       ?? 0);
  if ("totalWeight"       in updates) set("total_weight",        updates.totalWeight       ?? 0);
  if ("totalValue"        in updates) set("total_value",         updates.totalValue        ?? 0);
  if ("currency"          in updates) set("currency",            updates.currency          ?? "USD");
  if ("serviceType"       in updates) set("service_type",        updates.serviceType       ?? null);
  if ("fromCountry"       in updates) set("from_country",        updates.fromCountry       ?? null);
  if ("toCountry"         in updates) set("to_country",          updates.toCountry         ?? null);
  if ("trackingIds"       in updates) set("tracking_ids",        updates.trackingIds       ?? []);
  if ("parcels"           in updates) set("parcels",             updates.parcels           ?? []);
  if ("trackingEvents"    in updates) set("tracking_events",     updates.trackingEvents    ?? []);
  if ("baggingInfo"       in updates) set("bagging_info",        updates.baggingInfo       ?? {});
  return row;
}

// ── camelCase → snake_case (full row) ───────────────────────────────────────
function toDbRow(entry: ManifestStockEntry): Record<string, any> {
  return {
    manifest_id:         entry.manifestId,
    booking_from_date:   entry.bookingFromDate   || null,
    booking_till_date:   entry.bookingTillDate   || null,
    manifest_date:       entry.manifestDate      || null,
    manifest_time:       entry.manifestTime      || null,
    run_number:          entry.runNumber         || null,
    flight_no:           entry.flightNo          || null,
    no_of_bags:          entry.noOfBags          ?? 0,
    arrival_date:        entry.arrivalDate       || null,
    arrival_time:        entry.arrivalTime       || null,
    forwarder:           entry.forwarder         || null,
    service:             entry.service           || null,
    master_no:           entry.masterNo          || null,
    master_edi_bag_no:   entry.masterEdiBagNo    || null,
    remark:              entry.remark            || null,
    created_by_user:     entry.createdByUser     || null,
    company:             entry.company           || null,
    license:             entry.license           || null,
    vendor_weight:       entry.vendorWeight      ?? 0,
    total_actual_wt:     entry.totalActualWt     ?? entry.totalWeight,
    total_volumetric_wt: entry.totalVolumetricWt ?? 0,
    total_chargeable_wt: entry.totalChargeableWt ?? entry.totalWeight,
    origin_hub:          entry.originHub         || null,
    destination_hub:     entry.destinationHub    || null,
    is_locked:           entry.isLocked          ?? false,
    parcel_count:        entry.parcelCount,
    total_weight:        entry.totalWeight,
    total_value:         entry.totalValue,
    currency:            entry.currency,
    service_type:        entry.serviceType,
    from_country:        entry.fromCountry,
    to_country:          entry.toCountry,
    tracking_ids:        entry.trackingIds,
    parcels:             entry.parcels,
    tracking_events:     entry.trackingEvents    ?? [],
    bagging_info:        entry.baggingInfo       ?? {},
    manifest_status:     entry.manifestStatus    || null,
    created_at:          entry.createdAt,
  };
}

function fromDbRow(row: Record<string, any>): ManifestStockEntry {
  return {
    manifestId:        row.manifest_id,
    createdAt:         row.created_at,
    parcelCount:       row.parcel_count       ?? 0,
    trackingIds:       row.tracking_ids       ?? [],
    totalWeight:       Number(row.total_weight ?? 0),
    totalPieces:       row.no_of_pcs          ?? 0,
    totalValue:        Number(row.total_value  ?? 0),
    currency:          row.currency           || "USD",
    serviceType:       row.service_type       || "",
    fromCountry:       row.from_country       || "",
    toCountry:         row.to_country         || "",
    parcels:           row.parcels            || [],
    bookingFromDate:   row.booking_from_date  || undefined,
    bookingTillDate:   row.booking_till_date  || undefined,
    manifestDate:      row.manifest_date      || undefined,
    manifestTime:      row.manifest_time      || undefined,
    runNumber:         row.run_number         || undefined,
    flightNo:          row.flight_no          || undefined,
    noOfBags:          row.no_of_bags         ?? undefined,
    arrivalDate:       row.arrival_date       || undefined,
    arrivalTime:       row.arrival_time       || undefined,
    forwarder:         row.forwarder          || undefined,
    service:           row.service            || undefined,
    masterNo:          row.master_no          || undefined,
    masterEdiBagNo:    row.master_edi_bag_no  || undefined,
    remark:            row.remark             || undefined,
    createdByUser:     row.created_by_user    || undefined,
    company:           row.company            || undefined,
    license:           row.license            || undefined,
    vendorWeight:      row.vendor_weight      != null ? Number(row.vendor_weight)      : undefined,
    totalActualWt:     row.total_actual_wt    != null ? Number(row.total_actual_wt)    : undefined,
    totalVolumetricWt: row.total_volumetric_wt != null ? Number(row.total_volumetric_wt) : undefined,
    totalChargeableWt: row.total_chargeable_wt != null ? Number(row.total_chargeable_wt) : undefined,
    originHub:         row.origin_hub         || undefined,
    destinationHub:    row.destination_hub    || undefined,
    isLocked:          row.is_locked          ?? false,
    manifestStatus:    row.manifest_status    || undefined,
    trackingEvents:    row.tracking_events    || [],
    baggingInfo:       row.bagging_info       || undefined,
  };
}

// ── localStorage CRUD (kept as fallback / offline cache) ────────────────────
export function loadManifestStock(): ManifestStockEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ManifestStockEntry[];
  } catch {
    return [];
  }
}

function saveLocalCache(entries: ManifestStockEntry[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch (_) {}
}

// ── Supabase-primary CRUD ────────────────────────────────────────────────────

/**
 * Load all manifests from Supabase.
 * Falls back to localStorage when the DB is unreachable or returns an error.
 */
export async function loadManifestStockDB(): Promise<ManifestStockEntry[]> {
  try {
    const { data, error } = await supabase
      .from("manifests_detail")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && Array.isArray(data)) {
      const entries = data.map(fromDbRow);
      saveLocalCache(entries);
      return entries;
    }
  } catch (_) {}
  return loadManifestStock();
}

/**
 * Save a new manifest entry.
 * Writes to Supabase first; also keeps localStorage in sync.
 */
export async function saveManifestToStockDB(entry: ManifestStockEntry): Promise<void> {
  // Optimistically update local cache
  const stock = loadManifestStock();
  stock.unshift(entry);
  saveLocalCache(stock);

  try {
    await supabase
      .from("manifests_detail")
      .upsert(toDbRow(entry), { onConflict: "manifest_id" });
  } catch (_) {}
}

/** @deprecated use saveManifestToStockDB */
export function saveManifestToStock(entry: ManifestStockEntry): void {
  const stock = loadManifestStock();
  stock.unshift(entry);
  saveLocalCache(stock);
}

/**
 * Apply partial updates to a manifest (status, lock, detail fields, etc.).
 * Uses a direct .update() so only the changed columns are patched — no
 * fetch-then-upsert race condition and no silent full-row overwrites.
 */
export async function updateManifestInStockDB(
  manifestId: string,
  updates: Partial<ManifestStockEntry>
): Promise<void> {
  // Optimistically update localStorage so the UI responds instantly
  const stock = loadManifestStock().map((e) =>
    e.manifestId === manifestId ? { ...e, ...updates } : e
  );
  saveLocalCache(stock);

  try {
    const partial = toPartialDbRow(updates);
    if (Object.keys(partial).length === 0) return;

    const { error } = await supabase
      .from("manifests_detail")
      .update(partial)
      .eq("manifest_id", manifestId);

    if (error) {
      console.error("[ManifestStorage] update failed:", error.message, error.details);
    }
  } catch (err) {
    console.error("[ManifestStorage] updateManifestInStockDB error:", err);
  }
}

/** @deprecated use updateManifestInStockDB */
export function updateManifestInStock(manifestId: string, updates: Partial<ManifestStockEntry>): void {
  const stock = loadManifestStock().map((e) =>
    e.manifestId === manifestId ? { ...e, ...updates } : e
  );
  saveLocalCache(stock);
}

/**
 * Permanently delete a manifest.
 */
export async function deleteManifestFromStockDB(manifestId: string): Promise<void> {
  saveLocalCache(loadManifestStock().filter((e) => e.manifestId !== manifestId));
  try {
    await supabase.from("manifests_detail").delete().eq("manifest_id", manifestId);
  } catch (_) {}
}

// ── Manifest History ─────────────────────────────────────────────────────────

/**
 * Save a history snapshot whenever a manifest is updated.
 */
export async function saveManifestHistory(
  manifestId: string,
  snapshot: Partial<ManifestStockEntry>,
  changedBy: string,
  changeNote?: string
): Promise<void> {
  try {
    await supabase.from("manifest_history").insert({
      manifest_id:  manifestId,
      changed_at:   new Date().toISOString(),
      changed_by:   changedBy,
      snapshot:     snapshot,
      change_note:  changeNote || null,
    });
  } catch (_) {}
}

/**
 * Load history entries for a given manifest, newest first.
 */
export async function loadManifestHistory(manifestId: string): Promise<ManifestHistoryEntry[]> {
  try {
    const { data, error } = await supabase
      .from("manifest_history")
      .select("*")
      .eq("manifest_id", manifestId)
      .order("changed_at", { ascending: false })
      .limit(50);
    if (!error && Array.isArray(data)) {
      return data.map((row: any) => ({
        id:         row.id,
        manifestId: row.manifest_id,
        changedAt:  row.changed_at,
        changedBy:  row.changed_by || "unknown",
        snapshot:   row.snapshot || {},
        changeNote: row.change_note || undefined,
      }));
    }
  } catch (_) {}
  return [];
}

/** @deprecated use deleteManifestFromStockDB */
export function deleteManifestFromStock(manifestId: string): void {
  saveLocalCache(loadManifestStock().filter((e) => e.manifestId !== manifestId));
}

// ── Build a new ManifestStockEntry from parcels ──────────────────────────────
export function buildManifestEntry(
  parcels: ManifestStockParcel[],
  countryMap: Record<string, string>,
  manifestId: string
): ManifestStockEntry {
  const totalWeight  = parcels.reduce((s, p) => s + Number(p.weight ?? 0), 0);
  const totalPieces  = parcels.reduce((s, p) => s + (p.pieces ?? 1), 0);
  const totalValue   = parcels.reduce((s, p) => s + Number(p.total_price ?? 0), 0);
  const currency     = parcels[0]?.currency || "USD";
  const serviceType  = [...new Set(parcels.map((p) => p.service_type).filter(Boolean))].join(", ") || "Mixed";
  const fromCountry  = countryMap[parcels[0]?.from_country] || parcels[0]?.from_country || "";
  const toCountry    = [...new Set(parcels.map((p) => countryMap[p.to_country] || p.to_country))].join(", ");

  return {
    manifestId,
    createdAt:    new Date().toISOString(),
    parcelCount:  parcels.length,
    trackingIds:  parcels.map((p) => p.tracking_id),
    totalWeight:  Math.round(totalWeight * 100) / 100,
    totalPieces,
    totalValue:   Math.round(totalValue * 100) / 100,
    currency,
    serviceType,
    fromCountry,
    toCountry,
    parcels,
    manifestDate: new Date().toISOString().split("T")[0],
    manifestTime: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    totalActualWt:     Math.round(totalWeight * 100) / 100,
    totalVolumetricWt: 0,
    totalChargeableWt: Math.round(totalWeight * 100) / 100,
  };
}
