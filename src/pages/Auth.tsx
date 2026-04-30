import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Stethoscope, Mail, Lock, User, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const signupSchema = z.object({
  email: z.string()
    .trim()
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters"),
  password: z.string()
    .min(6, "Password must be at least 6 characters")
    .max(128, "Password must be less than 128 characters"),
  fullName: z.string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters")
    .regex(/^[a-zA-Z\s\-']+$/, "Name can only contain letters, spaces, hyphens, and apostrophes"),
  phone: z.string()
    .trim()
    .regex(/^[0-9]{10}$/, "Phone number must be exactly 10 digits")
    .max(15, "Phone number is too long"),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const Auth = () => {
  const [authView, setAuthView] = useState<'login' | 'signup' | 'forgot_email' | 'forgot_otp' | 'forgot_new_password'>('login');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if URL has recovery hash
    const isRecovery = window.location.hash.includes("type=recovery");
    if (isRecovery) {
      setAuthView("forgot_new_password");
    }

    // Check if user is already logged in and redirect based on role
    const checkUser = async () => {
      if (isRecovery) return; // Prevent redirecting when user needs to reset password
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Check user role to redirect appropriately
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id);
        
        const userRoles = roles?.map(r => r.role) || [];
        const getRedirectPath = (defaultPath: string) => {
          const params = new URLSearchParams(window.location.search);
          const returnTo = params.get("returnTo");
          return returnTo || defaultPath;
        };

        if (userRoles.includes("doctor")) {
          navigate(getRedirectPath("/doctor-dashboard"));
        } else if (userRoles.includes("admin")) {
          navigate(getRedirectPath("/dashboard"));
        } else {
          navigate(getRedirectPath("/patient-dashboard"));
        }
      }
    };
    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setAuthView("forgot_new_password");
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validatedData = signupSchema.parse({ email, password, fullName, phone });
      
      // Step 1: Create user via edge function (admin API - auto-confirmed, no email sent)
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/signup`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: validatedData.email,
            password: validatedData.password,
            full_name: validatedData.fullName,
            phone: validatedData.phone,
            role: "patient",
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        toast({
          title: "Signup failed",
          description: result.error || "Something went wrong",
          variant: "destructive",
        });
        return;
      }

      // Step 2: Sign in immediately with the new credentials
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: validatedData.email,
        password: validatedData.password,
      });

      if (signInError) {
        toast({
          title: "Account created but login failed",
          description: "Please try logging in manually.",
          variant: "destructive",
        });
        setAuthView("login");
        return;
      }

      toast({
        title: "Success!",
        description: "Account created successfully. Redirecting...",
      });
      const params = new URLSearchParams(window.location.search);
      const returnTo = params.get("returnTo");
      navigate(returnTo || "/patient-dashboard");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validatedData = loginSchema.parse({ email, password });

      const { data, error } = await supabase.auth.signInWithPassword({
        email: validatedData.email,
        password: validatedData.password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast({
            title: "Login failed",
            description: "Invalid email or password. Please try again.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Login failed",
            description: error.message,
            variant: "destructive",
          });
        }
        return;
      }

      if (data.session) {
        // Check user role to redirect appropriately
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.session.user.id);
        
        const userRoles = roles?.map(r => r.role) || [];
        
        toast({
          title: "Welcome back!",
          description: "Logged in successfully.",
        });
        
        const getRedirectPath = (defaultPath: string) => {
          const params = new URLSearchParams(window.location.search);
          const returnTo = params.get("returnTo");
          return returnTo || defaultPath;
        };

        if (userRoles.includes("doctor")) {
          navigate(getRedirectPath("/doctor-dashboard"));
        } else if (userRoles.includes("admin")) {
          navigate(getRedirectPath("/dashboard"));
        } else {
          navigate(getRedirectPath("/patient-dashboard"));
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return toast({ title: "Error", description: "Email is required", variant: "destructive" });
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) throw error;
      toast({ title: "Email Sent", description: "Please check your email for the OTP or Reset Link." });
      setAuthView('forgot_otp');
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return toast({ title: "Error", description: "OTP is required", variant: "destructive" });
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'recovery'
      });
      if (error) throw error;
      toast({ title: "OTP Verified", description: "Please create a new password." });
      setAuthView('forgot_new_password');
    } catch (error: any) {
      toast({ title: "Invalid OTP", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) return toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
    if (newPassword !== confirmPassword) return toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: "Success", description: "Password updated successfully. You can now login." });
      setAuthView('login');
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setOtp('');
      // Clean up URL hash after password reset
      window.history.replaceState(null, '', window.location.pathname);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-secondary/10 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-card rounded-2xl shadow-large p-8 border border-border">
          <div className="flex items-center justify-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
              <Stethoscope className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-foreground ml-3">MedBud</span>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {authView === 'login' ? "Welcome Back" : 
               authView === 'signup' ? "Get Started" : 
               authView === 'forgot_email' ? "Reset Password" :
               authView === 'forgot_otp' ? "Enter OTP" : "New Password"}
            </h1>
            <p className="text-muted-foreground">
              {authView === 'login' ? "Sign in to access your account" : 
               authView === 'signup' ? "Create your account to book appointments" :
               authView === 'forgot_email' ? "Enter your email to receive an OTP" :
               authView === 'forgot_otp' ? "Enter the OTP sent to your email" : "Enter your new preferred password"}
            </p>
          </div>

          {authView === 'login' || authView === 'signup' ? (
            <form onSubmit={authView === 'login' ? handleLogin : handleSignup} className="space-y-4">
              {authView === 'signup' && (
                <>
                  <div>
                    <Label htmlFor="fullName">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="Enter your full name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="Enter your phone number"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {authView === 'login' && (
                    <button type="button" onClick={() => setAuthView('forgot_email')} className="text-sm text-primary hover:underline font-medium">
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full shadow-medium hover:shadow-large transition-smooth"
                disabled={loading}
              >
                {loading ? "Please wait..." : authView === 'login' ? "Sign In" : "Create Account"}
              </Button>
            </form>
          ) : authView === 'forgot_email' ? (
            <form onSubmit={handleSendResetOtp} className="space-y-4">
              <div>
                <Label htmlFor="reset-email">Email</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full shadow-medium transition-smooth" disabled={loading}>
                {loading ? "Please wait..." : "Send OTP"}
              </Button>
            </form>
          ) : authView === 'forgot_otp' ? (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <Label htmlFor="otp">Enter OTP</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="otp"
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full shadow-medium transition-smooth" disabled={loading}>
                {loading ? "Verifying..." : "Verify OTP"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full shadow-medium transition-smooth" disabled={loading}>
                {loading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            {authView === 'login' ? (
              <button
                onClick={() => setAuthView('signup')}
                className="text-primary hover:underline text-sm"
              >
                Don't have an account? Sign up
              </button>
            ) : authView === 'signup' ? (
              <button
                onClick={() => setAuthView('login')}
                className="text-primary hover:underline text-sm"
              >
                Already have an account? Sign in
              </button>
            ) : (
              <button
                onClick={() => setAuthView('login')}
                className="text-primary hover:underline text-sm"
              >
                Back to Sign in
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-muted-foreground text-sm mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </motion.div>
    </div>
  );
};

export default Auth;
