import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Search, Plus, Package, Eye, Edit, FileText, Trash2 } from "lucide-react";
import { ParcelForm } from "./ParcelForm";
import { ParcelDetails } from "./ParcelDetails";

interface Parcel {
  id: string;
  tracking_id: string;
  reference_id?: string;
  sender_name: string;
  sender_phone: string;
  receiver_name: string;
  receiver_phone: string;
  parcel_type: string;
  weight: number;
  length: number;
  width: number;
  height: number;
  total_price: number;
  currency: string;
  current_status: string;
  from_country: string;
  to_country: string;
  created_at: string;
}

const statusColors = {
  created: "bg-yellow-100 text-yellow-800",
  picked_up: "bg-blue-100 text-blue-800",
  in_transit: "bg-purple-100 text-purple-800",
  customs: "bg-orange-100 text-orange-800",
  out_for_delivery: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export const ParcelManagement = () => {
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingParcel, setEditingParcel] = useState<Parcel | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchParcels();
  }, []);

  const fetchParcels = async () => {
    try {
      const { data, error } = await supabase
        .from('parcels')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setParcels(data || []);
    } catch (error: any) {
      console.error('Error fetching parcels:', error);
      toast({
        title: "Error",
        description: "Failed to load parcels",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleParcelCreated = () => {
    fetchParcels();
    setShowCreateForm(false);
    toast({
      title: "Success",
      description: "Parcel created successfully",
    });
  };

  const handleParcelUpdated = () => {
    fetchParcels();
    setShowEditForm(false);
    setEditingParcel(null);
    toast({
      title: "Success",
      description: "Parcel updated successfully",
    });
  };

  const handleEditClick = (parcel: Parcel) => {
    setEditingParcel(parcel);
    setShowEditForm(true);
  };

  const handleDeleteParcel = async (parcelId: string, trackingId: string) => {
    if (!window.confirm(`Are you sure you want to delete parcel ${trackingId}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('parcels')
        .delete()
        .eq('id', parcelId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Parcel ${trackingId} deleted successfully`,
      });

      fetchParcels();
    } catch (error: any) {
      console.error('Error deleting parcel:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete parcel",
        variant: "destructive",
      });
    }
  };

  const filteredParcels = parcels.filter(parcel => {
    const query = searchQuery.toLowerCase();
    return (
      parcel.tracking_id.toLowerCase().includes(query) ||
      parcel.sender_name.toLowerCase().includes(query) ||
      parcel.receiver_name.toLowerCase().includes(query) ||
      parcel.sender_phone.toLowerCase().includes(query) ||
      parcel.receiver_phone.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Parcel Management
            </CardTitle>
            <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Parcel
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Parcel</DialogTitle>
                </DialogHeader>
                <ParcelForm onSuccess={handleParcelCreated} />
              </DialogContent>
            </Dialog>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by tracking ID, name, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference ID</TableHead>
                  <TableHead>Tracking ID</TableHead>
                  <TableHead>Sender</TableHead>
                  <TableHead>Receiver</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParcels.map((parcel) => (
                  <TableRow key={parcel.id}>
                    <TableCell>
                      <div className="font-mono font-semibold text-blue-600">
                        {parcel.reference_id || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono font-semibold text-primary">
                        {parcel.tracking_id}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{parcel.sender_name}</div>
                        <div className="text-sm text-muted-foreground">{parcel.sender_phone}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{parcel.receiver_name}</div>
                        <div className="text-sm text-muted-foreground">{parcel.receiver_phone}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {parcel.from_country} → {parcel.to_country}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{parcel.parcel_type}</div>
                        <div className="text-muted-foreground">
                          {parcel.weight}kg • {parcel.length}×{parcel.width}×{parcel.height}cm
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold">
                        {parcel.currency} {parcel.total_price?.toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[parcel.current_status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"}>
                        {parcel.current_status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(parcel.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedParcel(parcel);
                            setShowDetailsModal(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditClick(parcel)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteParcel(parcel.id, parcel.tracking_id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredParcels.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No parcels found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Parcel Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Parcel Details</DialogTitle>
          </DialogHeader>
          {selectedParcel && (
            <ParcelDetails 
              parcel={selectedParcel} 
              onUpdate={fetchParcels}
              onClose={() => setShowDetailsModal(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Parcel Modal */}
      <Dialog open={showEditForm} onOpenChange={(open) => {
        setShowEditForm(open);
        if (!open) setEditingParcel(null);
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Parcel - {editingParcel?.tracking_id}</DialogTitle>
          </DialogHeader>
          {editingParcel && (
            <ParcelForm 
              parcel={editingParcel} 
              onSuccess={handleParcelUpdated} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};