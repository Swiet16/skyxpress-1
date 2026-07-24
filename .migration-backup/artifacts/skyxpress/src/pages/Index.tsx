import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import FeatureCards from "@/components/FeatureCards";
import ImageSlider from "@/components/ImageSlider";
import { TrackingSection } from "@/components/TrackingSection";

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

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

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} />
      <main>
        {/* Hero Image Slider Section - Now First */}
        <section className="bg-background">
          <div className="container mx-auto px-4">
            <ImageSlider />
          </div>
        </section>
        
        <TrackingSection />
        
        <FeatureCards />
        
        {/* Company Overview Section */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <h2 className="text-4xl font-bold text-foreground">
                  SkyXpress
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  The SkyXpress network stretches across all continents, 
                  providing the Global business community with fast, reliable and secure 
                  Express delivery services to almost every country and territory Worldwide.
                </p>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-primary rounded-full" />
                    <span className="text-foreground">Over 40 years of experience</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-primary rounded-full" />
                    <span className="text-foreground">Committed and qualified personnel</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-primary rounded-full" />
                    <span className="text-foreground">Global network coverage</span>
                  </div>
                </div>
              </div>
              
              <div className="relative">
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-8 text-center">
                  <h3 className="text-2xl font-bold text-foreground mb-4">
                    Committed and qualified personnel
                  </h3>
                  <p className="text-lg text-primary font-semibold mb-6">
                    With more than 40 years of experience in the industry!
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="bg-background rounded-lg p-4 shadow-sm">
                      <div className="text-2xl font-bold text-primary">190+</div>
                      <div className="text-sm text-muted-foreground">Countries Served</div>
                    </div>
                    <div className="bg-background rounded-lg p-4 shadow-sm">
                      <div className="text-2xl font-bold text-primary">99.9%</div>
                      <div className="text-sm text-muted-foreground">On-time Delivery</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
