import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldCheck, 
  Users, 
  UserCheck, 
  UserPlus, 
  Clock, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Eye, 
  LogOut,
  Search,
  AlertCircle,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const AdminPanel = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();



  const ADMIN_PASSWORD = "Medbud@2k26";

  useEffect(() => {
    // Check if already authenticated in session storage
    const auth = sessionStorage.getItem("admin_authenticated");
    if (auth === "true") {
      setIsAuthenticated(true);
      fetchDoctors();
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      sessionStorage.setItem("admin_authenticated", "true");
      fetchDoctors();
      toast({
        title: "Access Granted",
        description: "Welcome to the Admin Control Panel.",
      });
    } else {
      toast({
        title: "Access Denied",
        description: "Invalid administrator password.",
        variant: "destructive",
      });
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem("admin_authenticated");
  };

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const { data: doctorsData, error: doctorsError } = await supabase
        .from("doctors")
        .select('*')
        .order("created_at", { ascending: false });

      if (doctorsError) throw doctorsError;
      
      if (!doctorsData || doctorsData.length === 0) {
        setDoctors([]);
        return;
      }

      // Fetch profiles manually to avoid foreign key issues
      const userIds = doctorsData.map(d => d.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select('id, full_name, phone')
        .in("id", userIds);
        
      if (profilesError) throw profilesError;
      
      const mergedData = doctorsData.map(doc => {
        const profile = profilesData?.find(p => p.id === doc.user_id);
        return {
          ...doc,
          profiles: profile || null
        };
      });

      setDoctors(mergedData);
    } catch (error: any) {
      toast({
        title: "Error fetching data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateDoctorStatus = async (doctorId: string, status: "APPROVED" | "REJECTED") => {
    const action = status === "APPROVED" ? "approve" : "reject";
    if (!window.confirm(`Are you sure you want to ${action} this doctor?`)) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from("doctors")
        .update({ 
          is_active: status === "APPROVED"
        })
        .eq("id", doctorId);

      if (error) throw error;

      toast({
        title: `Doctor ${status === "APPROVED" ? "Approved" : "Rejected"}`,
        description: `The doctor has been ${status.toLowerCase()} successfully.`,
      });

      fetchDoctors();
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteDoctor = async (doctorId: string) => {
    if (!window.confirm("Are you sure you want to DELETE this doctor's profile? This cannot be undone.")) return;
    
    setLoading(true);
    try {
      const doctor = doctors.find(d => d.id === doctorId);
      const userId = doctor?.user_id;

      // Delete related data first (ignore errors for tables that may be empty)
      if (userId) {
        await supabase.from("patient_records").delete().eq("doctor_id", doctorId);
        await supabase.from("tokens").delete().eq("doctor_id", doctorId);
        await supabase.from("appointments").delete().eq("doctor_id", doctorId);
        await supabase.from("prepone_requests").delete().eq("doctor_id", doctorId);
        await supabase.from("clinics").delete().eq("doctor_id", doctorId);
      }

      // Delete the doctor record
      const { error } = await supabase.from("doctors").delete().eq("id", doctorId);
      if (error) throw error;

      // Clean up user data
      if (userId) {
        await supabase.from("user_roles").delete().eq("user_id", userId);
        await supabase.from("profiles").delete().eq("id", userId);
      }

      toast({
        title: "Doctor Deleted",
        description: "Profile removed. The doctor must register again.",
      });

      fetchDoctors();
    } catch (error: any) {
      toast({
        title: "Deletion failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getDocStatus = (doc: any) => {
    if (doc.is_active === true) return "APPROVED";
    if (doc.is_active === false) return "REJECTED";
    return "PENDING";
  };

  const filteredDoctors = doctors.filter(doc => {
    const status = getDocStatus(doc);
    const matchesFilter = filter === "ALL" || status === filter;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      (doc.profiles?.full_name?.toLowerCase().includes(searchLower)) ||
      (doc.license_number?.toLowerCase().includes(searchLower)) ||
      (doc.specialization?.toLowerCase().includes(searchLower));
    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: doctors.length,
    pending: doctors.filter(d => getDocStatus(d) === "PENDING").length,
    approved: doctors.filter(d => getDocStatus(d) === "APPROVED").length,
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <Card className="p-8 border-slate-800 bg-slate-900 shadow-2xl">
            <div className="flex flex-col items-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mb-4">
                <ShieldCheck className="w-10 h-10 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-white">Admin Access</h1>
              <p className="text-slate-400 text-sm">Enter administrator password to continue</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <Input
                  type="password"
                  placeholder="Enter Admin Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 h-12"
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full h-12 text-lg font-semibold">
                Authorize
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-800 text-center">
              <button 
                onClick={() => toast({ title: "Hint", description: "Password is Medbud@2k26" })}
                className="text-xs text-slate-600 hover:text-slate-400"
              >
                Forgot Password?
              </button>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Admin Dashboard</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-destructive">
            <LogOut className="mr-2 h-4 w-4" /> Sign Out
          </Button>
        </div>
      </header>

      <main className="container py-8">
        {/* Stats Grid — Clickable cards to filter */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card 
            className={`p-6 border-l-4 border-l-blue-500 cursor-pointer transition-all hover:shadow-lg ${filter === "ALL" ? "ring-2 ring-blue-500" : ""}`}
            onClick={() => setFilter("ALL")}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Doctors</p>
                <h3 className="text-3xl font-bold mt-1">{stats.total}</h3>
              </div>
              <Users className="h-10 w-10 text-blue-500/20" />
            </div>
          </Card>
          <Card 
            className={`p-6 border-l-4 border-l-amber-500 cursor-pointer transition-all hover:shadow-lg ${filter === "PENDING" ? "ring-2 ring-amber-500" : ""}`}
            onClick={() => setFilter("PENDING")}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Approvals</p>
                <h3 className="text-3xl font-bold mt-1">{stats.pending}</h3>
              </div>
              <Clock className="h-10 w-10 text-amber-500/20" />
            </div>
          </Card>
          <Card 
            className={`p-6 border-l-4 border-l-green-500 cursor-pointer transition-all hover:shadow-lg ${filter === "APPROVED" ? "ring-2 ring-green-500" : ""}`}
            onClick={() => setFilter("APPROVED")}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Approved Doctors</p>
                <h3 className="text-3xl font-bold mt-1">{stats.approved}</h3>
              </div>
              <UserCheck className="h-10 w-10 text-green-500/20" />
            </div>
          </Card>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
          <div className="flex items-center gap-2 bg-muted p-1 rounded-lg w-full md:w-auto">
            {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  filter === t 
                    ? "bg-background text-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name, license or specialty..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Doctor Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="p-4 text-sm font-semibold text-muted-foreground">Doctor</th>
                  <th className="p-4 text-sm font-semibold text-muted-foreground">License Info</th>
                  <th className="p-4 text-sm font-semibold text-muted-foreground">Status</th>
                  <th className="p-4 text-sm font-semibold text-muted-foreground">Created At</th>
                  <th className="p-4 text-sm font-semibold text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredDoctors.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-muted-foreground">
                      <AlertCircle className="h-10 w-10 mx-auto mb-2 opacity-20" />
                      <p>No doctors found matching your criteria.</p>
                    </td>
                  </tr>
                ) : (
                  filteredDoctors.map((doc) => {
                    const status = getDocStatus(doc);
                    return (
                      <tr key={doc.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                              {doc.profiles?.full_name?.charAt(0) || "D"}
                            </div>
                            <div>
                              <p className="font-semibold">{doc.profiles?.full_name || "Unknown Doctor"}</p>
                              <p className="text-xs text-muted-foreground">{doc.specialization} • {doc.experience_years || 0} yrs exp</p>
                              {doc.profiles?.phone && (
                                <p className="text-xs text-muted-foreground">{doc.profiles.phone}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="space-y-1">
                            <p className="text-sm font-mono font-semibold">{doc.license_number || "Not provided"}</p>
                            <p className="text-xs text-muted-foreground">Fee: ₹{doc.consultation_fee}</p>
                            {doc.document_url && (
                              <a 
                                href={doc.document_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline flex items-center gap-1"
                              >
                                <FileText className="h-3 w-3" /> View Document
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            status === "APPROVED" 
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                              : status === "PENDING"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          }`}>
                            {status}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {new Date(doc.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {status === "PENDING" && (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={() => updateDoctorStatus(doc.id, "APPROVED")}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" /> Approve
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-8 text-destructive hover:bg-destructive/10"
                                  onClick={() => updateDoctorStatus(doc.id, "REJECTED")}
                                >
                                  <XCircle className="h-4 w-4 mr-1" /> Reject
                                </Button>
                              </>
                            )}
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => deleteDoctor(doc.id)}
                              title="Delete Doctor"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </main>


    </div>
  );
};

export default AdminPanel;
