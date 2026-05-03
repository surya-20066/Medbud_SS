import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useNotifications } from "@/hooks/useNotifications";
import {
  Calendar, Clock, FileText, LogOut, User, Bot, ChevronRight,
  Stethoscope, Bell, ArrowUpCircle, X, Settings, Upload, Save, Camera, Eye
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
  const [selectedRecordDoctor, setSelectedRecordDoctor] = useState<string | null>(null);
  const [viewingRecord, setViewingRecord] = useState<any>(null);
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [queueData, setQueueData] = useState<any[]>([]);
  const [selectedQueueToken, setSelectedQueueToken] = useState<any>(null);
  const [fetchingQueue, setFetchingQueue] = useState(false);

  // Settings
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ full_name: "", phone: "", avatar_url: "" });
  const [savingSettings, setSavingSettings] = useState(false);

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

      // Fetch roles - don't throw on empty result
      const { data: rolesData } = await supabase.from("user_roles").select("role").eq("user_id", userId);
      setUserRoles(rolesData?.map((r) => r.role) || []);

      // Fetch ALL appointments (recent + upcoming) so dashboard shows real data
      const { data: appointmentsData } = await supabase
        .from("appointments")
        .select(`*, doctors:doctor_id (id, specialization, user_id)`)
        .eq("patient_id", userId)
        .order("appointment_date", { ascending: false })
        .limit(20);

      const { data: tokensData } = await supabase
        .from("tokens")
        .select(`*, doctors:doctor_id (id, specialization, user_id)`)
        .eq("patient_id", userId)
        .in("status", ["waiting", "in_progress"])
        .gte("token_date", new Date().toISOString().split("T")[0])
        .order("token_date", { ascending: true })
        .limit(50);

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

  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(session?.user?.id || null);

  useRealtimeSubscription({
    table: "appointments",
    filter: session ? `patient_id=eq.${session.user.id}` : undefined,
    enabled: !!session,
    onChange: () => { if (session) fetchUserData(session.user.id); },
  });

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

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchAvailableSlots = useCallback(async (apt: any) => {
    if (!apt) return;
    const today = new Date().toISOString().split("T")[0];
    const { data: bookedTokens } = await supabase
      .from("tokens")
      .select("token_date, estimated_time")
      .eq("doctor_id", apt.doctor_id)
      .gte("token_date", today)
      .lt("token_date", apt.appointment_date)
      .in("status", ["waiting", "in_progress"]);

    const bookedSet = new Set((bookedTokens || []).map(t => `${t.token_date}|${t.estimated_time?.split("T")[1]?.substring(0, 5)}`));
    const slots: string[] = [];
    const aptDate = new Date(apt.appointment_date);
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() + 1);

    for (let d = new Date(startDate); d < aptDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      for (let h = 9; h < 18; h++) {
        for (const m of [0, 30]) {
          const timeStr = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
          const key = `${dateStr}|${timeStr}`;
          if (!bookedSet.has(key)) slots.push(`${dateStr} ${timeStr}`);
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

  const handleUpdateSettings = async () => {
    if (!profile) return;
    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: settingsForm.full_name,
          phone: settingsForm.phone,
          avatar_url: settingsForm.avatar_url
        })
        .eq("id", profile.id);

      await supabase.auth.updateUser({
        data: {
          avatar_url: settingsForm.avatar_url,
          full_name: settingsForm.full_name
        }
      });

      if (error) throw error;
      toast({ title: "Success", description: "Profile updated successfully." });
      setProfile({ ...profile, full_name: settingsForm.full_name, phone: settingsForm.phone, avatar_url: settingsForm.avatar_url });
      setShowSettingsModal(false);
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to update profile", variant: "destructive" });
    } finally {
      setSavingSettings(false);
    }
  };

  const uniqueDates = Array.from(new Set(availableSlots.map(s => s.split(" ")[0]))).sort();
  const timesForDate = availableSlots.filter(s => s.startsWith(preponeDate)).map(s => s.split(" ")[1]).sort();

  const doctorRecordGroups = useMemo(() => {
    const doctorMap = new Map<string, { doctorId: string; name: string; specialization: string; recordCount: number }>();
    patientRecords.forEach(r => {
      const docId = r.doctors?.id || r.doctor_id;
      if (!docId) return;
      if (!doctorMap.has(docId)) {
        doctorMap.set(docId, {
          doctorId: docId,
          name: r.doctors?.profiles?.full_name || "Unknown",
          specialization: r.doctors?.specialization || "",
          recordCount: 0,
        });
      }
      doctorMap.get(docId)!.recordCount++;
    });
    return Array.from(doctorMap.values());
  }, [patientRecords]);

  const doctorQueueGroups = useMemo(() => {
    const doctorMap = new Map<string, { token: any; tokenCount: number }>();
    tokens.forEach(token => {
      const docId = token.doctor_id;
      if (!docId) return;
      if (!doctorMap.has(docId)) {
        doctorMap.set(docId, { token, tokenCount: 0 });
      }
      doctorMap.get(docId)!.tokenCount++;
    });
    return Array.from(doctorMap.values());
  }, [tokens]);

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
      <nav className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center shadow-sm">
                <Stethoscope className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground tracking-tight">MedBud</h1>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Patient Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative" ref={notifRef}>
                <Button variant="ghost" size="icon" className="relative hover:bg-primary/10 transition-colors" onClick={() => setShowNotifications(!showNotifications)}>
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-card">
                      {unreadCount}
                    </span>
                  )}
                </Button>
                {showNotifications && (
                  <div className="absolute right-0 top-12 w-80 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
                    <div className="p-3 border-b border-border flex items-center justify-between bg-muted/30">
                      <h4 className="font-semibold text-sm">Notifications</h4>
                      {unreadCount > 0 && (
                        <Button variant="ghost" size="sm" className="text-xs h-7 hover:text-primary" onClick={markAllAsRead}>Mark all read</Button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto custom-scrollbar">
                      {notifications.length === 0 ? (
                        <div className="p-10 text-center text-muted-foreground text-sm">
                          <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                          <p>No notifications</p>
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div key={n.id} className={`p-4 border-b border-border last:border-0 cursor-pointer hover:bg-muted/50 transition-colors ${!n.is_read ? "bg-primary/5" : ""}`} onClick={() => markAsRead(n.id)}>
                            <p className={`text-sm ${!n.is_read ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{n.title}</p>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.message}</p>
                            <p className="text-[10px] text-muted-foreground mt-2 font-medium">{new Date(n.created_at).toLocaleString()}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              <Button onClick={handleLogout} variant="ghost" size="sm" className="hover:text-red-500 hover:bg-red-50 transition-colors">
                <LogOut className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-8 h-8 text-white" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{profile?.full_name || "Patient"}</h2>
                    <p className="text-white/80 text-sm font-medium">{profile?.phone || "No phone linked"}</p>
                    <div className="mt-2 flex gap-2">
                      {userRoles.map((role) => (
                        <span key={role} className="px-2 py-0.5 bg-white/20 rounded-md text-[10px] font-bold uppercase tracking-wider border border-white/10">{role}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 gap-4">
                <div className="bg-card border border-border rounded-2xl p-4 shadow-sm flex flex-col justify-center items-center text-center">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{appointments.filter(a => a.status === 'confirmed').length}</p>
                  <p className="text-xs text-muted-foreground font-medium">Appointments</p>
                </div>
                <div className="bg-card border border-border rounded-2xl p-4 shadow-sm flex flex-col justify-center items-center text-center">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center mb-2">
                    <Clock className="w-5 h-5 text-orange-500" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{tokens.length}</p>
                  <p className="text-xs text-muted-foreground font-medium">Active Tokens</p>
                </div>
              </motion.div>
            </div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="outline" className="h-auto py-6 flex flex-col gap-3 rounded-2xl border-border hover:border-primary hover:bg-primary/5 transition-all shadow-sm group" onClick={() => navigate("/book-appointment")}>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Calendar className="w-6 h-6 text-primary" />
                </div>
                <span className="text-sm font-semibold">Book Appt</span>
              </Button>
              <Button variant="outline" className="h-auto py-6 flex flex-col gap-3 rounded-2xl border-border hover:border-primary hover:bg-primary/5 transition-all shadow-sm group" onClick={() => setShowRecordsModal(true)}>
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="w-6 h-6 text-blue-500" />
                </div>
                <span className="text-sm font-semibold">My Records</span>
              </Button>
              <Button variant="outline" className="h-auto py-6 flex flex-col gap-3 rounded-2xl border-border hover:border-primary hover:bg-primary/5 transition-all shadow-sm group" onClick={() => { setSelectedQueueToken(null); setShowQueueModal(true); }}>
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Clock className="w-6 h-6 text-orange-500" />
                </div>
                <span className="text-sm font-semibold">Token Status</span>
              </Button>
              <Button variant="outline" className="h-auto py-6 flex flex-col gap-3 rounded-2xl border-border hover:border-primary hover:bg-primary/5 transition-all shadow-sm group" onClick={() => {
                setSettingsForm({ full_name: profile?.full_name || "", phone: profile?.phone || "", avatar_url: profile?.avatar_url || "" });
                setShowSettingsModal(true);
              }}>
                <div className="w-12 h-12 rounded-xl bg-slate-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Settings className="w-6 h-6 text-slate-500" />
                </div>
                <span className="text-sm font-semibold">Settings</span>
              </Button>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
              <div className="p-5 border-b border-border flex items-center justify-between bg-muted/10">
                <h3 className="font-bold text-foreground flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" /> Upcoming Appointments
                </h3>
              </div>
              <div className="divide-y divide-border">
                {appointments.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">No upcoming appointments</p>
                  </div>
                ) : (
                  appointments.map((apt) => (
                    <div key={apt.id} className="p-5 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Stethoscope className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <p className="font-bold text-foreground">Dr. {apt.doctors?.profiles?.full_name || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{apt.doctors?.specialization}</p>
                            <div className="flex items-center gap-3 mt-1.5">
                              <span className="flex items-center gap-1 text-xs font-medium text-foreground">
                                <Calendar className="w-3 h-3 text-primary" /> {new Date(apt.appointment_date).toLocaleDateString()}
                              </span>
                              <span className="flex items-center gap-1 text-xs font-medium text-foreground">
                                <Clock className="w-3 h-3 text-primary" /> {apt.appointment_time}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg ${apt.status === "confirmed" ? "bg-green-500/10 text-green-600 border border-green-500/20" :
                              apt.status === "pending" ? "bg-yellow-500/10 text-yellow-600 border border-yellow-500/20" :
                                "bg-red-500/10 text-red-600 border border-red-500/20"
                            }`}>
                            {apt.status === "pending" ? "Awaiting Approval" : apt.status}
                          </span>
                          {apt.status === "confirmed" && new Date(apt.appointment_date) > new Date() && (
                            <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2 font-bold uppercase text-orange-600 hover:bg-orange-50 transition-colors" onClick={() => openPreponeModal(apt)}>
                              <ArrowUpCircle className="w-3 h-3 mr-1" /> Prepone
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
              <div className="p-5 border-b border-border bg-muted/10">
                <h3 className="font-bold text-foreground flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" /> Active Queue Status
                </h3>
              </div>
              <div className="divide-y divide-border">
                {tokens.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">
                    <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" /><p className="font-medium">No active tokens</p>
                  </div>
                ) : (
                  tokens.map((token) => (
                    <div key={token.id} className="p-5 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 border ${token.status === "in_progress" ? "bg-green-500 border-green-400 text-white shadow-lg shadow-green-500/20" : "bg-primary/5 border-primary/10 text-primary"
                            }`}>
                            <span className="text-[10px] font-bold uppercase opacity-80">Token</span>
                            <span className="text-xl font-black leading-none mt-1">{token.token_number}</span>
                          </div>
                          <div>
                            <p className="font-bold text-foreground">Dr. {token.doctors?.profiles?.full_name || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground font-medium">{token.doctors?.specialization}</p>
                            {token.estimated_time && (
                              <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-primary">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Est. Arrival: {new Date(token.estimated_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${token.status === "in_progress" ? "bg-green-500 text-white animate-pulse" : "bg-primary/10 text-primary"
                            }`}>{token.status === "in_progress" ? "Current Patient" : "Waiting"}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className={`${showAIAssistant ? "block" : "hidden lg:block"} lg:sticky lg:top-24 h-[calc(100vh-120px)]`}>
            <div className="h-full bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 border-b border-border flex items-center justify-between bg-primary/5 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-bold text-sm">Health Assistant</h3>
                </div>
                <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setShowAIAssistant(false)}><X className="w-4 h-4" /></Button>
              </div>
              <AIHealthAssistant />
            </div>
          </motion.div>
        </div>
      </main>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={() => setShowSettingsModal(false)} />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="relative bg-card rounded-3xl border border-border shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 pb-4 border-b border-border flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                  <Settings className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Settings</h3>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Update your profile</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-background/80" onClick={() => setShowSettingsModal(false)}><X className="w-5 h-5" /></Button>
            </div>

            <ScrollArea className="flex-1 p-6">
              <div className="space-y-8">
                <div className="flex flex-col items-center">
                  <div className="relative group">
                    <div className="w-32 h-32 rounded-3xl bg-muted border-4 border-card shadow-2xl overflow-hidden flex items-center justify-center transition-transform group-hover:scale-105">
                      {settingsForm.avatar_url ? (
                        <img src={settingsForm.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-12 h-12 text-muted-foreground opacity-30" />
                      )}
                    </div>
                    <div className="absolute -bottom-2 -right-2 flex gap-1">
                      <label htmlFor="take-pic-upload" className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 transition-transform">
                        <Camera className="w-5 h-5" />
                        <input type="file" accept="image/*" capture="user" id="take-pic-upload" className="hidden" onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => setSettingsForm({ ...settingsForm, avatar_url: reader.result as string });
                            reader.readAsDataURL(file);
                          }
                        }} />
                      </label>
                    </div>
                  </div>
                  <div className="mt-6 flex gap-3 w-full">
                    <label htmlFor="gallery-upload" className="flex-1 py-2.5 rounded-xl border border-border bg-card hover:bg-muted/50 flex items-center justify-center gap-2 cursor-pointer transition-colors text-sm font-semibold">
                      <Upload className="w-4 h-4" /> Browse Gallery
                      <input type="file" accept="image/*" id="gallery-upload" className="hidden" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => setSettingsForm({ ...settingsForm, avatar_url: reader.result as string });
                          reader.readAsDataURL(file);
                        }
                      }} />
                    </label>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Full Name</Label>
                    <Input className="h-12 rounded-xl bg-muted/30 border-border focus:ring-primary focus:border-primary transition-all" value={settingsForm.full_name} onChange={(e) => setSettingsForm({ ...settingsForm, full_name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Phone Number</Label>
                    <Input className="h-12 rounded-xl bg-muted/30 border-border focus:ring-primary focus:border-primary transition-all" value={settingsForm.phone} onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })} />
                  </div>
                </div>
              </div>
            </ScrollArea>
            <div className="p-6 border-t border-border bg-muted/10 flex justify-end gap-3 shrink-0">
              <Button variant="ghost" className="rounded-xl font-bold text-muted-foreground h-12 px-6" onClick={() => setShowSettingsModal(false)}>Cancel</Button>
              <Button className="rounded-xl bg-primary text-white font-bold h-12 px-8 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all min-w-[140px]" disabled={savingSettings} onClick={handleUpdateSettings}>
                {savingSettings ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save Profile</>}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* My Records Modal */}
      {showRecordsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={() => { setShowRecordsModal(false); setSelectedRecordDoctor(null); setViewingRecord(null); }} />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="relative bg-card rounded-3xl border border-border shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-border flex items-center justify-between bg-muted/10 shrink-0">
              <div className="flex items-center gap-3">
                {(selectedRecordDoctor || viewingRecord) && (
                  <Button variant="ghost" size="icon" onClick={() => {
                    if (viewingRecord) { setViewingRecord(null); }
                    else { setSelectedRecordDoctor(null); }
                  }} className="h-10 w-10 rounded-full hover:bg-background">
                    <ChevronRight className="w-6 h-6 rotate-180" />
                  </Button>
                )}
                <div>
                  <h3 className="text-xl font-bold text-foreground">
                    {viewingRecord ? "Record Details" : selectedRecordDoctor ? "Consultations" : "Medical Records"}
                  </h3>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{profile?.full_name}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-background" onClick={() => { setShowRecordsModal(false); setSelectedRecordDoctor(null); setViewingRecord(null); }}><X className="w-6 h-6" /></Button>
            </div>
            <ScrollArea className="flex-1 p-6">
              {!selectedRecordDoctor && !viewingRecord && (
                <>
                  {doctorRecordGroups.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground">
                      <FileText className="w-16 h-16 mx-auto mb-4 opacity-10" />
                      <p className="font-bold text-lg">No records found</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {doctorRecordGroups.map(doc => (
                        <div key={doc.doctorId} onClick={() => setSelectedRecordDoctor(doc.doctorId)} className="p-5 rounded-2xl border border-border hover:border-primary cursor-pointer transition-all bg-card hover:bg-primary/5 group flex items-center justify-between shadow-sm">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                              <Stethoscope className="w-7 h-7 text-primary" />
                            </div>
                            <div>
                              <p className="font-black text-foreground">Dr. {doc.name}</p>
                              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{doc.specialization}</p>
                              <div className="mt-2 flex items-center gap-1.5">
                                <span className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary text-[10px] font-black uppercase tracking-tighter">{doc.recordCount} {doc.recordCount === 1 ? 'Record' : 'Records'}</span>
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {selectedRecordDoctor && !viewingRecord && (
                <div className="space-y-4">
                  {patientRecords
                    .filter(r => (r.doctors?.id || r.doctor_id) === selectedRecordDoctor)
                    .map(record => (
                      <div key={record.id} className="p-5 rounded-2xl border border-border bg-muted/20 flex items-center justify-between hover:bg-muted/30 transition-colors group">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-6 h-6 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-foreground">Consultation</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Calendar className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground font-semibold">{new Date(record.created_at).toLocaleDateString()}</span>
                              {record.tokens && <span className="text-xs text-muted-foreground font-black ml-1 uppercase opacity-50">Token #{record.tokens.token_number}</span>}
                            </div>
                            {record.diagnosis && <p className="text-xs text-muted-foreground truncate mt-2 italic">"{record.diagnosis}"</p>}
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" className="flex-shrink-0 ml-4 rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-primary hover:text-white transition-all px-4" onClick={() => setViewingRecord(record)}>
                          <Eye className="w-4 h-4 mr-2" /> View
                        </Button>
                      </div>
                    ))}
                </div>
              )}

              {viewingRecord && (
                <div className="space-y-6">
                  <div className="flex items-center gap-4 p-5 bg-primary/5 rounded-2xl border border-primary/20">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner">
                      <Stethoscope className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-primary uppercase tracking-widest">Consulting Doctor</p>
                      <p className="text-2xl font-black text-foreground">Dr. {viewingRecord.doctors?.profiles?.full_name || "Unknown"}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground font-semibold">
                          {new Date(viewingRecord.created_at).toLocaleDateString()}
                          {viewingRecord.tokens && ` • Token #${viewingRecord.tokens.token_number}`}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {viewingRecord.diagnosis && (
                      <div className="p-5 rounded-2xl bg-muted/20 border border-border">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3">Diagnosis</p>
                        <p className="text-base text-foreground font-medium leading-relaxed">{viewingRecord.diagnosis}</p>
                      </div>
                    )}
                    {viewingRecord.prescription && (
                      <div className="p-5 rounded-2xl bg-muted/20 border border-border">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3">Prescription</p>
                        <p className="text-base text-foreground font-medium leading-relaxed whitespace-pre-wrap">{viewingRecord.prescription}</p>
                      </div>
                    )}
                  </div>

                  {viewingRecord.notes && (
                    <div className="p-5 rounded-2xl bg-muted/20 border border-border">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3">Additional Notes</p>
                      <p className="text-base text-foreground font-medium leading-relaxed">{viewingRecord.notes}</p>
                    </div>
                  )}

                  {viewingRecord.attachments && (viewingRecord.attachments as string[]).length > 0 && (
                    <div className="p-5 rounded-2xl bg-muted/20 border border-border">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4">Clinical Attachments</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {(viewingRecord.attachments as string[]).map((img, i) => (
                          <div key={i} className="aspect-square rounded-xl overflow-hidden border border-border cursor-pointer hover:ring-4 hover:ring-primary/20 transition-all" onClick={() => window.open(img, '_blank')}>
                            <img src={img} alt={`Attachment ${i + 1}`} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </motion.div>
        </div>
      )}

      {/* Token Status / Current Queue Modal */}
      {showQueueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={() => setShowQueueModal(false)} />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="relative bg-card rounded-3xl border border-border shadow-2xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-border flex items-center justify-between bg-muted/10 shrink-0">
              <div className="flex items-center gap-3">
                {selectedQueueToken && (
                  <Button variant="ghost" size="icon" onClick={() => setSelectedQueueToken(null)} className="h-10 w-10 rounded-full hover:bg-background">
                    <ChevronRight className="w-6 h-6 rotate-180" />
                  </Button>
                )}
                <div>
                  <h3 className="text-xl font-bold text-foreground">
                    {selectedQueueToken ? `Dr. ${selectedQueueToken.doctors?.profiles?.full_name}` : "Select Doctor"}
                  </h3>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Live Queue Status</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-background" onClick={() => setShowQueueModal(false)}><X className="w-6 h-6" /></Button>
            </div>
            <ScrollArea className="flex-1 p-6">
              {!selectedQueueToken ? (
                doctorQueueGroups.length === 0 ? (
                  <div className="text-center py-20 text-muted-foreground">
                    <Clock className="w-16 h-16 mx-auto mb-4 opacity-10" />
                    <p className="font-bold text-lg">No active tokens</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {doctorQueueGroups.map(({ token, tokenCount }) => (
                      <div key={token.doctor_id}
                        onClick={async () => {
                          setSelectedQueueToken(token);
                          setFetchingQueue(true);
                          const today = new Date().toISOString().split("T")[0];
                          const { data } = await supabase
                            .from("tokens")
                            .select("*")
                            .eq("doctor_id", token.doctor_id)
                            .gte("token_date", today)
                            .order("token_number", { ascending: true });
                          setQueueData(data || []);
                          setFetchingQueue(false);
                        }}
                        className="p-5 rounded-2xl border border-border hover:border-primary cursor-pointer transition-all bg-card hover:bg-primary/5 group flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Stethoscope className="w-7 h-7 text-orange-500" />
                          </div>
                          <div>
                            <p className="font-black text-foreground">Dr. {token.doctors?.profiles?.full_name}</p>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{token.doctors?.specialization}</p>
                            <div className="mt-2 flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded-lg bg-orange-500/10 text-orange-600 text-[10px] font-black uppercase tracking-tighter">{tokenCount} Active {tokenCount === 1 ? 'Token' : 'Tokens'}</span>
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    ))}
                  </div>
                )
              ) : fetchingQueue ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Syncing live queue...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex gap-3 mb-6">
                    <div className="flex-1 p-4 bg-primary/5 rounded-2xl border border-primary/10 text-center">
                      <p className="text-3xl font-black text-primary">{queueData.filter(t => t.status === "completed").length}</p>
                      <p className="text-[10px] text-muted-foreground font-black uppercase tracking-tighter">Completed</p>
                    </div>
                    <div className="flex-1 p-4 bg-orange-500/5 rounded-2xl border border-orange-500/10 text-center">
                      <p className="text-3xl font-black text-orange-600">{queueData.filter(t => t.status === "waiting" || t.status === "in_progress").length}</p>
                      <p className="text-[10px] text-muted-foreground font-black uppercase tracking-tighter">Waiting</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {queueData.map((token) => {
                      const isMyToken = tokens.some(t => t.id === token.id);
                      return (
                        <div key={token.id} className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${isMyToken ? 'bg-primary border-primary shadow-lg shadow-primary/20 text-white' : 'bg-card border-border hover:bg-muted/30'
                          }`}>
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-black transition-all ${token.status === "in_progress" ? "bg-white text-green-600 animate-pulse" :
                                token.status === "completed" ? "bg-muted text-muted-foreground opacity-50" :
                                  isMyToken ? "bg-white/20 text-white" : "bg-muted text-foreground"
                              }`}>
                              <span className="text-[8px] uppercase tracking-tighter mb-0.5">Token</span>
                              <span className="text-lg leading-none">{token.token_number}</span>
                            </div>
                            <div>
                              <p className="font-bold">{isMyToken ? "Your Appointment" : `Token #${token.token_number}`}</p>
                              <div className="flex items-center gap-1.5 opacity-80">
                                <Clock className="w-3 h-3" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">{new Date(token.token_date).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                          <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full ${token.status === "in_progress" ? "bg-white/20 text-white" :
                              token.status === "completed" ? "bg-muted/50 text-muted-foreground" :
                                isMyToken ? "bg-white/10 text-white" : "bg-primary/5 text-primary"
                            }`}>{token.status}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </ScrollArea>
          </motion.div>
        </div>
      )}

      {/* Prepone Modal */}
      {showPreponeModal && selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={() => setShowPreponeModal(false)} />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative bg-card rounded-3xl border border-border shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-border bg-orange-500/5">
              <h3 className="text-xl font-bold text-foreground">Request Prepone</h3>
              <p className="text-xs text-muted-foreground">Move your appointment earlier</p>
            </div>
            <div className="p-6 space-y-6">
              <div className="p-4 bg-muted/30 rounded-2xl border border-border">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Current Schedule</p>
                <p className="font-bold text-foreground">{new Date(selectedAppointment.appointment_date).toLocaleDateString()} at {selectedAppointment.appointment_time}</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">New Date</Label>
                  <select className="w-full h-12 rounded-xl bg-muted/30 border border-border px-4 font-semibold text-sm focus:ring-2 focus:ring-primary" value={preponeDate} onChange={(e) => setPreponeDate(e.target.value)}>
                    <option value="">Select a date</option>
                    {uniqueDates.map(date => <option key={date} value={date}>{new Date(date).toLocaleDateString()}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">New Time</Label>
                  <select className="w-full h-12 rounded-xl bg-muted/30 border border-border px-4 font-semibold text-sm focus:ring-2 focus:ring-primary" value={preponeTime} onChange={(e) => setPreponeTime(e.target.value)} disabled={!preponeDate}>
                    <option value="">Select a time</option>
                    {timesForDate.map(time => <option key={time} value={time}>{time}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Reason (Optional)</Label>
                  <Textarea className="rounded-2xl bg-muted/30 border border-border focus:ring-primary resize-none" placeholder="Reason..." value={preponeReason} onChange={(e) => setPreponeReason(e.target.value)} rows={2} />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-border flex gap-3 bg-muted/10">
              <Button variant="ghost" className="flex-1 rounded-xl h-12 font-bold" onClick={() => setShowPreponeModal(false)}>Cancel</Button>
              <Button className="flex-1 rounded-xl h-12 bg-orange-500 hover:bg-orange-600 text-white font-bold" onClick={handlePreponeSubmit} disabled={preponeLoading || !preponeDate || !preponeTime}>
                {preponeLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Request"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default PatientDashboard;
