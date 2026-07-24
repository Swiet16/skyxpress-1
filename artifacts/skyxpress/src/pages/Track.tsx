import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PublicTracking from "@/components/PublicTracking";

const Track = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <PublicTracking />
      </main>
      <Footer />
    </div>
  );
};

export default Track;