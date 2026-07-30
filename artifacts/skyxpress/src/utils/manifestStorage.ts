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
  trackingEvents?: Array<{
    id: string;
    awb: string;
    event: string;
    location: string;
    timestamp: string;
    notes?: string;
  }>;
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

// ── camelCase ↔ snake_case mapping ──────────────────────────────────────────
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
 */
export async function updateManifestInStockDB(
  manifestId: string,
  updates: Partial<ManifestStockEntry>
): Promise<void> {
  // Update localStorage cache immediately
  const stock = loadManifestStock().map((e) =>
    e.manifestId === manifestId ? { ...e, ...updates } : e
  );
  saveLocalCache(stock);

  try {
    // Fetch the current DB row, merge, upsert
    const { data } = await supabase
      .from("manifests_detail")
      .select("*")
      .eq("manifest_id", manifestId)
      .single();

    const base: ManifestStockEntry = data
      ? fromDbRow(data)
      : (stock.find((e) => e.manifestId === manifestId) ?? ({ manifestId } as ManifestStockEntry));

    await supabase
      .from("manifests_detail")
      .upsert(toDbRow({ ...base, ...updates }), { onConflict: "manifest_id" });
  } catch (_) {}
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
