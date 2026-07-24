import Header from "@/components/Header";
import Footer from "@/components/Footer";

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-foreground mb-8">About SkyXpress</h1>
        <div className="prose prose-lg max-w-4xl">
          <p className="text-xl text-muted-foreground mb-8">
            With more than 40 years of experience in the industry, SkyXpress 
            has been delivering excellence in logistics and shipping services worldwide.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div>
              <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
              <p className="text-muted-foreground">
                To provide fast, reliable, and secure express delivery services that connect 
                businesses and individuals across the globe, enabling commerce and communication 
                in an increasingly connected world.
              </p>
            </div>
            
            <div>
              <h2 className="text-2xl font-bold mb-4">Our Vision</h2>
              <p className="text-muted-foreground">
                To be the world's most trusted logistics partner, setting the standard for 
                excellence in international shipping and supply chain solutions.
              </p>
            </div>
          </div>

          <div className="bg-muted/30 rounded-lg p-8 mb-8">
            <h2 className="text-2xl font-bold mb-4">Why Choose SkyXpress?</h2>
            <ul className="space-y-3">
              <li className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                <span>Global network spanning 190+ countries and territories</span>
              </li>
              <li className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                <span>99.9% on-time delivery rate with real-time tracking</span>
              </li>
              <li className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                <span>Committed and qualified personnel with decades of experience</span>
              </li>
              <li className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                <span>Comprehensive insurance coverage and secure handling</span>
              </li>
            </ul>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default About;