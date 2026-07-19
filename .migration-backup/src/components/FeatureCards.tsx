import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Globe, Package, ShoppingCart, ArrowRight } from "lucide-react";

const FeatureCards = () => {
  const features = [
    {
      icon: Globe,
      title: "SkyXpress Network",
      description: "The SkyXpress network stretches across all continents.",
      link: "/network",
      color: "text-blue-600"
    },
    {
      icon: Package,
      title: "Track a shipment", 
      description: "Real-time tracking for all your shipments with detailed status updates.",
      link: "/track",
      color: "text-green-600"
    },
    {
      icon: ShoppingCart,
      title: "E-commerce solutions",
      description: "The solution to automate and handle the shipping for e-commerce companies.",
      link: "/services",
      color: "text-primary"
    }
  ];

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Making your logistics easier with our Best SkyXpress Tools
          </h2>
          <div className="w-24 h-1 bg-primary mx-auto rounded-full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <Card 
                key={index} 
                className="group hover:shadow-lg transition-all duration-300 border-0 bg-card/50 backdrop-blur-sm"
              >
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-4 p-4 rounded-full bg-muted/50 w-20 h-20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <IconComponent className={`h-10 w-10 ${feature.color}`} />
                  </div>
                  <CardTitle className="text-xl font-bold text-foreground">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                  <CardDescription className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </CardDescription>
                  <Link to={feature.link}>
                    <Button 
                      variant="outline" 
                      className="group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300"
                    >
                      Learn more
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Special Track Button */}
        
      </div>
    </section>
  );
};

export default FeatureCards;
