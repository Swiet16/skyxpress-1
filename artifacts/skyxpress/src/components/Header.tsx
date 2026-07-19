import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plane, Menu, X, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";

interface HeaderProps {
  user?: any;
}

const Header = ({ user }: HeaderProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        variant: "destructive",
        title: "Error signing out",
        description: error.message,
      });
    } else {
      toast({
        title: "Signed out successfully",
      });
      navigate("/");
    }
  };

  return (
    <header className="bg-background border-b border-border shadow-sm">
      <div className="container mx-auto px-4">
        {/* Desktop Layout */}
        <div className="hidden md:flex flex-col items-center py-4">
          {/* Logo - Centered */}
          <div className="flex items-center justify-center mb-4">
            <Link to="/" className="flex items-center group">
              <img
                src="https://thunaolandjuvuhvbsds.supabase.co/storage/v1/object/public/File/Logo1.png"
              
                alt="SkyXpress Logo"
                className="h-[350px] w-auto object-contain transition-transform duration-100 group-hover:scale-105"
              />
            </Link>
          </div>

          {/* Navigation and Auth - Centered */}
          <div className="flex items-center justify-center w-full">
            <nav className="flex items-center space-x-8 mr-8">
              <Link to="/services" className="text-foreground hover:text-primary transition-colors">
                Services
              </Link>
              <Link to="/network" className="text-foreground hover:text-primary transition-colors">
                Our Network
              </Link>
              <Link to="/about" className="text-foreground hover:text-primary transition-colors">
                About Us
              </Link>
              <Link to="/contact" className="text-foreground hover:text-primary transition-colors">
                Contact Us
              </Link>
            </nav>

            {/* Auth Buttons */}
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <Link to="/dashboard">
                    <Button variant="ghost">Dashboard</Button>
                  </Link>
                  <Button variant="outline" onClick={handleSignOut}>
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/auth">
                    <Button variant="ghost">Sign In</Button>
                  </Link>
                  <Link to="/auth">
                    <Button className="bg-primary hover:bg-primary/90">Get Started</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden flex flex-col items-center py-4">
          {/* Logo - Centered */}
          <div className="flex items-center justify-center mb-4">
            <Link to="/" className="flex items-center group">
              <img
                 src="https://thunaolandjuvuhvbsds.supabase.co/storage/v1/object/public/File/Logo1.png"
                alt="SkyXpress Logo"
                className="h-[180px] w-auto object-contain transition-transform duration-300 group-hover:scale-105"
              />
            </Link>
          </div>

          {/* Mobile Menu Button - Centered below logo */}
          <Button
            variant="ghost"
            size="lg"
            className="w-full max-w-xs justify-center"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-6 w-6 mr-2" /> : <Menu className="h-6 w-6 mr-2" />}
            Menu - Navigation
          </Button>

          {/* Mobile Navigation Menu */}
          {isMenuOpen && (
            <div className="py-4 border-t border-border w-full">
              <nav className="flex flex-col space-y-4 items-center">
                <Link
                  to="/services"
                  className="text-foreground hover:text-primary transition-colors text-center py-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Services
                </Link>
                <Link
                  to="/network"
                  className="text-foreground hover:text-primary transition-colors text-center py-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Our Network
                </Link>
                <Link
                  to="/about"
                  className="text-foreground hover:text-primary transition-colors text-center py-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  About Us
                </Link>
                <Link
                  to="/contact"
                  className="text-foreground hover:text-primary transition-colors text-center py-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Contact Us
                </Link>

                {/* Mobile Auth Buttons */}
                <div className="flex flex-col space-y-3 w-full max-w-xs pt-4 border-t border-border">
                  {user ? (
                    <>
                      <Link to="/dashboard" onClick={() => setIsMenuOpen(false)}>
                        <Button variant="ghost" className="w-full">Dashboard</Button>
                      </Link>
                      <Button variant="outline" onClick={() => { handleSignOut(); setIsMenuOpen(false); }} className="w-full">
                        Sign Out
                      </Button>
                    </>
                  ) : (
                    <>
                      <Link to="/auth" onClick={() => setIsMenuOpen(false)}>
                        <Button variant="ghost" className="w-full">Sign In</Button>
                      </Link>
                      <Link to="/auth" onClick={() => setIsMenuOpen(false)}>
                        <Button className="w-full bg-primary hover:bg-primary/90">Get Started</Button>
                      </Link>
                    </>
                  )}
                </div>
              </nav>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;