import { motion } from "framer-motion";
import {
  Stethoscope, Users, CalendarDays, TrendingUp,
  Clock, UserCheck, ArrowUpRight
} from "lucide-react";

interface OverviewProps {
  stats: {
    totalDoctors: number;
    pendingDoctors: number;
    approvedDoctors: number;
    totalPatients: number;
    totalAppointments: number;
    todayAppointments: number;
    pendingAppointments: number;
    totalRevenue: number;
    recentDoctors: any[];
    recentPatients: any[];
  };
  onNavigate: (view: string) => void;
}

const StatCard = ({ icon: Icon, label, value, bgClass, iconClass, delay, onClick }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    onClick={onClick}
    className="bg-card rounded-2xl p-6 border border-border hover:border-primary/30 transition-smooth cursor-pointer group shadow-soft hover:shadow-medium"
  >
    <div className="flex items-start justify-between mb-4">
      <div className={`w-12 h-12 rounded-xl ${bgClass} flex items-center justify-center group-hover:scale-110 transition-smooth`}>
        <Icon className={`w-6 h-6 ${iconClass}`} />
      </div>
    </div>
    <p className="text-3xl font-bold text-foreground mb-1">{value}</p>
    <p className="text-muted-foreground text-sm">{label}</p>
  </motion.div>
);

const AdminOverview = ({ stats, onNavigate }: OverviewProps) => {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-3xl font-bold text-foreground">
          Command Center
        </motion.h1>
        <motion.p initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="text-muted-foreground mt-1">
          Platform-wide overview • {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </motion.p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Stethoscope} label="Total Doctors" value={stats.totalDoctors}
          bgClass="bg-primary/10" iconClass="text-primary" delay={0.1} onClick={() => onNavigate("doctors")} />
        <StatCard icon={Users} label="Total Patients" value={stats.totalPatients}
          bgClass="bg-blue-500/10" iconClass="text-blue-600" delay={0.15} onClick={() => onNavigate("patients")} />
        <StatCard icon={CalendarDays} label="Total Appointments" value={stats.totalAppointments}
          bgClass="bg-success/10" iconClass="text-success" delay={0.2} onClick={() => onNavigate("appointments")} />
        <StatCard icon={TrendingUp} label="Est. Revenue" value={`₹${stats.totalRevenue.toLocaleString()}`}
          bgClass="bg-warning/10" iconClass="text-warning" delay={0.25} />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-warning/5 border border-warning/20 rounded-xl p-4 cursor-pointer hover:bg-warning/10 transition-smooth"
          onClick={() => onNavigate("doctors")}>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-warning" />
            <span className="text-warning text-xs font-semibold uppercase tracking-wider">Pending</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.pendingDoctors}</p>
          <p className="text-muted-foreground text-xs mt-1">Doctor approvals</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="bg-success/5 border border-success/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <UserCheck className="w-4 h-4 text-success" />
            <span className="text-success text-xs font-semibold uppercase tracking-wider">Active</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.approvedDoctors}</p>
          <p className="text-muted-foreground text-xs mt-1">Verified doctors</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CalendarDays className="w-4 h-4 text-blue-600" />
            <span className="text-blue-600 text-xs font-semibold uppercase tracking-wider">Today</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.todayAppointments}</p>
          <p className="text-muted-foreground text-xs mt-1">Appointments today</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-4 cursor-pointer hover:bg-orange-500/10 transition-smooth"
          onClick={() => onNavigate("appointments")}>
          <div className="flex items-center gap-2 mb-2">
            <CalendarDays className="w-4 h-4 text-orange-500" />
            <span className="text-orange-500 text-xs font-semibold uppercase tracking-wider">Pending</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.pendingAppointments}</p>
          <p className="text-muted-foreground text-xs mt-1">Booking requests</p>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Doctors */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="bg-card rounded-2xl border border-border overflow-hidden shadow-soft">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h3 className="text-foreground font-semibold flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-primary" /> Recent Doctors
            </h3>
            <button onClick={() => onNavigate("doctors")} className="text-primary text-xs hover:underline font-medium">View all →</button>
          </div>
          <div className="divide-y divide-border">
            {stats.recentDoctors.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No doctors registered yet</div>
            ) : (
              stats.recentDoctors.slice(0, 5).map((doc: any) => (
                <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                      {doc.profiles?.full_name?.charAt(0) || "D"}
                    </div>
                    <div>
                      <p className="text-foreground text-sm font-medium">{doc.profiles?.full_name || "Unknown"}</p>
                      <p className="text-muted-foreground text-xs">{doc.specialization}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    doc.is_active === true ? "bg-success/10 text-success" :
                    doc.is_active === false ? "bg-destructive/10 text-destructive" :
                    "bg-warning/10 text-warning"
                  }`}>
                    {doc.is_active === true ? "Active" : doc.is_active === false ? "Rejected" : "Pending"}
                  </span>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Recent Patients */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
          className="bg-card rounded-2xl border border-border overflow-hidden shadow-soft">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h3 className="text-foreground font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" /> Recent Patients
            </h3>
            <button onClick={() => onNavigate("patients")} className="text-primary text-xs hover:underline font-medium">View all →</button>
          </div>
          <div className="divide-y divide-border">
            {stats.recentPatients.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No patients registered yet</div>
            ) : (
              stats.recentPatients.slice(0, 5).map((p: any) => (
                <div key={p.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 font-bold text-sm">
                      {p.full_name?.charAt(0) || "P"}
                    </div>
                    <div>
                      <p className="text-foreground text-sm font-medium">{p.full_name || "Unknown"}</p>
                      <p className="text-muted-foreground text-xs">{p.phone || "No phone"}</p>
                    </div>
                  </div>
                  <span className="text-muted-foreground text-xs">{new Date(p.created_at).toLocaleDateString()}</span>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminOverview;
