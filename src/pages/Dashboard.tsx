import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { AdminDashboard } from "@/components/AdminDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Package, FileText, Shield, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserRequestForm } from "@/components/UserRequestForm";
import { Download, Send } from "lucide-react";
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
      // Fetch user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      setProfile(profileData);

      // Fetch recent parcels for regular users (not admin or staff)
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
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const isAdminOrStaff = profile?.role === 'admin' || profile?.role === 'staff';

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        {/* Hero Section */}
        <section className="py-16 bg-gradient-to-r from-primary/10 to-primary/5">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center mb-4">
                  <div className="bg-primary p-3 rounded-full mr-4">
                    {isAdminOrStaff ? (
                      <Shield className="h-8 w-8 text-primary-foreground" />
                    ) : (
                      <User className="h-8 w-8 text-primary-foreground" />
                    )}
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold text-foreground">
                      {isAdminOrStaff ? `${profile?.role === 'admin' ? 'Admin' : 'Staff'} Dashboard` : 'Dashboard'}
                    </h1>
                    <p className="text-muted-foreground">
                      Welcome back, {user?.email}
                      {profile?.role && profile?.role !== 'user' && (
                        <Badge variant="secondary" className="ml-2">
                          {profile?.role.toUpperCase()}
                        </Badge>
                      )}
                    </p>
                  </div>
                </div>
              </div>
              <Button 
                onClick={handleLogout}
                variant="outline"
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </section>

        {/* Dashboard Content */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            {isAdminOrStaff ? (
              <AdminDashboard user={user} profile={profile} />
            ) : (
              <div className="max-w-6xl mx-auto space-y-6">
                {/* User Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                        <CardContent className="flex flex-col items-center justify-center p-8 space-y-4">
                          <div className="bg-primary/10 p-6 rounded-full">
                            <Send className="h-12 w-12 text-primary" />
                          </div>
                          <h3 className="text-xl font-semibold">Submit Shipment Request</h3>
                          <p className="text-muted-foreground text-center">Request a new shipment and get it approved by admin</p>
                        </CardContent>
                      </Card>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Submit Shipment Request</DialogTitle>
                      </DialogHeader>
                      <UserRequestForm onSuccess={() => {
                        fetchUserData(user.id);
                      }} />
                    </DialogContent>
                  </Dialog>

                  <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                    <CardContent className="flex flex-col items-center justify-center p-8 space-y-4">
                      <div className="bg-green-500/10 p-6 rounded-full">
                        <FileText className="h-12 w-12 text-green-600" />
                      </div>
                      <h3 className="text-xl font-semibold">View My Invoices</h3>
                      <p className="text-muted-foreground text-center">Download payment invoices anytime</p>
                    </CardContent>
                  </Card>
                </div>

                {/* User's Parcels */}
                <Card>
                  <CardHeader>
                    <CardTitle>Your Shipment Requests</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {recentParcels.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">
                          No requests yet. Submit your first shipment request!
                        </p>
                      ) : (
                        recentParcels.map((parcel) => (
                          <div key={parcel.id} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-mono font-semibold text-primary">{parcel.tracking_id}</p>
                                <p className="text-sm text-muted-foreground">
                                  {parcel.from_country} → {parcel.to_country}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  To: {parcel.receiver_name}
                                </p>
                              </div>
                              <div className="text-right space-y-2">
                                <div>
                                  <Badge 
                                    variant={
                                      parcel.request_status === 'approved' ? 'default' : 
                                      parcel.request_status === 'rejected' ? 'destructive' : 
                                      'secondary'
                                    }
                                  >
                                    {parcel.request_status?.toUpperCase()}
                                  </Badge>
                                </div>
                                {parcel.request_status === 'approved' && (
                                  <div>
                                    <Badge variant="outline">
                                      {parcel.shipping_status?.replace('_', ' ').toUpperCase()}
                                    </Badge>
                                  </div>
                                )}
                                {parcel.payment_amount && (
                                  <div className="mt-2">
                                    <UserPaymentInvoice parcel={parcel} />
                                  </div>
                                )}
                                <p className="text-sm text-muted-foreground mt-1">
                                  {new Date(parcel.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            {parcel.rejection_reason && (
                              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                                <p className="text-sm text-red-800">
                                  <strong>Rejection Reason:</strong> {parcel.rejection_reason}
                                </p>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;