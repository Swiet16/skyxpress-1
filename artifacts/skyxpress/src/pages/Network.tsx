import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, MapPin, Phone, Mail } from "lucide-react";

const Network = () => {
  const continents = [
    {
      name: "North America",
      countries: [
        { name: "United States", cities: ["New York", "Los Angeles", "Chicago"], phone: "+1-800-SKYEXP" },
        { name: "Canada", cities: ["Toronto", "Vancouver", "Montreal"], phone: "+1-800-SKYEXP" },
        { name: "Mexico", cities: ["Mexico City", "Guadalajara"], phone: "+52-800-SKYEXP" }
      ]
    },
    {
      name: "Europe",
      countries: [
        { name: "United Kingdom", cities: ["London", "Manchester"], phone: "+44-800-SKYEXP" },
        { name: "Germany", cities: ["Berlin", "Munich", "Hamburg"], phone: "+49-800-SKYEXP" },
        { name: "France", cities: ["Paris", "Lyon", "Marseille"], phone: "+33-800-SKYEXP" }
      ]
    },
    {
      name: "Asia",
      countries: [
        { name: "Japan", cities: ["Tokyo", "Osaka", "Nagoya"], phone: "+81-800-SKYEXP" },
        { name: "Singapore", cities: ["Singapore"], phone: "+65-800-SKYEXP" },
        { name: "China", cities: ["Beijing", "Shanghai", "Guangzhou"], phone: "+86-800-SKYEXP" }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <section className="py-16 bg-gradient-to-r from-primary/10 to-primary/5">
          <div className="container mx-auto px-4 text-center">
            <Globe className="h-16 w-16 text-primary mx-auto mb-6" />
            <h1 className="text-5xl font-bold text-foreground mb-6">Our Network</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              The SkyXpress network stretches across all continents, 
              providing fast, reliable and secure express delivery services worldwide.
            </p>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="space-y-12">
              {continents.map((continent, index) => (
                <div key={index}>
                  <h2 className="text-3xl font-bold text-foreground mb-8 text-center">
                    {continent.name}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {continent.countries.map((country, countryIndex) => (
                      <Card key={countryIndex} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2">
                            <MapPin className="h-5 w-5 text-primary" />
                            <span>{country.name}</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <h4 className="font-semibold mb-2">Service Areas:</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              {country.cities.map((city, cityIndex) => (
                                <li key={cityIndex}>• {city}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="pt-2 border-t">
                            <div className="flex items-center space-x-2 text-sm">
                              <Phone className="h-4 w-4 text-primary" />
                              <span>{country.phone}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Network;