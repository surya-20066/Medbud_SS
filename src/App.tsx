import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import PatientDashboard from "./pages/PatientDashboard";
import DoctorDashboard from "./pages/DoctorDashboard";
import NotFound from "./pages/NotFound";
import BookAppointment from "./pages/BookAppointment";
import DoctorSignup from "./pages/DoctorSignup";
import DoctorAuth from "./pages/DoctorAuth";
import AdminPanel from "./pages/AdminPanel";


const queryClient = new QueryClient();

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

const MissingConfig = () => (
  <div className="min-h-screen flex items-center justify-center bg-background p-4 text-center">
    <div className="max-w-md space-y-6">
      <h1 className="text-3xl font-bold text-destructive">Configuration Missing</h1>
      <p className="text-muted-foreground">
        Supabase environment variables are not set. The app cannot function without them.
      </p>
      <div className="bg-muted p-4 rounded-lg text-left text-sm font-mono overflow-auto max-h-48">
        <p className="font-bold mb-2">Required Variables:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>VITE_SUPABASE_URL</li>
          <li>VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY)</li>
        </ul>
      </div>
      <p className="text-sm">
        Please add these variables to your Vercel project settings and redeploy.
      </p>
    </div>
  </div>
);

const App = () => {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return <MissingConfig />;
  }

  useEffect(() => {
    if (window.location.hash === "#admins") {
      window.location.replace("/admin-panel");
    }
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/doctor-auth" element={<DoctorAuth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/patient-dashboard" element={<PatientDashboard />} />
          <Route path="/doctor-dashboard" element={<DoctorDashboard />} />
          <Route path="/book-appointment" element={<BookAppointment />} />
          <Route path="/doctor-signup" element={<DoctorSignup />} />
          <Route path="/admin-panel" element={<AdminPanel />} />

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
