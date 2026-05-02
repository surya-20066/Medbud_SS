import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Activity, Bell, Calendar, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const AdminActivity = () => {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50);
      setActivities(data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchActivities();
    const channel = supabase.channel("admin-activity")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => { fetchActivities(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const getIcon = (type: string) => {
    if (type.includes("appointment") || type.includes("booking")) return Calendar;
    if (type.includes("admin") || type.includes("approved")) return CheckCircle;
    if (type.includes("reject") || type.includes("cancel")) return XCircle;
    return Bell;
  };

  const getColor = (type: string) => {
    if (type.includes("approved") || type.includes("confirmed")) return { bg: "bg-success/10", text: "text-success" };
    if (type.includes("reject") || type.includes("cancel") || type.includes("declined")) return { bg: "bg-destructive/10", text: "text-destructive" };
    if (type.includes("prepone") || type.includes("pending")) return { bg: "bg-warning/10", text: "text-warning" };
    if (type.includes("appointment") || type.includes("booking")) return { bg: "bg-blue-500/10", text: "text-blue-600" };
    return { bg: "bg-primary/10", text: "text-primary" };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3"><Activity className="w-7 h-7 text-success" /> Activity Log</h1>
          <p className="text-muted-foreground text-sm mt-1">Real-time feed of all platform events</p>
        </div>
        <Button variant="ghost" onClick={fetchActivities} className="text-muted-foreground hover:text-foreground" disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="space-y-2">
        {loading && activities.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Loading activities...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-16 text-center shadow-soft">
            <Activity className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">No activity recorded yet</p>
          </div>
        ) : (
          activities.map((activity, i) => {
            const Icon = getIcon(activity.type);
            const color = getColor(activity.type);
            return (
              <motion.div key={activity.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                className="bg-card rounded-xl border border-border p-4 flex items-start gap-4 hover:bg-muted/30 transition-colors shadow-soft">
                <div className={`w-10 h-10 rounded-xl ${color.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  <Icon className={`w-5 h-5 ${color.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground text-sm font-medium">{activity.title}</p>
                  <p className="text-muted-foreground text-sm mt-0.5 line-clamp-2">{activity.message}</p>
                  <p className="text-muted-foreground/50 text-xs mt-2">
                    {new Date(activity.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${color.bg} ${color.text} flex-shrink-0`}>
                  {activity.type.replace(/_/g, " ")}
                </span>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AdminActivity;
