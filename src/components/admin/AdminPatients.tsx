import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Trash2, Eye, Users, AlertCircle, Phone,
  Calendar, FileText, X, ChevronDown, ChevronUp, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AdminPatientsProps {
  patients: any[];
  onRefresh: () => void;
}

const AdminPatients = ({ patients, onRefresh }: AdminPatientsProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedPatient, setExpandedPatient] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [detailModal, setDetailModal] = useState<any>(null);
  const [patientAppointments, setPatientAppointments] = useState<any[]>([]);
  const [patientRecords, setPatientRecords] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const { toast } = useToast();

  const filteredPatients = patients.filter(p => {
    const sl = searchQuery.toLowerCase();
    return !searchQuery || (p.full_name?.toLowerCase().includes(sl)) || (p.phone?.includes(sl));
  });

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const newPatients = patients.filter(p => new Date(p.created_at) >= sevenDaysAgo).length;

  const openDetailModal = async (patient: any) => {
    setDetailModal(patient);
    setDetailLoading(true);
    try {
      // Get appointments
      const { data: appts } = await supabase.from("appointments").select("*")
        .eq("patient_id", patient.id).order("appointment_date", { ascending: false }).limit(20);

      if (appts && appts.length > 0) {
        const docIds = [...new Set(appts.map(a => a.doctor_id).filter(Boolean))];
        const { data: docs } = await supabase.from("doctors").select("id, user_id").in("id", docIds);
        const docUserIds = docs?.map(d => d.user_id).filter(Boolean) || [];
        const { data: docProfiles } = await supabase.from("profiles").select("id, full_name").in("id", docUserIds);
        const profileMap = new Map(docProfiles?.map(p => [p.id, p.full_name]) || []);
        const docNameMap = new Map<string, string>();
        docs?.forEach(d => { docNameMap.set(d.id, profileMap.get(d.user_id) || "Unknown"); });
        setPatientAppointments(appts.map(a => ({ ...a, doctorName: docNameMap.get(a.doctor_id) || "Unknown" })));
      } else { setPatientAppointments([]); }

      // Get records
      const { data: records } = await supabase.from("patient_records").select("*")
        .eq("patient_id", patient.id).order("created_at", { ascending: false }).limit(20);

      if (records && records.length > 0) {
        const recDocIds = [...new Set(records.map(r => r.doctor_id).filter(Boolean))];
        const { data: recDocs } = await supabase.from("doctors").select("id, user_id").in("id", recDocIds);
        const recUserIds = recDocs?.map(d => d.user_id).filter(Boolean) || [];
        const { data: recProfiles } = await supabase.from("profiles").select("id, full_name").in("id", recUserIds);
        const docIdToName = new Map<string, string>();
        recDocs?.forEach(d => { const p = recProfiles?.find(p => p.id === d.user_id); docIdToName.set(d.id, p?.full_name || "Unknown"); });
        setPatientRecords(records.map(r => ({ ...r, doctorName: docIdToName.get(r.doctor_id) || "Unknown" })));
      } else { setPatientRecords([]); }
    } catch (err) { console.error("[Admin] Patient detail error:", err); }
    finally { setDetailLoading(false); }
  };

  const executeDelete = async (patientId: string) => {
    setLoading(patientId);
    setDeleteConfirm(null);
    try {
      console.log(`[Admin] Deleting patient ${patientId}`);
      const steps = [
        supabase.from("patient_records").delete().eq("patient_id", patientId),
        supabase.from("prepone_requests").delete().eq("patient_id", patientId),
        supabase.from("tokens").delete().eq("patient_id", patientId),
        supabase.from("appointments").delete().eq("patient_id", patientId),
        supabase.from("notifications").delete().eq("user_id", patientId),
        supabase.from("user_roles").delete().eq("user_id", patientId),
      ];
      for (const step of steps) {
        const res = await step;
        if (res.error) console.warn("[Admin] Cleanup:", res.error);
      }

      const { error } = await supabase.from("profiles").delete().eq("id", patientId);
      if (error) {
        console.error("[Admin] Profile delete error:", error);
        toast({ title: "❌ Deletion Failed", description: error.message, variant: "destructive" });
        return;
      }

      toast({ title: "🗑️ Patient Deleted", description: "All patient data permanently removed." });
      if (detailModal?.id === patientId) setDetailModal(null);
      onRefresh();
    } catch (error: any) {
      console.error("[Admin] Delete exception:", error);
      toast({ title: "Error", description: error.message || "Deletion failed", variant: "destructive" });
    } finally { setLoading(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Users className="w-7 h-7 text-blue-600" /> Patient Management
          </h1>
          <p className="text-muted-foreground text-sm mt-1">View and manage all registered patients</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name or phone..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 rounded-xl" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4"><p className="text-2xl font-bold text-foreground">{patients.length}</p><p className="text-muted-foreground text-xs mt-1">Total Patients</p></div>
        <div className="bg-success/5 border border-success/20 rounded-xl p-4"><p className="text-2xl font-bold text-foreground">{newPatients}</p><p className="text-muted-foreground text-xs mt-1">New (7 days)</p></div>
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 col-span-2 md:col-span-1"><p className="text-2xl font-bold text-foreground">{patients.length - newPatients}</p><p className="text-muted-foreground text-xs mt-1">Returning Patients</p></div>
      </div>

      <div className="space-y-3">
        {filteredPatients.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-16 text-center shadow-soft">
            <AlertCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">No patients found</p>
          </div>
        ) : (
          filteredPatients.map((patient, i) => {
            const isExpanded = expandedPatient === patient.id;
            const isLoading = loading === patient.id;
            return (
              <motion.div key={patient.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                className={`bg-card rounded-2xl border border-border hover:border-primary/20 transition-smooth shadow-soft ${isLoading ? "opacity-50 pointer-events-none" : ""}`}>
                <div className="p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 font-bold text-lg flex-shrink-0">{patient.full_name?.charAt(0) || "P"}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground font-semibold truncate">{patient.full_name || "Unknown Patient"}</p>
                    <div className="flex items-center gap-3 text-muted-foreground text-sm">
                      {patient.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{patient.phone}</span>}
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Joined {new Date(patient.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => openDetailModal(patient)} className="text-primary hover:bg-primary/10 h-9"><Eye className="w-4 h-4 mr-1" /> View All</Button>
                    <Button size="sm" variant="ghost" onClick={() => setExpandedPatient(isExpanded ? null : patient.id)} className="text-muted-foreground hover:text-foreground h-9">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(patient.id)} className="text-destructive/50 hover:text-destructive hover:bg-destructive/10 h-9"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="px-5 pb-5 pt-2 border-t border-border grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div><p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">User ID</p><p className="text-muted-foreground text-xs font-mono truncate">{patient.id}</p></div>
                        <div><p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Role</p><p className="text-foreground text-sm capitalize">{patient.role}</p></div>
                        <div><p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Last Updated</p><p className="text-foreground text-sm">{new Date(patient.updated_at).toLocaleDateString()}</p></div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>

      {/* DELETE CONFIRM MODAL */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-card border border-destructive/30 rounded-2xl w-full max-w-sm p-6 shadow-large">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <h3 className="text-foreground font-bold">Delete Patient?</h3>
                  <p className="text-destructive text-sm font-medium">Permanently removes all patient data!</p>
                </div>
              </div>
              <p className="text-muted-foreground text-sm mb-4">Appointments, records, tokens — everything will be deleted. This action cannot be undone.</p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="flex-1">Cancel</Button>
                <Button onClick={() => executeDelete(deleteConfirm)} className="flex-1 bg-destructive hover:bg-destructive/90 text-white">
                  <Trash2 className="w-4 h-4 mr-1" /> Delete Forever
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FULL DETAIL MODAL */}
      <AnimatePresence>
        {detailModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setDetailModal(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-large">
              <div className="p-6 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 font-bold text-lg">{detailModal.full_name?.charAt(0) || "P"}</div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{detailModal.full_name}</h3>
                    <p className="text-muted-foreground text-sm">{detailModal.phone || "No phone"} • Joined {new Date(detailModal.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setDetailModal(null)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></Button>
              </div>
              <ScrollArea className="max-h-[65vh]">
                {detailLoading ? (
                  <div className="p-12 text-center">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">Loading patient data...</p>
                  </div>
                ) : (
                  <div className="p-6 space-y-6">
                    <div>
                      <h4 className="text-foreground font-semibold mb-3 flex items-center gap-2"><Calendar className="w-4 h-4 text-blue-600" /> Appointment History ({patientAppointments.length})</h4>
                      {patientAppointments.length === 0 ? <p className="text-muted-foreground text-sm p-4 bg-muted/30 rounded-xl">No appointments found</p> : (
                        <div className="space-y-2">{patientAppointments.map((apt: any) => (
                          <div key={apt.id} className="p-3 bg-muted/20 rounded-xl flex items-center justify-between">
                            <div><p className="text-foreground text-sm">Dr. {apt.doctorName}</p><p className="text-muted-foreground text-xs">{apt.appointment_date} at {apt.appointment_time}</p>
                              {apt.symptoms && <p className="text-muted-foreground/60 text-xs mt-1 truncate max-w-xs">Symptoms: {apt.symptoms}</p>}</div>
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                              apt.status === "confirmed" ? "bg-success/10 text-success" : apt.status === "pending" ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"
                            }`}>{apt.status}</span>
                          </div>
                        ))}</div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-foreground font-semibold mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> Medical Records ({patientRecords.length})</h4>
                      {patientRecords.length === 0 ? <p className="text-muted-foreground text-sm p-4 bg-muted/30 rounded-xl">No medical records found</p> : (
                        <div className="space-y-2">{patientRecords.map((rec: any) => (
                          <div key={rec.id} className="p-4 bg-muted/20 rounded-xl">
                            <div className="flex items-center justify-between mb-2"><p className="text-foreground text-sm font-medium">Dr. {rec.doctorName}</p>
                              <p className="text-muted-foreground text-xs">{new Date(rec.created_at).toLocaleDateString()}</p></div>
                            {rec.diagnosis && <div className="mb-1"><p className="text-muted-foreground text-[10px] uppercase">Diagnosis</p><p className="text-foreground text-sm">{rec.diagnosis}</p></div>}
                            {rec.prescription && <div className="mb-1"><p className="text-muted-foreground text-[10px] uppercase">Prescription</p><p className="text-foreground text-sm whitespace-pre-wrap">{rec.prescription}</p></div>}
                            {rec.notes && <div><p className="text-muted-foreground text-[10px] uppercase">Notes</p><p className="text-foreground text-sm">{rec.notes}</p></div>}
                          </div>
                        ))}</div>
                      )}
                    </div>
                    <Button onClick={() => { setDetailModal(null); setDeleteConfirm(detailModal.id); }} className="w-full bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20">
                      <Trash2 className="w-4 h-4 mr-2" /> Delete Patient & All Data
                    </Button>
                  </div>
                )}
              </ScrollArea>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminPatients;
