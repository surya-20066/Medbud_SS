import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Stethoscope } from "lucide-react";
import Navbar from "@/components/Navbar";

const DoctorSignup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    specialization: "",
    experience_years: "",
    consultation_fee: "",
    bio: "",
    education: "",
    clinic_name: "",
    clinic_address: "",
    city: "Vizag",
    state: "Andhra Pradesh",
    pincode: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Create doctor profile via server-side function (bypasses RLS)
      const { error: rpcError } = await supabase.rpc("create_doctor_profile", {
        p_user_id: user.id,
        p_full_name: "",
        p_phone: "",
        p_specialization: formData.specialization,
        p_experience_years: parseInt(formData.experience_years),
        p_consultation_fee: parseFloat(formData.consultation_fee),
        p_bio: formData.bio,
        p_education: formData.education,
        p_clinic_name: formData.clinic_name,
        p_clinic_address: formData.clinic_address,
        p_city: formData.city,
        p_state: formData.state,
        p_pincode: formData.pincode || "",
      });

      if (rpcError) throw rpcError;

      toast({ title: "Doctor profile created successfully!" });
      navigate("/dashboard");
    } catch (error: any) {
      toast({ title: "Error creating profile", description: error.message, variant: "destructive" });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto"
        >
          <Button variant="ghost" onClick={() => navigate("/")} className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>

          <Card className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Stethoscope className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Doctor Registration</h1>
                <p className="text-muted-foreground">Join MedBud as a healthcare provider</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="specialization">Specialization *</Label>
                <Input
                  id="specialization"
                  name="specialization"
                  value={formData.specialization}
                  onChange={handleChange}
                  placeholder="e.g., Cardiologist, Dermatologist"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="experience_years">Experience (years) *</Label>
                  <Input
                    id="experience_years"
                    name="experience_years"
                    type="number"
                    value={formData.experience_years}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="consultation_fee">Consultation Fee (₹) *</Label>
                  <Input
                    id="consultation_fee"
                    name="consultation_fee"
                    type="number"
                    value={formData.consultation_fee}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="education">Education *</Label>
                <Input
                  id="education"
                  name="education"
                  value={formData.education}
                  onChange={handleChange}
                  placeholder="e.g., MBBS, MD"
                  required
                />
              </div>

              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder="Brief description about yourself"
                  rows={3}
                />
              </div>

              <div className="pt-4 border-t">
                <h3 className="font-semibold mb-4">Clinic Information</h3>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="clinic_name">Clinic Name *</Label>
                    <Input
                      id="clinic_name"
                      name="clinic_name"
                      value={formData.clinic_name}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="clinic_address">Clinic Address *</Label>
                    <Input
                      id="clinic_address"
                      name="clinic_address"
                      value={formData.clinic_address}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State *</Label>
                      <Input
                        id="state"
                        name="state"
                        value={formData.state}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="pincode">Pincode</Label>
                      <Input
                        id="pincode"
                        name="pincode"
                        value={formData.pincode}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Creating Profile..." : "Complete Registration"}
              </Button>
            </form>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default DoctorSignup;
