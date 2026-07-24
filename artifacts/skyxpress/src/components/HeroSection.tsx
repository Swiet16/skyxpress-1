import { HeroCarousel } from "@/components/HeroCarousel";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Package, Globe } from "lucide-react";
import skyxpressLogo from '@/assets/skyxpress_logo.png';

const HeroSection = () => {
  return (
    <section className="relative min-h-screen overflow-hidden">
      {/* Brand Header */}
      <div className="relative z-20 bg-gradient-to-r from-secondary/10 via-background to-primary/10 py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            <img 
              src={skyxpressLogo}
              alt="SkyXpress Logo" 
              className="h-20 w-auto object-contain"
            />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            <span className="text-secondary">Sky</span>
            <span className="text-primary">Xpress</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-6 max-w-2xl mx-auto">
            
          </p>
        </div>
      </div>

      {/* Hero Carousel */}
      <div className="relative z-10 container mx-auto px-4 -mt-4">
        <HeroCarousel />
      </div>
      
      {/* Features Section */}
      <div className="relative z-20 bg-gradient-to-r from-primary/5 via-background to-secondary/5 py-12">
        <div className="container mx-auto px-4">
          {/* Key Features */}
          <div className="flex flex-wrap justify-center gap-6 text-sm md:text-base mb-8">
            <div className="flex items-center space-x-2 bg-card backdrop-blur-sm px-6 py-3 rounded-full shadow-card hover:scale-105 transition-transform">
              <Globe className="h-5 w-5 text-secondary" />
              <span className="font-medium"></span>
            </div>
            <div className="flex items-center space-x-2 bg-card backdrop-blur-sm px-6 py-3 rounded-full shadow-card hover:scale-105 transition-transform">
              <Package className="h-5 w-5 text-primary" />
              <span className="font-medium"></span>
            </div>
            <div className="flex items-center space-x-2 bg-card backdrop-blur-sm px-6 py-3 rounded-full shadow-card hover:scale-105 transition-transform">
              <ArrowRight className="h-5 w-5 text-secondary" />
              <span className="font-medium"></span>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="text-center mb-8">
            <p className="text-lg text-muted-foreground mb-6">
              Trusted by businesses worldwide for reliable shipping
            </p>
            <div className="flex justify-center items-center space-x-12 text-foreground">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">195+</div>
                <div className="text-sm text-muted-foreground">Countries</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-secondary">1M+</div>
                <div className="text-sm text-muted-foreground">Shipments</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">99.8%</div>
                <div className="text-sm text-muted-foreground">On-time</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
