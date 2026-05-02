import { motion } from "framer-motion";
import { Settings, Shield, Database, Server, Globe } from "lucide-react";

const AdminSettings = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-3"><Settings className="w-7 h-7 text-muted-foreground" /> Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Platform configuration and system info</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { icon: Shield, label: "Security", color: "text-primary", items: [{ k: "Auth Method", v: "Master Password" }, { k: "Session", v: "Browser Session (sessionStorage)" }] },
          { icon: Database, label: "Database", color: "text-blue-600", items: [{ k: "Provider", v: "Supabase (PostgreSQL)" }, { k: "Real-Time", v: "● Enabled", cls: "text-success" }] },
          { icon: Server, label: "Platform", color: "text-success", items: [{ k: "Version", v: "MedBud Admin v2.0" }, { k: "Framework", v: "React + Vite + TypeScript" }] },
          { icon: Globe, label: "Deployment", color: "text-warning", items: [{ k: "Host", v: "Vercel" }, { k: "Status", v: "● Operational", cls: "text-success" }] },
        ].map(({ icon: Icon, label, color, items }, idx) => (
          <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
            className="bg-card rounded-2xl border border-border p-6 shadow-soft">
            <h3 className="text-foreground font-semibold mb-4 flex items-center gap-2"><Icon className={`w-4 h-4 ${color}`} /> {label}</h3>
            <div className="space-y-3">
              {items.map(item => (
                <div key={item.k} className="p-3 bg-muted/20 rounded-xl">
                  <p className="text-muted-foreground text-xs uppercase mb-1">{item.k}</p>
                  <p className={`text-sm ${(item as any).cls || "text-foreground"}`}>{item.v}</p>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default AdminSettings;
