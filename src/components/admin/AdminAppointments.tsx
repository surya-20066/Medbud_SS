import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, CalendarDays, AlertCircle, XCircle, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AdminAppointmentsProps {
  appointments: any[];
  onRefresh: () => void;
}

const AdminAppointments = ({ appointments, onRefresh }: AdminAppointmentsProps) => {
  const [filter, setFilter] = useState<"ALL" | "pending" | "confirmed" | "cancelled">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: string; status: string; apt: any } | null>(null);
  const { toast } = useToast();

  const filtered = appointments.filter(apt => {
    const matchesFilter = filter === "ALL" || apt.status === filter;
    const sl = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || (apt.patient_name?.toLowerCase().includes(sl)) || (apt.doctorName?.toLowerCase().includes(sl)) || (apt.appointment_date?.includes(sl));
    return matchesFilter && matchesSearch;
  });

  const stats = { total: appointments.length, pending: appointments.filter(a => a.status === "pending").length, confirmed: appointments.filter(a => a.status === "confirmed").length, cancelled: appointments.filter(a => a.status === "cancelled").length };

  const executeStatusUpdate = async () => {
    if (!confirmAction) return;
    const { id, status, apt } = confirmAction;
    setLoading(id);
    setConfirmAction(null);
    try {
      console.log(`[Admin] Updating appointment ${id} -> status: ${status}`);
      const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
      if (error) {
        console.error("[Admin] Appointment update error:", error);
        toast({ title: "❌ Update Failed", description: error.message, variant: "destructive" });
        return;
      }

      // Notify patient
      if (apt?.patient_id) {
        await supabase.from("notifications").insert({
          user_id: apt.patient_id,
          type: status === "cancelled" ? "appointment_cancelled" : "appointment_confirmed",
          title: status === "cancelled" ? "❌ Appointment Cancelled" : "✅ Appointment Confirmed",
          message: status === "cancelled"
            ? `Your appointment on ${apt.appointment_date} at ${apt.appointment_time} has been cancelled by admin.`
            : `Your appointment on ${apt.appointment_date} at ${apt.appointment_time} has been confirmed.`,
        });
      }

      toast({ title: "✅ Updated", description: `Appointment ${status} successfully.` });
      onRefresh();
    } catch (error: any) {
      console.error("[Admin] Exception:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally { setLoading(null); }
  };

  const filters = [
    { key: "ALL" as const, label: "All", count: stats.total },
    { key: "pending" as const, label: "Pending", count: stats.pending },
    { key: "confirmed" as const, label: "Confirmed", count: stats.confirmed },
    { key: "cancelled" as const, label: "Cancelled", count: stats.cancelled },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3"><CalendarDays className="w-7 h-7 text-success" /> Appointments</h1>
          <p className="text-muted-foreground text-sm mt-1">All appointments across the platform</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search patient, doctor, date..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 rounded-xl" />
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {filters.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-smooth ${
              filter === f.key ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}>
            {f.label} <span className="ml-1 text-xs opacity-60">{f.count}</span>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-16 text-center shadow-soft">
            <AlertCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">No appointments found</p>
          </div>
        ) : (
          filtered.map((apt, i) => (
            <motion.div key={apt.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
              className={`bg-card rounded-2xl border border-border hover:border-primary/20 p-5 transition-smooth shadow-soft ${loading === apt.id ? "opacity-50 pointer-events-none" : ""}`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  apt.status === "confirmed" ? "bg-success/10" : apt.status === "pending" ? "bg-warning/10" : "bg-destructive/10"
                }`}>
                  {apt.status === "confirmed" ? <CheckCircle className="w-5 h-5 text-success" /> :
                   apt.status === "pending" ? <Clock className="w-5 h-5 text-warning" /> :
                   <XCircle className="w-5 h-5 text-destructive" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-foreground font-semibold">{apt.patient_name || "Unknown Patient"}</p>
                    <span className="text-muted-foreground">→</span>
                    <p className="text-muted-foreground">Dr. {apt.doctorName || "Unknown"}</p>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground text-sm mt-1">
                    <span>{apt.appointment_date}</span><span>{apt.appointment_time}</span>
                    {apt.symptoms && <span className="truncate max-w-[200px] text-muted-foreground/60">• {apt.symptoms}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    apt.status === "confirmed" ? "bg-success/10 text-success" : apt.status === "pending" ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"
                  }`}>{apt.status}</span>
                  {apt.status === "pending" && (
                    <Button size="sm" onClick={() => setConfirmAction({ id: apt.id, status: "confirmed", apt })}
                      className="bg-success/10 text-success hover:bg-success/20 border border-success/20 h-8 text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" /> Confirm
                    </Button>
                  )}
                  {apt.status !== "cancelled" && (
                    <Button size="sm" onClick={() => setConfirmAction({ id: apt.id, status: "cancelled", apt })}
                      className="bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 h-8 text-xs">
                      <XCircle className="w-3 h-3 mr-1" /> Cancel
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* CONFIRM ACTION MODAL */}
      <AnimatePresence>
        {confirmAction && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setConfirmAction(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-card border border-border rounded-2xl w-full max-w-sm p-6 shadow-large">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${confirmAction.status === "confirmed" ? "bg-success/10" : "bg-destructive/10"}`}>
                  {confirmAction.status === "confirmed" ? <CheckCircle className="w-6 h-6 text-success" /> : <XCircle className="w-6 h-6 text-destructive" />}
                </div>
                <div>
                  <h3 className="text-foreground font-bold">{confirmAction.status === "confirmed" ? "Confirm" : "Cancel"} Appointment?</h3>
                  <p className="text-muted-foreground text-sm">Patient: {confirmAction.apt?.patient_name || "Unknown"}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setConfirmAction(null)} className="flex-1">Back</Button>
                <Button onClick={executeStatusUpdate}
                  className={`flex-1 text-white ${confirmAction.status === "confirmed" ? "bg-success hover:bg-success/90" : "bg-destructive hover:bg-destructive/90"}`}>
                  Yes, {confirmAction.status === "confirmed" ? "Confirm" : "Cancel"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminAppointments;
