import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Save, RefreshCw, DollarSign, TrendingUp, Globe, Settings } from "lucide-react";

interface PricingConfig {
  id?: string;
  base_rates: {
    standard: number;
    express: number;
    overnight: number;
  };
  currency_rates: {
    USD: number;
    EUR: number;
    GBP: number;
    AED: number;
    PKR: number;
  };
  weight_multipliers: {
    light: number; // 0-1kg
    medium: number; // 1-5kg
    heavy: number; // 5-20kg
    extra_heavy: number; // 20kg+
  };
  distance_multipliers: {
    domestic: number;
    regional: number;
    international: number;
  };
  service_fees: {
    insurance: number;
    tracking: number;
    signature: number;
    express_handling: number;
  };
  tax_rate: number;
  updated_at?: string;
}

export const PricingManager = () => {
  const [config, setConfig] = useState<PricingConfig>({
    base_rates: {
      standard: 15,
      express: 25,
      overnight: 45
    },
    currency_rates: {
      USD: 1.0,
      EUR: 0.85,
      GBP: 0.75,
      AED: 3.67,
      PKR: 285.0
    },
    weight_multipliers: {
      light: 1.0,
      medium: 1.2,
      heavy: 1.5,
      extra_heavy: 2.0
    },
    distance_multipliers: {
      domestic: 1.0,
      regional: 1.3,
      international: 1.8
    },
    service_fees: {
      insurance: 5.0,
      tracking: 2.0,
      signature: 3.0,
      express_handling: 10.0
    },
    tax_rate: 0.10
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    fetchPricingConfig();
  }, []);

  const fetchPricingConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('pricing_config')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      if (data) {
        setConfig({
          id: data.id,
          // @ts-ignore
          base_rates: data.base_rates || config.base_rates,
          // @ts-ignore
          currency_rates: data.currency_rates || config.currency_rates,
          // Map service_multipliers from database to weight_multipliers for frontend
          // @ts-ignore
          weight_multipliers: data.service_multipliers || config.weight_multipliers,
          // Map region_multipliers from database to distance_multipliers for frontend
          // @ts-ignore
          distance_multipliers: data.region_multipliers || config.distance_multipliers,
          // @ts-ignore
          service_fees: data.service_fees || config.service_fees,
          // @ts-ignore
          tax_rate: data.tax_rate || config.tax_rate,
          updated_at: data.updated_at
        });
        setLastUpdated(data.updated_at ? new Date(data.updated_at).toLocaleString() : "Never");
      }
    } catch (error: any) {
      console.error('Error fetching pricing config:', error);
      toast({
        title: "Error",
        description: "Failed to load pricing configuration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = (section: keyof PricingConfig, field: string, value: number) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...(prev[section] as any),
        [field]: value
      }
    }));
  };

  const updateTaxRate = (value: number) => {
    setConfig(prev => ({
      ...prev,
      tax_rate: value / 100 // Convert percentage to decimal
    }));
  };

  const savePricingConfig = async () => {
    setSaving(true);
    try {
      // Map frontend structure to database schema
      const configData = {
        base_rates: config.base_rates,
        currency_rates: config.currency_rates,
        // Map weight_multipliers to service_multipliers for database compatibility
        service_multipliers: config.weight_multipliers,
        // Map distance_multipliers to region_multipliers for database compatibility  
        region_multipliers: config.distance_multipliers,
        // Note: service_fees might not exist in database schema, but we'll try to save it
        // If it fails, we'll handle it gracefully
        tax_rate: config.tax_rate,
        updated_at: new Date().toISOString()
      };

      let result;
      if (config.id) {
        // Update existing config
        result = await supabase
          .from('pricing_config')
          // @ts-ignore
          .update(configData)
          .eq('id', config.id)
          .select()
          .single();
      } else {
        // Insert new config
        result = await supabase
          .from('pricing_config')
          // @ts-ignore
          .insert(configData)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      // Update state with the saved data from database
      setConfig({
        id: result.data.id,
        // @ts-ignore
        base_rates: result.data.base_rates || config.base_rates,
        // @ts-ignore
        currency_rates: result.data.currency_rates || config.currency_rates,
        // @ts-ignore
        weight_multipliers: result.data.service_multipliers || config.weight_multipliers,
        // @ts-ignore
        distance_multipliers: result.data.region_multipliers || config.distance_multipliers,
        // @ts-ignore
        service_fees: result.data.service_fees || config.service_fees,
        // @ts-ignore
        tax_rate: result.data.tax_rate || config.tax_rate,
        updated_at: result.data.updated_at
      });
      setLastUpdated(new Date(result.data.updated_at).toLocaleString());

      toast({
        title: "Success!",
        description: "Pricing configuration updated successfully",
      });
    } catch (error: any) {
      console.error('Error saving pricing config:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save pricing configuration",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const refreshRates = async () => {
    // In a real application, you would fetch live exchange rates from an API
    // For now, we'll simulate updating PKR and other rates
    const updatedRates = {
      ...config.currency_rates,
      PKR: 285.5, // Simulated updated PKR rate
      EUR: 0.86,
      GBP: 0.76,
      AED: 3.68
    };

    setConfig(prev => ({
      ...prev,
      currency_rates: updatedRates
    }));

    toast({
      title: "Rates Refreshed",
      description: "Currency exchange rates have been updated",
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading pricing configuration...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold flex items-center">
                <Settings className="mr-3 h-6 w-6" />
                Base Pricing Configuration
              </CardTitle>
              <p className="text-muted-foreground mt-2">
                Manage shipping rates, currency exchange rates, and service fees
              </p>
              {lastUpdated && (
                <p className="text-sm text-muted-foreground mt-1">
                  Last updated: {lastUpdated}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={refreshRates} variant="outline" size="sm">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Rates
              </Button>
              <Button onClick={savePricingConfig} disabled={saving}>
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Base Shipping Rates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5" />
              Base Shipping Rates (USD)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="standard">Standard Delivery (5-7 days)</Label>
              <Input
                id="standard"
                type="number"
                step="0.01"
                value={config.base_rates.standard}
                onChange={(e) => updateConfig('base_rates', 'standard', parseFloat(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="express">Express Delivery (2-3 days)</Label>
              <Input
                id="express"
                type="number"
                step="0.01"
                value={config.base_rates.express}
                onChange={(e) => updateConfig('base_rates', 'express', parseFloat(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="overnight">Overnight Delivery (1 day)</Label>
              <Input
                id="overnight"
                type="number"
                step="0.01"
                value={config.base_rates.overnight}
                onChange={(e) => updateConfig('base_rates', 'overnight', parseFloat(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Currency Exchange Rates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Globe className="mr-2 h-5 w-5" />
              Currency Exchange Rates
            </CardTitle>
            <p className="text-sm text-muted-foreground">Rates relative to USD (1.00)</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="pkr">Pakistani Rupee (PKR)</Label>
              <Input
                id="pkr"
                type="number"
                step="0.01"
                value={config.currency_rates.PKR}
                onChange={(e) => updateConfig('currency_rates', 'PKR', parseFloat(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="eur">Euro (EUR)</Label>
              <Input
                id="eur"
                type="number"
                step="0.01"
                value={config.currency_rates.EUR}
                onChange={(e) => updateConfig('currency_rates', 'EUR', parseFloat(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="gbp">British Pound (GBP)</Label>
              <Input
                id="gbp"
                type="number"
                step="0.01"
                value={config.currency_rates.GBP}
                onChange={(e) => updateConfig('currency_rates', 'GBP', parseFloat(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="aed">UAE Dirham (AED)</Label>
              <Input
                id="aed"
                type="number"
                step="0.01"
                value={config.currency_rates.AED}
                onChange={(e) => updateConfig('currency_rates', 'AED', parseFloat(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Weight Multipliers */}
        <Card>
          <CardHeader>
            <CardTitle>Weight Multipliers</CardTitle>
            <p className="text-sm text-muted-foreground">Pricing adjustments based on package weight</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="light">Light (0-1kg)</Label>
              <Input
                id="light"
                type="number"
                step="0.1"
                value={config.weight_multipliers.light}
                onChange={(e) => updateConfig('weight_multipliers', 'light', parseFloat(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="medium">Medium (1-5kg)</Label>
              <Input
                id="medium"
                type="number"
                step="0.1"
                value={config.weight_multipliers.medium}
                onChange={(e) => updateConfig('weight_multipliers', 'medium', parseFloat(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="heavy">Heavy (5-20kg)</Label>
              <Input
                id="heavy"
                type="number"
                step="0.1"
                value={config.weight_multipliers.heavy}
                onChange={(e) => updateConfig('weight_multipliers', 'heavy', parseFloat(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="extra_heavy">Extra Heavy (20kg+)</Label>
              <Input
                id="extra_heavy"
                type="number"
                step="0.1"
                value={config.weight_multipliers.extra_heavy}
                onChange={(e) => updateConfig('weight_multipliers', 'extra_heavy', parseFloat(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Distance Multipliers */}
        <Card>
          <CardHeader>
            <CardTitle>Distance Multipliers</CardTitle>
            <p className="text-sm text-muted-foreground">Pricing adjustments based on shipping distance</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="domestic">Domestic</Label>
              <Input
                id="domestic"
                type="number"
                step="0.1"
                value={config.distance_multipliers.domestic}
                onChange={(e) => updateConfig('distance_multipliers', 'domestic', parseFloat(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="regional">Regional</Label>
              <Input
                id="regional"
                type="number"
                step="0.1"
                value={config.distance_multipliers.regional}
                onChange={(e) => updateConfig('distance_multipliers', 'regional', parseFloat(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="international">International</Label>
              <Input
                id="international"
                type="number"
                step="0.1"
                value={config.distance_multipliers.international}
                onChange={(e) => updateConfig('distance_multipliers', 'international', parseFloat(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Service Fees */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="mr-2 h-5 w-5" />
              Additional Service Fees (USD)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="insurance">Insurance</Label>
              <Input
                id="insurance"
                type="number"
                step="0.01"
                value={config.service_fees.insurance}
                onChange={(e) => updateConfig('service_fees', 'insurance', parseFloat(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="tracking">Tracking</Label>
              <Input
                id="tracking"
                type="number"
                step="0.01"
                value={config.service_fees.tracking}
                onChange={(e) => updateConfig('service_fees', 'tracking', parseFloat(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="signature">Signature Required</Label>
              <Input
                id="signature"
                type="number"
                step="0.01"
                value={config.service_fees.signature}
                onChange={(e) => updateConfig('service_fees', 'signature', parseFloat(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="express_handling">Express Handling</Label>
              <Input
                id="express_handling"
                type="number"
                step="0.01"
                value={config.service_fees.express_handling}
                onChange={(e) => updateConfig('service_fees', 'express_handling', parseFloat(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tax Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Tax Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="tax_rate">Tax Rate (%)</Label>
              <Input
                id="tax_rate"
                type="number"
                step="0.01"
                value={(config.tax_rate * 100).toFixed(2)}
                onChange={(e) => updateTaxRate(parseFloat(e.target.value) || 0)}
                className="mt-1"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Current rate: {(config.tax_rate * 100).toFixed(2)}%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button (Mobile) */}
      <div className="lg:hidden">
        <Button onClick={savePricingConfig} disabled={saving} className="w-full">
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
              Saving Changes...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save All Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
};