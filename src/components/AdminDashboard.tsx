import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  Package,
  FileText,
  Settings,
  Plus,
  Shield,
  DollarSign,
  Radio,
  Activity,
  ClipboardCheck,
  Terminal,
} from "lucide-react";
import { UserManagement } from "./UserManagement";
import { ParcelManagement } from "./ParcelManagement";
import { QuoteManagement } from "./QuoteManagement";
import { PricingManager } from "./PricingManager";
import { InvoiceManager } from "./InvoiceManager";
import { InvoiceCreator } from "./InvoiceCreator";
import { AdminRequestsSection } from "./AdminRequestsSection";
import { ApprovedParcelsSection } from "./ApprovedParcelsSection";
import { useLiveData } from "@/hooks/useLiveData";
import {
  FlightPathChart,
  ManifestBar,
  LedgerBars,
  Sparkline,
  lastNDays,
  bucketByDay,
  sumByDay,
  dayLabel,
  pctDelta,
} from "./DashboardCharts";

interface AdminDashboardProps {
  user: any;
  profile: any;
}

// ---------- role identity ----------
// Every role gets its own callsign, accent color and set of privileges instead
// of one generic "admin dashboard" shell.

type RoleKey = "admin" | "staff" | "developer";

const ROLE_THEME: Record<
  RoleKey,
  { label: string; tagline: string; accent: string; badgeClass: string }
> = {
  admin: {
    label: "Admin",
    tagline: "Full manifest access — rates, users & finance",
    accent: "#C98A2B",
    badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  },
  staff: {
    label: "Staff",
    tagline: "Ground ops — requests, parcels & quotes",
    accent: "#2B8C7E",
    badgeClass: "bg-teal-500/15 text-teal-300 border-teal-500/30",
  },
  developer: {
    label: "Developer",
    tagline: "Systems desk — live channels & diagnostics",
    accent: "#6C5CE7",
    badgeClass: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  },
};

const resolveRole = (rawRole?: string): RoleKey => {
  const r = (rawRole || "").toLowerCase();
  if (r === "admin") return "admin";
  if (r === "developer" || r === "dev" || r === "engineer") return "developer";
  return "staff";
};

// Status colors kept consistent with the parcel table elsewhere in the app.
const STATUS_HEX: Record<string, string> = {
  created: "#EAB308",
  picked_up: "#3B82F6",
  in_transit: "#8B5CF6",
  custom_hold: "#EF4444",
  flight_departure: "#6366F1",
  flight_arrived: "#22C55E",
  flight_offload: "#F97316",
  in_custom_clearance: "#EAB308",
  arrived_hub: "#3B82F6",
  customs: "#F97316",
  out_for_delivery: "#6366F1",
  delivered: "#22C55E",
  cancelled: "#EF4444",
};

const METRIC_ACCENT = {
  users: "#6C5CE7",
  parcels: "#C98A2B",
  invoices: "#2B8C7E",
  revenue: "#3FA76B",
};

const formatRelativeTime = (iso?: string) => {
  if (!iso) return "no activity yet";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export const AdminDashboard = ({ user, profile }: AdminDashboardProps) => {
  const { data: users } = useLiveData<any>({
    table: "profiles",
    orderBy: { column: "created_at", ascending: false },
  });

  const { data: parcels } = useLiveData<any>({
    table: "parcels",
    orderBy: { column: "created_at", ascending: false },
  });

  const { data: invoices } = useLiveData<any>({
    table: "invoices",
    orderBy: { column: "created_at", ascending: false },
  });

  const { data: quotes } = useLiveData<any>({
    table: "quotes",
    orderBy: { column: "created_at", ascending: false },
  });

  const [activeTab, setActiveTab] = useState("overview");

  const role = resolveRole(profile?.role);
  const theme = ROLE_THEME[role];
  const isAdmin = role === "admin";
  const isDeveloper = role === "developer";

  // ---------- derived stats ----------
  const stats = {
    totalUsers: users.length,
    totalParcels: parcels.length,
    activeParcels: parcels.filter((p) => !["delivered", "cancelled"].includes(p.current_status)).length,
    totalInvoices: invoices.length,
    pendingQuotes: quotes.filter((q) => q.status === "pending").length,
    todayRevenue: invoices
      .filter((inv) => new Date(inv.created_at).toDateString() === new Date().toDateString())
      .reduce((sum, inv) => sum + (inv.final_amount || 0), 0),
  };

  // ---------- chart data (memoized so we only re-bucket when the underlying rows change) ----------
  const days14 = useMemo(() => lastNDays(14), []);
  const days7 = useMemo(() => lastNDays(7), []);

  const parcelsPerDay14 = useMemo(() => bucketByDay(parcels, "created_at", days14), [parcels, days14]);
  const usersPerDay14 = useMemo(() => bucketByDay(users, "created_at", days14), [users, days14]);
  const invoicesPerDay14 = useMemo(() => bucketByDay(invoices, "created_at", days14), [invoices, days14]);
  const revenuePerDay7 = useMemo(() => sumByDay(invoices, "created_at", "final_amount", days7), [invoices, days7]);

  const parcelsDelta = useMemo(
    () => pctDelta(parcelsPerDay14.slice(7), parcelsPerDay14.slice(0, 7)),
    [parcelsPerDay14]
  );
  const usersDelta = useMemo(() => pctDelta(usersPerDay14.slice(7), usersPerDay14.slice(0, 7)), [usersPerDay14]);
  const invoicesDelta = useMemo(
    () => pctDelta(invoicesPerDay14.slice(7), invoicesPerDay14.slice(0, 7)),
    [invoicesPerDay14]
  );

  const statusSegments = useMemo(() => {
    const counts: Record<string, number> = {};
    parcels.forEach((p) => {
      const key = p.current_status || "created";
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([label, value]) => ({ label, value, color: STATUS_HEX[label] || "#94A3B8" }));
  }, [parcels]);

  const day14Labels = days14.map(dayLabel);
  const day7Labels = days7.map(dayLabel);

  const latestByTable = {
    profiles: users[0]?.created_at,
    parcels: parcels[0]?.created_at,
    invoices: invoices[0]?.created_at,
    quotes: quotes[0]?.created_at,
  };

  return (
    <div className="space-y-6">
      {/* ---------- Control tower header ---------- */}
      <div className="relative overflow-hidden rounded-2xl bg-[#0B1220] text-white px-6 py-8 md:px-10 md:py-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "18px 18px",
          }}
        />
        <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-white/50">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              Live ·{" "}
              {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
            </div>
            <h1 className="mt-2 text-3xl md:text-4xl font-semibold tracking-tight">
              {theme.label} Control Tower
            </h1>
            <p className="mt-1 text-sm text-white/60 max-w-md">{theme.tagline}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${theme.badgeClass}`}>
              <Shield className="h-3.5 w-3.5" />
              {theme.label.toUpperCase()}
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">{user?.email}</p>
              <p className="text-xs text-white/50 font-mono">{(profile?.role || role).toUpperCase()}</p>
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          {isAdmin && <TabsTrigger value="users">Users</TabsTrigger>}
          <TabsTrigger value="parcels">All Parcels</TabsTrigger>
          <TabsTrigger value="quotes">Quotes</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="create-invoice">Create Invoice</TabsTrigger>
          {isAdmin && <TabsTrigger value="rates">Rates</TabsTrigger>}
          {(isDeveloper || isAdmin) && <TabsTrigger value="system">System</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* ---------- Stat cards ---------- */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4" style={{ color: METRIC_ACCENT.users }} />
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <div className="text-2xl font-bold">{stats.totalUsers}</div>
                    <p className="text-xs text-muted-foreground">
                      {usersDelta >= 0 ? "+" : ""}
                      {usersDelta}% vs prior week
                    </p>
                  </div>
                  <Sparkline data={usersPerDay14.slice(7)} accent={METRIC_ACCENT.users} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Parcels</CardTitle>
                <Package className="h-4 w-4" style={{ color: METRIC_ACCENT.parcels }} />
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <div className="text-2xl font-bold">{stats.totalParcels}</div>
                    <p className="text-xs text-muted-foreground">{stats.activeParcels} active</p>
                  </div>
                  <Sparkline data={parcelsPerDay14.slice(7)} accent={METRIC_ACCENT.parcels} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
                <FileText className="h-4 w-4" style={{ color: METRIC_ACCENT.invoices }} />
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <div className="text-2xl font-bold">{stats.totalInvoices}</div>
                    <p className="text-xs text-muted-foreground">
                      {invoicesDelta >= 0 ? "+" : ""}
                      {invoicesDelta}% vs prior week
                    </p>
                  </div>
                  <Sparkline data={invoicesPerDay14.slice(7)} accent={METRIC_ACCENT.invoices} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
                <DollarSign className="h-4 w-4" style={{ color: METRIC_ACCENT.revenue }} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${stats.todayRevenue.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">{stats.pendingQuotes} pending quotes</p>
              </CardContent>
            </Card>
          </div>

          {/* ---------- Ops board: progress charts ---------- */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-4 w-4" style={{ color: theme.accent }} />
                  Parcel Flow — last 14 days
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FlightPathChart data={parcelsPerDay14} labels={day14Labels} accent={theme.accent} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ClipboardCheck className="h-4 w-4" style={{ color: theme.accent }} />
                  Manifest Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statusSegments.length > 0 ? (
                  <ManifestBar segments={statusSegments} />
                ) : (
                  <p className="text-sm text-muted-foreground">No parcels yet.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <DollarSign className="h-4 w-4" style={{ color: METRIC_ACCENT.revenue }} />
                  Revenue — last 7 days
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LedgerBars
                  data={revenuePerDay7}
                  labels={day7Labels}
                  accent={METRIC_ACCENT.revenue}
                  formatValue={(v) => `$${v.toFixed(2)}`}
                />
              </CardContent>
            </Card>
          )}

          {/* ---------- Role-based quick actions ---------- */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              {isAdmin && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button className="h-16 flex-col gap-2" onClick={() => setActiveTab("create-invoice")}>
                    <Plus className="h-6 w-6" />
                    Create New Parcel
                  </Button>
                  <Button variant="outline" className="h-16 flex-col gap-2" onClick={() => setActiveTab("users")}>
                    <Users className="h-6 w-6" />
                    Manage Users
                  </Button>
                  <Button variant="outline" className="h-16 flex-col gap-2" onClick={() => setActiveTab("rates")}>
                    <Settings className="h-6 w-6" />
                    Update Rates
                  </Button>
                </div>
              )}
              {role === "staff" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button className="h-16 flex-col gap-2" onClick={() => setActiveTab("parcels")}>
                    <Package className="h-6 w-6" />
                    View All Parcels
                  </Button>
                  <Button variant="outline" className="h-16 flex-col gap-2" onClick={() => setActiveTab("requests")}>
                    <ClipboardCheck className="h-6 w-6" />
                    Review Requests
                  </Button>
                  <Button variant="outline" className="h-16 flex-col gap-2" onClick={() => setActiveTab("quotes")}>
                    <FileText className="h-6 w-6" />
                    Handle Quotes
                  </Button>
                </div>
              )}
              {isDeveloper && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button className="h-16 flex-col gap-2" onClick={() => setActiveTab("system")}>
                    <Terminal className="h-6 w-6" />
                    System Diagnostics
                  </Button>
                  <Button variant="outline" className="h-16 flex-col gap-2" onClick={() => setActiveTab("parcels")}>
                    <Package className="h-6 w-6" />
                    View All Parcels
                  </Button>
                  <Button variant="outline" className="h-16 flex-col gap-2" onClick={() => setActiveTab("invoices")}>
                    <FileText className="h-6 w-6" />
                    View Invoices
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests">
          <AdminRequestsSection />
        </TabsContent>

        <TabsContent value="approved">
          <ApprovedParcelsSection />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="users">
            <UserManagement />
          </TabsContent>
        )}

        <TabsContent value="parcels">
          <ParcelManagement />
        </TabsContent>

        <TabsContent value="quotes">
          <QuoteManagement />
        </TabsContent>

        <TabsContent value="invoices">
          <InvoiceManager />
        </TabsContent>

        <TabsContent value="create-invoice">
          <InvoiceCreator />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="rates">
            <PricingManager />
          </TabsContent>
        )}

        {(isDeveloper || isAdmin) && (
          <TabsContent value="system" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Radio className="h-4 w-4" style={{ color: theme.accent }} />
                  Live Channels
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Diagnostics reflect the same realtime Supabase channels powering this dashboard.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { table: "profiles", label: "Profiles", count: users.length },
                    { table: "parcels", label: "Parcels", count: parcels.length },
                    { table: "invoices", label: "Invoices", count: invoices.length },
                    { table: "quotes", label: "Quotes", count: quotes.length },
                  ].map((row) => (
                    <div key={row.table} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{row.label}</p>
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        </span>
                      </div>
                      <p className="text-2xl font-bold font-mono mt-1">{row.count}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        last write {formatRelativeTime((latestByTable as any)[row.table])}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};
