import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Stethoscope, Mail, Lock, User, Phone, ArrowLeft, GraduationCap, Building2, MapPin, IndianRupee, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const doctorSignupSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(128),
  fullName: z.string().trim().min(2, "Name must be at least 2 characters").max(100)
    .regex(/^[a-zA-Z\s\-']+$/, "Name can only contain letters, spaces, hyphens, and apostrophes"),
  phone: z.string().trim().regex(/^[0-9]{10}$/, "Phone number must be exactly 10 digits"),
  specialization: z.string().trim().min(2, "Specialization is required"),
  experience_years: z.string().min(1, "Experience is required"),
  consultation_fee: z.string().min(1, "Consultation fee is required"),
  education: z.string().trim().min(2, "Education is required"),
  bio: z.string().max(500).optional(),
  clinic_name: z.string().trim().min(2, "Clinic name is required"),
  clinic_address: z.string().trim().min(5, "Clinic address is required"),
  city: z.string().trim().min(2, "City is required"),
  state: z.string().trim().min(2, "State is required"),
  pincode: z.string().trim().optional(),
  license_number: z.string().trim().min(5, "License number is required"),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const DoctorAuth = () => {
  const [authView, setAuthView] = useState<'login' | 'signup_account' | 'signup_profile' | 'forgot_email' | 'forgot_otp' | 'forgot_new_password'>('login');
  
  // Account fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  
  // Doctor profile fields
  const [specialization, setSpecialization] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [consultationFee, setConsultationFee] = useState("");
  const [education, setEducation] = useState("");
  const [bio, setBio] = useState("");
  
  // Clinic fields
  const [clinicName, setClinicName] = useState("");
  const [clinicAddress, setClinicAddress] = useState("");
  const [city, setCity] = useState("Vizag");
  const [state, setState] = useState("Andhra Pradesh");
  const [pincode, setPincode] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  
  // Password reset fields
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const isRecovery = window.location.hash.includes("type=recovery");
    if (isRecovery) {
      setAuthView("forgot_new_password");
    }

    const checkUser = async () => {
      if (isRecovery) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id);
        
        const userRoles = roles?.map(r => r.role) || [];
        if (userRoles.includes("doctor")) {
          navigate("/doctor-dashboard");
        }
      }
    };
    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setAuthView("forgot_new_password");
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

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
        toast({
          title: "Login failed",
          description: error.message.includes("Invalid login credentials")
            ? "Invalid email or password. Please try again."
            : error.message,
          variant: "destructive",
        });
        return;
      }

      if (data.session) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.session.user.id);
        
        const userRoles = roles?.map(r => r.role) || [];
        
        if (!userRoles.includes("doctor")) {
          toast({
            title: "Not a doctor account",
            description: "This account is not registered as a doctor. Please sign up as a doctor or use the patient login.",
            variant: "destructive",
          });
          await supabase.auth.signOut();
          return;
        }

        toast({ title: "Welcome back, Doctor!", description: "Logged in successfully." });
        navigate("/doctor-dashboard");
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ title: "Validation error", description: error.errors[0].message, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAccountNext = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      z.object({
        email: z.string().trim().email("Invalid email address"),
        password: z.string().min(6, "Password must be at least 6 characters"),
        fullName: z.string().trim().min(2, "Name must be at least 2 characters")
          .regex(/^[a-zA-Z\s\-']+$/, "Name can only contain letters, spaces, hyphens, and apostrophes"),
        phone: z.string().trim().regex(/^[0-9]{10}$/, "Phone number must be exactly 10 digits"),
      }).parse({ email, password, fullName, phone });
      setAuthView('signup_profile');
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ title: "Validation error", description: error.errors[0].message, variant: "destructive" });
      }
    }
  };

  const handleDoctorSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      doctorSignupSchema.parse({
        email, password, fullName, phone,
        specialization, experience_years: experienceYears,
        consultation_fee: consultationFee, education, bio,
        clinic_name: clinicName, clinic_address: clinicAddress,
        city, state, pincode,
        license_number: licenseNumber,
      });

      // Step 1: Create user + doctor profile via edge function (admin API - auto-confirmed)
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/signup`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim(),
            password,
            full_name: fullName.trim(),
            phone: phone.trim(),
            role: "doctor",
            doctor_data: {
              specialization: specialization.trim(),
              experience_years: parseInt(experienceYears),
              consultation_fee: parseFloat(consultationFee),
              bio: bio.trim() || null,
              education: education.trim(),
              clinic_name: clinicName.trim(),
              clinic_address: clinicAddress.trim(),
              city: city.trim(),
              state: state.trim(),
              pincode: pincode.trim() || "",
              license_number: licenseNumber.trim(),
              is_active: null,
            },
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        toast({ title: "Signup failed", description: result.error || "Something went wrong", variant: "destructive" });
        return;
      }

      // Upload License Document if present
      if (licenseFile && result.user?.id) {
        const fileExt = licenseFile.name.split('.').pop();
        const fileName = `${result.user.id}/license.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('doctor-documents')
          .upload(fileName, licenseFile, { upsert: true });

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('doctor-documents')
            .getPublicUrl(fileName);
          
          // Update doctor record with document URL
          await supabase
            .from('doctors')
            .update({ document_url: publicUrl })
            .eq('user_id', result.user.id);
        }
      }

      // Sign out immediately so they must wait for approval
      await supabase.auth.signOut();

      toast({ 
        title: "🕐 Verification in Progress", 
        description: "Your profile has been created successfully and is under review. You will be able to log in smoothly once the admin approves your credentials.",
        duration: 8000
      });
      
      // Redirect to home page
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({ title: "Validation error", description: error.errors[0].message, variant: "destructive" });
      } else {
        toast({ title: "Error", description: error.message || "Something went wrong", variant: "destructive" });
        console.error(error);
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
        redirectTo: `${window.location.origin}/doctor-auth`,
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
      const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'recovery' });
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
      setPassword(''); setNewPassword(''); setConfirmPassword(''); setOtp('');
      window.history.replaceState(null, '', window.location.pathname);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (authView) {
      case 'login': return "Doctor Login";
      case 'signup_account': return "Create Doctor Account";
      case 'signup_profile': return "Professional Details";
      case 'forgot_email': return "Reset Password";
      case 'forgot_otp': return "Enter OTP";
      case 'forgot_new_password': return "New Password";
    }
  };

  const getSubtitle = () => {
    switch (authView) {
      case 'login': return "Sign in to your doctor portal";
      case 'signup_account': return "Step 1: Account information";
      case 'signup_profile': return "Step 2: Professional & clinic details";
      case 'forgot_email': return "Enter your email to receive a reset link";
      case 'forgot_otp': return "Enter the OTP sent to your email";
      case 'forgot_new_password': return "Enter your new preferred password";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-secondary/10 px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        <div className="bg-card rounded-2xl shadow-large p-8 border border-border">
          {/* Header */}
          <div className="flex items-center justify-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
              <Stethoscope className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-foreground ml-3">MedBud</span>
            <span className="ml-2 text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase tracking-wide">Doctor</span>
          </div>

          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-foreground mb-1">{getTitle()}</h1>
            <p className="text-muted-foreground text-sm">{getSubtitle()}</p>
            
            {/* Step indicator for signup */}
            {(authView === 'signup_account' || authView === 'signup_profile') && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <div className={`w-8 h-1 rounded-full transition-all ${authView === 'signup_account' ? 'bg-primary' : 'bg-primary/30'}`} />
                <div className={`w-8 h-1 rounded-full transition-all ${authView === 'signup_profile' ? 'bg-primary' : 'bg-primary/30'}`} />
              </div>
            )}
          </div>

          <AnimatePresence mode="wait">
            {/* LOGIN */}
            {authView === 'login' && (
              <motion.form key="login" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="login-email">Email</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input id="login-email" type="email" placeholder="doctor@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password">Password</Label>
                    <button type="button" onClick={() => setAuthView('forgot_email')} className="text-sm text-primary hover:underline font-medium">Forgot password?</button>
                  </div>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input id="login-password" type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" required />
                  </div>
                </div>
                <Button type="submit" className="w-full shadow-medium hover:shadow-large transition-smooth" disabled={loading}>
                  {loading ? "Please wait..." : "Sign In as Doctor"}
                </Button>
              </motion.form>
            )}

            {/* SIGNUP STEP 1: Account Info */}
            {authView === 'signup_account' && (
              <motion.form key="signup1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} onSubmit={handleAccountNext} className="space-y-4">
                <div>
                  <Label htmlFor="signup-name">Full Name</Label>
                  <div className="relative mt-1">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input id="signup-name" placeholder="Dr. John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10" required />
                  </div>
                </div>
                <div>
                  <Label htmlFor="signup-phone">Phone Number</Label>
                  <div className="relative mt-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input id="signup-phone" type="tel" placeholder="10-digit number" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} className="pl-10" maxLength={10} required />
                  </div>
                </div>
                <div>
                  <Label htmlFor="signup-email">Email</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input id="signup-email" type="email" placeholder="doctor@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
                  </div>
                </div>
                <div>
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input id="signup-password" type="password" placeholder="Min 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" required />
                  </div>
                </div>
                <Button type="submit" className="w-full shadow-medium transition-smooth">
                  Next: Professional Details →
                </Button>
              </motion.form>
            )}

            {/* SIGNUP STEP 2: Professional & Clinic Info */}
            {authView === 'signup_profile' && (
              <motion.form key="signup2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} onSubmit={handleDoctorSignup} className="space-y-4">
                <button type="button" onClick={() => setAuthView('signup_account')} className="flex items-center text-sm text-muted-foreground hover:text-primary mb-2">
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back to account details
                </button>

                <div>
                  <Label htmlFor="specialization">Specialization *</Label>
                  <div className="relative mt-1">
                    <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input id="specialization" placeholder="e.g., Cardiologist" value={specialization} onChange={(e) => setSpecialization(e.target.value)} className="pl-10" required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="experience">Experience (years) *</Label>
                    <div className="relative mt-1">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="experience" type="number" min="0" placeholder="5" value={experienceYears} onChange={(e) => setExperienceYears(e.target.value)} className="pl-10" required />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="fee">Consultation Fee (₹) *</Label>
                    <div className="relative mt-1">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="fee" type="number" min="0" placeholder="500" value={consultationFee} onChange={(e) => setConsultationFee(e.target.value)} className="pl-10" required />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="education">Education *</Label>
                  <div className="relative mt-1">
                    <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input id="education" placeholder="e.g., MBBS, MD" value={education} onChange={(e) => setEducation(e.target.value)} className="pl-10" required />
                  </div>
                </div>

                <div>
                  <Textarea id="bio" placeholder="Brief description about yourself..." value={bio} onChange={(e) => setBio(e.target.value)} rows={2} maxLength={500} className="mt-1" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="license">Medical License Number *</Label>
                    <div className="relative mt-1">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="license" placeholder="REG-123456789" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} className="pl-10" required />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="document">License Document (PDF/Image) *</Label>
                    <Input 
                      id="document" 
                      type="file" 
                      accept=".pdf,image/*" 
                      onChange={(e) => setLicenseFile(e.target.files?.[0] || null)}
                      className="mt-1 text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-border">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> Clinic Information
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="clinic-name">Clinic Name *</Label>
                      <Input id="clinic-name" placeholder="MedBud Health Center" value={clinicName} onChange={(e) => setClinicName(e.target.value)} className="mt-1" required />
                    </div>
                    <div>
                      <Label htmlFor="clinic-address">Address *</Label>
                      <div className="relative mt-1">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="clinic-address" placeholder="Full clinic address" value={clinicAddress} onChange={(e) => setClinicAddress(e.target.value)} className="pl-10" required />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label htmlFor="city">City *</Label>
                        <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} className="mt-1" required />
                      </div>
                      <div>
                        <Label htmlFor="state">State *</Label>
                        <Input id="state" value={state} onChange={(e) => setState(e.target.value)} className="mt-1" required />
                      </div>
                      <div>
                        <Label htmlFor="pincode">Pincode</Label>
                        <Input id="pincode" value={pincode} onChange={(e) => setPincode(e.target.value)} className="mt-1" />
                      </div>
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full shadow-medium hover:shadow-large transition-smooth" disabled={loading}>
                  {loading ? "Creating Profile..." : "Complete Registration"}
                </Button>
              </motion.form>
            )}

            {/* FORGOT PASSWORD - Email */}
            {authView === 'forgot_email' && (
              <motion.form key="forgot1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} onSubmit={handleSendResetOtp} className="space-y-4">
                <div>
                  <Label htmlFor="reset-email">Email</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input id="reset-email" type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
                  </div>
                </div>
                <Button type="submit" className="w-full shadow-medium transition-smooth" disabled={loading}>
                  {loading ? "Please wait..." : "Send Recovery Email"}
                </Button>
              </motion.form>
            )}

            {/* FORGOT PASSWORD - OTP */}
            {authView === 'forgot_otp' && (
              <motion.form key="forgot2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <Label htmlFor="otp">Enter OTP</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input id="otp" type="text" placeholder="Enter 6-digit OTP" value={otp} onChange={(e) => setOtp(e.target.value)} className="pl-10" required />
                  </div>
                </div>
                <Button type="submit" className="w-full shadow-medium transition-smooth" disabled={loading}>
                  {loading ? "Verifying..." : "Verify OTP"}
                </Button>
              </motion.form>
            )}

            {/* FORGOT PASSWORD - New Password */}
            {authView === 'forgot_new_password' && (
              <motion.form key="forgot3" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} onSubmit={handleUpdatePassword} className="space-y-4">
                <div>
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input id="new-password" type="password" placeholder="Enter new password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="pl-10" required />
                  </div>
                </div>
                <div>
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input id="confirm-password" type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-10" required />
                  </div>
                </div>
                <Button type="submit" className="w-full shadow-medium transition-smooth" disabled={loading}>
                  {loading ? "Updating..." : "Update Password"}
                </Button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Footer links */}
          <div className="mt-6 text-center">
            {authView === 'login' ? (
              <button onClick={() => setAuthView('signup_account')} className="text-primary hover:underline text-sm">
                New doctor? Register your practice
              </button>
            ) : (authView === 'signup_account' || authView === 'signup_profile') ? (
              <button onClick={() => setAuthView('login')} className="text-primary hover:underline text-sm">
                Already registered? Sign in
              </button>
            ) : (
              <button onClick={() => setAuthView('login')} className="text-primary hover:underline text-sm">
                Back to Sign in
              </button>
            )}
          </div>

          <div className="mt-4 text-center">
            <button onClick={() => navigate("/auth")} className="text-muted-foreground hover:text-foreground text-xs hover:underline">
              Not a doctor? Go to Patient Login →
            </button>
          </div>
        </div>

        <p className="text-center text-muted-foreground text-sm mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </motion.div>
    </div>
  );
};

export default DoctorAuth;
