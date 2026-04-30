-- =====================================================
-- MEDBUD DATABASE SCHEMA - Level 2
-- Complete schema for medical appointment platform
-- =====================================================

-- 1. PROFILES TABLE
-- Links to auth.users and stores role information
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('patient', 'doctor', 'admin')),
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 2. DOCTORS TABLE
-- Stores doctor-specific information
CREATE TABLE IF NOT EXISTS public.doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  specialization TEXT NOT NULL,
  experience_years INTEGER DEFAULT 0,
  consultation_fee DECIMAL(10, 2) NOT NULL,
  bio TEXT,
  education TEXT,
  timings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);

-- Enable RLS on doctors
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

-- Doctors RLS Policies
CREATE POLICY "Anyone can view active doctors"
  ON public.doctors FOR SELECT
  USING (is_active = true);

CREATE POLICY "Doctors can update their own profile"
  ON public.doctors FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Doctors can insert their own profile"
  ON public.doctors FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 3. CLINICS TABLE
-- Links doctors to clinic locations
CREATE TABLE IF NOT EXISTS public.clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  clinic_name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on clinics
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;

-- Clinics RLS Policies
CREATE POLICY "Anyone can view clinics"
  ON public.clinics FOR SELECT
  USING (true);

CREATE POLICY "Doctors can manage their own clinics"
  ON public.clinics FOR ALL
  USING (doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()));

-- 4. APPOINTMENTS TABLE
-- Main table for appointment bookings
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  symptoms TEXT,
  payment_method TEXT,
  payment_status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on appointments
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Appointments RLS Policies
CREATE POLICY "Patients can view their own appointments"
  ON public.appointments FOR SELECT
  USING (patient_id = auth.uid());

CREATE POLICY "Doctors can view their appointments"
  ON public.appointments FOR SELECT
  USING (doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()));

CREATE POLICY "Patients can create their own appointments"
  ON public.appointments FOR INSERT
  WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Doctors can update their appointments"
  ON public.appointments FOR UPDATE
  USING (doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()));

-- 5. TOKENS TABLE
-- Core queue management system
CREATE TABLE IF NOT EXISTS public.tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  token_number INTEGER NOT NULL,
  token_type TEXT NOT NULL CHECK (token_type IN ('online', 'walkin')),
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed', 'cancelled')),
  priority BOOLEAN DEFAULT false,
  delay_minutes INTEGER DEFAULT 0,
  estimated_time TIMESTAMP WITH TIME ZONE,
  token_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on tokens
ALTER TABLE public.tokens ENABLE ROW LEVEL SECURITY;

-- Tokens RLS Policies
CREATE POLICY "Patients can view their own tokens"
  ON public.tokens FOR SELECT
  USING (patient_id = auth.uid());

CREATE POLICY "Doctors can view their tokens"
  ON public.tokens FOR SELECT
  USING (doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()));

CREATE POLICY "Doctors can manage their tokens"
  ON public.tokens FOR ALL
  USING (doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()));

CREATE POLICY "System can create tokens for bookings"
  ON public.tokens FOR INSERT
  WITH CHECK (true);

-- 6. PATIENT_RECORDS TABLE
-- EHR-Lite system for storing medical records
CREATE TABLE IF NOT EXISTS public.patient_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID NOT NULL REFERENCES public.tokens(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  diagnosis TEXT,
  prescription TEXT,
  notes TEXT,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(token_id)
);

-- Enable RLS on patient_records
ALTER TABLE public.patient_records ENABLE ROW LEVEL SECURITY;

-- Patient Records RLS Policies
CREATE POLICY "Patients can view their own records"
  ON public.patient_records FOR SELECT
  USING (patient_id = auth.uid());

CREATE POLICY "Doctors can view records for their patients"
  ON public.patient_records FOR SELECT
  USING (doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()));

CREATE POLICY "Doctors can create records for their patients"
  ON public.patient_records FOR INSERT
  WITH CHECK (doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()));

CREATE POLICY "Doctors can update records for their patients"
  ON public.patient_records FOR UPDATE
  USING (doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()));

-- =====================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add triggers to all tables
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_doctors_updated_at
  BEFORE UPDATE ON public.doctors
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_clinics_updated_at
  BEFORE UPDATE ON public.clinics
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_tokens_updated_at
  BEFORE UPDATE ON public.tokens
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_patient_records_updated_at
  BEFORE UPDATE ON public.patient_records
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_doctors_user_id ON public.doctors(user_id);
CREATE INDEX idx_doctors_active ON public.doctors(is_active);
CREATE INDEX idx_clinics_doctor_id ON public.clinics(doctor_id);
CREATE INDEX idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX idx_appointments_doctor_id ON public.appointments(doctor_id);
CREATE INDEX idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX idx_tokens_doctor_id ON public.tokens(doctor_id);
CREATE INDEX idx_tokens_patient_id ON public.tokens(patient_id);
CREATE INDEX idx_tokens_status ON public.tokens(status);
CREATE INDEX idx_tokens_date ON public.tokens(token_date);
CREATE INDEX idx_patient_records_patient_id ON public.patient_records(patient_id);
CREATE INDEX idx_patient_records_doctor_id ON public.patient_records(doctor_id);

-- Enable realtime for tokens (critical for live queue updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.tokens;