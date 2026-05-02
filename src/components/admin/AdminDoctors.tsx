import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, CheckCircle, XCircle, Trash2, Eye, Clock, FileText,
  Stethoscope, AlertCircle, PauseCircle, ChevronDown, ChevronUp,
  Phone, Calendar, IndianRupee, GraduationCap, X, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AdminDoctorsProps {
  doctors: any[];
  onRefresh: () => void;
}

const AdminDoctors = ({ doctors, onRefresh }: AdminDoctorsProps) => {
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedDoctor, setExpandedDoctor] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [detailModal, setDetailModal] = useState<any>(null);
  const [confirmAction, setConfirmAction] = useState<{ doctorId: string; action: string; label: string; isActive: boolean | null } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const { toast } = useToast();

  const getDocStatus = (doc: any) => {
    if (doc.is_active === true) return "APPROVED";
    if (doc.is_active === false) return "REJECTED";
    return "PENDING";
  };

  const filteredDoctors = doctors.filter(doc => {
    const status = getDocStatus(doc);
    const matchesFilter = filter === "ALL" || status === filter;
    const sl = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery ||
      (doc.profiles?.full_name?.toLowerCase().includes(sl)) ||
      (doc.license_number?.toLowerCase().includes(sl)) ||
      (doc.specialization?.toLowerCase().includes(sl));
    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: doctors.length,
    pending: doctors.filter(d => getDocStatus(d) === "PENDING").length,
    approved: doctors.filter(d => getDocStatus(d) === "APPROVED").length,
    rejected: doctors.filter(d => getDocStatus(d) === "REJECTED").length,
  };

  const executeStatusUpdate = async (doctorId: string, isActive: boolean | null, label: string) => {
    setLoading(doctorId);
    setConfirmAction(null);
    try {
      // Map action to verification status for the RPC
      const statusMap: Record<string, string> = { approve: "APPROVED", reject: "REJECTED", suspend: "PENDING" };
      const verificationStatus = statusMap[label] || "PENDING";

      console.log(`[Admin] Updating doctor ${doctorId} -> ${verificationStatus} via RPC`);

      // Use the SECURITY DEFINER RPC to bypass RLS
      const { error } = await supabase.rpc("update_doctor_verification", {
        p_doctor_id: doctorId,
        p_status: verificationStatus,
      });

      if (error) {
        console.error("[Admin] RPC error:", error);
        toast({ title: "❌ Update Failed", description: error.message, variant: "destructive" });
        return;
      }

      // Send notification to doctor (using valid type 'appointment_update')
      const doc = doctors.find(d => d.id === doctorId);
      if (doc?.user_id) {
        const titles: Record<string, string> = { approve: "✅ Profile Approved!", reject: "❌ Profile Rejected", suspend: "⏸️ Profile Under Review" };
        const messages: Record<string, string> = {
          approve: "Your doctor profile has been verified and approved. You now have full access to the platform.",
          reject: "Your doctor profile has been rejected by the admin. Please contact support.",
          suspend: "Your profile has been placed under review. Please wait for verification.",
        };
        const notifRes = await supabase.from("notifications").insert({
          user_id: doc.user_id,
          type: "appointment_update",
          title: titles[label] || "Admin Action",
          message: messages[label] || "Your profile status has been updated.",
        });
        if (notifRes.error) console.warn("[Admin] Notification insert warning:", notifRes.error);
      }

      toast({ title: `✅ Doctor ${label}d successfully`, description: "Status updated. Changes reflect instantly in the doctor's view." });
      onRefresh();
    } catch (error: any) {
      console.error("[Admin] Exception:", error);
      toast({ title: "Error", description: error.message || "Something went wrong", variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const executeDelete = async (doctorId: string) => {
    setLoading(doctorId);
    setDeleteConfirm(null);
    try {
      const doc = doctors.find(d => d.id === doctorId);
      const userId = doc?.user_id;
      console.log(`[Admin] Deleting doctor ${doctorId}, userId: ${userId}`);

      // Delete related data first (order matters for FK constraints)
      if (doctorId) {
        const steps = [
          supabase.from("patient_records").delete().eq("doctor_id", doctorId),
          supabase.from("tokens").delete().eq("doctor_id", doctorId),
          supabase.from("prepone_requests").delete().eq("doctor_id", doctorId),
          supabase.from("appointments").delete().eq("doctor_id", doctorId),
          supabase.from("clinics").delete().eq("doctor_id", doctorId),
        ];
        for (const step of steps) {
          const res = await step;
          if (res.error) console.warn("[Admin] Cleanup step error:", res.error);
        }
      }

      // Delete doctor record
      const { error } = await supabase.from("doctors").delete().eq("id", doctorId);
      if (error) {
        console.error("[Admin] Doctor delete error:", error);
        toast({ title: "❌ Deletion Failed", description: error.message, variant: "destructive" });
        return;
      }

      // Delete user data
      if (userId) {
        await supabase.from("notifications").delete().eq("user_id", userId);
        await supabase.from("user_roles").delete().eq("user_id", userId);
        await supabase.from("profiles").delete().eq("id", userId);
      }

      toast({ title: "🗑️ Doctor Deleted", description: "Doctor and all related data permanently removed." });
      onRefresh();
    } catch (error: any) {
      console.error("[Admin] Delete exception:", error);
      toast({ title: "Error", description: error.message || "Deletion failed", variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const filters = [
    { key: "ALL" as const, label: "All", count: stats.total },
    { key: "PENDING" as const, label: "Pending", count: stats.pending },
    { key: "APPROVED" as const, label: "Approved", count: stats.approved },
    { key: "REJECTED" as const, label: "Rejected", count: stats.rejected },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Stethoscope className="w-7 h-7 text-primary" /> Doctor Management
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Approve, manage, and control all registered doctors</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search name, license, specialty..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 rounded-xl" />
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {filters.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-smooth ${
              filter === f.key ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}>
            {f.label} <span className="ml-2 text-xs opacity-60">{f.count}</span>
          </button>
        ))}
      </div>

      {stats.pending > 0 && filter !== "PENDING" && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-warning/5 border border-warning/20 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-warning/10 transition-smooth"
          onClick={() => setFilter("PENDING")}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center animate-pulse">
              <Clock className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-foreground font-semibold">{stats.pending} Doctor{stats.pending > 1 ? "s" : ""} awaiting approval</p>
              <p className="text-muted-foreground text-xs">Click to review pending applications</p>
            </div>
          </div>
          <span className="text-primary text-sm font-medium">Review →</span>
        </motion.div>
      )}

      {/* Doctor List */}
      <div className="space-y-3">
        {filteredDoctors.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-16 text-center shadow-soft">
            <AlertCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">No doctors match your criteria</p>
          </div>
        ) : (
          filteredDoctors.map((doc, i) => {
            const status = getDocStatus(doc);
            const isExpanded = expandedDoctor === doc.id;
            const isLoading = loading === doc.id;
            return (
              <motion.div key={doc.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className={`bg-card rounded-2xl border transition-smooth shadow-soft ${
                  status === "PENDING" ? "border-warning/30" : "border-border hover:border-primary/20"
                } ${isLoading ? "opacity-50 pointer-events-none" : ""}`}>
                <div className="p-5 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0 ${
                    status === "APPROVED" ? "bg-success/10 text-success" :
                    status === "PENDING" ? "bg-warning/10 text-warning" :
                    "bg-destructive/10 text-destructive"
                  }`}>{doc.profiles?.full_name?.charAt(0) || "D"}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-foreground font-semibold truncate">{doc.profiles?.full_name || "Unknown Doctor"}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        status === "APPROVED" ? "bg-success/10 text-success" :
                        status === "PENDING" ? "bg-warning/10 text-warning" :
                        "bg-destructive/10 text-destructive"
                      }`}>{status}</span>
                    </div>
                    <p className="text-muted-foreground text-sm">{doc.specialization} • {doc.experience_years || 0} yrs • ₹{doc.consultation_fee}</p>
                    {doc.license_number && <p className="text-muted-foreground/60 text-xs font-mono mt-0.5">License: {doc.license_number}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                    {status === "PENDING" && (<>
                      <Button size="sm" onClick={() => setConfirmAction({ doctorId: doc.id, action: "approve", label: "approve", isActive: true })}
                        className="bg-success/10 text-success hover:bg-success/20 border border-success/20 h-9">
                        <CheckCircle className="w-4 h-4 mr-1" /> Approve
                      </Button>
                      <Button size="sm" onClick={() => setConfirmAction({ doctorId: doc.id, action: "reject", label: "reject", isActive: false })}
                        className="bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 h-9">
                        <XCircle className="w-4 h-4 mr-1" /> Reject
                      </Button>
                    </>)}

                    {status === "REJECTED" && (
                      <Button size="sm" onClick={() => setConfirmAction({ doctorId: doc.id, action: "approve", label: "approve", isActive: true })}
                        className="bg-success/10 text-success hover:bg-success/20 border border-success/20 h-9">
                        <CheckCircle className="w-4 h-4 mr-1" /> Approve
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setDetailModal(doc)} className="text-muted-foreground hover:text-foreground h-9"><Eye className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => setExpandedDoctor(isExpanded ? null : doc.id)} className="text-muted-foreground hover:text-foreground h-9">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(doc.id)} className="text-destructive/50 hover:text-destructive hover:bg-destructive/10 h-9"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="px-5 pb-5 pt-2 border-t border-border grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div><p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Education</p><p className="text-foreground text-sm">{doc.education || "N/A"}</p></div>
                        <div><p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Phone</p><p className="text-foreground text-sm">{doc.profiles?.phone || "N/A"}</p></div>
                        <div><p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Registered</p><p className="text-foreground text-sm">{new Date(doc.created_at).toLocaleDateString()}</p></div>
                        <div><p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Document</p>
                          {doc.document_url ? <a href={doc.document_url} target="_blank" rel="noopener noreferrer" className="text-primary text-sm hover:underline flex items-center gap-1"><FileText className="w-3 h-3" /> View License</a>
                           : <p className="text-muted-foreground text-sm">Not uploaded</p>}
                        </div>
                        {doc.bio && <div className="col-span-full"><p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Bio</p><p className="text-muted-foreground text-sm">{doc.bio}</p></div>}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>

      {/* ===== CONFIRM ACTION MODAL ===== */}
      <AnimatePresence>
        {confirmAction && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setConfirmAction(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-card border border-border rounded-2xl w-full max-w-sm p-6 shadow-large">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  confirmAction.action === "approve" ? "bg-success/10" : confirmAction.action === "reject" ? "bg-destructive/10" : "bg-warning/10"
                }`}>
                  {confirmAction.action === "approve" ? <CheckCircle className="w-6 h-6 text-success" /> :
                   confirmAction.action === "reject" ? <XCircle className="w-6 h-6 text-destructive" /> :
                   <PauseCircle className="w-6 h-6 text-warning" />}
                </div>
                <div>
                  <h3 className="text-foreground font-bold capitalize">{confirmAction.action} Doctor?</h3>
                  <p className="text-muted-foreground text-sm">This will instantly update the doctor's access</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setConfirmAction(null)} className="flex-1">Cancel</Button>
                <Button onClick={() => executeStatusUpdate(confirmAction.doctorId, confirmAction.isActive, confirmAction.label)}
                  className={`flex-1 ${
                    confirmAction.action === "approve" ? "bg-success hover:bg-success/90 text-white" :
                    confirmAction.action === "reject" ? "bg-destructive hover:bg-destructive/90 text-white" :
                    "bg-warning hover:bg-warning/90 text-white"
                  }`}>
                  Yes, {confirmAction.action}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ===== DELETE CONFIRM MODAL ===== */}
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
                  <h3 className="text-foreground font-bold">Delete Doctor?</h3>
                  <p className="text-destructive text-sm font-medium">This permanently removes all data!</p>
                </div>
              </div>
              <p className="text-muted-foreground text-sm mb-4">Appointments, tokens, records, clinic data — everything will be deleted. This action cannot be undone.</p>
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

      {/* ===== DETAIL MODAL ===== */}
      <AnimatePresence>
        {detailModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setDetailModal(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-card border border-border rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden shadow-large">
              <div className="p-6 border-b border-border flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground">Doctor Profile</h3>
                <Button variant="ghost" size="icon" onClick={() => setDetailModal(null)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></Button>
              </div>
              <ScrollArea className="max-h-[60vh] p-6">
                <div className="space-y-5">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl">{detailModal.profiles?.full_name?.charAt(0) || "D"}</div>
                    <div><p className="text-xl font-bold text-foreground">{detailModal.profiles?.full_name}</p><p className="text-muted-foreground text-sm">{detailModal.specialization}</p></div>
                  </div>
                  {[
                    { icon: GraduationCap, label: "Education", value: detailModal.education },
                    { icon: Clock, label: "Experience", value: `${detailModal.experience_years || 0} years` },
                    { icon: IndianRupee, label: "Consultation Fee", value: `₹${detailModal.consultation_fee}` },
                    { icon: Phone, label: "Phone", value: detailModal.profiles?.phone },
                    { icon: FileText, label: "License Number", value: detailModal.license_number },
                    { icon: Calendar, label: "Registered", value: new Date(detailModal.created_at).toLocaleDateString() },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
                      <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div><p className="text-muted-foreground text-xs">{label}</p><p className="text-foreground text-sm">{value || "N/A"}</p></div>
                    </div>
                  ))}
                  {detailModal.document_url && (
                    <a href={detailModal.document_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-xl text-primary hover:bg-primary/10 transition-smooth text-sm">
                      <FileText className="w-4 h-4" /> View License Document
                    </a>
                  )}
                </div>
              </ScrollArea>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDoctors;
