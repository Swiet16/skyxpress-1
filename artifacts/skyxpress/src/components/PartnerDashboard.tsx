// @ts-nocheck
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Package, FileText, ClipboardList, Users, Building2,
  Plus, ArrowRight, TrendingUp,
} from "lucide-react";
import { ParcelManagement } from "./ParcelManagement";
import { ManifestStock } from "./ManifestStock";
import { UserManagement } from "./UserManagement";
import { useLiveData } from "@/hooks/useLiveData";

interface PartnerDashboardProps {
  user: any;       // supabase auth user
  profile: any;    // profiles row
}

export const PartnerDashboard = ({ user, profile }: PartnerDashboardProps) => {
  const [activeTab, setActiveTab] = useState("parcels");

  const canManageUsers = !!profile?.can_manage_users;
  const orgName = profile?.company || "Your Organization";

  // Fetch only this partner's parcels for overview stats
  const { data: myParcels } = useLiveData<any>({
    table: "parcels",
    filter: { column: "created_by", value: user?.id },
    orderBy: { column: "created_at", ascending: false },
  });

  const { data: myInvoices } = useLiveData<any>({
    table: "invoices",
    filter: { column: "user_id", value: user?.id },
    orderBy: { column: "created_at", ascending: false },
  });

  const activeParcels = myParcels.filter(
    (p) => !["delivered", "cancelled"].includes(p.current_status),
  );

  const totalRevenue = myInvoices.reduce(
    (sum, inv) => sum + (inv.final_amount || inv.total_amount || 0),
    0,
  );

  return (
    <div className="space-y-6">
      {/* Identity banner */}
      <div className="flex items-center gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/8 px-5 py-3">
        <Building2 className="h-5 w-5 text-emerald-400 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-emerald-300 truncate">{orgName}</p>
          <p className="text-xs text-emerald-400/60">
            Partner account — you can only view and create your own parcels, manifests, and invoices.
          </p>
        </div>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card
          className="cursor-pointer hover:-translate-y-0.5 transition-transform"
          onClick={() => setActiveTab("parcels")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Parcels</CardTitle>
            <Package className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myParcels.length}</div>
            <p className="text-xs text-muted-foreground">{activeParcels.length} active</p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:-translate-y-0.5 transition-transform"
          onClick={() => setActiveTab("manifests")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Manifests</CardTitle>
            <ClipboardList className="h-4 w-4 text-sky-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <p className="text-xs text-muted-foreground">View in Manifests tab</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{myInvoices.length} invoice{myInvoices.length !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="parcels" className="gap-1.5">
            <Package className="h-3.5 w-3.5" />
            My Parcels
          </TabsTrigger>
          <TabsTrigger value="manifests" className="gap-1.5">
            <ClipboardList className="h-3.5 w-3.5" />
            My Manifests
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            My Invoices
          </TabsTrigger>
          {canManageUsers && (
            <TabsTrigger value="users" className="gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Users
            </TabsTrigger>
          )}
        </TabsList>

        {/* My Parcels — filtered to this partner only */}
        <TabsContent value="parcels">
          <ParcelManagement filterUserId={user?.id} />
        </TabsContent>

        {/* My Manifests — filtered to this partner's email */}
        <TabsContent value="manifests">
          <ManifestStock filterEmail={user?.email} />
        </TabsContent>

        {/* My Invoices */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-emerald-500" />
                My Invoices
              </CardTitle>
            </CardHeader>
            <CardContent>
              {myInvoices.length === 0 ? (
                <div className="py-12 text-center">
                  <FileText className="mx-auto h-8 w-8 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No invoices yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground text-xs">
                        <th className="pb-2 pr-4 font-medium">Invoice #</th>
                        <th className="pb-2 pr-4 font-medium">Customer</th>
                        <th className="pb-2 pr-4 font-medium">Amount</th>
                        <th className="pb-2 pr-4 font-medium">Status</th>
                        <th className="pb-2 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {myInvoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-muted/30">
                          <td className="py-2.5 pr-4 font-mono text-xs text-primary">
                            {inv.invoice_number}
                          </td>
                          <td className="py-2.5 pr-4">{inv.customer_name}</td>
                          <td className="py-2.5 pr-4 font-semibold">
                            {inv.currency} {(inv.final_amount || inv.total_amount || 0).toFixed(2)}
                          </td>
                          <td className="py-2.5 pr-4">
                            <Badge
                              variant="outline"
                              className={
                                inv.payment_status === "paid"
                                  ? "border-emerald-500/30 text-emerald-500"
                                  : "border-amber-500/30 text-amber-500"
                              }
                            >
                              {inv.payment_status || "pending"}
                            </Badge>
                          </td>
                          <td className="py-2.5 text-muted-foreground text-xs">
                            {new Date(inv.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Management — only if can_manage_users */}
        {canManageUsers && (
          <TabsContent value="users">
            <UserManagement />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};
