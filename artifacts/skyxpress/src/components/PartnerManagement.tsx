// @ts-nocheck
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Building2, Search, RefreshCw, UserPlus, Mail, Phone,
  Calendar, Users, Shield, ShieldOff, Info,
} from "lucide-react";

const PROTECTED_EMAIL = "myne7x@gmail.com";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  company: string | null;
  phone: string | null;
  role: string | null;
  is_blocked: boolean | null;
  can_manage_users: boolean | null;
  created_at: string;
  email?: string;
}

/* ── tiny helpers ─────────────────────────────────────── */
const initials = (name?: string | null) => {
  if (!name) return "?";
  const p = name.trim().split(" ");
  return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

/* ── partner card ─────────────────────────────────────── */
const PartnerCard = ({
  user, isPartner, orgEdit, setOrgEdit,
  onRoleChange, onOrgSave, onToggleCMU,
}: any) => {
  const orgVal = orgEdit[user.user_id] !== undefined ? orgEdit[user.user_id] : (user.company || "");
  const orgDirty = orgVal !== (user.company || "");

  return (
    <div
      className={`rounded-xl border p-4 transition-all duration-200 ${
        isPartner
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-white/8 bg-white/3 hover:border-white/15"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Avatar + info */}
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
              isPartner
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-white/8 text-white/50"
            }`}
          >
            {initials(user.full_name)}
          </div>
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-white truncate">
                {user.full_name || "Unnamed User"}
              </span>
              {isPartner && (
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
                  Partner
                </Badge>
              )}
              {user.can_manage_users && isPartner && (
                <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/30 text-[10px]">
                  User Mgmt
                </Badge>
              )}
            </div>
            {user.email && user.email !== "N/A" && (
              <div className="flex items-center gap-1.5 text-xs text-white/45">
                <Mail className="h-3 w-3 shrink-0 text-white/25" />
                <span className="truncate">{user.email}</span>
              </div>
            )}
            {user.phone && (
              <div className="flex items-center gap-1.5 text-xs text-white/45">
                <Phone className="h-3 w-3 shrink-0 text-white/25" />
                {user.phone}
              </div>
            )}
            {user.company && !isPartner && (
              <div className="flex items-center gap-1.5 text-xs text-white/35">
                <Building2 className="h-3 w-3 shrink-0 text-white/20" />
                {user.company}
              </div>
            )}
            <div className="flex items-center gap-1.5 text-xs text-white/30">
              <Calendar className="h-3 w-3 shrink-0 text-white/20" />
              Joined {fmt(user.created_at)}
            </div>
          </div>
        </div>

        {/* Right-side controls */}
        <div className="flex flex-col gap-2.5 sm:items-end shrink-0">
          {isPartner ? (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
              onClick={() => onRoleChange(user, "user")}
            >
              <ShieldOff className="h-3.5 w-3.5 mr-1" />
              Remove Partner
            </Button>
          ) : (
            <Button
              size="sm"
              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => onRoleChange(user, "partner")}
            >
              <UserPlus className="h-3.5 w-3.5 mr-1" />
              Assign Partner
            </Button>
          )}

          {isPartner && (
            <div className="flex items-center gap-2">
              <Switch
                id={`cmu-${user.user_id}`}
                checked={!!user.can_manage_users}
                onCheckedChange={() => onToggleCMU(user)}
              />
              <Label
                htmlFor={`cmu-${user.user_id}`}
                className="text-xs text-white/50 cursor-pointer"
              >
                Can manage users
              </Label>
            </div>
          )}
        </div>
      </div>

      {/* Org name editor — only for partners */}
      {isPartner && (
        <div className="mt-4 pt-3 border-t border-white/8">
          <Label className="text-xs text-white/40 mb-1.5 block">
            Organization Name (shown on parcels & airway bills)
          </Label>
          <div className="flex gap-2">
            <Input
              value={orgVal}
              onChange={(e) =>
                setOrgEdit((prev: any) => ({ ...prev, [user.user_id]: e.target.value }))
              }
              placeholder="e.g. Acme Logistics Ltd."
              className="h-8 text-sm bg-white/5 border-white/10 text-white placeholder:text-white/25"
            />
            <Button
              size="sm"
              className="h-8 text-xs shrink-0"
              onClick={() => onOrgSave(user, orgVal)}
              disabled={!orgDirty}
            >
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── skeleton ─────────────────────────────────────────── */
const Skel = () => (
  <div className="animate-pulse rounded-xl border border-white/8 bg-white/3 p-4 flex items-start gap-3">
    <div className="h-10 w-10 rounded-full bg-white/8 shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="h-3 w-1/3 rounded-full bg-white/8" />
      <div className="h-2.5 w-1/2 rounded-full bg-white/6" />
    </div>
    <div className="h-7 w-28 rounded-lg bg-white/8" />
  </div>
);

/* ── main component ────────────────────────────────────── */
export const PartnerManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orgEdit, setOrgEdit] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async (quiet = false) => {
    quiet ? setRefreshing(true) : setLoading(true);
    try {
      const { data: profilesData, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      let authUsers: any[] = [];
      try {
        const { data: { users: au } } = await supabase.auth.admin.listUsers();
        if (au) authUsers = au;
      } catch (_) {}

      const merged = (profilesData || [])
        .filter((p) => authUsers.find((u) => u.id === p.user_id)?.email?.toLowerCase() !== PROTECTED_EMAIL)
        .map((p) => ({
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

  const setRole = async (user: UserProfile, newRole: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("user_id", user.user_id);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    setUsers((prev) => prev.map((u) => (u.user_id === user.user_id ? { ...u, role: newRole } : u)));
    toast({
      title: newRole === "partner" ? "Partner assigned" : "Role changed",
      description: `${user.full_name || user.email} is now ${newRole}`,
    });
  };

  const saveOrgName = async (user: UserProfile, orgName: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ company: orgName })
      .eq("user_id", user.user_id);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    setUsers((prev) => prev.map((u) => (u.user_id === user.user_id ? { ...u, company: orgName } : u)));
    setOrgEdit((prev) => { const n = { ...prev }; delete n[user.user_id]; return n; });
    toast({ title: "Organization saved", description: orgName });
  };

  const toggleCMU = async (user: UserProfile) => {
    const newVal = !user.can_manage_users;
    const { error } = await supabase
      .from("profiles")
      .update({ can_manage_users: newVal })
      .eq("user_id", user.user_id);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    setUsers((prev) => prev.map((u) => (u.user_id === user.user_id ? { ...u, can_manage_users: newVal } : u)));
    toast({
      title: newVal ? "User management enabled" : "User management disabled",
      description: user.full_name || user.email || "",
    });
  };

  const q = search.toLowerCase();
  const matches = (u: UserProfile) =>
    !q ||
    u.full_name?.toLowerCase().includes(q) ||
    u.email?.toLowerCase().includes(q) ||
    u.company?.toLowerCase().includes(q) ||
    u.phone?.toLowerCase().includes(q);

  const partners = users.filter((u) => u.role === "partner" && matches(u));
  const eligible = users.filter(
    (u) => u.role !== "partner" && u.role !== "admin" && !u.is_blocked && matches(u),
  );

  return (
    <div className="min-h-screen rounded-2xl bg-[#0d1117] p-6">
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Building2 className="h-5 w-5 text-emerald-400" />
            Partner Management
          </h2>
          <p className="text-sm text-white/40 mt-0.5">
            Assign partner roles, set organization names, and control dashboard access.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchUsers(true)}
          disabled={refreshing}
          className="border-white/15 bg-white/5 text-white hover:bg-white/10"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* SQL note */}
      <div className="rounded-lg border border-amber-500/25 bg-amber-500/8 px-4 py-3 flex gap-3">
        <Info className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-300/80 leading-relaxed font-mono space-y-1">
          <span className="font-bold text-amber-300 not-italic">Run these once in Supabase → SQL Editor:</span>
          <br />
          <span className="block mt-1">
            {"-- 1. Nullify any rows with an unrecognised role (keeps data safe)"}
            <br />
            {"UPDATE profiles SET role = 'user'"}
            <br />
            {"  WHERE role NOT IN ('user','staff','admin','developer','partner');"}
            <br /><br />
            {"-- 2. Replace the role check constraint"}
            <br />
            {"ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;"}
            <br />
            {"ALTER TABLE profiles ADD CONSTRAINT profiles_role_check"}
            <br />
            {"  CHECK (role IN ('user','staff','admin','developer','partner'));"}
            <br /><br />
            {"-- 3. Add can_manage_users column"}
            <br />
            {"ALTER TABLE profiles ADD COLUMN IF NOT EXISTS can_manage_users boolean DEFAULT false;"}
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
        <Input
          placeholder="Search name, email, or organization..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/25"
        />
      </div>

      {/* Active Partners */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-white">Active Partners</h3>
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
            {users.filter((u) => u.role === "partner").length}
          </Badge>
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skel /><Skel />
          </div>
        ) : partners.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 py-12 text-center">
            <Building2 className="mx-auto h-8 w-8 text-white/15 mb-3" />
            <p className="text-sm text-white/30">No partners yet.</p>
            <p className="text-xs text-white/20 mt-1">Assign the Partner role from the section below.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {partners.map((u) => (
              <PartnerCard
                key={u.user_id}
                user={u}
                isPartner={true}
                orgEdit={orgEdit}
                setOrgEdit={setOrgEdit}
                onRoleChange={setRole}
                onOrgSave={saveOrgName}
                onToggleCMU={toggleCMU}
              />
            ))}
          </div>
        )}
      </div>

      {/* Eligible users */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-white">Assign Partner Role</h3>
          <Badge variant="outline" className="border-white/15 text-white/40">
            {users.filter((u) => u.role !== "partner" && u.role !== "admin" && !u.is_blocked).length}{" "}
            eligible
          </Badge>
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skel /><Skel /><Skel />
          </div>
        ) : eligible.length === 0 ? (
          <p className="text-sm text-white/30 py-6 text-center">
            {search ? "No users match your search." : "No eligible users found."}
          </p>
        ) : (
          <div className="space-y-3">
            {eligible.map((u) => (
              <PartnerCard
                key={u.user_id}
                user={u}
                isPartner={false}
                orgEdit={orgEdit}
                setOrgEdit={setOrgEdit}
                onRoleChange={setRole}
                onOrgSave={saveOrgName}
                onToggleCMU={toggleCMU}
              />
            ))}
          </div>
        )}
      </div>
    </div>
    </div>
  );
};
