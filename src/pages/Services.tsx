import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Plane, Home, RotateCcw, Ship, ArrowRight } from "lucide-react";

const Services = () => {
  const services = [
    {
      icon: ShoppingCart,
      title: "E-commerce Solutions",
      description: "Complete automation and handling of shipping for e-commerce companies. Streamline your online business with our integrated logistics platform.",
      features: ["Automated order processing", "Real-time inventory sync", "Multi-carrier shipping", "Returns management"],
      color: "text-blue-600"
    },
    {
      icon: Plane,
      title: "Airfreight", 
      description: "Fast and reliable air transportation services for urgent shipments. Get your packages delivered quickly across continents.",
      features: ["Express delivery", "Priority handling", "Temperature-controlled", "Customs clearance"],
      color: "text-green-600"
    },
    {
      icon: Home,
      title: "Door-to-door",
      description: "Complete pickup and delivery service from origin to destination. We handle every step of your shipment journey.",
      features: ["Free pickup", "Direct delivery", "Signature confirmation", "Insurance coverage"],
      color: "text-purple-600"
    },
    {
      icon: RotateCcw,
      title: "Return Logistics",
      description: "Efficient reverse logistics solutions for returns and exchanges. Make returns easy for your customers.",
      features: ["Easy return labels", "Quality inspection", "Restocking service", "Refund processing"],
      color: "text-orange-600"
    },
    {
      icon: Ship,
      title: "Import Services",
      description: "Comprehensive import solutions including customs clearance and documentation. Simplify your international trade.",
      features: ["Customs brokerage", "Documentation", "Duty calculation", "Compliance support"],
      color: "text-primary"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        {/* Hero Section */}
        <section className="py-16 bg-gradient-to-r from-primary/10 to-primary/5">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-5xl font-bold text-foreground mb-6">Our Services</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Discover our comprehensive range of logistics and shipping services designed 
              to meet all your business needs. From e-commerce solutions to international trade.
            </p>
          </div>
        </section>

        {/* Services Grid */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {services.map((service, index) => {
                const IconComponent = service.icon;
                return (
                  <Card key={index} className="group hover:shadow-xl transition-all duration-300 border-0 bg-card/50 backdrop-blur-sm">
                    <CardHeader className="text-center pb-4">
                      <div className="mx-auto mb-4 p-4 rounded-full bg-muted/50 w-20 h-20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <IconComponent className={`h-10 w-10 ${service.color}`} />
                      </div>
                      <CardTitle className="text-2xl font-bold text-foreground">
                        {service.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <CardDescription className="text-muted-foreground leading-relaxed text-center">
                        {service.description}
                      </CardDescription>
                      
                      <div className="space-y-3">
                        <h4 className="font-semibold text-foreground">Key Features:</h4>
                        <ul className="space-y-2">
                          {service.features.map((feature, featureIndex) => (
                            <li key={featureIndex} className="flex items-center space-x-2 text-sm text-muted-foreground">
                              <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="pt-4">
                        <Button 
                          variant="outline" 
                          className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300"
                        >
                          Learn more
                          <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl font-bold text-foreground mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Contact us today to discuss your specific logistics needs and discover 
              how our services can help your business grow.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="hero" size="lg">
                Get a Quote
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg">
                Contact Us
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Services;