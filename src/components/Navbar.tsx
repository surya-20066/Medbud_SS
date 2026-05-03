import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Stethoscope } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";

const Navbar = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);

  const fetchUserRole = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();
    setRole(data?.role ?? "patient");
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchUserRole(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRole(session.user.id);
      } else {
        setRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };
  
  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border"
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <a 
            href={!user ? "/#home" : role === "doctor" ? "/doctor-dashboard" : "/patient-dashboard"}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Stethoscope className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-foreground">MedBud</span>
          </a>

          <div className="hidden md:flex items-center gap-8">
            <a href="/#home" className="text-foreground hover:text-primary transition-smooth">
              Home
            </a>
            <a href="/#about" className="text-foreground hover:text-primary transition-smooth">
              About Us
            </a>
            <a href="/#features" className="text-foreground hover:text-primary transition-smooth">
              Features
            </a>
            <a href="/#testimonials" className="text-foreground hover:text-primary transition-smooth">
              Testimonials
            </a>
            {!user && (
              <a href="/doctor-auth" className="text-foreground hover:text-primary transition-smooth">
                For Doctors
              </a>
            )}
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Button variant="ghost" onClick={() => navigate(role === "doctor" ? "/doctor-dashboard" : "/patient-dashboard")}>
                  Dashboard
                </Button>
                <Button variant="ghost" onClick={handleLogout}>Logout</Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate("/auth")}>Login</Button>
                <Button className="shadow-soft" onClick={() => navigate("/auth")}>Get Started</Button>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
