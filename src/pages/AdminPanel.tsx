import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLogin from "@/components/admin/AdminLogin";
import AdminSidebar, { type AdminView } from "@/components/admin/AdminSidebar";
import AdminOverview from "@/components/admin/AdminOverview";
import AdminDoctors from "@/components/admin/AdminDoctors";
import AdminPatients from "@/components/admin/AdminPatients";
import AdminAppointments from "@/components/admin/AdminAppointments";
import AdminActivity from "@/components/admin/AdminActivity";
import AdminSettings from "@/components/admin/AdminSettings";
import { AnimatePresence, motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const AdminPanel = () => {
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(() =>
    sessionStorage.getItem("admin_authenticated") === "true"
  );
  const [activeView, setActiveView] = useState<AdminView>("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [doctors, setDoctors] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [tokens, setTokens] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // ============ DATA FETCHING (no foreign key joins - manual merge) ============

  const fetchDoctors = useCallback(async () => {
    try {
      // Step 1: Get all doctors
      const { data: doctorRows, error: docErr } = await supabase
        .from("doctors")
        .select("*")
        .order("created_at", { ascending: false });

      if (docErr) { console.error("Doctor fetch error:", docErr); setDoctors([]); return; }
      if (!doctorRows || doctorRows.length === 0) { setDoctors([]); return; }

      // Step 2: Get profiles for these doctors
      const userIds = doctorRows.map(d => d.user_id).filter(Boolean);
      let profileMap = new Map<string, any>();

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("*")
          .in("id", userIds);
        profiles?.forEach(p => profileMap.set(p.id, p));
      }

      // Step 3: Merge
      const merged = doctorRows.map(d => ({
        ...d,
        profiles: profileMap.get(d.user_id) || null,
      }));

      setDoctors(merged);
    } catch (err) {
      console.error("Error fetching doctors:", err);
    }
  }, []);

  const fetchPatients = useCallback(async () => {
    try {
      // Step 1: Get all doctor user_ids to exclude them
      const { data: docRows } = await supabase.from("doctors").select("user_id");
      const docUserIds = new Set(docRows?.map(d => d.user_id).filter(Boolean) || []);

      // Step 2: Try to get patients from user_roles
      const { data: roleData } = await supabase.from("user_roles").select("user_id").eq("role", "patient");
      const patientIdsFromRoles = roleData?.map(r => r.user_id) || [];

      // Step 3: Fetch profiles
      let query = supabase.from("profiles").select("*");
      
      // If we have specific patient IDs from roles, use them. 
      // Otherwise, fetch all profiles and filter out doctors manually (fallback)
      if (patientIdsFromRoles.length > 0) {
        query = query.in("id", patientIdsFromRoles);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;

      // Filter out doctors if we're doing a broad search
      const filteredData = patientIdsFromRoles.length > 0 
        ? (data || []) 
        : (data || []).filter(p => !docUserIds.has(p.id));

      setPatients(filteredData.map(p => ({ ...p, role: "patient" })));
      console.log(`Fetched ${filteredData.length} patients (Fallback mode: ${patientIdsFromRoles.length === 0})`);
    } catch (err) {
      console.error("Error fetching patients:", err);
    }
  }, []);

  const fetchAppointments = useCallback(async () => {
    try {
      // Step 1: Get all appointments
      const { data: apptRows, error: apptErr } = await supabase
        .from("appointments")
        .select("*")
        .order("appointment_date", { ascending: false })
        .limit(200);

      if (apptErr) { console.error("Appt error:", apptErr); setAppointments([]); return; }
      if (!apptRows || apptRows.length === 0) { setAppointments([]); return; }

      // Step 2: Get doctor IDs, then doctor user_ids, then profile names
      const doctorIds = [...new Set(apptRows.map(a => a.doctor_id).filter(Boolean))];

      let docNameMap = new Map<string, string>();
      if (doctorIds.length > 0) {
        const { data: docRows } = await supabase.from("doctors").select("id, user_id").in("id", doctorIds);
        const docUserIds = docRows?.map(d => d.user_id).filter(Boolean) || [];

        if (docUserIds.length > 0) {
          const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", docUserIds);
          const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
          docRows?.forEach(d => {
            docNameMap.set(d.id, profileMap.get(d.user_id) || "Unknown");
          });
        }
      }

      setAppointments(apptRows.map(a => ({
        ...a,
        doctorName: docNameMap.get(a.doctor_id) || "Unknown",
      })));
    } catch (err) {
      console.error("Error fetching appointments:", err);
    }
  }, []);

  const fetchTokens = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("tokens").select("id, doctor_id, status");
      if (!error && data) setTokens(data);
    } catch (err) {
      console.error("Error fetching tokens:", err);
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    setLoadingData(true);
    await Promise.all([fetchDoctors(), fetchPatients(), fetchAppointments(), fetchTokens()]);
    setLoadingData(false);
  }, [fetchDoctors, fetchPatients, fetchAppointments, fetchTokens]);

  // ============ REALTIME SUBSCRIPTIONS ============

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchAllData();

    const ch1 = supabase.channel("adm-doc").on("postgres_changes", { event: "*", schema: "public", table: "doctors" }, (payload) => {
      fetchDoctors();
      // Show explicit toast if a new doctor registers
      if (payload.eventType === "INSERT" && payload.new.is_active === null) {
        toast({
          title: "👨‍⚕️ New Doctor Registration!",
          description: "A new doctor has registered and is awaiting your approval.",
          variant: "default",
          duration: 10000,
        });
      }
    }).subscribe();

    const ch2 = supabase.channel("adm-prof").on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => { fetchDoctors(); fetchPatients(); }).subscribe();
    const ch3 = supabase.channel("adm-appt").on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => fetchAppointments()).subscribe();
    const ch4 = supabase.channel("adm-role").on("postgres_changes", { event: "*", schema: "public", table: "user_roles" }, () => { fetchPatients(); fetchDoctors(); }).subscribe();

    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); supabase.removeChannel(ch3); supabase.removeChannel(ch4); };
  }, [isAuthenticated, fetchAllData, fetchDoctors, fetchPatients, fetchAppointments, toast]);

  const handleLogout = () => {
    sessionStorage.removeItem("admin_authenticated");
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <AdminLogin onLogin={() => setIsAuthenticated(true)} />;
  }

  const today = new Date().toISOString().split("T")[0];
  const pendingDoctors = doctors.filter(d => d.is_active === null).length;
  const pendingAppointments = appointments.filter(a => a.status === "pending").length;
  const approvedDoctors = doctors.filter(d => d.is_active === true).length;
  const todayAppointments = appointments.filter(a => a.appointment_date === today).length;

  const revenueEstimate = doctors.reduce((sum, d) => {
    // Revenue is based on accepted patients, which is represented by tokens (both booked and walk-in)
    const acceptedCount = tokens.filter(t => t.doctor_id === d.id && t.status !== "cancelled").length;
    return sum + (acceptedCount * (d.consultation_fee || 0));
  }, 0);

  const overviewStats = {
    totalDoctors: doctors.length, pendingDoctors, approvedDoctors,
    totalPatients: patients.length, totalAppointments: appointments.length,
    todayAppointments, pendingAppointments, totalRevenue: revenueEstimate,
    recentDoctors: doctors.slice(0, 5), recentPatients: patients.slice(0, 5),
  };

  const sidebarWidth = sidebarCollapsed ? 72 : 260;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AdminSidebar activeView={activeView} onViewChange={setActiveView} onLogout={handleLogout}
        collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        pendingDoctors={pendingDoctors} pendingAppointments={pendingAppointments} />

      <main className="transition-all duration-300 ease-in-out min-h-screen" style={{ marginLeft: sidebarWidth }}>
        <div className="p-6 md:p-8 max-w-[1600px]">
          {loadingData && doctors.length === 0 && patients.length === 0 ? (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center">
                <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Loading platform data...</p>
              </div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div key={activeView} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                {activeView === "overview" && <AdminOverview stats={overviewStats} onNavigate={(v) => setActiveView(v as AdminView)} />}
                {activeView === "doctors" && <AdminDoctors doctors={doctors} onRefresh={fetchDoctors} />}
                {activeView === "patients" && <AdminPatients patients={patients} onRefresh={fetchPatients} />}
                {activeView === "appointments" && <AdminAppointments appointments={appointments} onRefresh={fetchAppointments} />}
                {activeView === "activity" && <AdminActivity />}
                {activeView === "settings" && <AdminSettings />}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminPanel;
