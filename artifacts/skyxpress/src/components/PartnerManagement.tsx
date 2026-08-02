// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Building2, Search, RefreshCw, UserPlus, Mail, Phone,
  Calendar, Shield, ShieldOff, Info, User, CreditCard,
  MapPin, FileText, Upload, X, Eye, Edit3, Zap,
  CheckCircle2, AlertCircle, ImageIcon, Trash2, Copy,
} from "lucide-react";

const PROTECTED_EMAIL = "myne7x@gmail.com";
const CNIC_BUCKET = "partner-cnic";

// Branch options for partner assignment
const BRANCH_OPTIONS = [
  "GRT - GUJRAT", "LHE - LAHORE", "KHI - KARACHI", "ISB - ISLAMABAD",
  "MUL - MULTAN", "FSD - FAISALABAD", "PEW - PESHAWAR", "QTA - QUETTA",
  "HYD - HYDERABAD", "SKT - SIALKOT", "UK BRANCH - MCS UK",
  "USA BRANCH - MCS USA", "CANADA - MCS CAN", "SPAIN - MCS ESP",
  "ITALY - MCS ITA", "AUSTRALIA - MCS AUS", "HEAD OFFICE",
];

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  company: string | null;
  phone: string | null;
  role: string | null;
  is_blocked: boolean | null;
  can_manage_users: boolean | null;
  show_partner_page: boolean | null;
  created_at: string;
  email?: string;
}

interface PartnerProfile {
  id?: string;
  user_id: string;
  username?: string | null;
  cnic?: string | null;
  bio?: string | null;
  branch?: string | null;
  cnic_image_url?: string | null;
  status?: "active" | "suspended";
  created_at?: string;
  updated_at?: string;
}

const initials = (name?: string | null) => {
  if (!name) return "?";
  const p = name.trim().split(" ");
  return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

// ── Status badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status?: string }) =>
  status === "suspended" ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 border border-red-500/30 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-400">
      <AlertCircle className="h-2.5 w-2.5" /> Suspended
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
      <CheckCircle2 className="h-2.5 w-2.5" /> Active
    </span>
  );

// ── Skeleton ─────────────────────────────────────────────────────────────────
const Skel = () => (
  <div className="animate-pulse rounded-2xl border border-white/8 bg-white/3 p-5 flex items-start gap-4">
    <div className="h-14 w-14 rounded-full bg-white/8 shrink-0" />
    <div className="flex-1 space-y-2.5">
      <div className="h-3.5 w-1/3 rounded-full bg-white/8" />
      <div className="h-2.5 w-1/2 rounded-full bg-white/6" />
      <div className="h-2.5 w-1/4 rounded-full bg-white/5" />
    </div>
    <div className="h-8 w-24 rounded-xl bg-white/8" />
  </div>
);

// ── Partner Card ──────────────────────────────────────────────────────────────
const PartnerCard = ({
  user, partnerProfile, onView, onSuspend, onActivate, onRemove,
}: {
  user: UserProfile;
  partnerProfile: PartnerProfile | null;
  onView: () => void;
  onSuspend: () => void;
  onActivate: () => void;
  onRemove: () => void;
}) => {
  const isSuspended = partnerProfile?.status === "suspended";
  const branch = partnerProfile?.branch;
  const username = partnerProfile?.username;

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 hover:-translate-y-0.5 ${
        isSuspended
          ? "border-red-500/20 bg-red-500/4"
          : "border-emerald-500/20 bg-emerald-500/4 hover:border-emerald-500/35"
      }`}
    >
      {/* Top gradient bar */}
      <div
        className={`h-0.5 w-full ${
          isSuspended
            ? "bg-gradient-to-r from-red-500 via-orange-500 to-red-600"
            : "bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500"
        }`}
      />

      {/* Glow bg */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: isSuspended
            ? "radial-gradient(ellipse at 30% 0%, rgba(239,68,68,0.06) 0%, transparent 60%)"
            : "radial-gradient(ellipse at 30% 0%, rgba(52,211,153,0.06) 0%, transparent 60%)",
        }}
      />

      <div className="relative p-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div
              className={`absolute -inset-0.5 rounded-full blur-[2px] ${
                isSuspended
                  ? "bg-gradient-to-br from-red-500 to-orange-500"
                  : "bg-gradient-to-br from-emerald-400 to-teal-500"
              }`}
            />
            <div
              className={`relative flex h-14 w-14 items-center justify-center rounded-full text-base font-bold text-white ${
                isSuspended
                  ? "bg-gradient-to-br from-red-600 to-orange-700"
                  : "bg-gradient-to-br from-emerald-600 to-teal-700"
              }`}
            >
              {initials(user.full_name)}
            </div>
            {/* Status dot */}
            <span
              className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-[#0d1117] ${
                isSuspended ? "bg-red-500" : "bg-emerald-400"
              }`}
            >
              {!isSuspended && (
                <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
              )}
            </span>
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-bold text-white text-base truncate">
                {user.full_name || "Unnamed Partner"}
              </span>
              <StatusBadge status={partnerProfile?.status || "active"} />
            </div>

            {username && (
              <div className="flex items-center gap-1.5 text-xs text-white/50 mb-0.5">
                <User className="h-3 w-3 text-white/30" />
                <span className="font-mono">@{username}</span>
              </div>
            )}
            {user.email && user.email !== "N/A" && (
              <div className="flex items-center gap-1.5 text-xs text-white/40">
                <Mail className="h-3 w-3 text-white/25" />
                <span className="truncate">{user.email}</span>
              </div>
            )}
            {user.phone && (
              <div className="flex items-center gap-1.5 text-xs text-white/40">
                <Phone className="h-3 w-3 text-white/25" />
                {user.phone}
              </div>
            )}
            {user.company && (
              <div className="flex items-center gap-1.5 text-xs text-white/40">
                <Building2 className="h-3 w-3 text-white/25" />
                {user.company}
              </div>
            )}
          </div>
        </div>

        {/* Branch + CNIC chips */}
        <div className="mt-3.5 flex flex-wrap gap-2">
          {branch && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-sky-500/10 border border-sky-500/20 px-2.5 py-1 text-[11px] font-semibold text-sky-300">
              <MapPin className="h-3 w-3" /> {branch}
            </span>
          )}
          {partnerProfile?.cnic && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-violet-500/10 border border-violet-500/20 px-2.5 py-1 text-[11px] font-semibold text-violet-300">
              <CreditCard className="h-3 w-3" />
              {partnerProfile.cnic}
            </span>
          )}
          {partnerProfile?.cnic_image_url && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-[11px] font-semibold text-amber-300">
              <ImageIcon className="h-3 w-3" /> CNIC Photo ✓
            </span>
          )}
        </div>

        {/* Bio */}
        {partnerProfile?.bio && (
          <p className="mt-3 text-xs text-white/40 leading-relaxed line-clamp-2 border-t border-white/6 pt-2.5">
            {partnerProfile.bio}
          </p>
        )}

        {/* Actions row */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/6 pt-3.5">
          <Button
            size="sm"
            className="h-7 text-xs bg-white/8 hover:bg-white/15 border border-white/10 text-white gap-1.5"
            onClick={onView}
          >
            <Eye className="h-3 w-3" /> View / Edit
          </Button>

          {isSuspended ? (
            <Button
              size="sm"
              className="h-7 text-xs bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/25 text-emerald-400 gap-1.5"
              onClick={onActivate}
            >
              <Zap className="h-3 w-3" /> Activate
            </Button>
          ) : (
            <Button
              size="sm"
              className="h-7 text-xs bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 gap-1.5"
              onClick={onSuspend}
            >
              <AlertCircle className="h-3 w-3" /> Suspend
            </Button>
          )}

          <Button
            size="sm"
            className="h-7 text-xs bg-white/4 hover:bg-red-500/15 border border-white/8 hover:border-red-500/25 text-white/35 hover:text-red-400 gap-1.5 ml-auto"
            onClick={onRemove}
          >
            <ShieldOff className="h-3 w-3" /> Remove
          </Button>
        </div>
      </div>
    </div>
  );
};

// ── Eligible user row ─────────────────────────────────────────────────────────
const EligibleRow = ({
  user, onAssign,
}: { user: UserProfile; onAssign: () => void }) => (
  <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/3 p-3.5 hover:border-white/15 hover:bg-white/5 transition-all">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/8 text-xs font-bold text-white/60">
      {initials(user.full_name)}
    </div>
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-semibold text-white text-sm truncate">{user.full_name || "Unnamed"}</span>
        <span className="text-[10px] rounded-full bg-white/8 px-2 py-0.5 text-white/40 font-medium uppercase tracking-wide">
          {user.role || "user"}
        </span>
      </div>
      {user.email && user.email !== "N/A" && (
        <span className="text-xs text-white/35 truncate">{user.email}</span>
      )}
    </div>
    <Button
      size="sm"
      className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 gap-1.5"
      onClick={onAssign}
    >
      <UserPlus className="h-3 w-3" /> Assign
    </Button>
  </div>
);

// ── CNIC Image Upload ─────────────────────────────────────────────────────────
const CnicUpload = ({
  userId, currentUrl, onUploaded,
}: { userId: string; currentUrl?: string | null; onUploaded: (url: string) => void }) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image file.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Too large", description: "Max file size is 5MB.", variant: "destructive" });
      return;
    }

    setUploading(true);
    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);

    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/cnic_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(CNIC_BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from(CNIC_BUCKET).getPublicUrl(path);
      const publicUrl = urlData?.publicUrl || "";
      onUploaded(publicUrl);
      toast({ title: "CNIC uploaded ✓", description: "Photo saved to secure storage." });
    } catch (err: any) {
      setPreview(currentUrl || null);
      toast({ title: "Upload failed", description: err.message || "Could not upload image.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs text-white/50 font-semibold uppercase tracking-wider">CNIC Photo</Label>
      {preview ? (
        <div className="relative rounded-xl overflow-hidden border border-white/10 bg-white/5">
          <img src={preview} alt="CNIC" className="w-full h-40 object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end gap-2 p-3">
            <Button
              size="sm"
              className="h-7 text-xs bg-white/20 hover:bg-white/30 text-white border border-white/20 gap-1.5"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="h-3 w-3" />
              {uploading ? "Uploading…" : "Replace"}
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/25 gap-1.5"
              onClick={() => { setPreview(null); onUploaded(""); }}
            >
              <Trash2 className="h-3 w-3" /> Remove
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/15 bg-white/3 hover:border-violet-500/40 hover:bg-violet-500/5 transition-all py-8 text-white/40 hover:text-white/60 disabled:opacity-50"
        >
          {uploading ? (
            <RefreshCw className="h-6 w-6 animate-spin" />
          ) : (
            <ImageIcon className="h-6 w-6" />
          )}
          <span className="text-xs font-medium">{uploading ? "Uploading…" : "Click to upload CNIC photo"}</span>
          <span className="text-[10px] text-white/25">JPG, PNG, WEBP · max 5MB</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
    </div>
  );
};

// ── Partner Edit/View Modal ───────────────────────────────────────────────────
const PartnerModal = ({
  open, onClose, user, partnerProfile, allPartnerProfiles,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  user: UserProfile | null;
  partnerProfile: PartnerProfile | null;
  allPartnerProfiles: PartnerProfile[];
  onSaved: (profile: PartnerProfile) => void;
}) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<PartnerProfile>({
    user_id: user?.user_id || "",
    username: "",
    cnic: "",
    bio: "",
    branch: "",
    cnic_image_url: "",
    status: "active",
  });
  const [showCnicImg, setShowCnicImg] = useState(false);

  useEffect(() => {
    if (user && partnerProfile) {
      setForm({ ...partnerProfile });
    } else if (user) {
      setForm({ user_id: user.user_id, username: "", cnic: "", bio: "", branch: "", cnic_image_url: "", status: "active" });
    }
    setShowCnicImg(false);
  }, [user, partnerProfile, open]);

  const set = (field: keyof PartnerProfile) => (val: string) =>
    setForm((prev) => ({ ...prev, [field]: val }));

  const validateUnique = () => {
    const others = allPartnerProfiles.filter((p) => p.user_id !== user?.user_id);

    if (form.username) {
      const exists = others.find(
        (p) => p.username?.toLowerCase() === form.username?.toLowerCase()
      );
      if (exists) {
        toast({ title: "Username taken", description: `@${form.username} is already used by another partner.`, variant: "destructive" });
        return false;
      }
    }
    if (form.cnic) {
      const exists = others.find(
        (p) => p.cnic?.replace(/[-\s]/g, "") === form.cnic?.replace(/[-\s]/g, "")
      );
      if (exists) {
        toast({ title: "CNIC duplicate", description: "This CNIC is already registered to another partner.", variant: "destructive" });
        return false;
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!user) return;
    if (!validateUnique()) return;

    setSaving(true);
    try {
      const payload: any = {
        user_id: user.user_id,
        username: form.username?.trim() || null,
        cnic: form.cnic?.trim() || null,
        bio: form.bio?.trim() || null,
        branch: form.branch?.trim() || null,
        cnic_image_url: form.cnic_image_url?.trim() || null,
        status: form.status || "active",
        updated_at: new Date().toISOString(),
      };

      let result;
      if (partnerProfile?.id) {
        result = await supabase
          .from("partner_profiles")
          .update(payload)
          .eq("id", partnerProfile.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from("partner_profiles")
          .insert({ ...payload, created_at: new Date().toISOString() })
          .select()
          .single();
      }

      if (result.error) throw result.error;
      toast({ title: "Partner profile saved ✓" });
      onSaved(result.data);
      onClose();
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0d1117] border border-white/10 text-white p-0">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0d1117] border-b border-white/8 px-6 py-4 flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="absolute -inset-0.5 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 blur-[2px]" />
            <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 text-sm font-bold text-white">
              {initials(user.full_name)}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-white text-base truncate">{user.full_name || "Partner"}</h2>
            <p className="text-xs text-white/40 truncate">{user.email}</p>
          </div>
          <StatusBadge status={form.status} />
        </div>

        <div className="p-6 space-y-6">
          {/* Status toggle */}
          <div className="flex items-center justify-between rounded-xl bg-white/4 border border-white/8 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-white">Partner Status</p>
              <p className="text-xs text-white/40 mt-0.5">Suspended partners cannot access the partner portal</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-semibold ${form.status === "suspended" ? "text-red-400" : "text-white/30"}`}>
                Suspended
              </span>
              <Switch
                checked={form.status === "active"}
                onCheckedChange={(v) => setForm((p) => ({ ...p, status: v ? "active" : "suspended" }))}
                className="data-[state=checked]:bg-emerald-500"
              />
              <span className={`text-xs font-semibold ${form.status === "active" ? "text-emerald-400" : "text-white/30"}`}>
                Active
              </span>
            </div>
          </div>

          {/* Basic info grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Username */}
            <div className="space-y-1.5">
              <Label className="text-xs text-white/50 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <User className="h-3 w-3" /> Username <span className="text-violet-400 text-[10px] font-normal normal-case tracking-normal">(unique)</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm font-bold">@</span>
                <Input
                  value={form.username || ""}
                  onChange={(e) => set("username")(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ""))}
                  placeholder="partnerusername"
                  className="pl-7 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-emerald-500/50 h-9"
                  maxLength={40}
                />
              </div>
            </div>

            {/* CNIC */}
            <div className="space-y-1.5">
              <Label className="text-xs text-white/50 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="h-3 w-3" /> CNIC <span className="text-violet-400 text-[10px] font-normal normal-case tracking-normal">(unique)</span>
              </Label>
              <Input
                value={form.cnic || ""}
                onChange={(e) => set("cnic")(e.target.value)}
                placeholder="35202-1234567-1"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-emerald-500/50 h-9 font-mono"
                maxLength={20}
              />
            </div>

            {/* Branch */}
            <div className="space-y-1.5">
              <Label className="text-xs text-white/50 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="h-3 w-3" /> Branch
              </Label>
              <select
                value={form.branch || ""}
                onChange={(e) => set("branch")(e.target.value)}
                className="w-full h-9 rounded-md bg-white/5 border border-white/10 text-white text-sm px-3 focus:border-emerald-500/50 focus:outline-none"
              >
                <option value="" className="bg-[#0d1117]">Select branch…</option>
                {BRANCH_OPTIONS.map((b) => (
                  <option key={b} value={b} className="bg-[#0d1117]">{b}</option>
                ))}
              </select>
            </div>

            {/* Org name */}
            <div className="space-y-1.5">
              <Label className="text-xs text-white/50 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="h-3 w-3" /> Organization Name
              </Label>
              <Input
                value={user.company || ""}
                readOnly
                className="bg-white/3 border-white/6 text-white/50 h-9 cursor-not-allowed"
                placeholder="Set via Partner Management list"
              />
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <Label className="text-xs text-white/50 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="h-3 w-3" /> Bio / Notes
            </Label>
            <Textarea
              value={form.bio || ""}
              onChange={(e) => set("bio")(e.target.value)}
              placeholder="Short bio, region, specialization…"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-emerald-500/50 resize-none min-h-[80px] text-sm"
              maxLength={500}
            />
            <p className="text-[10px] text-white/25 text-right">{(form.bio || "").length}/500</p>
          </div>

          {/* Can manage users */}
          <div className="flex items-center justify-between rounded-xl bg-sky-500/5 border border-sky-500/15 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-sky-300">Can Manage Users</p>
              <p className="text-xs text-white/35 mt-0.5">Grants access to user management section</p>
            </div>
            <Switch
              id={`cmu-modal-${user.user_id}`}
              checked={!!user.can_manage_users}
              onCheckedChange={async (v) => {
                await supabase.from("profiles").update({ can_manage_users: v }).eq("user_id", user.user_id);
              }}
              className="data-[state=checked]:bg-sky-500"
            />
          </div>

          {/* CNIC Photo upload */}
          <CnicUpload
            userId={user.user_id}
            currentUrl={form.cnic_image_url}
            onUploaded={(url) => setForm((p) => ({ ...p, cnic_image_url: url }))}
          />

          {/* CNIC preview toggle */}
          {form.cnic_image_url && (
            <div className="rounded-xl overflow-hidden border border-white/10">
              <button
                type="button"
                onClick={() => setShowCnicImg(!showCnicImg)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-white/4 hover:bg-white/8 text-xs text-white/50 transition"
              >
                <span className="flex items-center gap-2">
                  <ImageIcon className="h-3.5 w-3.5 text-amber-400" />
                  CNIC Photo Preview
                </span>
                <span>{showCnicImg ? "Hide" : "Show"}</span>
              </button>
              {showCnicImg && (
                <img
                  src={form.cnic_image_url}
                  alt="CNIC"
                  className="w-full max-h-52 object-contain bg-black/30"
                />
              )}
            </div>
          )}

          {/* Info / joined */}
          <div className="flex items-center gap-1.5 text-xs text-white/30 pt-1">
            <Calendar className="h-3 w-3" /> Joined {fmt(user.created_at)}
            {partnerProfile?.updated_at && (
              <span className="ml-3">· Updated {fmt(partnerProfile.updated_at)}</span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2 border-t border-white/8">
            <Button
              variant="outline"
              className="flex-1 border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {saving ? "Saving…" : "Save Profile"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
export const PartnerManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [partnerProfiles, setPartnerProfiles] = useState<PartnerProfile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal state
  const [modalUser, setModalUser] = useState<UserProfile | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { toast } = useToast();

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async (quiet = false) => {
    quiet ? setRefreshing(true) : setLoading(true);
    try {
      const [{ data: profilesData }, { data: ppData }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("partner_profiles").select("*"),
      ]);

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
      setPartnerProfiles(ppData || []);
    } catch {
      toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getPartnerProfile = (userId: string) =>
    partnerProfiles.find((p) => p.user_id === userId) || null;

  const setRole = async (user: UserProfile, newRole: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("user_id", user.user_id);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    setUsers((prev) => prev.map((u) => (u.user_id === user.user_id ? { ...u, role: newRole } : u)));
    toast({
      title: newRole === "partner" ? "✓ Partner assigned" : "Role changed",
      description: `${user.full_name || user.email} is now ${newRole}`,
    });
  };

  const toggleStatus = async (user: UserProfile, newStatus: "active" | "suspended") => {
    const pp = getPartnerProfile(user.user_id);
    try {
      let result;
      if (pp?.id) {
        result = await supabase
          .from("partner_profiles")
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq("id", pp.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from("partner_profiles")
          .insert({ user_id: user.user_id, status: newStatus, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .select()
          .single();
      }
      if (result.error) throw result.error;
      setPartnerProfiles((prev) => {
        const others = prev.filter((p) => p.user_id !== user.user_id);
        return [...others, result.data];
      });
      toast({
        title: newStatus === "suspended" ? "Partner suspended" : "Partner activated",
        description: user.full_name || user.email || "",
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const openModal = (user: UserProfile) => {
    setModalUser(user);
    setModalOpen(true);
  };

  const handleProfileSaved = (profile: PartnerProfile) => {
    setPartnerProfiles((prev) => {
      const others = prev.filter((p) => p.user_id !== profile.user_id);
      return [...others, profile];
    });
  };

  // Filtered lists
  const q = search.toLowerCase();
  const matches = (u: UserProfile) => {
    const pp = getPartnerProfile(u.user_id);
    return (
      !q ||
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.company?.toLowerCase().includes(q) ||
      u.phone?.toLowerCase().includes(q) ||
      pp?.username?.toLowerCase().includes(q) ||
      pp?.cnic?.includes(q) ||
      pp?.branch?.toLowerCase().includes(q)
    );
  };

  const partners = users.filter((u) => u.role === "partner" && matches(u));
  const eligible = users.filter(
    (u) => u.role !== "partner" && u.role !== "admin" && !u.is_blocked && matches(u)
  );

  const activeCount = partners.filter((u) => getPartnerProfile(u.user_id)?.status !== "suspended").length;
  const suspendedCount = partners.length - activeCount;

  return (
    <div className="min-h-screen bg-[#0d1117] rounded-2xl">
      {/* Subtle grid texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.015] rounded-2xl"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative p-6 space-y-6">
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-[0_0_20px_rgba(52,211,153,0.4)]">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Partner Management</h2>
              <p className="text-xs text-white/35 mt-0.5">
                {partners.length} partners · {activeCount} active · {suspendedCount} suspended
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAll(true)}
            disabled={refreshing}
            className="border-white/15 bg-white/5 text-white hover:bg-white/10 gap-2"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Partners", val: partners.length, color: "#34d399" },
            { label: "Active", val: activeCount, color: "#34d399" },
            { label: "Suspended", val: suspendedCount, color: "#f87171" },
            { label: "Eligible Users", val: eligible.length, color: "#94a3b8" },
          ].map(({ label, val, color }) => (
            <div
              key={label}
              className="rounded-xl border border-white/8 bg-white/4 p-3.5"
              style={{ boxShadow: `inset 0 0 20px ${color}0d` }}
            >
              <p className="text-2xl font-bold text-white">{val}</p>
              <p className="text-[11px] text-white/40 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Search ── */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <Input
            placeholder="Search name, email, username, CNIC, branch…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-emerald-500/40"
          />
        </div>

        {/* ── Active Partners ── */}
        <section className="space-y-3">
          <div className="flex items-center gap-2.5">
            <h3 className="text-sm font-bold text-white">Active Partners</h3>
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
              {partners.length}
            </Badge>
          </div>

          {loading ? (
            <div className="grid sm:grid-cols-2 gap-3">
              <Skel /><Skel />
            </div>
          ) : partners.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 py-14 text-center">
              <Building2 className="mx-auto h-8 w-8 text-white/12 mb-3" />
              <p className="text-sm text-white/25">No partners yet.</p>
              <p className="text-xs text-white/15 mt-1">Assign the Partner role below.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {partners.map((u) => (
                <PartnerCard
                  key={u.user_id}
                  user={u}
                  partnerProfile={getPartnerProfile(u.user_id)}
                  onView={() => openModal(u)}
                  onSuspend={() => toggleStatus(u, "suspended")}
                  onActivate={() => toggleStatus(u, "active")}
                  onRemove={() => setRole(u, "user")}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── Assign Partner Role ── */}
        <section className="space-y-3">
          <div className="flex items-center gap-2.5">
            <h3 className="text-sm font-bold text-white">Assign Partner Role</h3>
            <Badge variant="outline" className="border-white/15 text-white/40 text-[10px]">
              {eligible.length} eligible
            </Badge>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse h-14 rounded-xl bg-white/3 border border-white/8" />
              ))}
            </div>
          ) : eligible.length === 0 ? (
            <p className="text-sm text-white/25 py-6 text-center">
              {search ? "No users match your search." : "No eligible users found."}
            </p>
          ) : (
            <div className="space-y-2">
              {eligible.map((u) => (
                <EligibleRow
                  key={u.user_id}
                  user={u}
                  onAssign={() => setRole(u, "partner")}
                />
              ))}
            </div>
          )}
        </section>

      </div>

      {/* ── Partner Edit Modal ── */}
      <PartnerModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setModalUser(null); }}
        user={modalUser}
        partnerProfile={modalUser ? getPartnerProfile(modalUser.user_id) : null}
        allPartnerProfiles={partnerProfiles}
        onSaved={handleProfileSaved}
      />
    </div>
  );
};
