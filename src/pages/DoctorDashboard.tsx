import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useNotifications } from "@/hooks/useNotifications";
import {
  Calendar,
  Clock,
  FileText,
  LogOut,
  User,
  Users,
  Stethoscope,
  Bell,
  ChevronRight,
  CheckCircle,
  XCircle,
  PlayCircle,
  Search,
  ArrowLeft,
  Save,
  ArrowUpCircle,
  Check,
  X,
  Eye,
  Pencil,
  ImagePlus,
  Loader2,
  CalendarCheck,
  AlertCircle
} from "lucide-react";
import { Session } from "@supabase/supabase-js";
import { ScrollArea } from "@/components/ui/scroll-area";

type ViewMode = "dashboard" | "tokens" | "patients" | "records" | "patient-detail" | "settings" | "prepone-requests" | "appointments" | "booking-requests";

const DoctorDashboard = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [doctorInfo, setDoctorInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("dashboard");
  const [tokens, setTokens] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [patientRecords, setPatientRecords] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [preponeRequests, setPreponeRequests] = useState<any[]>([]);
  const [bookingRequests, setBookingRequests] = useState<any[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);
  const [todayStats, setTodayStats] = useState({ total: 0, completed: 0, waiting: 0 });

  // For creating/editing records
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [recordForm, setRecordForm] = useState({
    diagnosis: "",
    prescription: "",
    notes: ""
  });

  // For viewing/updating existing records
  const [viewingRecordPatient, setViewingRecordPatient] = useState<any>(null);
  const [showViewRecordModal, setShowViewRecordModal] = useState(false);
  const [showUpdateRecordModal, setShowUpdateRecordModal] = useState(false);
  const [updateRecordForm, setUpdateRecordForm] = useState({
    diagnosis: "",
    prescription: "",
    notes: "",
    attachments: [] as string[]
  });
  const [updatingRecordId, setUpdatingRecordId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Confirmation modal for status toggle
  const [confirmToggle, setConfirmToggle] = useState<{ tokenId: string; currentStatus: string; newStatus: string; patientName: string } | null>(null);

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted) {
        setSession(session);
        if (!session) {
          navigate("/auth");
        } else {
          fetchDoctorData(session.user.id);
        }
      }
    };
    
    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted) {
        setSession(session);
        if (event === "SIGNED_OUT") {
          navigate("/auth");
        } else if (session) {
          fetchDoctorData(session.user.id);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const fetchDoctorData = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      setProfile(profileData);

      // Fetch doctor info
      const { data: doctorData } = await supabase
        .from("doctors")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (!doctorData) {
        toast({
          title: "Access Denied",
          description: "You are not registered as a doctor.",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      // If doctor is rejected (is_active === false), redirect or show message
      if (doctorData.is_active === false) {
        toast({
          title: "Account Rejected",
          description: "Your doctor account has been rejected by the administrator. Please contact support.",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      setDoctorInfo(doctorData);

      // Fetch today's tokens
      const today = new Date().toISOString().split("T")[0];
      const { data: tokensData } = await supabase
        .from("tokens")
        .select(`
          *,
          profiles:patient_id (full_name, phone)
        `)
        .eq("doctor_id", doctorData.id)
        .eq("token_date", today)
        .order("token_number", { ascending: true });

      if (tokensData) {
        setTokens(tokensData);
        const completed = tokensData.filter(t => t.status === "completed").length;
        const waiting = tokensData.filter(t => t.status === "waiting").length;
        setTodayStats({ total: tokensData.length, completed, waiting });
      }

      // Fetch confirmed appointments for today + next 7 days with patient details
      const weekFromNow = new Date();
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      const weekEnd = weekFromNow.toISOString().split("T")[0];
      const { data: appointmentsData } = await supabase
        .from("appointments")
        .select("*, profiles:patient_id (full_name, phone)")
        .eq("doctor_id", doctorData.id)
        .eq("status", "confirmed")
        .gte("appointment_date", today)
        .lte("appointment_date", weekEnd)
        .order("appointment_date", { ascending: true })
        .order("appointment_time", { ascending: true });

      if (appointmentsData) setAppointments(appointmentsData);

      // Fetch pending booking requests
      const { data: pendingData } = await supabase
        .from("appointments")
        .select("*, profiles:patient_id (full_name, phone)")
        .eq("doctor_id", doctorData.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (pendingData) setBookingRequests(pendingData);

      // Fetch patients with records
      const { data: recordsData } = await supabase
        .from("patient_records")
        .select(`
          *,
          profiles:patient_id (id, full_name, phone),
          tokens:token_id (token_number, token_date)
        `)
        .eq("doctor_id", doctorData.id)
        .order("created_at", { ascending: false });

      if (recordsData) {
        setPatientRecords(recordsData);
        // Get unique patients from records
        const uniquePatients = new Map();
        recordsData.forEach(record => {
          if (record.profiles && !uniquePatients.has(record.profiles.id)) {
            uniquePatients.set(record.profiles.id, record.profiles);
          }
        });

        // Also add patients from completed tokens (so completed patients auto-appear)
        if (tokensData) {
          tokensData.forEach(token => {
            if (token.status === "completed" && token.patient_id && token.profiles && !uniquePatients.has(token.patient_id)) {
              uniquePatients.set(token.patient_id, {
                id: token.patient_id,
                full_name: token.profiles.full_name,
                phone: token.profiles.phone,
              });
            }
          });
        }

        setPatients(Array.from(uniquePatients.values()));
      }

    } catch (error) {
      console.error("Error fetching doctor data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookingAction = async (appointmentId: string, action: "accept" | "decline") => {
    try {
      if (action === "accept") {
        const { error } = await supabase
          .from("appointments")
          .update({ status: "confirmed" })
          .eq("id", appointmentId);

        if (error) throw error;

        // Create notification for patient
        const appointment = bookingRequests.find(a => a.id === appointmentId);
        if (appointment && appointment.patient_id) {
          // Create token for the appointment
          const { count } = await supabase
            .from("tokens")
            .select('*', { count: 'exact', head: true })
            .eq('doctor_id', doctorInfo.id)
            .eq('token_date', appointment.appointment_date);
          
          const orderIndex = (count || 0) + 1;
          const day = new Date(appointment.appointment_date).getDate().toString().padStart(2, '0');
          const newTokenNumber = Number(`${day}${orderIndex.toString().padStart(2, '0')}`);

          await supabase.from("tokens").insert({
            doctor_id: doctorInfo.id,
            patient_id: appointment.patient_id,
            appointment_id: appointmentId,
            token_number: newTokenNumber,
            token_date: appointment.appointment_date,
            token_type: "online",
            status: "waiting",
            estimated_time: `${appointment.appointment_date}T${appointment.appointment_time}`,
          });

          await supabase.from("notifications").insert({
            user_id: appointment.patient_id,
            type: "appointment_confirmed",
            title: "✅ Appointment Confirmed!",
            message: `Dr. ${profile?.full_name} has accepted your appointment for ${new Date(appointment.appointment_date).toLocaleDateString()} at ${appointment.appointment_time}.`,
            metadata: { appointment_id: appointmentId },
          });
        }

        toast({ title: "Appointment Accepted", description: "The patient has been notified and a token has been generated." });
      } else {
        const { error } = await supabase
          .from("appointments")
          .update({ status: "cancelled" })
          .eq("id", appointmentId);

        if (error) throw error;
        toast({ title: "Appointment Declined", variant: "destructive" });
      }

      if (session) fetchDoctorData(session.user.id);
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to update appointment", variant: "destructive" });
    }
  };

  // Notifications hook
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(
    session?.user?.id || null
  );

  // Fetch prepone requests
  const fetchPreponeRequests = useCallback(async () => {
    if (!doctorInfo) return;
    const { data } = await supabase
      .from("prepone_requests")
      .select("*, profiles:patient_id (full_name, phone)")
      .eq("doctor_id", doctorInfo.id)
      .order("created_at", { ascending: false });
    if (data) setPreponeRequests(data);
  }, [doctorInfo]);

  useEffect(() => {
    fetchPreponeRequests();
  }, [fetchPreponeRequests]);

  // Realtime: new tokens for this doctor
  useRealtimeSubscription({
    table: "tokens",
    filter: doctorInfo ? `doctor_id=eq.${doctorInfo.id}` : undefined,
    enabled: !!doctorInfo,
    onInsert: () => {
      if (doctorInfo) fetchDoctorData(session!.user.id);
      toast({ title: "🔔 New Patient", description: "A new appointment has been booked!" });
    },
    onUpdate: () => {
      if (doctorInfo) fetchDoctorData(session!.user.id);
    },
  });

  // Realtime: new prepone requests for this doctor
  useRealtimeSubscription({
    table: "prepone_requests",
    filter: doctorInfo ? `doctor_id=eq.${doctorInfo.id}` : undefined,
    enabled: !!doctorInfo,
    onInsert: () => {
      fetchPreponeRequests();
      toast({ title: "📋 Prepone Request", description: "A patient has requested to prepone their appointment." });
    },
    onUpdate: () => {
      fetchPreponeRequests();
    },
  });

  // Realtime: new/updated appointments for this doctor
  useRealtimeSubscription({
    table: "appointments",
    filter: doctorInfo ? `doctor_id=eq.${doctorInfo.id}` : undefined,
    enabled: !!doctorInfo,
    onInsert: () => {
      if (session) fetchDoctorData(session.user.id);
      toast({ title: "🆕 New Booking!", description: "A patient just booked an appointment!" });
    },
    onUpdate: () => {
      if (session) fetchDoctorData(session.user.id);
    },
  });

  // Close notification dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle prepone approve/decline
  const handlePreponeAction = async (requestId: string, action: "approved" | "declined", request: any) => {
    try {
      // Update prepone request status
      await supabase
        .from("prepone_requests")
        .update({ status: action, updated_at: new Date().toISOString() })
        .eq("id", requestId);

      // If approved, update the appointment date/time
      if (action === "approved") {
        await supabase
          .from("appointments")
          .update({
            appointment_date: request.requested_date,
            appointment_time: request.requested_time,
            updated_at: new Date().toISOString(),
          })
          .eq("id", request.appointment_id);

        // Also update the token
        await supabase
          .from("tokens")
          .update({
            token_date: request.requested_date,
            estimated_time: `${request.requested_date}T${request.requested_time}`,
          })
          .eq("appointment_id", request.appointment_id);
      }

      // Create notification for the patient
      await supabase.from("notifications").insert({
        user_id: request.patient_id,
        type: action === "approved" ? "prepone_approved" : "prepone_declined",
        title: action === "approved" ? "Prepone Request Approved ✅" : "Prepone Request Declined ❌",
        message: action === "approved"
          ? `Your appointment has been moved to ${request.requested_date} at ${request.requested_time}.`
          : `Your prepone request for ${request.requested_date} was declined by the doctor.`,
        metadata: { appointment_id: request.appointment_id },
      });

      toast({ title: "Success", description: `Request ${action} successfully` });
      fetchPreponeRequests();
      if (session) fetchDoctorData(session.user.id);
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to process request", variant: "destructive" });
    }
  };


  const handleTokenStatusChange = async (tokenId: string, newStatus: string) => {
    try {
      const { error: updateError } = await supabase
        .from("tokens")
        .update({ status: newStatus })
        .eq("id", tokenId);

      if (updateError) throw updateError;

      toast({ title: "Success", description: `Token marked as ${newStatus}` });
      
      // Auto-create an empty record when a token is completed, if it doesn't exist
      if (newStatus === "completed" && doctorInfo) {
        // Fetch the specific token to get the latest patient_id
        const { data: tokenData, error: tokenError } = await supabase
          .from("tokens")
          .select("patient_id")
          .eq("id", tokenId)
          .single();

        if (tokenError) {
          console.error("Error fetching token for record creation:", tokenError);
        } else if (tokenData && tokenData.patient_id) {
          const { data: existingRecords, error: checkError } = await supabase
            .from("patient_records")
            .select("id")
            .eq("token_id", tokenId);
            
          if (checkError) {
            console.error("Error checking existing records:", checkError);
          } else if (!existingRecords || existingRecords.length === 0) {
            const { error: insertError } = await supabase.from("patient_records").insert({
              patient_id: tokenData.patient_id,
              doctor_id: doctorInfo.id,
              token_id: tokenId,
              diagnosis: "",
              prescription: "",
              notes: "",
              attachments: []
            });
            if (insertError) console.error("Error creating auto-record:", insertError);
          }
        } else {
          console.log("Token has no patient_id, skipping record creation");
        }
      }

      // Re-fetch all data to ensure UI is in sync
      if (session) {
        await fetchDoctorData(session.user.id);
      }
    } catch (error: any) {
      console.error("Error in handleTokenStatusChange:", error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update token status", 
        variant: "destructive" 
      });
    }
  };

  const handleSaveRecord = async () => {
    if (!selectedPatient || !doctorInfo) return;

    // Find the latest token for this patient
    const latestToken = tokens.find(t => t.patient_id === selectedPatient.id && t.status === "in_progress");

    if (!latestToken) {
      toast({ title: "Error", description: "No active token found for this patient", variant: "destructive" });
      return;
    }

    const recordData = {
      patient_id: selectedPatient.id,
      doctor_id: doctorInfo.id,
      token_id: latestToken.id,
      diagnosis: recordForm.diagnosis,
      prescription: recordForm.prescription,
      notes: recordForm.notes,
    };

    const { error } = await supabase
      .from("patient_records")
      .insert(recordData);

    if (error) {
      toast({ title: "Error", description: "Failed to save record", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Patient record saved" });
      setRecordForm({ diagnosis: "", prescription: "", notes: "" });
      // Mark token as completed
      await handleTokenStatusChange(latestToken.id, "completed");
      setViewMode("tokens");
    }
  };

  // Handle image upload for record update
  const handleRecordImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUpdateRecordForm(prev => ({
          ...prev,
          attachments: [...prev.attachments, reader.result as string]
        }));
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast({ title: "Error", description: "Failed to upload image", variant: "destructive" });
      setUploadingImage(false);
    }
  };

  const handleUpdateRecord = async () => {
    if (!updatingRecordId) return;
    const { error } = await supabase
      .from("patient_records")
      .update({
        diagnosis: updateRecordForm.diagnosis,
        prescription: updateRecordForm.prescription,
        notes: updateRecordForm.notes,
        attachments: updateRecordForm.attachments,
        updated_at: new Date().toISOString(),
      })
      .eq("id", updatingRecordId);

    if (error) {
      toast({ title: "Error", description: "Failed to update record", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Patient record updated" });
      setShowUpdateRecordModal(false);
      setUpdatingRecordId(null);
      if (session) fetchDoctorData(session.user.id);
    }
  };

  const handleCreateNewRecord = async () => {
    if (!viewingRecordPatient || !doctorInfo) return;
    const { error } = await supabase
      .from("patient_records")
      .insert({
        patient_id: viewingRecordPatient.id,
        doctor_id: doctorInfo.id,
        token_id: tokens[0]?.id || null,
        diagnosis: updateRecordForm.diagnosis,
        prescription: updateRecordForm.prescription,
        notes: updateRecordForm.notes,
        attachments: updateRecordForm.attachments,
      });

    if (error) {
      toast({ title: "Error", description: "Failed to create record", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "New patient record created" });
      setShowUpdateRecordModal(false);
      if (session) fetchDoctorData(session.user.id);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const filteredPatients = patients.filter(p =>
    p.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.phone?.includes(searchQuery)
  );

  const getPatientRecords = (patientId: string) => {
    return patientRecords.filter(r => r.patient_id === patientId);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {viewMode !== "dashboard" && (
                <Button variant="ghost" size="icon" onClick={() => setViewMode("dashboard")}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              )}
              <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-foreground hidden sm:inline-block">MedBud</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative" ref={notifRef}>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="relative"
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  <Bell className="w-5 h-5 text-muted-foreground" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
                  )}
                </Button>
                
                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-80 bg-card rounded-xl shadow-large border border-border overflow-hidden z-[60]"
                    >
                      <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
                        <h3 className="font-semibold text-sm">Notifications</h3>
                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase">{unreadCount} New</span>
                      </div>
                      <div className="max-h-80 overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center text-muted-foreground">
                            <p className="text-sm">No notifications</p>
                          </div>
                        ) : (
                          notifications.map((notif) => (
                            <div 
                              key={notif.id} 
                              className={`p-4 border-b border-border last:border-0 hover:bg-muted/50 transition-colors cursor-pointer ${!notif.read_at ? "bg-primary/5" : ""}`}
                              onClick={() => markAsRead(notif.id)}
                            >
                              <div className="flex gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                  notif.type === 'booking' ? 'bg-blue-100 text-blue-600' : 
                                  notif.type === 'prepone' ? 'bg-orange-100 text-orange-600' : 'bg-primary/10 text-primary'
                                }`}>
                                  {notif.type === 'booking' ? <Calendar className="w-4 h-4" /> : 
                                   notif.type === 'prepone' ? <ArrowUpCircle className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-foreground leading-tight">{notif.title}</p>
                                  <p className="text-xs text-muted-foreground mt-1">{notif.message}</p>
                                  <p className="text-[10px] text-muted-foreground mt-2">{new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="h-8 w-px bg-border hidden sm:block" />
              
              <div className="flex items-center gap-3">
                <div className="text-right hidden md:block">
                  <p className="text-sm font-semibold text-foreground leading-none">{profile?.full_name}</p>
                  <p className="text-xs text-muted-foreground mt-1 capitalize">{doctorInfo?.specialization}</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleLogout}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <LogOut className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 relative">
        {!doctorInfo?.is_active ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <Card className="max-w-md w-full p-8 text-center shadow-2xl border-primary/20 bg-card">
              <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-6">
                <Clock className="w-10 h-10 text-amber-600 dark:text-amber-400 animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold mb-3">Verification Under Process</h2>
              <p className="text-muted-foreground mb-6">
                Your professional profile is currently being reviewed by our administrative team. 
                You will gain full access to the dashboard once your medical license is verified.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-left bg-muted p-3 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                  <span>Expect 24-48 hours for the verification process.</span>
                </div>
                <Button variant="outline" className="w-full" onClick={() => navigate("/")}>
                  Return to Home
                </Button>
              </div>
            </Card>
          </div>
        ) : (
          <>
            {viewMode === "dashboard" && (
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-foreground">Welcome back, Dr. {profile?.full_name}</h1>
                  <p className="text-muted-foreground">Here's what's happening with your practice today.</p>
                </div>
              </div>
            )}


      <div className="container mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {/* Dashboard View */}
          {viewMode === "dashboard" && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-card rounded-xl p-4 border border-border text-center">
                  <p className="text-3xl font-bold text-foreground">{todayStats.total}</p>
                  <p className="text-sm text-muted-foreground">Today's Tokens</p>
                </div>
                <div className="bg-card rounded-xl p-4 border border-border text-center">
                  <p className="text-3xl font-bold text-green-500">{todayStats.completed}</p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
                <div className="bg-card rounded-xl p-4 border border-border text-center">
                  <p className="text-3xl font-bold text-yellow-500">{todayStats.waiting}</p>
                  <p className="text-sm text-muted-foreground">Waiting</p>
                </div>
              </div>

              {/* Feature Cards */}
              {/* Feature Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* 1. Booking Requests */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setViewMode("booking-requests")}
                  className="bg-card rounded-xl shadow-soft p-6 border border-border cursor-pointer group"
                >
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <CalendarCheck className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Booking Requests</h3>
                  <p className="text-muted-foreground text-sm mb-4">Review and approve new appointment bookings</p>
                  <div className="flex items-center text-primary text-sm font-medium">
                    {bookingRequests.length} pending <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </motion.div>

                {/* 2. Token Queue */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setViewMode("tokens")}
                  className="bg-card rounded-xl shadow-soft p-6 border border-border cursor-pointer group"
                >
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Clock className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Token Queue</h3>
                  <p className="text-muted-foreground text-sm mb-4">Manage today's patient queue and call next patient</p>
                  <div className="flex items-center text-primary text-sm font-medium">
                    {todayStats.waiting} waiting <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </motion.div>


                {/* 3. Prepone Settings (Prepone Requests) */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setViewMode("prepone-requests")}
                  className="bg-card rounded-xl shadow-soft p-6 border border-border cursor-pointer group"
                >
                  <div className="w-14 h-14 rounded-xl bg-orange-500/10 flex items-center justify-center mb-4 group-hover:bg-orange-500/20 transition-colors">
                    <ArrowUpCircle className="w-7 h-7 text-orange-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Prepone Settings</h3>
                  <p className="text-muted-foreground text-sm mb-4">Review patient requests for earlier appointments</p>
                  <div className="flex items-center text-orange-500 text-sm font-medium">
                    {preponeRequests.filter(r => r.status === "pending").length} pending <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </motion.div>

                {/* 4. Profile & Settings */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setViewMode("settings")}
                  className="bg-card rounded-xl shadow-soft p-6 border border-border cursor-pointer group"
                >
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <User className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Profile & Settings</h3>
                  <p className="text-muted-foreground text-sm mb-4">Configure your UPI, QR code and Working Hours</p>
                  <div className="flex items-center text-primary text-sm font-medium">
                    Configure Settings <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </motion.div>

                {/* 5. Patient Records */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setViewMode("patients")}
                  className="bg-card rounded-xl shadow-soft p-6 border border-border cursor-pointer group"
                >
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Users className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Patient Records</h3>
                  <p className="text-muted-foreground text-sm mb-4">View and manage patient medical history</p>
                  <div className="flex items-center text-primary text-sm font-medium">
                    {patients.length} patients <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </motion.div>

                {/* 6. Appointments */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setViewMode("appointments")}
                  className="bg-card rounded-xl shadow-soft p-6 border border-border cursor-pointer group"
                >
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Calendar className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Appointments</h3>
                  <p className="text-muted-foreground text-sm mb-4">View upcoming 7-day schedule</p>
                  <div className="flex items-center text-primary text-sm font-medium">
                    {appointments.length} upcoming <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </motion.div>
              </div>

              <div className="grid grid-cols-1 gap-6 mt-6">
                {/* Quick Token List (Moved up since Booking Requests is now a card) */}


                {/* Quick Token List */}
                <div className="bg-card rounded-xl shadow-soft border border-border overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-border flex items-center justify-between">
                    <h3 className="font-semibold text-foreground">Current Queue</h3>
                    <Button variant="ghost" size="sm" onClick={() => setViewMode("tokens")}>
                      View All <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                  <div className="max-h-80 overflow-y-auto custom-scrollbar flex-1">
                    {tokens.filter(t => t.status !== "completed").slice(0, 5).map((token) => (
                      <div key={token.id} className="p-4 border-b border-border last:border-0 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${token.status === "in_progress"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                            }`}>
                            {token.token_number}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{token.profiles?.full_name || "Walk-in"}</p>
                            <p className="text-xs text-muted-foreground">{token.profiles?.phone || "No phone"}</p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (token.status === "waiting" || token.status === "completed") {
                              setConfirmToggle({
                                tokenId: token.id,
                                currentStatus: token.status,
                                newStatus: token.status === "waiting" ? "completed" : "waiting",
                                patientName: token.profiles?.full_name || "Walk-in",
                              });
                            }
                          }}
                          className={`px-2 py-1 rounded-full text-xs cursor-pointer hover:opacity-80 transition-opacity ${token.status === "in_progress"
                            ? "bg-primary/10 text-primary"
                            : token.status === "waiting"
                              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 hover:bg-green-100 hover:text-green-700"
                              : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-yellow-100 hover:text-yellow-700"
                          }`}
                          title={token.status === "waiting" ? "Click to mark as completed" : token.status === "completed" ? "Click to mark as waiting" : token.status}
                        >
                          {token.status}
                        </button>
                      </div>
                    ))}
                    {tokens.filter(t => t.status !== "completed").length === 0 && (
                      <div className="p-12 text-center text-muted-foreground">
                        <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p>No patients in queue</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Booking Requests View */}
          {viewMode === "booking-requests" && (
            <motion.div
              key="booking-requests"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => setViewMode("dashboard")}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Booking Requests</h2>
                  <p className="text-muted-foreground">Review and approve appointment requests</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {bookingRequests.map((req) => (
                  <motion.div
                    key={req.id}
                    whileHover={{ scale: 1.01 }}
                    className="bg-card rounded-xl border border-border overflow-hidden flex flex-col shadow-soft"
                  >
                    <div className="p-4 border-b border-border bg-primary/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-lg">
                          {req.profiles?.full_name?.charAt(0) || "P"}
                        </div>
                        <div>
                          <p className="font-bold text-foreground">{req.profiles?.full_name || "New Patient"}</p>
                          <p className="text-xs text-muted-foreground">{req.profiles?.phone || "No phone"}</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 flex-1 space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-4 h-4 text-primary" />
                          <span>{new Date(req.appointment_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="w-4 h-4 text-primary" />
                          <span>{req.appointment_time}</span>
                        </div>
                      </div>

                      {req.symptoms && (
                        <div className="bg-muted/50 p-3 rounded-lg border border-border/50">
                          <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Symptoms</p>
                          <p className="text-sm text-foreground italic">"{req.symptoms}"</p>
                        </div>
                      )}

                      <div className="flex gap-3 pt-2">
                        <Button className="flex-1" onClick={() => handleBookingAction(req.id, "accept")}>
                          <CheckCircle className="w-4 h-4 mr-2" /> Accept
                        </Button>
                        <Button variant="outline" className="flex-1 text-destructive hover:bg-destructive/10 border-destructive/20" onClick={() => handleBookingAction(req.id, "decline")}>
                          <XCircle className="w-4 h-4 mr-2" /> Decline
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {bookingRequests.length === 0 && (
                <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-border">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">All caught up!</h3>
                  <p className="text-muted-foreground max-w-xs mx-auto mt-2">There are no pending booking requests at the moment.</p>
                  <Button variant="outline" className="mt-6" onClick={() => setViewMode("dashboard")}>
                    Back to Dashboard
                  </Button>
                </div>
              )}
            </motion.div>
          )}

          {/* Token Queue View */}
          {viewMode === "tokens" && (
            <motion.div
              key="tokens"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold text-foreground">Token Queue Management</h2>
              <p className="text-muted-foreground">Manage today's patient queue</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Waiting */}
                <div className="bg-card rounded-xl border border-border overflow-hidden">
                  <div className="p-4 border-b border-border bg-yellow-50 dark:bg-yellow-900/20">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <Clock className="w-5 h-5 text-yellow-600" />
                      Waiting ({tokens.filter(t => t.status === "waiting").length})
                    </h3>
                  </div>
                  <ScrollArea className="h-96">
                    {tokens.filter(t => t.status === "waiting").map((token) => (
                      <div key={token.id} className="p-4 border-b border-border last:border-0">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center font-bold text-yellow-700 dark:text-yellow-400">
                              {token.token_number}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{token.profiles?.full_name || "Walk-in Patient"}</p>
                              <p className="text-xs text-muted-foreground">{token.profiles?.phone || "No phone"}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => handleTokenStatusChange(token.id, "in_progress")}
                          >
                            <PlayCircle className="w-4 h-4 mr-1" /> Call Now
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleTokenStatusChange(token.id, "cancelled")}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {tokens.filter(t => t.status === "waiting").length === 0 && (
                      <div className="p-8 text-center text-muted-foreground">
                        <p>No patients waiting</p>
                      </div>
                    )}
                  </ScrollArea>
                </div>

                {/* In Progress */}
                <div className="bg-card rounded-xl border border-border overflow-hidden">
                  <div className="p-4 border-b border-border bg-primary/10">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <User className="w-5 h-5 text-primary" />
                      In Progress ({tokens.filter(t => t.status === "in_progress").length})
                    </h3>
                  </div>
                  <ScrollArea className="h-96">
                    {tokens.filter(t => t.status === "in_progress").map((token) => (
                      <div key={token.id} className="p-4 border-b border-border last:border-0">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center font-bold text-primary-foreground">
                              {token.token_number}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{token.profiles?.full_name || "Walk-in Patient"}</p>
                              <p className="text-xs text-muted-foreground">{token.profiles?.phone || "No phone"}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => {
                              setSelectedPatient(token.profiles);
                              setViewMode("records");
                            }}
                          >
                            <FileText className="w-4 h-4 mr-1" /> Add Record
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleTokenStatusChange(token.id, "completed")}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" /> Complete
                          </Button>
                        </div>
                      </div>
                    ))}
                    {tokens.filter(t => t.status === "in_progress").length === 0 && (
                      <div className="p-8 text-center text-muted-foreground">
                        <p>No patient currently being seen</p>
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </div>

              {/* Completed Today */}
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="p-4 border-b border-border bg-green-50 dark:bg-green-900/20">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Completed Today ({tokens.filter(t => t.status === "completed").length})
                  </h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 p-4">
                  {tokens.filter(t => t.status === "completed").map((token) => (
                    <div
                      key={token.id}
                      className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-center cursor-pointer hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors group"
                      onClick={() => setConfirmToggle({
                        tokenId: token.id,
                        currentStatus: "completed",
                        newStatus: "waiting",
                        patientName: token.profiles?.full_name || "Walk-in",
                      })}
                      title="Click to move back to waiting"
                    >
                      <p className="font-bold text-green-700 dark:text-green-400 group-hover:text-yellow-700 dark:group-hover:text-yellow-400">#{token.token_number}</p>
                      <p className="text-xs text-muted-foreground truncate">{token.profiles?.full_name || "Walk-in"}</p>
                      <p className="text-[10px] text-green-600 dark:text-green-400 group-hover:text-yellow-600 dark:group-hover:text-yellow-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">↻ Back to Waiting</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Patients List View */}
          {viewMode === "patients" && (
            <motion.div
              key="patients"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold text-foreground">Patient Records</h2>
              <p className="text-muted-foreground">Search and view patient medical history</p>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Search by name or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPatients.map((patient) => {
                  const records = getPatientRecords(patient.id);
                  return (
                    <motion.div
                      key={patient.id}
                      whileHover={{ scale: 1.02 }}
                      className="bg-card rounded-xl p-4 border border-border hover:border-primary transition-colors cursor-pointer group shadow-soft"
                      onClick={() => {
                        setViewingRecordPatient(patient);
                        setShowViewRecordModal(true);
                      }}
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <User className="w-7 h-7 text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-foreground text-lg">{patient.full_name}</p>
                          <p className="text-sm text-muted-foreground">{patient.phone}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm mb-4 px-1">
                        <span className="flex items-center gap-1.5 text-muted-foreground bg-muted px-2 py-1 rounded-md">
                          <FileText className="w-3.5 h-3.5 text-primary" />
                          {records.length} {records.length === 1 ? 'Record' : 'Records'}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-xs font-medium"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingRecordPatient(patient);
                            setShowViewRecordModal(true);
                          }}
                        >
                          <Eye className="w-3.5 h-3.5 mr-1.5" /> View
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 text-xs font-medium"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingRecordPatient(patient);
                            const pRecords = getPatientRecords(patient.id);
                            if (pRecords.length > 0) {
                              const latest = pRecords[0];
                              setUpdatingRecordId(latest.id);
                              setUpdateRecordForm({
                                diagnosis: latest.diagnosis || "",
                                prescription: latest.prescription || "",
                                notes: latest.notes || "",
                                attachments: (latest.attachments as string[]) || []
                              });
                            } else {
                              // Reset form for a fresh record if none exists
                              setUpdatingRecordId(null);
                              setUpdateRecordForm({
                                diagnosis: "",
                                prescription: "",
                                notes: "",
                                attachments: []
                              });
                            }
                            setShowUpdateRecordModal(true);
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5 mr-1.5" /> {records.length > 0 ? 'Update' : 'Add Record'}
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {filteredPatients.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No patients found</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Patient Detail View */}
          {viewMode === "patient-detail" && selectedPatient && (
            <motion.div
              key="patient-detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => setViewMode("patients")}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">{selectedPatient.full_name}</h2>
                  <p className="text-muted-foreground">{selectedPatient.phone}</p>
                </div>
              </div>

              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold text-foreground">Medical History</h3>
                </div>
                <ScrollArea className="h-96">
                  {getPatientRecords(selectedPatient.id).map((record) => (
                    <div key={record.id} className="p-4 border-b border-border last:border-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">
                          {new Date(record.created_at).toLocaleDateString()} • Token #{record.tokens?.token_number}
                        </span>
                      </div>
                      {record.diagnosis && (
                        <div className="mb-2">
                          <p className="text-xs font-medium text-muted-foreground uppercase">Diagnosis</p>
                          <p className="text-foreground">{record.diagnosis}</p>
                        </div>
                      )}
                      {record.prescription && (
                        <div className="mb-2">
                          <p className="text-xs font-medium text-muted-foreground uppercase">Prescription</p>
                          <p className="text-foreground whitespace-pre-wrap">{record.prescription}</p>
                        </div>
                      )}
                      {record.notes && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase">Notes</p>
                          <p className="text-foreground">{record.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                  {getPatientRecords(selectedPatient.id).length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">
                      <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>No medical records found</p>
                    </div>
                  )}
                </ScrollArea>
              </div>
            </motion.div>
          )}

          {/* Add Record View */}
          {viewMode === "records" && selectedPatient && (
            <motion.div
              key="records"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => setViewMode("tokens")}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Add Patient Record</h2>
                  <p className="text-muted-foreground">For: {selectedPatient.full_name}</p>
                </div>
              </div>

              <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Diagnosis</label>
                  <Textarea
                    placeholder="Enter diagnosis..."
                    value={recordForm.diagnosis}
                    onChange={(e) => setRecordForm(prev => ({ ...prev, diagnosis: e.target.value }))}
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Prescription</label>
                  <Textarea
                    placeholder="Enter prescription details..."
                    value={recordForm.prescription}
                    onChange={(e) => setRecordForm(prev => ({ ...prev, prescription: e.target.value }))}
                    rows={4}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Notes</label>
                  <Textarea
                    placeholder="Additional notes..."
                    value={recordForm.notes}
                    onChange={(e) => setRecordForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                  />
                </div>
                <div className="flex gap-3">
                  <Button onClick={handleSaveRecord} className="flex-1">
                    <Save className="w-4 h-4 mr-2" /> Save Record & Complete
                  </Button>
                  <Button variant="outline" onClick={() => setViewMode("tokens")}>
                    Cancel
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Settings View */}
          {viewMode === "settings" && doctorInfo && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => setViewMode("dashboard")}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Profile & Settings</h2>
                  <p className="text-muted-foreground">Configure your UPI and Working Hours</p>
                </div>
              </div>

              <div className="bg-card rounded-xl border border-border p-6 space-y-6 max-w-2xl">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">UPI Number or ID</label>
                  <Input
                    placeholder="e.g. 8688286621 or name@upi"
                    defaultValue={((doctorInfo.timings as any)?.upiNumber) || ""}
                    onChange={(e) => {
                      const timings = (doctorInfo.timings as any) || {};
                      setDoctorInfo({ ...doctorInfo, timings: { ...timings, upiNumber: e.target.value } });
                    }}
                  />
                  <p className="text-xs text-muted-foreground mt-1">This number will be displayed to patients for payment.</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">UPI QR Code Image</label>
                  <div className="flex flex-col sm:flex-row gap-4 items-start">
                    <div className="w-48 h-48 bg-muted/30 border border-dashed rounded-xl flex items-center justify-center p-2">
                      <img 
                        src={((doctorInfo.timings as any)?.upiQrUrl) || "/default_qr.png"} 
                        alt="UPI Preview" 
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex-1 space-y-3">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              const timings = (doctorInfo.timings as any) || {};
                              setDoctorInfo({ ...doctorInfo, timings: { ...timings, upiQrUrl: reader.result } });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <p className="text-xs text-muted-foreground">Upload your QR code image. It will be securely stored and displayed to your patients.</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    Available Timings
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">Mon - Fri</label>
                      <Input
                        placeholder="e.g. 9AM - 6PM"
                        defaultValue={((doctorInfo.timings as any)?.mon_fri) || "9AM - 6PM"}
                        onChange={(e) => {
                          const timings = (doctorInfo.timings as any) || {};
                          setDoctorInfo({ ...doctorInfo, timings: { ...timings, mon_fri: e.target.value } });
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">Saturday</label>
                      <Input
                        placeholder="e.g. 9AM - 2PM"
                        defaultValue={((doctorInfo.timings as any)?.sat) || "9AM - 2PM"}
                        onChange={(e) => {
                          const timings = (doctorInfo.timings as any) || {};
                          setDoctorInfo({ ...doctorInfo, timings: { ...timings, sat: e.target.value } });
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">Sunday</label>
                      <Input
                        placeholder="e.g. Closed"
                        defaultValue={((doctorInfo.timings as any)?.sun) || "Closed"}
                        onChange={(e) => {
                          const timings = (doctorInfo.timings as any) || {};
                          setDoctorInfo({ ...doctorInfo, timings: { ...timings, sun: e.target.value } });
                        }}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Patients will see these timings when booking an appointment.</p>
                </div>

                <div className="pt-4 border-t flex gap-3">
                  <Button 
                    className="flex-1 max-w-xs"
                    onClick={async () => {
                      const { error } = await supabase
                        .from('doctors')
                        .update({ timings: doctorInfo.timings })
                        .eq('id', doctorInfo.id);
                      if (error) {
                        toast({ title: 'Error', description: 'Failed to update settings', variant: 'destructive' });
                      } else {
                        toast({ title: 'Success', description: 'Payment settings saved successfully' });
                      }
                    }}
                  >
                    <Save className="w-4 h-4 mr-2" /> Save Settings
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Prepone Requests View */}
          {viewMode === "prepone-requests" && (
            <motion.div
              key="prepone-requests"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold text-foreground">Prepone Requests</h2>
              <p className="text-muted-foreground">Review and respond to patient preponing requests</p>

              {preponeRequests.length === 0 ? (
                <div className="bg-card rounded-xl border border-border p-12 text-center">
                  <ArrowUpCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No prepone requests yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {preponeRequests.map((req) => (
                    <div key={req.id} className={`bg-card rounded-xl border p-5 ${req.status === "pending" ? "border-orange-300 dark:border-orange-700" : "border-border"}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold text-foreground">{req.profiles?.full_name || "Patient"}</p>
                          <p className="text-sm text-muted-foreground">{req.profiles?.phone}</p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          req.status === "pending" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                          req.status === "approved" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                          "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}>
                          {req.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                        <div className="bg-muted/50 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground mb-1">Original Schedule</p>
                          <p className="font-medium">{req.original_date}</p>
                          <p className="text-muted-foreground">{req.original_time}</p>
                        </div>
                        <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
                          <p className="text-xs text-primary mb-1">Requested Schedule</p>
                          <p className="font-medium">{req.requested_date}</p>
                          <p className="text-primary">{req.requested_time}</p>
                        </div>
                      </div>
                      {req.reason && (
                        <p className="text-sm text-muted-foreground mb-3 bg-muted/30 rounded-lg p-2">
                          <strong>Reason:</strong> {req.reason}
                        </p>
                      )}
                      {req.status === "pending" && (
                        <div className="flex gap-2">
                          <Button size="sm" className="flex-1" onClick={() => handlePreponeAction(req.id, "approved", req)}>
                            <Check className="w-4 h-4 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1" onClick={() => handlePreponeAction(req.id, "declined", req)}>
                            <X className="w-4 h-4 mr-1" /> Decline
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Appointments View */}
          {viewMode === "appointments" && (
            <motion.div
              key="appointments"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold text-foreground">Upcoming Appointments</h2>
              <p className="text-muted-foreground">Next 7 days — patient details and schedule</p>

              {appointments.length === 0 ? (
                <div className="bg-card rounded-xl border border-border p-12 text-center">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No upcoming appointments</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Group appointments by date */}
                  {Object.entries(
                    appointments.reduce((groups: Record<string, any[]>, appt) => {
                      const date = appt.appointment_date;
                      if (!groups[date]) groups[date] = [];
                      groups[date].push(appt);
                      return groups;
                    }, {})
                  ).map(([date, dayAppointments]) => {
                    const dateObj = new Date(date + "T00:00:00");
                    const isToday = date === new Date().toISOString().split("T")[0];
                    const dayName = isToday ? "Today" : dateObj.toLocaleDateString("en-US", { weekday: "long" });
                    const dateLabel = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

                    return (
                      <div key={date}>
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
                            isToday ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                          }`}>
                            {dayName}
                          </div>
                          <span className="text-sm text-muted-foreground">{dateLabel}</span>
                          <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                            {(dayAppointments as any[]).length} appointment{(dayAppointments as any[]).length !== 1 ? "s" : ""}
                          </span>
                        </div>

                        <div className="space-y-3">
                          {(dayAppointments as any[]).map((appt: any) => (
                            <div
                              key={appt.id}
                              className={`bg-card rounded-xl border p-5 transition-all ${
                                isToday ? "border-primary/30 shadow-md" : "border-border shadow-soft"
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm ${
                                    appt.status === "completed" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                    appt.status === "confirmed" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                                    appt.status === "cancelled" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                                    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                  }`}>
                                    <Clock className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <p className="font-semibold text-foreground text-base">
                                      {appt.profiles?.full_name || appt.patient_name || "Walk-in Patient"}
                                    </p>
                                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                                      {(appt.profiles?.phone || appt.patient_phone) && (
                                        <span>📱 {appt.profiles?.phone || appt.patient_phone}</span>
                                      )}
                                      {appt.patient_email && (
                                        <span>✉️ {appt.patient_email}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-bold text-foreground">
                                    {appt.appointment_time?.slice(0, 5)}
                                  </p>
                                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium mt-1 ${
                                    appt.status === "completed" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                    appt.status === "confirmed" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                                    appt.status === "cancelled" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                                    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                  }`}>
                                    {appt.status}
                                  </span>
                                </div>
                              </div>

                              {appt.symptoms && (
                                <div className="mt-3 pt-3 border-t border-border">
                                  <p className="text-sm text-muted-foreground">
                                    <span className="font-medium text-foreground">Symptoms:</span> {appt.symptoms}
                                  </p>
                                </div>
                              )}

                              {appt.payment_method && (
                                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                                  <span className="bg-muted px-2 py-0.5 rounded">💳 {appt.payment_method}</span>
                                  <span className={`px-2 py-0.5 rounded ${
                                    appt.payment_status === "completed" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-yellow-100 text-yellow-700"
                                  }`}>
                                    {appt.payment_status || "pending"}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
          </>
        )}
    </main>

      {/* View Record Modal */}
      {showViewRecordModal && viewingRecordPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowViewRecordModal(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg max-h-[85vh] overflow-hidden"
          >
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-foreground">Medical Records</h3>
                <p className="text-sm text-muted-foreground">{viewingRecordPatient.full_name}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowViewRecordModal(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <ScrollArea className="max-h-[70vh] p-4">
              {getPatientRecords(viewingRecordPatient.id).length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No medical records found</p>
                </div>
              ) : (
                getPatientRecords(viewingRecordPatient.id).map((record) => (
                  <div key={record.id} className="mb-4 p-4 rounded-xl bg-muted/30 border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">
                        {new Date(record.created_at).toLocaleDateString()} • Token #{record.tokens?.token_number}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-7"
                        onClick={() => {
                          setUpdatingRecordId(record.id);
                          setUpdateRecordForm({
                            diagnosis: record.diagnosis || "",
                            prescription: record.prescription || "",
                            notes: record.notes || "",
                            attachments: (record.attachments as string[]) || [],
                          });
                          setShowViewRecordModal(false);
                          setShowUpdateRecordModal(true);
                        }}
                      >
                        <Pencil className="w-3 h-3 mr-1" /> Edit
                      </Button>
                    </div>
                    {record.diagnosis && (
                      <div className="mb-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase">Diagnosis</p>
                        <p className="text-foreground">{record.diagnosis}</p>
                      </div>
                    )}
                    {record.prescription && (
                      <div className="mb-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase">Prescription</p>
                        <p className="text-foreground whitespace-pre-wrap">{record.prescription}</p>
                      </div>
                    )}
                    {record.notes && (
                      <div className="mb-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase">Notes</p>
                        <p className="text-foreground">{record.notes}</p>
                      </div>
                    )}
                    {record.attachments && (record.attachments as string[]).length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Attachments</p>
                        <div className="grid grid-cols-3 gap-2">
                          {(record.attachments as string[]).map((img, i) => (
                            <img key={i} src={img} alt={`Attachment ${i + 1}`} className="rounded-lg border border-border w-full h-24 object-cover cursor-pointer hover:opacity-80" onClick={() => window.open(img, '_blank')} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </ScrollArea>
          </motion.div>
        </div>
      )}

      {/* Update/Create Record Modal */}
      {showUpdateRecordModal && viewingRecordPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowUpdateRecordModal(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg max-h-[85vh] overflow-hidden"
          >
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  {updatingRecordId ? "Update Record" : "New Record"}
                </h3>
                <p className="text-sm text-muted-foreground">{viewingRecordPatient.full_name}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowUpdateRecordModal(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <ScrollArea className="max-h-[70vh]">
              <div className="p-4 space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Diagnosis</label>
                  <Textarea
                    placeholder="Enter diagnosis..."
                    value={updateRecordForm.diagnosis}
                    onChange={(e) => setUpdateRecordForm(prev => ({ ...prev, diagnosis: e.target.value }))}
                    rows={2}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Prescription</label>
                  <Textarea
                    placeholder="Enter prescription details..."
                    value={updateRecordForm.prescription}
                    onChange={(e) => setUpdateRecordForm(prev => ({ ...prev, prescription: e.target.value }))}
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Notes</label>
                  <Textarea
                    placeholder="Additional notes..."
                    value={updateRecordForm.notes}
                    onChange={(e) => setUpdateRecordForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows={2}
                  />
                </div>

                {/* Image Upload */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Attachments / Images</label>
                  {updateRecordForm.attachments.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {updateRecordForm.attachments.map((img, i) => (
                        <div key={i} className="relative group">
                          <img src={img} alt={`Attachment ${i + 1}`} className="rounded-lg border border-border w-full h-24 object-cover" />
                          <button
                            onClick={() => setUpdateRecordForm(prev => ({
                              ...prev,
                              attachments: prev.attachments.filter((_, idx) => idx !== i)
                            }))}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <label className="flex items-center gap-2 px-4 py-3 rounded-lg border border-dashed border-border hover:border-primary cursor-pointer transition-colors">
                    {uploadingImage ? (
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    ) : (
                      <ImagePlus className="w-5 h-5 text-muted-foreground" />
                    )}
                    <span className="text-sm text-muted-foreground">
                      {uploadingImage ? "Uploading..." : "Click to upload image"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleRecordImageUpload}
                      disabled={uploadingImage}
                    />
                  </label>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    className="flex-1"
                    onClick={updatingRecordId ? handleUpdateRecord : handleCreateNewRecord}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {updatingRecordId ? "Update Record" : "Create Record"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowUpdateRecordModal(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </motion.div>
        </div>
      )}

      {/* Confirmation Modal for Status Toggle */}
      {confirmToggle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setConfirmToggle(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-card rounded-2xl border border-border shadow-xl w-full max-w-sm p-6"
          >
            <div className="text-center mb-6">
              <div className={`w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center ${
                confirmToggle.newStatus === "completed"
                  ? "bg-green-100 dark:bg-green-900/30"
                  : "bg-yellow-100 dark:bg-yellow-900/30"
              }`}>
                {confirmToggle.newStatus === "completed" ? (
                  <CheckCircle className="w-7 h-7 text-green-600" />
                ) : (
                  <Clock className="w-7 h-7 text-yellow-600" />
                )}
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Confirm Status Change</h3>
              <p className="text-muted-foreground text-sm">
                Mark <strong>{confirmToggle.patientName}</strong> as{" "}
                <span className={`font-semibold ${
                  confirmToggle.newStatus === "completed" ? "text-green-600" : "text-yellow-600"
                }`}>
                  {confirmToggle.newStatus}
                </span>?
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                className="flex-1"
                onClick={async () => {
                  await handleTokenStatusChange(confirmToggle.tokenId, confirmToggle.newStatus);
                  setConfirmToggle(null);
                }}
              >
                {confirmToggle.newStatus === "completed" ? (
                  <><CheckCircle className="w-4 h-4 mr-2" /> Yes, Completed</>
                ) : (
                  <><Clock className="w-4 h-4 mr-2" /> Yes, Back to Waiting</>
                )}
              </Button>
              <Button variant="outline" onClick={() => setConfirmToggle(null)}>
                Cancel
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default DoctorDashboard;
