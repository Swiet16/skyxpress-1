// @ts-nocheck
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Truck, Package, MapPin, Calendar, User } from "lucide-react";
import { Json } from "@/integrations/supabase/types";

interface Shipment {
  id: string;
  tracking_number: string;
  current_status: string;
  origin: string;
  destination: string;
  service_type: string;
  estimated_delivery: string;
  events: Json;
  detailed_status: Json;
  created_at: string;
  user_id: string;
}

const ShipmentManager = () => {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  const [statusUpdate, setStatusUpdate] = useState({
    status: '',
    location: '',
    notes: ''
  });

  const statusOptions = [
    'processing',
    'picked_up',
    'in_transit',
    'out_for_delivery', 
    'delivered',
    'delayed',
    'returned'
  ];

  useEffect(() => {
    fetchShipments();
  }, []);

  const fetchShipments = async () => {
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setShipments(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateShipmentStatus = async () => {
    if (!selectedShipment || !statusUpdate.status) {
      toast({
        title: "Error",
        description: "Please select a status",
        variant: "destructive",
      });
      return;
    }

    setUpdating(true);
    try {
      const { data, error } = await supabase.rpc('update_shipment_status', {
        shipment_tracking: selectedShipment.tracking_number,
        new_status: statusUpdate.status,
        location: statusUpdate.location,
        notes: statusUpdate.notes
      });

      if (error) throw error;

      if (data) {
        toast({
          title: "Success",
          description: "Shipment status updated successfully",
        });
        
        // Reset form
        setStatusUpdate({ status: '', location: '', notes: '' });
        setSelectedShipment(null);
        
        // Refresh shipments
        await fetchShipments();
      } else {
        throw new Error("Failed to update shipment status");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'in_transit': return 'bg-blue-100 text-blue-800';
      case 'delayed': return 'bg-red-100 text-red-800';
      case 'out_for_delivery': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading shipments...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Shipments List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Active Shipments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
              {shipments.map((shipment) => (
                <div
                  key={shipment.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedShipment?.id === shipment.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedShipment(shipment)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-mono text-sm font-medium">
                      {shipment.tracking_number}
                    </div>
                    <Badge className={getStatusColor(shipment.current_status)}>
                      {shipment.current_status}
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3" />
                      {shipment.origin} → {shipment.destination}
                    </div>
                    <div className="flex items-center gap-2">
                      <Truck className="h-3 w-3" />
                      {shipment.service_type}
                    </div>
                    {shipment.estimated_delivery && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        Est. Delivery: {new Date(shipment.estimated_delivery).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            
            {shipments.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No shipments found
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Update Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Update Shipment Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedShipment ? (
              <>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="font-mono text-sm font-medium mb-2">
                    {selectedShipment.tracking_number}
                  </div>
                  <div className="text-sm text-gray-600">
                    Current Status: <Badge className={getStatusColor(selectedShipment.current_status)}>
                      {selectedShipment.current_status}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="status">New Status</Label>
                    <Select
                      value={statusUpdate.status}
                      onValueChange={(value) => setStatusUpdate(prev => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="location">Current Location</Label>
                    <Input
                      id="location"
                      value={statusUpdate.location}
                      onChange={(e) => setStatusUpdate(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="e.g., New York Distribution Center"
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={statusUpdate.notes}
                      onChange={(e) => setStatusUpdate(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Additional notes about status update..."
                      rows={3}
                    />
                  </div>

                  <Button 
                    onClick={updateShipmentStatus} 
                    disabled={updating || !statusUpdate.status}
                    className="w-full"
                  >
                    {updating ? "Updating..." : "Update Status"}
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Select a shipment to update its status
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Events */}
      {selectedShipment && selectedShipment.events && Array.isArray(selectedShipment.events) && selectedShipment.events.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tracking History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(selectedShipment.events as any[]).map((event: any, index: number) => (
                <div key={index} className="flex items-start gap-4 p-4 border-l-2 border-primary">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={getStatusColor(event.status)}>
                        {event.status}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {new Date(event.timestamp).toLocaleString()}
                      </span>
                    </div>
                    {event.location && (
                      <div className="text-sm text-gray-600 mb-1">
                        Location: {event.location}
                      </div>
                    )}
                    {event.notes && (
                      <div className="text-sm text-gray-700">
                        {event.notes}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ShipmentManager;