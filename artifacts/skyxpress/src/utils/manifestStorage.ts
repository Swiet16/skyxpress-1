// Manifest Stock — localStorage-based storage for generated manifests
// Works offline / without Supabase credentials

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
  manifestId: string;      // e.g. "SKX-A3F7K2P1"
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
}

const STORAGE_KEY = "skyxpress_manifest_stock";

// ── ID generation ─────────────────────────────────────────────────────────────
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars (0/O, 1/I)

export function generateManifestId(): string {
  let id = "";
  const array = new Uint8Array(8);
  crypto.getRandomValues(array);
  for (let i = 0; i < 8; i++) {
    id += CHARS[array[i] % CHARS.length];
  }
  return `SKX-${id}`;
}

// ── CRUD ──────────────────────────────────────────────────────────────────────
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
  // Prepend (newest first)
  stock.unshift(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stock));
}

export function deleteManifestFromStock(manifestId: string): void {
  const stock = loadManifestStock().filter((e) => e.manifestId !== manifestId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stock));
}

// ── Build a manifest entry from selected parcels ──────────────────────────────
export function buildManifestEntry(
  parcels: ManifestStockParcel[],
  countryMap: Record<string, string>
): ManifestStockEntry {
  const totalWeight = parcels.reduce((s, p) => s + Number(p.weight ?? 0), 0);
  const totalPieces = parcels.reduce((s, p) => s + (p.pieces ?? 1), 0);
  const totalValue  = parcels.reduce((s, p) => s + Number(p.total_price ?? 0), 0);
  const currency    = parcels[0]?.currency || "USD";
  const serviceType = [...new Set(parcels.map((p) => p.service_type).filter(Boolean))].join(", ") || "Mixed";
  const fromCountry = countryMap[parcels[0]?.from_country] || parcels[0]?.from_country || "";
  const toCountry   = [...new Set(parcels.map((p) => countryMap[p.to_country] || p.to_country))].join(", ");

  return {
    manifestId: generateManifestId(),
    createdAt: new Date().toISOString(),
    parcelCount: parcels.length,
    trackingIds: parcels.map((p) => p.tracking_id),
    totalWeight: Math.round(totalWeight * 100) / 100,
    totalPieces,
    totalValue: Math.round(totalValue * 100) / 100,
    currency,
    serviceType,
    fromCountry,
    toCountry,
    parcels,
  };
}
