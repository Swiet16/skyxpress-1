import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  Package,
  FileText,
  Plus,
  DollarSign,
  Activity,
  ClipboardCheck,
  ClipboardList,
  Building2,
  TrendingUp,
  TrendingDown,
  Minus,
  LayoutDashboard,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { UserManagement } from "./UserManagement";
import { ParcelManagement } from "./ParcelManagement";
import { AdminRequestsSection } from "./AdminRequestsSection";
import { ApprovedParcelsSection } from "./ApprovedParcelsSection";
import { ManifestStock } from "./ManifestStock";
import { PartnerManagement } from "./PartnerManagement";
import { useLiveData } from "@/hooks/useLiveData";
import { useTableCount } from "@/hooks/useTableCount";
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
    tagline: "Full manifest access — rates, users, partners & finance",
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

  // Exact counts — not capped at Supabase's 1000-row default
  const { count: exactUserCount } = useTableCount("profiles");
  const { count: exactParcelCount } = useTableCount("parcels");
  const { count: exactInvoiceCount } = useTableCount("invoices");
  const { count: exactActiveParcelCount } = useTableCount("parcels", { column: "current_status", value: "in_transit" });

  const [activeTab, setActiveTab] = useState("overview");
  const navigate = useNavigate();

  const role = resolveRole(profile?.role);
  const theme = ROLE_THEME[role];
  const isAdmin = role === "admin";

  // ---------- derived stats ----------
  const stats = {
    totalUsers: exactUserCount ?? users.length,
    totalParcels: exactParcelCount ?? parcels.length,
    activeParcels: exactActiveParcelCount ?? parcels.filter((p) => !["delivered", "cancelled"].includes(p.current_status)).length,
    totalInvoices: exactInvoiceCount ?? invoices.length,
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

  // ── Nav item definitions ────────────────────────────────────────────────────
  const navItems = [
    { tab: "overview",  label: "Overview",         icon: LayoutDashboard, count: null },
    { tab: "requests",  label: "Requests",          icon: ClipboardCheck,  count: stats.pendingQuotes || null },
    { tab: "approved",  label: "Status / Approved", icon: CheckCircle2,    count: null },
    ...(isAdmin
      ? [
          { tab: "users",    label: "Users",    icon: Users,       count: stats.totalUsers || null },
          { tab: "partners", label: "Partners", icon: Building2,   count: null },
        ]
      : []),
    { tab: "parcels",   label: "All Parcels",      icon: Package,         count: stats.totalParcels || null },
    { tab: "manifests", label: "Manifest Stock",   icon: ClipboardList,   count: null },
  ] as const;

  return (
    <div>
      {/* ── Mobile nav: horizontal scrollable pills (top) ─────────────────────── */}
      <div className="md:hidden mb-4 -mx-1 px-1 overflow-x-auto pb-1">
        <div className="flex gap-1.5 w-max">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.tab;
            return (
              <button
                key={item.tab}
                onClick={() => setActiveTab(item.tab)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 ${
                  active
                    ? "bg-slate-900 text-white shadow-md"
                    : "border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {item.label}
                {item.count != null && item.count > 0 && (
                  <span className={`rounded-full px-1.5 py-px text-[10px] font-bold ${active ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"}`}>
                    {item.count.toLocaleString()}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Desktop: content area + right nav sidebar ─────────────────────────── */}
      <div className="flex flex-col md:flex-row gap-6 items-start">

        {/* ── Main content ──────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* OVERVIEW */}
          {activeTab === "overview" && (
            <>
              {/* ---------- Stat cards ---------- */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Users */}
                <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-violet-500/10 via-violet-500/5 to-transparent p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Users</span>
                    <div className="rounded-lg p-2" style={{ backgroundColor: `${METRIC_ACCENT.users}20` }}>
                      <Users className="h-4 w-4" style={{ color: METRIC_ACCENT.users }} />
                    </div>
                  </div>
                  <div className="text-3xl font-bold tracking-tight">{stats.totalUsers}</div>
                  <div className="mt-2 flex items-center gap-1 text-xs">
                    {usersDelta > 0 ? (
                      <TrendingUp className="h-3 w-3 text-emerald-400" />
                    ) : usersDelta < 0 ? (
                      <TrendingDown className="h-3 w-3 text-red-400" />
                    ) : (
                      <Minus className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span className={usersDelta > 0 ? "text-emerald-400" : usersDelta < 0 ? "text-red-400" : "text-muted-foreground"}>
                      {usersDelta > 0 ? "+" : ""}{usersDelta}% vs prior week
                    </span>
                  </div>
                  <div className="absolute bottom-3 right-3 opacity-60">
                    <Sparkline data={usersPerDay14.slice(7)} accent={METRIC_ACCENT.users} />
                  </div>
                </div>

                {/* Parcels */}
                <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Parcels</span>
                    <div className="rounded-lg p-2" style={{ backgroundColor: `${METRIC_ACCENT.parcels}20` }}>
                      <Package className="h-4 w-4" style={{ color: METRIC_ACCENT.parcels }} />
                    </div>
                  </div>
                  <div className="text-3xl font-bold tracking-tight">{stats.totalParcels.toLocaleString()}</div>
                  <div className="mt-2 flex items-center gap-1 text-xs">
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
                      </span>
                      {stats.activeParcels.toLocaleString()} in transit
                    </span>
                  </div>
                  <div className="absolute bottom-3 right-3 opacity-60">
                    <Sparkline data={parcelsPerDay14.slice(7)} accent={METRIC_ACCENT.parcels} />
                  </div>
                </div>

                {/* Invoices */}
                <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-teal-500/10 via-teal-500/5 to-transparent p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Invoices</span>
                    <div className="rounded-lg p-2" style={{ backgroundColor: `${METRIC_ACCENT.invoices}20` }}>
                      <FileText className="h-4 w-4" style={{ color: METRIC_ACCENT.invoices }} />
                    </div>
                  </div>
                  <div className="text-3xl font-bold tracking-tight">{stats.totalInvoices.toLocaleString()}</div>
                  <div className="mt-2 flex items-center gap-1 text-xs">
                    {invoicesDelta > 0 ? (
                      <TrendingUp className="h-3 w-3 text-emerald-400" />
                    ) : invoicesDelta < 0 ? (
                      <TrendingDown className="h-3 w-3 text-red-400" />
                    ) : (
                      <Minus className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span className={invoicesDelta > 0 ? "text-emerald-400" : invoicesDelta < 0 ? "text-red-400" : "text-muted-foreground"}>
                      {invoicesDelta > 0 ? "+" : ""}{invoicesDelta}% vs prior week
                    </span>
                  </div>
                  <div className="absolute bottom-3 right-3 opacity-60">
                    <Sparkline data={invoicesPerDay14.slice(7)} accent={METRIC_ACCENT.invoices} />
                  </div>
                </div>

                {/* Revenue */}
                <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Today's Revenue</span>
                    <div className="rounded-lg p-2" style={{ backgroundColor: `${METRIC_ACCENT.revenue}20` }}>
                      <DollarSign className="h-4 w-4" style={{ color: METRIC_ACCENT.revenue }} />
                    </div>
                  </div>
                  <div className="text-3xl font-bold tracking-tight">${stats.todayRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {stats.pendingQuotes} quote{stats.pendingQuotes !== 1 ? "s" : ""} pending
                  </div>
                </div>
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
              {(() => {
                const actionCards: { tab: string; label: string; description: string; icon: React.ReactNode; gradient: string; iconBg: string; iconColor: string }[] =
                  isAdmin
                    ? [
                        {
                          tab: "parcels",
                          label: "Create / View Parcels",
                          description: "Add new shipments or browse the full parcel list",
                          icon: <Plus className="h-6 w-6" />,
                          gradient: "from-blue-500/15 via-blue-500/5 to-transparent",
                          iconBg: "#3B82F620",
                          iconColor: "#3B82F6",
                        },
                        {
                          tab: "users",
                          label: "Manage Users",
                          description: "View accounts, assign roles, and manage access",
                          icon: <Users className="h-6 w-6" />,
                          gradient: "from-violet-500/15 via-violet-500/5 to-transparent",
                          iconBg: "#8B5CF620",
                          iconColor: "#8B5CF6",
                        },
                        {
                          tab: "manifests",
                          label: "Manifest Stock",
                          description: "Create, lock, and export flight manifests",
                          icon: <ClipboardList className="h-6 w-6" />,
                          gradient: "from-amber-500/15 via-amber-500/5 to-transparent",
                          iconBg: "#F59E0B20",
                          iconColor: "#F59E0B",
                        },
                      ]
                    : role === "staff"
                    ? [
                        {
                          tab: "parcels",
                          label: "View All Parcels",
                          description: "Browse and update every shipment in the system",
                          icon: <Package className="h-6 w-6" />,
                          gradient: "from-blue-500/15 via-blue-500/5 to-transparent",
                          iconBg: "#3B82F620",
                          iconColor: "#3B82F6",
                        },
                        {
                          tab: "requests",
                          label: "Review Requests",
                          description: "Process and approve pending shipment requests",
                          icon: <ClipboardCheck className="h-6 w-6" />,
                          gradient: "from-teal-500/15 via-teal-500/5 to-transparent",
                          iconBg: "#2B8C7E20",
                          iconColor: "#2B8C7E",
                        },
                      ]
                    : [
                        {
                          tab: "parcels",
                          label: "View All Parcels",
                          description: "Browse and update every shipment in the system",
                          icon: <Package className="h-6 w-6" />,
                          gradient: "from-blue-500/15 via-blue-500/5 to-transparent",
                          iconBg: "#3B82F620",
                          iconColor: "#3B82F6",
                        },
                        {
                          tab: "approved",
                          label: "Status / Approved",
                          description: "Track approved parcels and update statuses",
                          icon: <ClipboardCheck className="h-6 w-6" />,
                          gradient: "from-teal-500/15 via-teal-500/5 to-transparent",
                          iconBg: "#2B8C7E20",
                          iconColor: "#2B8C7E",
                        },
                      ];

                return (
                  <div className={`grid grid-cols-1 gap-3 ${actionCards.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
                    {actionCards.map((a) => (
                      <button
                        key={a.tab}
                        onClick={() => setActiveTab(a.tab)}
                        className={`group relative overflow-hidden rounded-xl border bg-gradient-to-br ${a.gradient} p-4 text-left transition-all duration-200 hover:shadow-md hover:scale-[1.02] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                      >
                        <div className="flex items-start gap-4">
                          <div
                            className="shrink-0 rounded-xl p-3 transition-transform duration-200 group-hover:scale-110"
                            style={{ backgroundColor: a.iconBg, color: a.iconColor }}
                          >
                            {a.icon}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm leading-snug">{a.label}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground leading-snug">{a.description}</p>
                          </div>
                        </div>
                        <span className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-40 transition-opacity text-xs" style={{ color: a.iconColor }}>→</span>
                      </button>
                    ))}
                  </div>
                );
              })()}
            </>
          )}

          {activeTab === "requests"  && <AdminRequestsSection />}
          {activeTab === "approved"  && <ApprovedParcelsSection />}
          {activeTab === "users"     && isAdmin && <UserManagement />}
          {activeTab === "partners"  && isAdmin && <PartnerManagement />}
          {activeTab === "parcels"   && <ParcelManagement />}
          {activeTab === "manifests" && <ManifestStock />}
        </div>

        {/* ── Right nav sidebar — desktop only ──────────────────────────────── */}
        <aside className="hidden md:flex flex-col w-52 shrink-0 sticky top-4 self-start">
          <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
            {/* Sidebar header */}
            <div className="px-3 py-3 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Dashboard</p>
              <p className="text-xs font-semibold text-white mt-0.5 capitalize">{role} Panel</p>
            </div>

            {/* Nav items */}
            <nav className="p-1.5 space-y-0.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.tab;
                return (
                  <button
                    key={item.tab}
                    onClick={() => setActiveTab(item.tab)}
                    className={`group w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-left transition-all duration-150 ${
                      active
                        ? "bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-sm"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <div className={`shrink-0 rounded-lg p-1 transition-all ${active ? "bg-white/10" : "group-hover:bg-muted-foreground/10"}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="flex-1 truncate text-xs">{item.label}</span>
                    {item.count != null && item.count > 0 ? (
                      <span className={`text-[10px] font-bold rounded-full px-1.5 py-px shrink-0 ${active ? "bg-white/15 text-white" : "bg-muted text-muted-foreground"}`}>
                        {Number(item.count) > 9999 ? "10k+" : Number(item.count).toLocaleString()}
                      </span>
                    ) : active ? (
                      <ChevronRight className="h-3 w-3 shrink-0 opacity-50" />
                    ) : null}
                  </button>
                );
              })}
            </nav>

            {/* Footer: live indicator */}
            <div className="px-3 py-2.5 border-t bg-muted/30 flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              <span className="text-[10px] text-muted-foreground">Live data</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
