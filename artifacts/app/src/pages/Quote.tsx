import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calculator, Loader2, CheckCircle } from "lucide-react";

interface QuoteResult {
  quote_id: string;
  price_estimate: number;
  currency: string;
  service_type: string;
  estimated_days: string;
  message: string;
}

const Quote = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [quoteResult, setQuoteResult] = useState<QuoteResult | null>(null);
  const [formData, setFormData] = useState({
    origin_country: "",
    destination_country: "",
    weight: "",
    length: "",
    width: "",
    height: "",
    service_type: "",
    email: "",
    phone: "",
  });
  const { toast } = useToast();

  const countries = [
    { code: "US", name: "United States" },
    { code: "CA", name: "Canada" },
    { code: "MX", name: "Mexico" },
    { code: "GB", name: "United Kingdom" },
    { code: "DE", name: "Germany" },
    { code: "FR", name: "France" },
    { code: "ES", name: "Spain" },
    { code: "IT", name: "Italy" },
    { code: "JP", name: "Japan" },
    { code: "CN", name: "China" },
    { code: "IN", name: "India" },
    { code: "SG", name: "Singapore" },
    { code: "TH", name: "Thailand" },
    { code: "AU", name: "Australia" },
    { code: "NZ", name: "New Zealand" },
  ];

  const serviceTypes = [
    { value: "express", label: "Express (1-2 days)" },
    { value: "priority", label: "Priority (2-4 days)" },
    { value: "economy", label: "Economy (5-7 days)" },
    { value: "airfreight", label: "Airfreight" },
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Get current user if logged in
      const { data: { session } } = await supabase.auth.getSession();
      
      const requestData = {
        ...formData,
        weight: parseFloat(formData.weight),
        length: formData.length ? parseFloat(formData.length) : undefined,
        width: formData.width ? parseFloat(formData.width) : undefined,
        height: formData.height ? parseFloat(formData.height) : undefined,
        user_id: session?.user?.id || null,
      };

      const { data, error } = await supabase.functions.invoke('quote-calc', {
        body: requestData
      });

      if (error) {
        throw error;
      }

      setQuoteResult(data);
      toast({
        title: "Quote calculated successfully!",
        description: `Estimated cost: $${data.price_estimate} ${data.currency}`,
      });

    } catch (error: any) {
      console.error('Quote calculation error:', error);
      toast({
        variant: "destructive",
        title: "Quote calculation failed",
        description: error.message || "Failed to calculate quote. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        {/* Hero Section */}
        <section className="py-16 bg-gradient-to-r from-primary/10 to-primary/5">
          <div className="container mx-auto px-4 text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-primary p-4 rounded-full">
                <Calculator className="h-12 w-12 text-primary-foreground" />
              </div>
            </div>
            <h1 className="text-5xl font-bold text-foreground mb-6">Get a Quote</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Get an instant quote for your shipment. Fast, accurate, and transparent pricing.
            </p>
          </div>
        </section>

        {/* Quote Form */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              {!quoteResult ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-2xl">Shipment Details</CardTitle>
                    <CardDescription>
                      Provide your shipment information to get an accurate quote
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Route Information */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="origin-country">Origin Country</Label>
                          <Select onValueChange={(value) => handleInputChange('origin_country', value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select origin country" />
                            </SelectTrigger>
                            <SelectContent>
                              {countries.map((country) => (
                                <SelectItem key={country.code} value={country.code}>
                                  {country.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="destination-country">Destination Country</Label>
                          <Select onValueChange={(value) => handleInputChange('destination_country', value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select destination country" />
                            </SelectTrigger>
                            <SelectContent>
                              {countries.map((country) => (
                                <SelectItem key={country.code} value={country.code}>
                                  {country.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Package Information */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Package Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="weight">Weight (kg)</Label>
                            <Input
                              id="weight"
                              type="number"
                              step="0.1"
                              placeholder="0.0"
                              value={formData.weight}
                              onChange={(e) => handleInputChange('weight', e.target.value)}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="length">Length (cm)</Label>
                            <Input
                              id="length"
                              type="number"
                              step="0.1"
                              placeholder="0.0"
                              value={formData.length}
                              onChange={(e) => handleInputChange('length', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="width">Width (cm)</Label>
                            <Input
                              id="width"
                              type="number"
                              step="0.1"
                              placeholder="0.0"
                              value={formData.width}
                              onChange={(e) => handleInputChange('width', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="height">Height (cm)</Label>
                            <Input
                              id="height"
                              type="number"
                              step="0.1"
                              placeholder="0.0"
                              value={formData.height}
                              onChange={(e) => handleInputChange('height', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Service Type */}
                      <div className="space-y-2">
                        <Label htmlFor="service-type">Service Type</Label>
                        <Select onValueChange={(value) => handleInputChange('service_type', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select service type" />
                          </SelectTrigger>
                          <SelectContent>
                            {serviceTypes.map((service) => (
                              <SelectItem key={service.value} value={service.value}>
                                {service.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Contact Information */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Contact Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                              id="email"
                              type="email"
                              placeholder="Enter your email"
                              value={formData.email}
                              onChange={(e) => handleInputChange('email', e.target.value)}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number (Optional)</Label>
                            <Input
                              id="phone"
                              type="tel"
                              placeholder="Enter your phone number"
                              value={formData.phone}
                              onChange={(e) => handleInputChange('phone', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>

                      <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Calculating Quote...
                          </>
                        ) : (
                          <>
                            <Calculator className="mr-2 h-5 w-5" />
                            Get Quote
                          </>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              ) : (
                /* Quote Result */
                <Card>
                  <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                      <div className="bg-green-100 p-3 rounded-full">
                        <CheckCircle className="h-8 w-8 text-green-600" />
                      </div>
                    </div>
                    <CardTitle className="text-2xl">Quote Generated Successfully!</CardTitle>
                    <CardDescription>Here's your shipping quote</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="text-center bg-primary/5 rounded-lg p-6">
                      <div className="text-4xl font-bold text-primary mb-2">
                        ${quoteResult.price_estimate} {quoteResult.currency}
                      </div>
                      <div className="text-muted-foreground">
                        {quoteResult.service_type} • Estimated {quoteResult.estimated_days} days
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Route</Label>
                        <p className="text-muted-foreground">
                          {countries.find(c => c.code === formData.origin_country)?.name} → {" "}
                          {countries.find(c => c.code === formData.destination_country)?.name}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Package Weight</Label>
                        <p className="text-muted-foreground">{formData.weight} kg</p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                      <Button 
                        variant="hero" 
                        size="lg" 
                        className="flex-1"
                        onClick={() => {
                          // This would open the invoice generator - redirect to dashboard for invoice generation
                          navigate('/dashboard');
                          toast({
                            title: "Redirected to Dashboard",
                            description: "Go to the Generate tab to create an invoice for this quote.",
                          });
                        }}
                      >
                        Generate Invoice
                      </Button>
                      <Button 
                        variant="outline" 
                        size="lg" 
                        onClick={() => {
                          setQuoteResult(null);
                          setFormData({
                            origin_country: "",
                            destination_country: "",
                            weight: "",
                            length: "",
                            width: "",
                            height: "",
                            service_type: "",
                            email: "",
                            phone: "",
                          });
                        }}
                      >
                        Get Another Quote
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Quote;