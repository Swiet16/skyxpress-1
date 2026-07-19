import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { AdminDashboard } from "@/components/AdminDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Package, FileText, Shield, User, Send, ArrowRight, Inbox } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserRequestForm } from "@/components/UserRequestForm";
import { UserPaymentInvoice } from "@/components/UserPaymentInvoice";

const Dashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [recentParcels, setRecentParcels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      navigate('/auth');
      return;
    }

    setUser(session.user);
    await fetchUserData(session.user.id);
    setLoading(false);
  };

  const fetchUserData = async (userId: string) => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      setProfile(profileData);

      if (profileData?.role === 'user' || !profileData?.role) {
        const { data: parcelsData } = await supabase
          .from('parcels')
          .select('*')
          .eq('created_by', userId)
          .order('created_at', { ascending: false })
          .limit(5);

        setRecentParcels(parcelsData || []);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="relative h-16 w-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  const isAdminOrStaff = profile?.role === 'admin' || profile?.role === 'staff';

  const statusStyles: Record<string, string> = {
    approved: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
    rejected: "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
    pending: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        {isAdminOrStaff ? (
          <>
            {/* Admin / Staff — Command Center Hero */}
            <section className="relative overflow-hidden border-b border-white/10 bg-[#0a0e17]">
              {/* Glow accents */}
              <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary/30 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
              {/* Grid pattern */}
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.07]"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
                  backgroundSize: "40px 40px",
                }}
              />

              <div className="container relative mx-auto px-4 py-8 sm:py-12 md:py-14">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative shrink-0">
                      <div className="absolute inset-0 animate-pulse rounded-2xl bg-primary/40 blur-md" />
                      <div className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-primary to-primary/70 p-3.5 shadow-lg sm:p-4">
                        {profile?.role === 'admin' ? (
                          <Shield className="h-7 w-7 text-white sm:h-8 sm:w-8" />
                        ) : (
                          <User className="h-7 w-7 text-white sm:h-8 sm:w-8" />
                        )}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                        <span className="text-xs font-medium uppercase tracking-widest text-emerald-400">
                          System Online
                        </span>
                      </div>
                      <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl">
                        {profile?.role === 'admin' ? 'Admin Dashboard' : 'Staff Dashboard'}
                      </h1>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm text-white/60 sm:text-base">
                          Welcome back, <span className="text-white/90">{user?.email}</span>
                        </p>
                        <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/20 px-2.5 py-0.5 text-[11px] font-bold tracking-wider text-primary-foreground">
                          <Shield className="h-3 w-3" />
                          {profile?.role?.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleLogout}
                    variant="outline"
                    className="w-full gap-2 self-start border-white/15 bg-white/5 text-white backdrop-blur hover:bg-white/10 hover:text-white sm:w-auto sm:self-auto"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </Button>
                </div>
              </div>
            </section>

            <section className="bg-muted/20 py-10 sm:py-12 md:py-16">
              <div className="container mx-auto px-4">
                <AdminDashboard user={user} profile={profile} />
              </div>
            </section>
          </>
        ) : (
          <>
            {/* User — Light Hero */}
            <section className="relative overflow-hidden border-b bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.15]"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
                  backgroundSize: "24px 24px",
                }}
              />
              <div className="container relative mx-auto px-4 py-10 sm:py-14 md:py-16">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="shrink-0 rounded-2xl bg-primary p-3.5 shadow-lg shadow-primary/20 sm:p-4">
                      <User className="h-7 w-7 text-primary-foreground sm:h-8 sm:w-8" />
                    </div>
                    <div className="min-w-0">
                      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
                        Your Dashboard
                      </h1>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm text-muted-foreground sm:text-base">
                          Welcome back, {user?.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleLogout}
                    variant="outline"
                    className="w-full gap-2 self-start bg-background/60 backdrop-blur sm:w-auto sm:self-auto"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </Button>
                </div>
              </div>
            </section>

            <section className="py-10 sm:py-12 md:py-16">
              <div className="container mx-auto px-4">
                <div className="mx-auto max-w-6xl space-y-6 sm:space-y-8">
                  {/* Actions */}
                  <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Card className="group relative cursor-pointer overflow-hidden border-primary/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/10">
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                          <CardContent className="relative flex flex-col items-center gap-4 p-6 text-center sm:p-8">
                            <div className="rounded-full bg-primary/10 p-5 transition-transform group-hover:scale-110 sm:p-6">
                              <Send className="h-10 w-10 text-primary sm:h-12 sm:w-12" />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold sm:text-xl">Submit Shipment Request</h3>
                              <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                                Request a new shipment and get it approved by admin
                              </p>
                            </div>
                            <span className="flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                              Get started <ArrowRight className="h-4 w-4" />
                            </span>
                          </CardContent>
                        </Card>
                      </DialogTrigger>
                      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Submit Shipment Request</DialogTitle>
                        </DialogHeader>
                        <UserRequestForm onSuccess={() => {
                          fetchUserData(user.id);
                        }} />
                      </DialogContent>
                    </Dialog>

                    <Card className="group relative cursor-pointer overflow-hidden border-emerald-500/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-500/10">
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                      <CardContent className="relative flex flex-col items-center gap-4 p-6 text-center sm:p-8">
                        <div className="rounded-full bg-emerald-500/10 p-5 transition-transform group-hover:scale-110 sm:p-6">
                          <FileText className="h-10 w-10 text-emerald-600 sm:h-12 sm:w-12" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold sm:text-xl">View My Invoices</h3>
                          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                            Download payment invoices anytime
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Shipment requests */}
                  <Card className="overflow-hidden">
                    <CardHeader className="border-b bg-muted/30">
                      <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                        <Package className="h-5 w-5 text-primary" />
                        Your Shipment Requests
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6">
                      {recentParcels.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-12 text-center">
                          <div className="rounded-full bg-muted p-4">
                            <Inbox className="h-8 w-8 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">No requests yet</p>
                            <p className="text-sm text-muted-foreground">
                              Submit your first shipment request to see it here.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3 sm:space-y-4">
                          {recentParcels.map((parcel) => {
                            const status = parcel.request_status as string | undefined;
                            const statusClass =
                              status && statusStyles[status] ? statusStyles[status] : statusStyles.pending;

                            return (
                              <div
                                key={parcel.id}
                                className="rounded-xl border bg-card p-4 transition-colors hover:bg-muted/30 sm:p-5"
                              >
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                  <div className="min-w-0 space-y-1">
                                    <p className="truncate font-mono text-sm font-semibold text-primary sm:text-base">
                                      {parcel.tracking_id}
                                    </p>
                                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                      <span className="font-medium text-foreground">{parcel.from_country}</span>
                                      <ArrowRight className="h-3.5 w-3.5" />
                                      <span className="font-medium text-foreground">{parcel.to_country}</span>
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      To: <span className="text-foreground">{parcel.receiver_name}</span>
                                    </p>
                                  </div>

                                  <div className="flex flex-row flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                                    <span
                                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusClass}`}
                                    >
                                      {status?.toUpperCase()}
                                    </span>
                                    {status === 'approved' && (
                                      <Badge variant="outline">
                                        {parcel.shipping_status?.replace('_', ' ').toUpperCase()}
                                      </Badge>
                                    )}
                                    {parcel.payment_amount && <UserPaymentInvoice parcel={parcel} />}
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(parcel.created_at).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>

                                {parcel.rejection_reason && (
                                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-500/20 dark:bg-red-500/10">
                                    <p className="text-sm text-red-800 dark:text-red-400">
                                      <strong>Rejection Reason:</strong> {parcel.rejection_reason}
                                    </p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
