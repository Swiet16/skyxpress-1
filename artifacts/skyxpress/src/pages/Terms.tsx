import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-foreground mb-8">Terms of Service</h1>
        <div className="prose max-w-4xl">
          <p className="text-muted-foreground mb-6">
            Last updated: January 2025
          </p>
          
          <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
          <p className="text-muted-foreground mb-6">
            By using SkyXpress services, you agree to be bound by these terms and conditions.
          </p>

          <h2 className="text-2xl font-bold mb-4">2. Service Description</h2>
          <p className="text-muted-foreground mb-6">
            SkyXpress provides international express delivery services, logistics solutions, and related services 
            as described on our website and in our service guides.
          </p>

          <h2 className="text-2xl font-bold mb-4">3. Liability and Insurance</h2>
          <p className="text-muted-foreground mb-6">
            Our liability is limited as set forth in our standard terms and conditions of carriage. 
            Additional insurance coverage is available upon request.
          </p>

          <h2 className="text-2xl font-bold mb-4">4. Prohibited Items</h2>
          <p className="text-muted-foreground mb-6">
            Certain items are prohibited from shipment including but not limited to hazardous materials, 
            weapons, and illegal substances. Full list available upon request.
          </p>

          <h2 className="text-2xl font-bold mb-4">5. Payment Terms</h2>
          <p className="text-muted-foreground mb-6">
            Payment is due upon receipt of invoice unless other arrangements have been made. 
            Late payment charges may apply.
          </p>

          <h2 className="text-2xl font-bold mb-4">6. Contact Information</h2>
          <p className="text-muted-foreground">
            For questions about these terms, please contact us at skyxpress786@gmail.com or +92 321 4710522 <br/>+92 326 9422411.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Terms;
