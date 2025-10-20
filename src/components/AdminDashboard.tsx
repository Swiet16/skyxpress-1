import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Users, Package, FileText, Settings, Plus, Search, Shield, UserX, UserCheck } from "lucide-react";
import { UserManagement } from "./UserManagement";
import { ParcelManagement } from "./ParcelManagement";
import { QuoteManagement } from "./QuoteManagement";
import { PricingManager } from "./PricingManager";
import { InvoiceManager } from "./InvoiceManager";
import { InvoiceCreator } from "./InvoiceCreator";
import { AdminRequestsSection } from "./AdminRequestsSection";
import { ApprovedParcelsSection } from "./ApprovedParcelsSection";
import { useLiveData } from "@/hooks/useLiveData";

interface AdminDashboardProps {
  user: any;
  profile: any;
}

interface DashboardStats {
  totalUsers: number;
  totalParcels: number;
  activeParcels: number;
  totalInvoices: number;
  pendingQuotes: number;
  todayRevenue: number;
}

export const AdminDashboard = ({ user, profile }: AdminDashboardProps) => {
  const { data: users } = useLiveData<any>({ 
    table: 'profiles',
    orderBy: { column: 'created_at', ascending: false }
  });
  
  const { data: parcels } = useLiveData<any>({ 
    table: 'parcels',
    orderBy: { column: 'created_at', ascending: false }
  });
  
  const { data: invoices } = useLiveData<any>({ 
    table: 'invoices',
    orderBy: { column: 'created_at', ascending: false }
  });
  
  const { data: quotes } = useLiveData<any>({ 
    table: 'quotes',
    orderBy: { column: 'created_at', ascending: false }
  });

  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Calculate stats from live data
  const stats = {
    totalUsers: users.length,
    totalParcels: parcels.length,
    activeParcels: parcels.filter(p => !['delivered', 'cancelled'].includes(p.current_status)).length,
    totalInvoices: invoices.length,
    pendingQuotes: quotes.filter(q => q.status === 'pending').length,
    todayRevenue: invoices
      .filter(inv => new Date(inv.created_at).toDateString() === new Date().toDateString())
      .reduce((sum, inv) => sum + (inv.final_amount || 0), 0),
  };

  const isAdmin = profile?.role === 'admin';

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground">
            {isAdmin ? 'Admin Dashboard' : 'Staff Dashboard'}
          </h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.email}
            <Badge variant="secondary" className="ml-2">
              <Shield className="w-3 h-3 mr-1" />
              {profile?.role?.toUpperCase()}
            </Badge>
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full h-auto flex-wrap md:grid md:grid-cols-9 gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          {isAdmin && <TabsTrigger value="users">Users</TabsTrigger>}
          <TabsTrigger value="parcels">All Parcels</TabsTrigger>
          <TabsTrigger value="quotes">Quotes</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="create-invoice">Create Invoice</TabsTrigger>
          <TabsTrigger value="rates">Rates</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
                <p className="text-xs text-muted-foreground">Registered users</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Parcels</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalParcels}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.activeParcels} active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalInvoices}</div>
                <p className="text-xs text-muted-foreground">Generated invoices</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${stats.todayRevenue.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">{stats.pendingQuotes} pending quotes</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button className="h-16 flex-col gap-2">
                  <Plus className="h-6 w-6" />
                  Create New Parcel
                </Button>
                <Button variant="outline" className="h-16 flex-col gap-2">
                  <Users className="h-6 w-6" />
                  Manage Users
                </Button>
                <Button variant="outline" className="h-16 flex-col gap-2">
                  <Settings className="h-6 w-6" />
                  Update Rates
                </Button>
              </div>
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

        <TabsContent value="rates">
          <PricingManager />
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Company Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Company settings management will be implemented here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};