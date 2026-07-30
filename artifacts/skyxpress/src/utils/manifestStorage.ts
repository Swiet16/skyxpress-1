// @ts-nocheck
// Manifest Stock — localStorage-based storage for generated manifests
// Works offline / without Supabase credentials
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
  manifestStatus?: string; // live | pending | picked_up | in_transit | out_for_delivery | delivered | returned
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

// ── CRUD ─────────────────────────────────────────────────────────────────────
export function loadManifestStock(): ManifestStockEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ManifestStockEntry[];
  } catch {
    return [];
  }
}

export function saveManifestToStock(entry: ManifestStockEntry): void {
  const stock = loadManifestStock();
  stock.unshift(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stock));
}

export function updateManifestInStock(manifestId: string, updates: Partial<ManifestStockEntry>): void {
  const stock = loadManifestStock().map((e) =>
    e.manifestId === manifestId ? { ...e, ...updates } : e
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stock));
}

export function deleteManifestFromStock(manifestId: string): void {
  const stock = loadManifestStock().filter((e) => e.manifestId !== manifestId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stock));
}

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
