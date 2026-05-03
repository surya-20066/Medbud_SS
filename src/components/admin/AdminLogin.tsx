import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Lock, Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface AdminLoginProps {
  onLogin: () => void;
}

const AdminLogin = ({ onLogin }: AdminLoginProps) => {
  const [password, setPassword] = useState("");
  const { toast } = useToast();
  const overridePassword = localStorage.getItem("admin_override_password");
  const ADMIN_PASSWORD = overridePassword || import.meta.env.VITE_ADMIN_PASSWORD || "Medbud@2k26";

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem("admin_authenticated", "true");
      onLogin();
      toast({ title: "🔓 Access Granted", description: "Welcome to the God Mode Control Panel." });
    } else {
      toast({ title: "⛔ Access Denied", description: "Invalid administrator password.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-secondary/10 px-4 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-card rounded-2xl shadow-large p-10 border border-border">
          <div className="flex flex-col items-center mb-10">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="w-20 h-20 rounded-2xl bg-gradient-primary flex items-center justify-center mb-6 shadow-medium"
            >
              <ShieldCheck className="w-11 h-11 text-white" />
            </motion.div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Admin Control</h1>
            <p className="text-muted-foreground text-sm mt-2 flex items-center gap-2">
              <Fingerprint className="w-4 h-4" /> Restricted Access — God Mode
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Enter master password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-14 pl-12 text-lg rounded-xl"
                autoFocus
              />
            </div>
            <Button
              type="submit"
              className="w-full h-14 text-lg font-bold bg-gradient-primary rounded-xl shadow-medium hover:shadow-large transition-smooth hover:scale-[1.02]"
            >
              Authorize Access
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-border text-center">
            <p className="text-muted-foreground text-xs">MedBud Admin Console v2.0</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
