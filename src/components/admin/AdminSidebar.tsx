import { motion } from "framer-motion";
import {
  LayoutDashboard, Stethoscope, Users, CalendarDays,
  Activity, Settings, LogOut, ShieldCheck, ChevronLeft, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";

export type AdminView = "overview" | "doctors" | "patients" | "appointments" | "activity" | "settings";

interface AdminSidebarProps {
  activeView: AdminView;
  onViewChange: (view: AdminView) => void;
  onLogout: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  pendingDoctors: number;
  pendingAppointments: number;
}

const navItems: { id: AdminView; label: string; icon: any }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "doctors", label: "Doctors", icon: Stethoscope },
  { id: "patients", label: "Patients", icon: Users },
  { id: "appointments", label: "Appointments", icon: CalendarDays },
  { id: "activity", label: "Activity Log", icon: Activity },
  { id: "settings", label: "Settings", icon: Settings },
];

const AdminSidebar = ({
  activeView, onViewChange, onLogout,
  collapsed, onToggleCollapse,
  pendingDoctors, pendingAppointments,
}: AdminSidebarProps) => {
  const getBadge = (id: AdminView) => {
    if (id === "doctors" && pendingDoctors > 0) return pendingDoctors;
    if (id === "appointments" && pendingAppointments > 0) return pendingAppointments;
    return 0;
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="fixed left-0 top-0 bottom-0 z-50 bg-card/95 backdrop-blur-xl border-r border-border flex flex-col shadow-medium"
    >
      {/* Logo */}
      <div className="p-4 flex items-center gap-3 border-b border-border min-h-[72px]">
        <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center flex-shrink-0 shadow-soft">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <p className="text-foreground font-bold text-lg leading-none">MedBud</p>
            <p className="text-muted-foreground text-[10px] uppercase tracking-widest mt-1">ADMIN</p>
          </motion.div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = activeView === item.id;
          const badge = getBadge(item.id);
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-smooth relative group ${isActive
                  ? "bg-primary/10 text-primary shadow-soft border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-primary" : ""}`} />
              {!collapsed && (
                <span className="truncate">{item.label}</span>
              )}
              {badge > 0 && (
                <span className={`${collapsed ? "absolute -top-1 -right-1" : "ml-auto"} bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 shadow-soft animate-pulse`}>
                  {badge}
                </span>
              )}
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full"
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border space-y-2">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-muted-foreground hover:text-foreground text-xs rounded-lg hover:bg-muted/50 transition-smooth"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /> Collapse</>}
        </button>
        <Button
          variant="ghost"
          onClick={onLogout}
          className={`w-full text-destructive/60 hover:text-destructive hover:bg-destructive/10 ${collapsed ? "px-2" : ""}`}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span className="ml-2">Sign Out</span>}
        </Button>
      </div>
    </motion.aside>
  );
};

export default AdminSidebar;
