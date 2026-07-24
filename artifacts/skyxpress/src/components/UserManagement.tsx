// @ts-nocheck
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Shield,
  ShieldCheck,
  Briefcase,
  User,
  UserX,
  UserCheck,
  Crown,
  Lock,
  Users,
  Ban,
  RefreshCw,
  Mail,
  Phone,
  Building2,
  Calendar,
} from "lucide-react";

/* ─── types ──────────────────────────────────────────────── */
interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  company: string;
  phone: string;
  role: string;
  is_blocked: boolean;
  is_owner?: boolean;
  created_at: string;
  email?: string;
}

/* ─── protected account ──────────────────────────────────── */
const PROTECTED_EMAIL = "myne7x@gmail.com";
const isProtectedProfile = (u: UserProfile) =>
  u.is_owner === true || u.email?.toLowerCase() === PROTECTED_EMAIL;

/* ─── role config ────────────────────────────────────────── */
const ROLE_CFG = {
  admin: {
    label: "Admin",
    icon: ShieldCheck,
    ring: "from-violet-500 via-fuchsia-500 to-pink-500",
    badge: "bg-violet-500/20 text-violet-300 border border-violet-500/30",
    avatar: "from-violet-600 to-fuchsia-600",
    glow: "shadow-[0_0_18px_rgba(168,85,247,0.35)]",
  },
  staff: {
    label: "Staff",
    icon: Briefcase,
    ring: "from-sky-400 via-blue-500 to-indigo-500",
    badge: "bg-sky-500/20 text-sky-300 border border-sky-500/30",
    avatar: "from-sky-500 to-blue-600",
    glow: "shadow-[0_0_18px_rgba(56,189,248,0.3)]",
  },
  user: {
    label: "User",
    icon: User,
    ring: "from-slate-500 via-slate-400 to-slate-500",
    badge: "bg-slate-500/15 text-slate-300 border border-slate-500/25",
    avatar: "from-slate-500 to-slate-600",
    glow: "",
  },
  developer: {
    label: "Developer",
    icon: Crown,
    ring: "from-amber-400 via-yellow-400 to-amber-500",
    badge: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
    avatar: "from-amber-400 to-yellow-500",
    glow: "shadow-[0_0_20px_rgba(245,158,11,0.4)]",
  },
} as const;

const getRoleCfg = (role: string, isDev: boolean) => {
  if (isDev) return ROLE_CFG.developer;
  return ROLE_CFG[role as keyof typeof ROLE_CFG] || ROLE_CFG.user;
};

/* ─── avatar initials ─────────────────────────────────────── */
const initials = (name?: string) => {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  return parts.length === 1
    ? parts[0][0].toUpperCase()
    : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/* ─── stat tile ───────────────────────────────────────────── */
const StatTile = ({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: any;
  color: string;
}) => (
  <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-white/4 p-4 backdrop-blur-sm">
    <div
      className="absolute inset-0 opacity-10"
      style={{
        background: `radial-gradient(ellipse at 20% 50%, ${color} 0%, transparent 70%)`,
      }}
    />
    <div className="relative flex items-center gap-3">
      <div
        className="flex h-9 w-9 items-center justify-center rounded-xl"
        style={{ background: `${color}22`, border: `1px solid ${color}44` }}
      >
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-white/40">{label}</p>
      </div>
    </div>
  </div>
);

/* ─── filter pill ─────────────────────────────────────────── */
const FilterPill = ({
  label,
  active,
  onClick,
  count,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  count: number;
}) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
      active
        ? "bg-white text-[#0a0e17] shadow-lg"
        : "border border-white/10 bg-white/5 text-white/50 hover:border-white/20 hover:bg-white/10 hover:text-white/80"
    }`}
  >
    {label}
    <span
      className={`rounded-full px-1.5 py-0.5 text-xs ${
        active ? "bg-black/15 text-[#0a0e17]" : "bg-white/10 text-white/40"
      }`}
    >
      {count}
    </span>
  </button>
);

/* ─── user card ───────────────────────────────────────────── */
const UserCard = ({
  user,
  isSelf,
  onRoleChange,
  onToggleBlock,
}: {
  user: UserProfile;
  isSelf: boolean;
  onRoleChange: (user: UserProfile, role: string) => void;
  onToggleBlock: (user: UserProfile) => void;
}) => {
  const isDev = isProtectedProfile(user);
  const cfg = getRoleCfg(user.role, isDev);
  const RoleIcon = cfg.icon;
  const joined = new Date(user.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-white/8 bg-white/4 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/6 ${cfg.glow}`}
    >
      {/* Top accent strip */}
      <div className={`h-0.5 w-full bg-gradient-to-r ${cfg.ring}`} />

      {/* Subtle radial glow inside card */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.03) 0%, transparent 60%)",
        }}
      />

      <div className="flex flex-1 flex-col gap-4 p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          {/* Avatar */}
          <div className="relative shrink-0">
            {/* Rotating gradient ring */}
            <div
              className={`absolute -inset-0.5 rounded-full bg-gradient-to-br ${cfg.ring} opacity-80 blur-[1px]`}
            />
            <div
              className={`relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${cfg.avatar} text-sm font-bold text-white shadow-md`}
            >
              {initials(user.full_name)}
            </div>
            {/* Online dot */}
            <span
              className={`absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-[#0d1117] ${
                user.is_blocked ? "bg-red-500" : "bg-emerald-400"
              }`}
            >
              {!user.is_blocked && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              )}
            </span>
          </div>

          {/* Name + badges */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="truncate font-semibold text-white">
                {user.full_name || "Unknown"}
              </span>
              {isDev && (
                <Crown className="h-3.5 w-3.5 shrink-0 text-amber-400" style={{ animation: "crownFloat 2.2s ease-in-out infinite" }} />
              )}
              {isSelf && (
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-white/50">
                  you
                </span>
              )}
            </div>
            <div className="mt-0.5 truncate text-xs text-white/40">
              {user.company || "No company"}
            </div>
          </div>

          {/* Role badge */}
          <div
            className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${cfg.badge}`}
            style={isDev ? { animation: "devGlow 2.4s ease-in-out infinite" } : undefined}
          >
            <RoleIcon className="h-3 w-3" />
            {isDev ? "Dev" : cfg.label}
            {isDev && <Lock className="h-2.5 w-2.5 opacity-70" />}
          </div>
        </div>

        {/* Info rows */}
        <div className="space-y-1.5">
          {user.email && user.email !== "N/A" && (
            <div className="flex items-center gap-2 text-xs text-white/45">
              <Mail className="h-3 w-3 shrink-0 text-white/25" />
              <span className="truncate">{user.email}</span>
            </div>
          )}
          {user.phone && (
            <div className="flex items-center gap-2 text-xs text-white/45">
              <Phone className="h-3 w-3 shrink-0 text-white/25" />
              <span>{user.phone}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-white/35">
            <Calendar className="h-3 w-3 shrink-0 text-white/20" />
            <span>Joined {joined}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-white/6" />

        {/* Status chip + actions */}
        <div className="flex items-center justify-between gap-2">
          {/* Status */}
          <span
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
              user.is_blocked
                ? "bg-red-500/15 text-red-400 border border-red-500/25"
                : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
            }`}
          >
            {user.is_blocked ? (
              <><UserX className="h-3 w-3" />Blocked</>
            ) : (
              <><UserCheck className="h-3 w-3" />Active</>
            )}
          </span>

          {/* Actions */}
          {isDev ? (
            <span className="flex items-center gap-1 text-xs text-white/25">
              <Lock className="h-3 w-3" /> Protected
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <Select
                value={user.role}
                onValueChange={(r) => onRoleChange(user, r)}
                disabled={isSelf}
              >
                <SelectTrigger className="h-7 w-20 rounded-lg border-white/10 bg-white/6 text-xs text-white focus:ring-1 focus:ring-white/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#141922] text-white">
                  <SelectItem value="user" className="text-xs focus:bg-white/10">User</SelectItem>
                  <SelectItem value="staff" className="text-xs focus:bg-white/10">Staff</SelectItem>
                  <SelectItem value="admin" className="text-xs focus:bg-white/10">Admin</SelectItem>
                </SelectContent>
              </Select>

              <button
                onClick={() => onToggleBlock(user)}
                disabled={isSelf && !user.is_blocked}
                title={user.is_blocked ? "Unblock user" : "Block user"}
                className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-30 ${
                  user.is_blocked
                    ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
                    : "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                }`}
              >
                {user.is_blocked ? (
                  <UserCheck className="h-3.5 w-3.5" />
                ) : (
                  <Ban className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── loading skeleton ────────────────────────────────────── */
const CardSkeleton = () => (
  <div className="animate-pulse rounded-2xl border border-white/8 bg-white/4 p-5">
    <div className="mb-4 flex items-start gap-3">
      <div className="h-12 w-12 rounded-full bg-white/10" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-3/5 rounded-full bg-white/10" />
        <div className="h-2.5 w-2/5 rounded-full bg-white/6" />
      </div>
      <div className="h-6 w-14 rounded-full bg-white/8" />
    </div>
    <div className="mb-4 space-y-2">
      <div className="h-2.5 w-full rounded-full bg-white/6" />
      <div className="h-2.5 w-4/5 rounded-full bg-white/6" />
    </div>
    <div className="h-px bg-white/6" />
    <div className="mt-4 flex items-center justify-between">
      <div className="h-6 w-16 rounded-full bg-white/8" />
      <div className="h-6 w-28 rounded-full bg-white/8" />
    </div>
  </div>
);

/* ─── main component ──────────────────────────────────────── */
type RoleFilter = "all" | "admin" | "staff" | "user";

export const UserManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUser(user));
    fetchUsers();
  }, []);

  const fetchUsers = async (quiet = false) => {
    if (!quiet) setLoading(true);
    else setRefreshing(true);

    try {
      const { data: profilesData, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      let authUsers: any[] = [];
      try {
        const { data: { users: au }, error: ae } = await supabase.auth.admin.listUsers();
        if (!ae && au) authUsers = au;
      } catch (_) {}

      const merged = (profilesData || []).map((p) => ({
        ...p,
        email: authUsers.find((u) => u.id === p.user_id)?.email || "N/A",
      }));
      setUsers(merged);
    } catch {
      toast({ title: "Error", description: "Failed to load users", variant: "destructive" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateUserRole = async (user: UserProfile, newRole: string) => {
    if (isProtectedProfile(user)) return toastProtected();
    const { error } = await supabase.from("profiles").update({ role: newRole }).eq("user_id", user.user_id);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    setUsers((prev) => prev.map((u) => (u.user_id === user.user_id ? { ...u, role: newRole } : u)));
    toast({ title: "Role updated", description: `${user.full_name} → ${newRole}` });
  };

  const toggleUserBlock = async (user: UserProfile) => {
    if (isProtectedProfile(user)) return toastProtected();
    const { error } = await supabase.from("profiles").update({ is_blocked: !user.is_blocked }).eq("user_id", user.user_id);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    setUsers((prev) => prev.map((u) => (u.user_id === user.user_id ? { ...u, is_blocked: !u.is_blocked } : u)));
    toast({ title: user.is_blocked ? "User unblocked" : "User blocked", description: user.full_name });
  };

  const toastProtected = () =>
    toast({ title: "Protected account", description: "This account is locked and can't be modified.", variant: "destructive" });

  /* derived */
  const counts = useMemo(() => ({
    all: users.length,
    admin: users.filter((u) => u.role === "admin" && !isProtectedProfile(u)).length,
    staff: users.filter((u) => u.role === "staff").length,
    user: users.filter((u) => u.role === "user").length,
    blocked: users.filter((u) => u.is_blocked).length,
  }), [users]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter((u) => {
      const matchSearch =
        !q ||
        u.full_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q) ||
        u.company?.toLowerCase().includes(q);
      const matchRole =
        roleFilter === "all" || u.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, search, roleFilter]);

  /* ── render ── */
  return (
    <div className="min-h-screen rounded-2xl bg-[#0d1117] p-6">
      {/* Subtle grid texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.018] rounded-2xl"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative mx-auto max-w-7xl space-y-7">
        {/* ── Header ── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-[0_0_16px_rgba(168,85,247,0.45)]">
                <Users className="h-4 w-4 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">User Management</h2>
            </div>
            <p className="mt-1 pl-[52px] text-sm text-white/35">
              {users.length} total accounts · {counts.blocked} blocked
            </p>
          </div>

          <button
            onClick={() => fetchUsers(true)}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60 transition hover:bg-white/10 hover:text-white/90 disabled:opacity-40"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* ── Stat tiles ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Total Users" value={counts.all} icon={Users} color="#a855f7" />
          <StatTile label="Admins" value={counts.admin} icon={ShieldCheck} color="#e879f9" />
          <StatTile label="Staff" value={counts.staff} icon={Briefcase} color="#38bdf8" />
          <StatTile label="Blocked" value={counts.blocked} icon={Ban} color="#f87171" />
        </div>

        {/* ── Search + filter bar ── */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, phone…"
              className="h-9 w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-3 text-sm text-white placeholder-white/25 outline-none transition focus:border-white/25 focus:bg-white/8 focus:ring-1 focus:ring-white/10"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(["all", "admin", "staff", "user"] as RoleFilter[]).map((r) => (
              <FilterPill
                key={r}
                label={r === "all" ? "All" : r.charAt(0).toUpperCase() + r.slice(1)}
                active={roleFilter === r}
                onClick={() => setRoleFilter(r)}
                count={r === "all" ? counts.all : counts[r as keyof typeof counts] as number}
              />
            ))}
          </div>
        </div>

        {/* ── Grid ── */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-white/30">
            <Users className="h-10 w-10" />
            <p className="text-sm">No users match your filters</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((user) => (
              <UserCard
                key={user.user_id}
                user={user}
                isSelf={currentUser?.id === user.user_id}
                onRoleChange={updateUserRole}
                onToggleBlock={toggleUserBlock}
              />
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes crownFloat {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50%       { transform: translateY(-2px) rotate(-5deg); }
        }
        @keyframes devGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245,158,11,0.45); }
          50%       { box-shadow: 0 0 0 5px rgba(245,158,11,0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-ping, [style*="crownFloat"], [style*="devGlow"] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
};
