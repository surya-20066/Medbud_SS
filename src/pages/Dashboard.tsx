import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, FileText, LogOut, User } from "lucide-react";
import { Session } from "@supabase/supabase-js";

const Dashboard = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;

    // Get initial session
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted) {
        setSession(session);
        if (!session) {
          navigate("/auth");
        } else {
          fetchUserData(session.user.id);
        }
      }
    };
    initSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted) {
        setSession(session);
        if (event === "SIGNED_OUT") {
          navigate("/auth");
        } else if (session) {
          fetchUserData(session.user.id);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (rolesError) throw rolesError;
      const roles = rolesData.map((r) => r.role);
      setUserRoles(roles);
      
      if (roles.includes("doctor")) {
        navigate("/doctor-dashboard");
        return;
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to logout. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Logged out",
        description: "You have been logged out successfully.",
      });
      navigate("/");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <Button onClick={handleLogout} variant="ghost" size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <div className="bg-card rounded-xl shadow-soft p-6 border border-border">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  Welcome, {profile?.full_name || "User"}!
                </h2>
                <p className="text-muted-foreground">
                  Role: {userRoles.join(", ") || "Patient"}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="text-sm">
                <span className="text-muted-foreground">Email:</span>
                <span className="text-foreground ml-2">{session?.user.email}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Phone:</span>
                <span className="text-foreground ml-2">{profile?.phone || "Not set"}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-card rounded-xl shadow-soft p-6 border border-border cursor-pointer"
            >
              <Calendar className="w-10 h-10 text-primary mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">My Appointments</h3>
              <p className="text-muted-foreground text-sm">View and manage your appointments</p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-card rounded-xl shadow-soft p-6 border border-border cursor-pointer"
            >
              <Clock className="w-10 h-10 text-primary mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">My Tokens</h3>
              <p className="text-muted-foreground text-sm">Check your queue tokens</p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-card rounded-xl shadow-soft p-6 border border-border cursor-pointer"
            >
              <FileText className="w-10 h-10 text-primary mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Medical Records</h3>
              <p className="text-muted-foreground text-sm">Access your medical history</p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
