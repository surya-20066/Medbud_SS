import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useNotifications } from "@/hooks/useNotifications";
import {
  Calendar, Clock, FileText, LogOut, User, Bot, ChevronRight,
  Stethoscope, Bell, ArrowUpCircle, X
} from "lucide-react";
import { Session } from "@supabase/supabase-js";
import { ScrollArea } from "@/components/ui/scroll-area";
import AIHealthAssistant from "@/components/AIHealthAssistant";

const PatientDashboard = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [tokens, setTokens] = useState<any[]>([]);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showPreponeModal, setShowPreponeModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [preponeDate, setPreponeDate] = useState("");
  const [preponeTime, setPreponeTime] = useState("");
  const [preponeReason, setPreponeReason] = useState("");
  const [preponeLoading, setPreponeLoading] = useState(false);
  const [patientRecords, setPatientRecords] = useState<any[]>([]);
  const [showRecordsModal, setShowRecordsModal] = useState(false);
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [queueData, setQueueData] = useState<any[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);
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
          fetchUserData(session.user.id);
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
      const { data: profileData, error: profileError } = await supabase.from("profiles").select("*").eq("id", userId).single();
      if (profileError) throw profileError;
      setProfile(profileData);

      const { data: rolesData, error: rolesError } = await supabase.from("user_roles").select("role").eq("user_id", userId);
      if (rolesError) throw rolesError;
      setUserRoles(rolesData.map((r) => r.role));

      const { data: appointmentsData } = await supabase
        .from("appointments")
        .select(`*, doctors:doctor_id (id, specialization, user_id)`)
        .eq("patient_id", userId)
        .gte("appointment_date", new Date().toISOString().split("T")[0])
        .order("appointment_date", { ascending: true })
        .limit(10);

      const { data: tokensData } = await supabase
        .from("tokens")
        .select(`*, doctors:doctor_id (id, specialization, user_id)`)
        .eq("patient_id", userId)
        .in("status", ["waiting", "in_progress"])
        .order("token_date", { ascending: true })
        .limit(5);

      // Fetch patient records
      const { data: recordsData } = await supabase
        .from("patient_records")
        .select(`*, doctors:doctor_id (id, user_id), tokens:token_id (token_number, token_date)`)
        .eq("patient_id", userId)
        .order("created_at", { ascending: false });

      // Gather all doctor user_ids to fetch profiles manually
      const doctorUserIds = new Set<string>();
      const addDocId = (doc: any) => {
        if (doc) {
          const d = Array.isArray(doc) ? doc[0] : doc;
          if (d && d.user_id) doctorUserIds.add(d.user_id);
        }
      };
      
      appointmentsData?.forEach(a => addDocId(a.doctors));
      tokensData?.forEach(t => addDocId(t.doctors));
      recordsData?.forEach(r => addDocId(r.doctors));

      const { data: docProfiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", Array.from(doctorUserIds));

      const docProfileMap = new Map();
      docProfiles?.forEach(p => docProfileMap.set(p.id, p));

      if (appointmentsData) {
        setAppointments(appointmentsData.map((apt) => {
          const doc = Array.isArray(apt.doctors) ? apt.doctors[0] : apt.doctors;
          return {
            ...apt,
            doctors: { ...doc, profiles: docProfileMap.get(doc?.user_id) }
          };
        }));
      }

      if (tokensData) {
        setTokens(tokensData.map((token) => {
          const doc = Array.isArray(token.doctors) ? token.doctors[0] : token.doctors;
          return {
            ...token,
            doctors: { ...doc, profiles: docProfileMap.get(doc?.user_id) }
          };
        }));
        
        // Fetch queue data for the first active token's doctor to show Token Status
        if (tokensData.length > 0) {
          const docId = tokensData[0].doctor_id;
          const today = new Date().toISOString().split("T")[0];
          const { data: qData } = await supabase
            .from("tokens")
            .select("*")
            .eq("doctor_id", docId)
            .eq("token_date", today)
            .order("token_number", { ascending: true });
          if (qData) setQueueData(qData);
        }
      }

      if (recordsData) {
        setPatientRecords(recordsData.map(r => {
          const doc = Array.isArray(r.doctors) ? r.doctors[0] : r.doctors;
          return {
            ...r,
            doctors: { ...doc, profiles: docProfileMap.get(doc?.user_id) }
          };
        }));
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Notifications hook
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(session?.user?.id || null);

  // Realtime: appointment updates
  useRealtimeSubscription({
    table: "appointments",
    filter: session ? `patient_id=eq.${session.user.id}` : undefined,
    enabled: !!session,
    onChange: () => { if (session) fetchUserData(session.user.id); },
  });

  // Realtime: token updates
  useRealtimeSubscription({
    table: "tokens",
    filter: session ? `patient_id=eq.${session.user.id}` : undefined,
    enabled: !!session,
    onUpdate: (payload) => {
      const newStatus = payload.new?.status;
      if (newStatus === "in_progress") {
        toast({ title: "🔔 Your turn!", description: "The doctor is ready to see you now." });
      }
      if (session) fetchUserData(session.user.id);
    },
    onInsert: () => { if (session) fetchUserData(session.user.id); },
  });

  // Close notification dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Fetch available earlier slots for preponing
  const fetchAvailableSlots = useCallback(async (apt: any) => {
    if (!apt) return;
    const today = new Date().toISOString().split("T")[0];
    // Get all booked times for this doctor between today and the appointment date
    const { data: bookedTokens } = await supabase
      .from("tokens")
      .select("token_date, estimated_time")
      .eq("doctor_id", apt.doctor_id)
      .gte("token_date", today)
      .lt("token_date", apt.appointment_date)
      .in("status", ["waiting", "in_progress"]);

    const bookedSet = new Set((bookedTokens || []).map(t => `${t.token_date}|${t.estimated_time?.split("T")[1]?.substring(0,5)}`));

    // Generate available slots for dates before appointment
    const slots: string[] = [];
    const aptDate = new Date(apt.appointment_date);
    const startDate = new Date(today);
    // Only allow dates starting from tomorrow
    startDate.setDate(startDate.getDate() + 1);

    for (let d = new Date(startDate); d < aptDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      for (let h = 9; h < 18; h++) {
        for (const m of [0, 30]) {
          const timeStr = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
          const key = `${dateStr}|${timeStr}`;
          if (!bookedSet.has(key)) {
            slots.push(`${dateStr} ${timeStr}`);
          }
        }
      }
    }
    setAvailableSlots(slots);
  }, []);

  const openPreponeModal = (apt: any) => {
    setSelectedAppointment(apt);
    setPreponeDate("");
    setPreponeTime("");
    setPreponeReason("");
    fetchAvailableSlots(apt);
    setShowPreponeModal(true);
  };

  const handlePreponeSubmit = async () => {
    if (!preponeDate || !preponeTime || !selectedAppointment || !session) {
      toast({ title: "Please select a date and time", variant: "destructive" });
      return;
    }
    setPreponeLoading(true);
    try {
      // Create prepone request
      await supabase.from("prepone_requests").insert({
        appointment_id: selectedAppointment.id,
        patient_id: session.user.id,
        doctor_id: selectedAppointment.doctors?.id || selectedAppointment.doctor_id,
        requested_date: preponeDate,
        requested_time: preponeTime,
        original_date: selectedAppointment.appointment_date,
        original_time: selectedAppointment.appointment_time,
        reason: preponeReason || null,
      });

      // Find the doctor's user_id for notification
      const { data: doctorData } = await supabase
        .from("doctors")
        .select("user_id")
        .eq("id", selectedAppointment.doctors?.id || selectedAppointment.doctor_id)
        .single();

      if (doctorData) {
        await supabase.from("notifications").insert({
          user_id: doctorData.user_id,
          type: "prepone_request",
          title: "📋 Prepone Request",
          message: `${profile?.full_name || "A patient"} wants to move their appointment from ${selectedAppointment.appointment_date} to ${preponeDate} at ${preponeTime}.`,
          metadata: { appointment_id: selectedAppointment.id, patient_name: profile?.full_name },
        });
      }

      toast({ title: "Request Sent!", description: "Your prepone request has been sent to the doctor." });
      setShowPreponeModal(false);
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to submit request", variant: "destructive" });
    } finally {
      setPreponeLoading(false);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({ title: "Error", description: "Failed to logout.", variant: "destructive" });
    } else {
      toast({ title: "Logged out", description: "You have been logged out successfully." });
      navigate("/");
    }
  };

  // Get unique dates from available slots
  const uniqueDates = [...new Set(availableSlots.map(s => s.split(" ")[0]))];
  const timesForDate = availableSlots.filter(s => s.startsWith(preponeDate)).map(s => s.split(" ")[1]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
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
              <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Patient Dashboard</h1>
                <p className="text-xs text-muted-foreground">Welcome back!</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative" ref={notifRef}>
                <Button variant="ghost" size="icon" className="relative" onClick={() => setShowNotifications(!showNotifications)}>
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </Button>
                {showNotifications && (
                  <div className="absolute right-0 top-12 w-80 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
                    <div className="p-3 border-b border-border flex items-center justify-between">
                      <h4 className="font-semibold text-sm">Notifications</h4>
                      {unreadCount > 0 && (
                        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllAsRead}>Mark all read</Button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto custom-scrollbar">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-muted-foreground text-sm">No notifications</div>
                      ) : (
                        notifications.map((n) => (
                          <div key={n.id} className={`p-3 border-b border-border last:border-0 cursor-pointer hover:bg-muted/50 ${!n.is_read ? "bg-primary/5" : ""}`} onClick={() => markAsRead(n.id)}>
                            <p className={`text-sm ${!n.is_read ? "font-semibold" : ""}`}>{n.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              <Button onClick={handleLogout} variant="ghost" size="sm">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl shadow-soft p-6 border border-border">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center">
                  <User className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-foreground">{profile?.full_name || "Patient"}</h2>
                  <p className="text-muted-foreground text-sm">{session?.user.email}</p>
                  <div className="flex gap-2 mt-2">
                    {userRoles.map((role) => (
                      <span key={role} className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary capitalize">{role}</span>
                    ))}
                  </div>
                </div>
                <Button onClick={() => setShowAIAssistant(!showAIAssistant)} className="hidden md:flex" variant={showAIAssistant ? "secondary" : "default"}>
                  <Bot className="w-4 h-4 mr-2" /> AI Assistant
                </Button>
              </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => navigate("/book-appointment")}>
                <Calendar className="w-6 h-6 text-primary" /><span className="text-xs">Book Appointment</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => setShowAIAssistant(true)}>
                <Bot className="w-6 h-6 text-primary" /><span className="text-xs">AI Health Help</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => setShowRecordsModal(true)}>
                <FileText className="w-6 h-6 text-primary" /><span className="text-xs">My Records</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => setShowQueueModal(true)}>
                <Clock className="w-6 h-6 text-primary" /><span className="text-xs">Token Status</span>
              </Button>
            </motion.div>

            {/* Upcoming Appointments */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card rounded-xl shadow-soft border border-border overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" /> Upcoming Appointments
                </h3>
              </div>
              <div className="divide-y divide-border">
                {appointments.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">
                    <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>No upcoming appointments</p>
                    <Button variant="link" className="mt-2" onClick={() => navigate("/book-appointment")}>Book your first appointment</Button>
                  </div>
                ) : (
                  appointments.map((apt) => (
                    <div key={apt.id} className="p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">Dr. {apt.doctors?.profiles?.full_name || "Unknown"}</p>
                          <p className="text-sm text-muted-foreground">{apt.doctors?.specialization}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-foreground">{new Date(apt.appointment_date).toLocaleDateString()}</p>
                          <p className="text-sm text-muted-foreground">{apt.appointment_time}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${
                          apt.status === "confirmed" 
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                            : apt.status === "pending"
                              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}>
                          {apt.status === "pending" ? "Pending Approval" : apt.status}
                        </span>
                        {apt.status === "confirmed" && new Date(apt.appointment_date) > new Date() && (
                          <Button size="sm" variant="outline" className="text-xs h-7 gap-1 text-orange-600 border-orange-300 hover:bg-orange-50" onClick={() => openPreponeModal(apt)}>
                            <ArrowUpCircle className="w-3.5 h-3.5" /> Request Prepone
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>

            {/* Active Appointments */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-card rounded-xl shadow-soft border border-border overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" /> Active Appointments
                </h3>
              </div>
              <div className="divide-y divide-border">
                {tokens.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">
                    <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>No active tokens</p>
                  </div>
                ) : (
                  tokens.map((token) => (
                    <div key={token.id} className="p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">Token #{token.token_number}</p>
                          <p className="text-sm text-muted-foreground">Dr. {token.doctors?.profiles?.full_name || "Unknown"} - {token.doctors?.specialization}</p>
                        </div>
                        <div className="text-right">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            token.status === "in_progress" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 animate-pulse" : "bg-primary/10 text-primary"
                          }`}>{token.status === "in_progress" ? "Your Turn!" : token.status}</span>
                          {token.estimated_time && (
                            <p className="text-xs text-muted-foreground mt-1">Est. {new Date(token.estimated_time).toLocaleTimeString()}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>

          {/* Right Column - AI Assistant */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className={`${showAIAssistant ? "block" : "hidden lg:block"} lg:sticky lg:top-24 h-[calc(100vh-120px)]`}>
            <AIHealthAssistant />
          </motion.div>
        </div>

        {/* Mobile AI Toggle */}
        <div className="fixed bottom-6 right-6 lg:hidden">
          <Button onClick={() => setShowAIAssistant(!showAIAssistant)} size="lg" className="rounded-full w-14 h-14 shadow-lg">
            <Bot className="w-6 h-6" />
          </Button>
        </div>

        {/* Mobile AI Modal */}
        {showAIAssistant && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowAIAssistant(false)} />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="absolute bottom-0 left-0 right-0 h-[80vh] bg-card rounded-t-2xl overflow-hidden">
              <AIHealthAssistant />
            </motion.div>
          </div>
        )}

        {/* Prepone Request Modal */}
        {showPreponeModal && selectedAppointment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowPreponeModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative bg-card rounded-2xl border border-border shadow-xl w-full max-w-md p-6 space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground">Request Prepone</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowPreponeModal(false)}><X className="w-5 h-5" /></Button>
              </div>

              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="text-muted-foreground">Current: <strong>{selectedAppointment.appointment_date}</strong> at <strong>{selectedAppointment.appointment_time}</strong></p>
                <p className="text-muted-foreground">Dr. {selectedAppointment.doctors?.profiles?.full_name}</p>
              </div>

              {availableSlots.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No earlier slots available</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Select Date</label>
                    <div className="grid grid-cols-3 gap-2 max-h-28 overflow-y-auto">
                      {uniqueDates.map((d) => (
                        <button key={d} onClick={() => { setPreponeDate(d); setPreponeTime(""); }}
                          className={`p-2 rounded-lg text-xs border transition-all ${preponeDate === d ? "border-primary bg-primary/10 text-primary font-semibold" : "border-border hover:border-primary/50"}`}>
                          {new Date(d).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                        </button>
                      ))}
                    </div>
                  </div>

                  {preponeDate && (
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">Select Time</label>
                      <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto">
                        {timesForDate.map((t) => (
                          <button key={t} onClick={() => setPreponeTime(t)}
                            className={`p-2 rounded-lg text-xs border transition-all ${preponeTime === t ? "border-primary bg-primary/10 text-primary font-semibold" : "border-border hover:border-primary/50"}`}>
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Reason (optional)</label>
                    <Textarea placeholder="Why do you need to prepone?" value={preponeReason} onChange={(e) => setPreponeReason(e.target.value)} rows={2} />
                  </div>

                  <Button className="w-full" disabled={!preponeDate || !preponeTime || preponeLoading} onClick={handlePreponeSubmit}>
                    {preponeLoading ? "Sending..." : "Send Prepone Request"}
                  </Button>
                </>
              )}
            </motion.div>
          </div>
        )}

        {/* My Records Modal */}
        {showRecordsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowRecordsModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative bg-card rounded-2xl border border-border shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground">My Medical Records</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowRecordsModal(false)}><X className="w-5 h-5" /></Button>
              </div>
              <ScrollArea className="flex-1 p-4">
                {patientRecords.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No medical records found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {patientRecords.map((record) => (
                      <div key={record.id} className="p-4 rounded-xl border border-border bg-muted/30">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-semibold">Dr. {record.doctors?.profiles?.full_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(record.created_at).toLocaleDateString()}
                              {record.tokens && ` • Token #${record.tokens.token_number}`}
                            </p>
                          </div>
                        </div>
                        {record.diagnosis && (
                          <div className="mb-2">
                            <p className="text-xs font-medium text-muted-foreground uppercase">Diagnosis</p>
                            <p className="text-sm">{record.diagnosis}</p>
                          </div>
                        )}
                        {record.prescription && (
                          <div className="mb-2">
                            <p className="text-xs font-medium text-muted-foreground uppercase">Prescription</p>
                            <p className="text-sm whitespace-pre-wrap">{record.prescription}</p>
                          </div>
                        )}
                        {record.notes && (
                          <div className="mb-2">
                            <p className="text-xs font-medium text-muted-foreground uppercase">Doctor's Notes</p>
                            <p className="text-sm">{record.notes}</p>
                          </div>
                        )}
                        {record.attachments && (record.attachments as string[]).length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Attachments</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              {(record.attachments as string[]).map((img, i) => (
                                <img key={i} src={img} alt={`Attachment ${i + 1}`} className="w-full h-20 object-cover rounded-lg border border-border cursor-pointer hover:opacity-80" onClick={() => window.open(img, '_blank')} />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </motion.div>
          </div>
        )}

        {/* Token Status / Current Queue Modal */}
        {showQueueModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowQueueModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative bg-card rounded-2xl border border-border shadow-xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground">Current Queue</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowQueueModal(false)}><X className="w-5 h-5" /></Button>
              </div>
              <ScrollArea className="flex-1 p-4">
                {queueData.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No active queue for your doctors today.</p>
                    <p className="text-sm mt-2">Book an appointment to get a token.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg mb-4 border border-primary/20">
                      <div className="text-center flex-1 border-r border-border">
                        <p className="text-2xl font-bold text-primary">{queueData.filter(t => t.status === "completed").length}</p>
                        <p className="text-xs text-muted-foreground">Completed</p>
                      </div>
                      <div className="text-center flex-1">
                        <p className="text-2xl font-bold text-yellow-600">{queueData.filter(t => t.status === "waiting" || t.status === "in_progress").length}</p>
                        <p className="text-xs text-muted-foreground">Waiting</p>
                      </div>
                    </div>
                    
                    <h4 className="font-medium text-sm mb-2 px-1">Today's Token Queue</h4>
                    {queueData.map((token) => {
                      const isMyToken = tokens.some(t => t.id === token.id);
                      return (
                        <div key={token.id} className={`p-3 rounded-xl border flex items-center justify-between ${
                          isMyToken ? 'bg-primary/10 border-primary shadow-sm' : 'bg-card border-border'
                        }`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                              token.status === "in_progress" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                              token.status === "completed" ? "bg-muted text-muted-foreground" :
                              isMyToken ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                            }`}>
                              {token.token_number}
                            </div>
                            <div>
                              <p className={`font-medium ${isMyToken ? 'text-primary' : 'text-foreground'}`}>
                                {isMyToken ? "Your Token" : `Token #${token.token_number}`}
                              </p>
                              {token.estimated_time && token.status !== "completed" && (
                                <p className="text-xs text-muted-foreground">Est. {new Date(token.estimated_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                              )}
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                            token.status === "in_progress" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                            token.status === "completed" ? "bg-muted text-muted-foreground" :
                            "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                          }`}>
                            {token.status.replace("_", " ")}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientDashboard;
