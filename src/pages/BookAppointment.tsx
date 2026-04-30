import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, MapPin, Stethoscope, CreditCard, CheckCircle, Download, 
  Phone, Mail, User, GraduationCap, Clock, Award, Star, Building2, Calendar, Search
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { z } from "zod";

type Clinic = {
  id: string;
  clinic_name: string;
  address: string;
  city: string;
  pincode: string;
  state: string;
};

type Doctor = {
  id: string;
  user_id: string;
  specialization: string;
  consultation_fee: number;
  experience_years: number;
  bio: string;
  education: string;
  is_active: boolean;
  profiles: { full_name: string };
};

type TimeSlot = {
  time: string;
  available: boolean;
};

type BookingDetails = {
  symptoms: string;
};

const bookingSchema = z.object({
  symptoms: z.string()
    .trim()
    .max(1000, "Symptoms description must be less than 1000 characters")
    .optional()
});

const BookAppointment = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth?returnTo=/book-appointment");
      return;
    }
    setUser(user);
  };

  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [tokenNumber, setTokenNumber] = useState<number | null>(null);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  
  const [bookingDetails, setBookingDetails] = useState<BookingDetails>({
    symptoms: ""
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showOthersSearch, setShowOthersSearch] = useState(false);
  const [doctorSearchQuery, setDoctorSearchQuery] = useState("");
  const [allSearchableDoctors, setAllSearchableDoctors] = useState<(Doctor & { clinic?: Clinic })[]>([]);
  const [searchResults, setSearchResults] = useState<(Doctor & { clinic?: Clinic })[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    if (step === 1) {
      fetchClinics();
    }
  }, [step]);

  useEffect(() => {
    if (selectedClinic) {
      fetchDoctors();
    }
  }, [selectedClinic]);

  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      generateTimeSlots();
    }
  }, [selectedDoctor, selectedDate]);

  const fetchClinics = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("clinics")
      .select("id, clinic_name, address, city, pincode, state, doctor_id")
      .eq("city", "Vizag");
    
    if (error) {
      toast({ title: "Error loading hospitals", variant: "destructive" });
    } else {
      const filteredClinics = (data || []).filter(c => 
        !c.clinic_name.toLowerCase().includes("sm2") &&
        (c.clinic_name.toLowerCase().includes("hospital") || 
         c.clinic_name.toLowerCase().includes("medic") ||
         c.clinic_name.toLowerCase().includes("care") ||
         c.clinic_name.toLowerCase().includes("health"))
      );
      setClinics(filteredClinics);
    }
    setLoading(false);
  };

  const fetchDoctors = async () => {
    if (!selectedClinic) return;
    setLoading(true);

    // First get doctor_ids that belong to this clinic
    const { data: clinicDoctors, error: clinicErr } = await supabase
      .from("clinics")
      .select("doctor_id")
      .eq("id", selectedClinic.id);

    if (clinicErr || !clinicDoctors || clinicDoctors.length === 0) {
      setDoctors([]);
      setLoading(false);
      return;
    }

    const doctorIds = clinicDoctors.map(c => c.doctor_id);

    // Fetch only the doctors that belong to this clinic
    const { data: doctorsData, error: doctorsError } = await supabase
      .from("doctors")
      .select("*")
      .eq("is_active", true)
      .in("id", doctorIds);
    
    if (doctorsError) {
      toast({ title: "Error loading doctors", variant: "destructive" });
      setLoading(false);
      return;
    }

    // Fetch profiles for these doctors
    const userIds = (doctorsData || []).map(d => d.user_id);
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    // Combine doctors with their profile names
    const transformedData = (doctorsData || []).map(doc => {
      const profile = profilesData?.find(p => p.id === doc.user_id);
      return {
        ...doc,
        profiles: { full_name: profile?.full_name || 'Dr. ' + doc.specialization }
      };
    }) as Doctor[];
    
    setDoctors(transformedData);
    setLoading(false);
  };

  const generateTimeSlots = () => {
    const slots: TimeSlot[] = [];
    const startHour = 9;
    const endHour = 18;
    
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const isToday = selectedDate === today;
    // Current time in minutes with a 30-minute buffer so patients can't book slots that are about to pass
    const currentMinutes = isToday ? now.getHours() * 60 + now.getMinutes() + 30 : 0;
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute of [0, 30]) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const slotMinutes = hour * 60 + minute;
        // Slot is unavailable if it's in the past for today
        const isPast = isToday && slotMinutes < currentMinutes;
        slots.push({ time, available: !isPast });
      }
    }
    setTimeSlots(slots);
    // Clear selected time if it's now in the past
    if (isToday && selectedTime) {
      const [h, m] = selectedTime.split(':').map(Number);
      if (h * 60 + m < currentMinutes) {
        setSelectedTime('');
      }
    }
  };

  const handleClinicSelect = (clinic: Clinic) => {
    setSelectedClinic(clinic);
    setShowOthersSearch(false);
    setStep(2);
  };

  const handleOthersClick = async () => {
    setShowOthersSearch(true);
    setDoctorSearchQuery("");
    setSearchLoading(true);
    
    try {
      const { data: doctorsData } = await supabase
        .from("doctors")
        .select("*")
        .eq("is_active", true);

      if (!doctorsData || doctorsData.length === 0) {
        setAllSearchableDoctors([]);
        setSearchResults([]);
        setSearchLoading(false);
        return;
      }

      const userIds = doctorsData.map(d => d.user_id);
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      const doctorIds = doctorsData.map(d => d.id);
      const { data: clinicsData } = await supabase
        .from("clinics")
        .select("*")
        .in("doctor_id", doctorIds);

      const results = doctorsData.map(doc => {
        const profile = profilesData?.find(p => p.id === doc.user_id);
        const clinic = clinicsData?.find(c => c.doctor_id === doc.id);
        return {
          ...doc,
          profiles: { full_name: profile?.full_name || 'Dr. ' + doc.specialization },
          clinic: clinic || undefined,
        };
      }) as (Doctor & { clinic?: Clinic })[];

      setAllSearchableDoctors(results);
      setSearchResults(results);
    } catch (err) {
      console.error(err);
      setAllSearchableDoctors([]);
      setSearchResults([]);
    }
    
    setSearchLoading(false);
  };

  const searchDoctorByName = (query: string) => {
    setDoctorSearchQuery(query);
    if (!query.trim()) {
      setSearchResults(allSearchableDoctors);
      return;
    }
    
    const loweredQuery = query.toLowerCase();
    const filtered = allSearchableDoctors.filter(doc => {
      const nameMatch = doc.profiles?.full_name?.toLowerCase().includes(loweredQuery);
      const deptMatch = doc.specialization?.toLowerCase().includes(loweredQuery);
      return nameMatch || deptMatch;
    });

    // Sort by name match priority (those whose name includes query should appear before dept match)
    const sorted = [...filtered].sort((a, b) => {
      const aNameMatch = a.profiles?.full_name?.toLowerCase().includes(loweredQuery);
      const bNameMatch = b.profiles?.full_name?.toLowerCase().includes(loweredQuery);
      if (aNameMatch && !bNameMatch) return -1;
      if (!aNameMatch && bNameMatch) return 1;
      return 0;
    });
    
    setSearchResults(sorted);
  };

  const handleSearchDoctorSelect = (doctor: Doctor & { clinic?: Clinic }) => {
    // Set the clinic from the doctor's clinic info
    if (doctor.clinic) {
      setSelectedClinic(doctor.clinic);
    } else {
      // Create a placeholder clinic
      setSelectedClinic({
        id: 'other',
        clinic_name: 'Independent Practice',
        address: 'N/A',
        city: 'N/A',
        pincode: '',
        state: '',
      });
    }
    setSelectedDoctor({
      id: doctor.id,
      user_id: doctor.user_id,
      specialization: doctor.specialization,
      consultation_fee: doctor.consultation_fee,
      experience_years: doctor.experience_years,
      bio: doctor.bio,
      education: doctor.education,
      is_active: doctor.is_active,
      profiles: doctor.profiles,
    });
    setShowOthersSearch(false);
    setStep(3); // Go directly to doctor profile
  };

  const handleDoctorSelect = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setStep(3); // Go to doctor profile view
  };

  const handleBookDoctor = () => {
    setStep(4); // Go to time slot selection
  };

  const handleTimeSelect = () => {
    if (!selectedDate || !selectedTime) {
      toast({ title: "Please select date and time", variant: "destructive" });
      return;
    }
    setStep(5); // Go to patient details
  };

  const validateBookingDetails = () => {
    try {
      bookingSchema.parse(bookingDetails);
      setValidationErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0].toString()] = err.message;
          }
        });
        setValidationErrors(errors);
      }
      return false;
    }
  };

  const handlePayment = async () => {
    if (!validateBookingDetails()) {
      toast({ title: "Please fix the errors in the form", variant: "destructive" });
      return;
    }

    if (!selectedDoctor || !selectedClinic) {
      toast({ title: "Missing doctor or clinic selection", variant: "destructive" });
      return;
    }

    // Re-fetch user if not available
    let currentUser = user;
    if (!currentUser) {
      const { data: { user: freshUser } } = await supabase.auth.getUser();
      if (!freshUser) {
        toast({ title: "Please login to continue", description: "Your session may have expired.", variant: "destructive" });
        navigate("/auth");
        return;
      }
      currentUser = freshUser;
      setUser(freshUser);
    }

    setLoading(true);
    try {
      // Get count of tokens for that date to give an ordered token number
      const { count, error: countError } = await supabase
        .from("tokens")
        .select('*', { count: 'exact', head: true })
        .eq('token_date', selectedDate);
        
      if (countError) throw countError;
      
      const orderIndex = (count || 0) + 1;
      const day = new Date(selectedDate).getDate().toString().padStart(2, '0');
      const orderStr = orderIndex.toString().padStart(2, '0');
      const newTokenNumber = Number(`${day}${orderStr}`);

      const newAppointmentId = crypto.randomUUID();
      const { error: apptError } = await supabase
        .from("appointments")
        .insert([
          {
            id: newAppointmentId,
            patient_id: currentUser.id,
            doctor_id: selectedDoctor.id,
            appointment_date: selectedDate,
            appointment_time: selectedTime,
            symptoms: bookingDetails.symptoms || null,
            payment_status: "completed",
            payment_method: paymentMethod,
            status: "pending",
          },
        ]);

      if (apptError) {
        console.error("Appointment insert error:", apptError);
        throw apptError;
      }



      // Notify doctor in real-time
      try {
        const { data: doctorData } = await supabase
          .from("doctors")
          .select("user_id")
          .eq("id", selectedDoctor.id)
          .single();

        if (doctorData) {
          const { data: patientProfile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", currentUser.id)
            .single();

          await supabase.from("notifications").insert({
            user_id: doctorData.user_id,
            type: "new_appointment",
            title: "🔔 New Appointment Booked",
            message: `${patientProfile?.full_name || "A patient"} booked for ${new Date(selectedDate).toLocaleDateString()} at ${selectedTime}. ${bookingDetails.symptoms ? "Symptoms: " + bookingDetails.symptoms : ""}`,
            metadata: { appointment_id: newAppointmentId, patient_name: patientProfile?.full_name, symptoms: bookingDetails.symptoms },
          });
        }
      } catch (notifErr) {
        console.error("Notification error (non-critical):", notifErr);
      }

      setTokenNumber(newTokenNumber);
      setAppointmentId(newAppointmentId);
      setStep(6);
      toast({ title: "Appointment booked successfully!" });
    } catch (error: any) {
      console.error("Booking error:", error);
      toast({ title: "Error booking appointment", description: error.message || "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof BookingDetails, value: string) => {
    setBookingDetails(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const downloadReceipt = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFillColor(34, 197, 94);
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text('MedBud', pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('APPOINTMENT RECEIPT', pageWidth / 2, 32, { align: 'center' });
    
    // Reset text color
    doc.setTextColor(0, 0, 0);
    
    // Booking confirmation badge
    doc.setFillColor(254, 249, 195);
    doc.roundedRect(60, 50, 90, 20, 3, 3, 'F');
    doc.setTextColor(161, 98, 7);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('⧗ REQUEST PENDING', pageWidth / 2, 63, { align: 'center' });
    
    // Reset text color
    doc.setTextColor(0, 0, 0);
    
    // Token Number - Large prominent display
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Token Number', pageWidth / 2, 85, { align: 'center' });
    doc.setFontSize(48);
    doc.setTextColor(34, 197, 94);
    doc.text(`#${tokenNumber}`, pageWidth / 2, 105, { align: 'center' });
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Appointment ID: ${appointmentId}`, pageWidth / 2, 115, { align: 'center' });
    
    // Line separator
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 125, pageWidth - 20, 125);
    
    let yPos = 135;
    const leftCol = 25;
    const rightCol = 110;
    
    // Section: Patient Information
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(34, 197, 94);
    doc.text('Patient Information', leftCol, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Patient ID:', leftCol, yPos);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(user?.id || 'Unknown', leftCol + 25, yPos);
    
    yPos += 15;
    
    // Section: Hospital Details
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(34, 197, 94);
    doc.text('Hospital Details', leftCol, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Hospital:', leftCol, yPos);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(selectedClinic?.clinic_name || '', leftCol + 30, yPos);
    
    yPos += 8;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Address:', leftCol, yPos);
    doc.setTextColor(0, 0, 0);
    doc.text(`${selectedClinic?.address}, ${selectedClinic?.city}`, leftCol + 30, yPos);
    
    yPos += 15;
    
    // Section: Doctor Details
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(34, 197, 94);
    doc.text('Doctor Details', leftCol, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Doctor:', leftCol, yPos);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(selectedDoctor?.profiles.full_name || '', leftCol + 30, yPos);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Specialization:', rightCol, yPos);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(selectedDoctor?.specialization || '', rightCol + 40, yPos);
    
    yPos += 8;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Experience:', leftCol, yPos);
    doc.setTextColor(0, 0, 0);
    doc.text(`${selectedDoctor?.experience_years} years`, leftCol + 35, yPos);
    
    yPos += 15;
    
    // Section: Appointment Details
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(34, 197, 94);
    doc.text('Appointment Details', leftCol, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Date:', leftCol, yPos);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), leftCol + 20, yPos);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Time:', rightCol, yPos);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(selectedTime, rightCol + 20, yPos);
    
    yPos += 8;
    if (bookingDetails.symptoms) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text('Symptoms:', leftCol, yPos);
      doc.setTextColor(0, 0, 0);
      const symptomsLines = doc.splitTextToSize(bookingDetails.symptoms, 120);
      doc.text(symptomsLines, leftCol + 30, yPos);
      yPos += symptomsLines.length * 5;
    }
    
    yPos += 10;
    
    // Section: Payment Details
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(34, 197, 94);
    doc.text('Payment Details', leftCol, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Consultation Fee:', leftCol, yPos);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(`₹${selectedDoctor?.consultation_fee}`, leftCol + 45, yPos);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Payment Method:', rightCol, yPos);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(paymentMethod.toUpperCase(), rightCol + 45, yPos);
    
    yPos += 8;
    doc.setFillColor(220, 252, 231);
    doc.roundedRect(leftCol, yPos - 3, 50, 10, 2, 2, 'F');
    doc.setTextColor(22, 101, 52);
    doc.setFontSize(9);
    doc.text('✓ PAYMENT COMPLETED', leftCol + 3, yPos + 4);
    
    // Footer
    yPos = 265;
    doc.setDrawColor(200, 200, 200);
    doc.line(20, yPos, pageWidth - 20, yPos);
    
    yPos += 8;
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('⏰ Please arrive 10 minutes before your scheduled time', pageWidth / 2, yPos, { align: 'center' });
    yPos += 6;
    doc.text('📋 Bring a valid ID and this receipt', pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;
    doc.setTextColor(34, 197, 94);
    doc.setFont('helvetica', 'bold');
    doc.text('Thank you for choosing MedBud!', pageWidth / 2, yPos, { align: 'center' });
    
    // Save
    doc.save(`MedBud-Receipt-${tokenNumber}.pdf`);
  };

  const goBack = () => {
    if (step === 1) {
      navigate("/patient-dashboard");
    } else if (step === 3) {
      setStep(2);
      setSelectedDoctor(null);
    } else if (step === 4) {
      setStep(3);
    } else {
      setStep(step - 1);
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1: return "Select Hospital";
      case 2: return "Choose Doctor";
      case 3: return "Doctor Profile";
      case 4: return "Select Time Slot";
      case 5: return "Patient Details & Payment";
      case 6: return "Booking Confirmed";
      default: return "";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          {step < 6 && (
            <Button
              variant="ghost"
              onClick={goBack}
              className="mb-6"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          )}

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4 overflow-x-auto">
              {[1, 2, 3, 4, 5, 6].map((s) => (
                <div key={s} className="flex items-center flex-shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                    step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    {step > s ? <CheckCircle className="h-4 w-4" /> : s}
                  </div>
                  {s < 6 && <div className={`h-1 w-8 md:w-12 mx-1 md:mx-2 transition-all duration-300 ${step > s ? "bg-primary" : "bg-muted"}`} />}
                </div>
              ))}
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold">{getStepTitle()}</h2>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {/* Step 1: Select Hospital */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <p className="text-muted-foreground text-center mb-6">
                  Select a hospital in Vizag to view available doctors
                </p>
                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-muted-foreground">Loading hospitals...</p>
                  </div>
                ) : (
                  <>
                  <div className="grid md:grid-cols-2 gap-4">
                    {clinics.length === 0 ? (
                      <Card className="p-8 text-center md:col-span-2">
                        <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No hospitals available in Vizag at the moment</p>
                      </Card>
                    ) : (
                      clinics.map((clinic, index) => (
                        <motion.div
                          key={clinic.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <Card
                            className="p-6 cursor-pointer hover:border-primary transition-all duration-300 hover:shadow-lg group"
                            onClick={() => handleClinicSelect(clinic)}
                          >
                            <div className="flex items-start gap-4">
                              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                                <Building2 className="h-7 w-7 text-primary" />
                              </div>
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
                                  {clinic.clinic_name}
                                </h3>
                                <div className="flex items-start gap-1 text-muted-foreground text-sm">
                                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                  <span>{clinic.address}, {clinic.city} - {clinic.pincode}</span>
                                </div>
                              </div>
                            </div>
                          </Card>
                        </motion.div>
                      ))
                    )}

                    {/* Others Option */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: clinics.length * 0.1 }}
                      className={clinics.length === 0 ? "md:col-span-2" : ""}
                    >
                      <Card
                        className={`p-6 cursor-pointer transition-all duration-300 hover:shadow-lg group ${
                          showOthersSearch ? 'border-primary bg-primary/5' : 'hover:border-primary border-dashed'
                        }`}
                        onClick={handleOthersClick}
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-14 h-14 rounded-xl bg-secondary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                            <Search className="h-7 w-7 text-secondary group-hover:text-primary transition-colors" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
                              Others
                            </h3>
                            <p className="text-muted-foreground text-sm">
                              Search for a specific doctor by name
                            </p>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  </div>

                  {/* Doctor Search Panel */}
                  {showOthersSearch && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-6 space-y-4"
                    >
                      <Card className="p-6">
                        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                          <Search className="h-5 w-5 text-primary" />
                          Search Doctor by Name
                        </h3>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                          <Input
                            placeholder="Search by doctor name or department..."
                            value={doctorSearchQuery}
                            onChange={(e) => searchDoctorByName(e.target.value)}
                            className="pl-10 text-lg"
                            autoFocus
                          />
                        </div>

                        {searchLoading && (
                          <div className="text-center py-6">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                            <p className="text-sm text-muted-foreground mt-2">Searching...</p>
                          </div>
                        )}

                        {!searchLoading && doctorSearchQuery.length > 0 && searchResults.length === 0 && (
                          <div className="text-center py-6">
                            <User className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                            <p className="text-muted-foreground">No registered doctor found with that name or department</p>
                            <p className="text-xs text-muted-foreground mt-1">Make sure the doctor has signed up on MedBud</p>
                          </div>
                        )}

                        {searchResults.length > 0 && (
                          <div className="mt-4 space-y-3">
                            {searchResults.map((doc) => (
                              <Card
                                key={doc.id}
                                className="p-4 cursor-pointer hover:border-primary hover:shadow-md transition-all group"
                                onClick={() => handleSearchDoctorSelect(doc)}
                              >
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <Stethoscope className="h-6 w-6 text-primary" />
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="font-semibold group-hover:text-primary transition-colors">
                                      {doc.profiles.full_name}
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                      {doc.specialization} • {doc.experience_years} yrs exp • ₹{doc.consultation_fee}
                                    </p>
                                    {doc.clinic && (
                                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                        <MapPin className="h-3 w-3" />
                                        {doc.clinic.clinic_name}, {doc.clinic.city}
                                      </p>
                                    )}
                                  </div>
                                  <Badge variant="secondary" className="flex-shrink-0">Select</Badge>
                                </div>
                              </Card>
                            ))}
                          </div>
                        )}
                      </Card>
                    </motion.div>
                  )}
                  </>
                )}
              </motion.div>
            )}

            {/* Step 2: Select Doctor */}
            {step === 2 && selectedClinic && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <Card className="p-4 bg-primary/5 border-primary/20">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Selected Hospital</p>
                      <p className="font-semibold">{selectedClinic.clinic_name}</p>
                    </div>
                  </div>
                </Card>

                <p className="text-muted-foreground text-center">
                  Choose a doctor to view their complete profile
                </p>

                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-muted-foreground">Loading doctors...</p>
                  </div>
                ) : doctors.length === 0 ? (
                  <Card className="p-8 text-center">
                    <Stethoscope className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No doctors available at this hospital</p>
                  </Card>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {doctors.map((doctor, index) => (
                      <motion.div
                        key={doctor.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Card
                          className="p-6 cursor-pointer hover:border-primary transition-all duration-300 hover:shadow-lg group overflow-hidden"
                          onClick={() => handleDoctorSelect(doctor)}
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0">
                              <User className="h-8 w-8 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors truncate">
                                {doctor.profiles.full_name}
                              </h3>
                              <Badge variant="secondary" className="mb-2">
                                {doctor.specialization}
                              </Badge>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5" />
                                  {doctor.experience_years} yrs
                                </span>
                                <span className="flex items-center gap-1">
                                  <Star className="h-3.5 w-3.5 text-yellow-500" />
                                  4.8
                                </span>
                              </div>
                              <p className="text-lg font-bold text-primary">
                                ₹{doctor.consultation_fee}
                              </p>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 3: Doctor Profile */}
            {step === 3 && selectedDoctor && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <Card className="overflow-hidden">
                  {/* Doctor Header */}
                  <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8">
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                      <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
                        <User className="h-16 w-16 text-primary-foreground" />
                      </div>
                      <div className="text-center md:text-left flex-1">
                        <h2 className="text-3xl font-bold mb-2">{selectedDoctor.profiles.full_name}</h2>
                        <Badge className="mb-4 text-sm px-3 py-1">{selectedDoctor.specialization}</Badge>
                        <div className="flex flex-wrap justify-center md:justify-start gap-4 text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Award className="h-5 w-5 text-primary" />
                            <span>{selectedDoctor.experience_years} Years Experience</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Star className="h-5 w-5 text-yellow-500" />
                            <span>4.8 Rating</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-center md:text-right">
                        <p className="text-sm text-muted-foreground mb-1">Consultation Fee</p>
                        <p className="text-4xl font-bold text-primary">₹{selectedDoctor.consultation_fee}</p>
                      </div>
                    </div>
                  </div>

                  {/* Doctor Details */}
                  <div className="p-8 space-y-6">
                    {/* Education */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <GraduationCap className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold text-lg">Education & Qualifications</h3>
                      </div>
                      <p className="text-muted-foreground pl-7">
                        {selectedDoctor.education || "MBBS, MD - General Medicine"}
                      </p>
                    </div>

                    {/* About */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Stethoscope className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold text-lg">About</h3>
                      </div>
                      <p className="text-muted-foreground pl-7 leading-relaxed">
                        {selectedDoctor.bio || "Experienced healthcare professional dedicated to providing quality patient care."}
                      </p>
                    </div>

                    {/* Hospital */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Building2 className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold text-lg">Hospital</h3>
                      </div>
                      <div className="pl-7">
                        <p className="font-medium">{selectedClinic?.clinic_name}</p>
                        <p className="text-muted-foreground text-sm">
                          {selectedClinic?.address}, {selectedClinic?.city} - {selectedClinic?.pincode}
                        </p>
                      </div>
                    </div>

                    {/* Timings */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Clock className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold text-lg">Available Timings</h3>
                      </div>
                      <div className="pl-7 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Badge variant="outline" className="justify-center py-2.5 text-sm">
                          Mon-Fri: {((selectedDoctor.timings as any)?.mon_fri) || "9AM - 6PM"}
                        </Badge>
                        <Badge variant="outline" className="justify-center py-2.5 text-sm">
                          Sat: {((selectedDoctor.timings as any)?.sat) || "9AM - 2PM"}
                        </Badge>
                        <Badge variant="outline" className="justify-center py-2.5 text-sm">
                          Sun: {((selectedDoctor.timings as any)?.sun) || "Closed"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Card>

                <Button onClick={handleBookDoctor} size="lg" className="w-full">
                  Book Appointment with {selectedDoctor.profiles.full_name}
                </Button>
              </motion.div>
            )}

            {/* Step 4: Select Time Slot */}
            {step === 4 && selectedDoctor && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <Card className="p-4 bg-primary/5 border-primary/20">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Selected Doctor</p>
                      <p className="font-semibold">{selectedDoctor.profiles.full_name} - {selectedDoctor.specialization}</p>
                    </div>
                  </div>
                </Card>
                
                <div>
                  <Label htmlFor="date" className="text-base font-semibold mb-2 block">Select Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="mt-2"
                  />
                </div>

                {selectedDate && (
                  <div>
                    <Label className="text-base font-semibold mb-3 block">Available Time Slots</Label>
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                      {timeSlots.map((slot) => (
                        <Button
                          key={slot.time}
                          variant={selectedTime === slot.time ? "default" : "outline"}
                          onClick={() => setSelectedTime(slot.time)}
                          disabled={!slot.available}
                          className="h-12"
                        >
                          {slot.time}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <Button 
                  onClick={handleTimeSelect} 
                  disabled={!selectedDate || !selectedTime}
                  className="w-full"
                  size="lg"
                >
                  Continue to Patient Details
                </Button>
              </motion.div>
            )}

            {/* Step 5: Patient Details & Payment */}
            {step === 5 && selectedDoctor && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <Card className="p-6">
                  <h3 className="font-semibold text-lg mb-4">Booking Summary</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Hospital:</strong> {selectedClinic?.clinic_name}</p>
                    <p><strong>Doctor:</strong> {selectedDoctor.profiles.full_name}</p>
                    <p><strong>Specialization:</strong> {selectedDoctor.specialization}</p>
                    <p><strong>Date:</strong> {new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    <p><strong>Time:</strong> {selectedTime}</p>
                    <p className="text-lg font-bold text-primary pt-2 border-t mt-2">
                      Consultation Fee: ₹{selectedDoctor.consultation_fee}
                    </p>
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="font-semibold text-lg mb-4">Additional Details</h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="symptoms">Symptoms (Optional)</Label>
                      <Textarea
                        id="symptoms"
                        value={bookingDetails.symptoms}
                        onChange={(e) => handleInputChange("symptoms", e.target.value)}
                        placeholder="Describe your symptoms..."
                        className={`mt-2 ${validationErrors.symptoms ? 'border-destructive' : ''}`}
                        rows={4}
                        maxLength={1000}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {bookingDetails.symptoms.length}/1000 characters
                      </p>
                      {validationErrors.symptoms && (
                        <p className="text-sm text-destructive mt-1">{validationErrors.symptoms}</p>
                      )}
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="font-semibold text-lg mb-4">Payment Method</h3>
                  <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-accent">
                        <RadioGroupItem value="card" id="card" />
                        <Label htmlFor="card" className="cursor-pointer flex-1">Credit/Debit Card</Label>
                      </div>
                      <div className="flex flex-col space-y-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value="upi" id="upi" />
                          <Label htmlFor="upi" className="cursor-pointer flex-1">UPI</Label>
                        </div>
                        {paymentMethod === "upi" && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="pt-4 border-t"
                          >
                            <div className="flex flex-col md:flex-row items-center gap-6 p-4 bg-muted/30 rounded-xl">
                              <div className="w-48 h-48 bg-white p-2 rounded-xl shadow-sm">
                                <img
                                  src={((selectedDoctor?.timings as any)?.upiQrUrl) || "/default_qr.png"}
                                  alt="UPI QR Code"
                                  className="w-full h-full object-contain"
                                />
                              </div>
                              <div className="text-center md:text-left space-y-2">
                                <p className="text-sm text-muted-foreground">Scan QR to pay directly to</p>
                                <p className="text-lg font-bold">{selectedDoctor?.profiles?.full_name}</p>
                                <div className="bg-primary/10 px-4 py-2 rounded-lg inline-block">
                                  <p className="text-xl font-mono text-primary font-bold tracking-wider">
                                    {((selectedDoctor?.timings as any)?.upiNumber) || "8688286621"}
                                  </p>
                                </div>
                                <p className="text-sm font-medium mt-2">Amount Payable: ₹{selectedDoctor?.consultation_fee}</p>
                                <p className="text-xs text-muted-foreground max-w-xs mt-2">
                                  Please complete the payment and click "Confirm Booking & Pay" below. Keep screenshot for reference.
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </div>
                      <div className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-accent">
                        <RadioGroupItem value="cash" id="cash" />
                        <Label htmlFor="cash" className="cursor-pointer flex-1">Cash at Hospital</Label>
                      </div>
                    </div>
                  </RadioGroup>
                </Card>

                <Button onClick={handlePayment} disabled={loading} className="w-full" size="lg">
                  <CreditCard className="mr-2 h-5 w-5" />
                  {loading ? "Processing..." : "Confirm Booking & Pay"}
                </Button>
              </motion.div>
            )}

            {/* Step 6: Confirmation */}
            {step === 6 && (
              <motion.div
                key="step6"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-6"
              >
                <motion.div 
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", duration: 0.8, bounce: 0.4 }}
                  className="flex justify-center"
                >
                  <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center shadow-lg">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3, type: "spring" }}
                    >
                      <CheckCircle className="h-16 w-16 text-primary" />
                    </motion.div>
                  </div>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    Booking Request Sent!
                  </h2>
                  <p className="text-muted-foreground">Your appointment request has been sent to the doctor. You will receive a notification once it's confirmed!</p>
                </motion.div>

                {/* Animated Ticket */}
                <motion.div
                  initial={{ opacity: 0, y: 40, rotateX: -15 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0 }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                >
                  <Card className="max-w-lg mx-auto overflow-hidden shadow-xl border-2 border-primary/20">
                    {/* Ticket Header */}
                    <div className="bg-gradient-to-r from-primary to-primary/80 p-6 text-primary-foreground">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xl font-bold">MedBud</h3>
                          <p className="text-sm opacity-90">Appointment Ticket</p>
                        </div>
                        <motion.div
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ repeat: Infinity, duration: 2 }}
                          className="text-right"
                        >
                          <p className="text-xs opacity-80">Token Number</p>
                          <p className="text-4xl font-bold">#{tokenNumber}</p>
                        </motion.div>
                      </div>
                    </div>

                    {/* Ticket Perforation */}
                    <div className="flex justify-between px-2 bg-muted/30">
                      {[...Array(20)].map((_, i) => (
                        <div key={i} className="w-2 h-2 rounded-full bg-background -mt-1" />
                      ))}
                    </div>

                    {/* Ticket Body */}
                    <div className="p-6 space-y-4">
                      {/* Unique Appointment ID */}
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 }}
                        className="bg-muted/50 p-3 rounded-lg"
                      >
                        <p className="text-xs text-muted-foreground">Unique Appointment ID</p>
                        <p className="font-mono text-sm font-bold text-primary break-all">{appointmentId}</p>
                      </motion.div>

                      {/* Patient Details Removed */}

                      {/* Divider */}
                      <div className="border-t border-dashed border-muted-foreground/30" />

                      {/* Hospital & Doctor */}
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.8 }}
                        className="text-left space-y-3"
                      >
                        <div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> Hospital
                          </p>
                          <p className="font-semibold">{selectedClinic?.clinic_name}</p>
                          <p className="text-sm text-muted-foreground">{selectedClinic?.address}, {selectedClinic?.city}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Stethoscope className="h-3 w-3" /> Doctor
                          </p>
                          <p className="font-semibold">{selectedDoctor?.profiles.full_name}</p>
                          <p className="text-sm text-muted-foreground">{selectedDoctor?.specialization} • {selectedDoctor?.experience_years} years exp</p>
                        </div>
                      </motion.div>

                      {/* Divider */}
                      <div className="border-t border-dashed border-muted-foreground/30" />

                      {/* Date, Time & Payment */}
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.9 }}
                        className="grid grid-cols-3 gap-4"
                      >
                        <div className="text-left">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> Date
                          </p>
                          <p className="font-semibold text-sm">{new Date(selectedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        </div>
                        <div className="text-left">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Time
                          </p>
                          <p className="font-semibold text-sm">{selectedTime}</p>
                        </div>
                        <div className="text-left">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <CreditCard className="h-3 w-3" /> Fee
                          </p>
                          <p className="font-semibold text-sm text-primary">₹{selectedDoctor?.consultation_fee}</p>
                        </div>
                      </motion.div>

                      {/* Symptoms if any */}
                      {bookingDetails.symptoms && (
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.95 }}
                          className="text-left"
                        >
                          <p className="text-xs text-muted-foreground">Symptoms</p>
                          <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">{bookingDetails.symptoms}</p>
                        </motion.div>
                      )}

                      {/* Status Badge */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 1, type: "spring" }}
                        className="flex flex-col items-center justify-center gap-2"
                      >
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-sm font-medium border border-yellow-200">
                          <Clock className="h-4 w-4" />
                          Pending Doctor Approval
                        </span>
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                          <CheckCircle className="h-3 w-3" />
                          Payment {paymentMethod === 'cash' ? 'At Clinic' : 'Completed'} • {paymentMethod.toUpperCase()}
                        </span>
                      </motion.div>
                    </div>

                    {/* Ticket Footer */}
                    <div className="bg-muted/50 p-4 text-center space-y-1">
                      <p className="text-sm font-medium">
                        ⏰ Please arrive <span className="text-primary font-bold">10 minutes</span> before your appointment
                      </p>
                      <p className="text-xs text-muted-foreground">
                        📋 Bring a valid ID and this receipt for verification
                      </p>
                    </div>
                  </Card>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2 }}
                  className="flex gap-4 justify-center flex-wrap pt-4"
                >
                  <Button onClick={downloadReceipt} variant="default" size="lg" className="shadow-lg">
                    <Download className="mr-2 h-5 w-5" />
                    Download PDF Receipt
                  </Button>
                  <Button onClick={() => navigate("/patient-dashboard")} variant="outline" size="lg">
                    Go to Dashboard
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default BookAppointment;
