-- =====================================================
-- NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('new_appointment', 'prepone_request', 'prepone_approved', 'prepone_declined', 'appointment_update')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- PREPONE REQUESTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.prepone_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  requested_date DATE NOT NULL,
  requested_time TIME NOT NULL,
  original_date DATE NOT NULL,
  original_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  reason TEXT,
  doctor_response TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prepone_requests_appointment_id ON public.prepone_requests(appointment_id);
CREATE INDEX IF NOT EXISTS idx_prepone_requests_patient_id ON public.prepone_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_prepone_requests_doctor_id ON public.prepone_requests(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prepone_requests_status ON public.prepone_requests(status);

-- =====================================================
-- ROW LEVEL SECURITY FOR NOTIFICATIONS
-- =====================================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- ROW LEVEL SECURITY FOR PREPONE REQUESTS
-- =====================================================
ALTER TABLE public.prepone_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can view own prepone requests"
  ON public.prepone_requests FOR SELECT
  USING (auth.uid() = patient_id);

CREATE POLICY "Doctors can view their prepone requests"
  ON public.prepone_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.doctors
      WHERE public.doctors.id = public.prepone_requests.doctor_id
      AND public.doctors.user_id = auth.uid()
    )
  );

CREATE POLICY "Patients can create prepone requests"
  ON public.prepone_requests FOR INSERT
  WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Doctors can update their prepone requests"
  ON public.prepone_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.doctors
      WHERE public.doctors.id = public.prepone_requests.doctor_id
      AND public.doctors.user_id = auth.uid()
    )
  );

-- =====================================================
-- ENABLE REALTIME FOR NEW TABLES + APPOINTMENTS
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.prepone_requests;
