-- Add patient contact fields to appointments table for public bookings
ALTER TABLE public.appointments 
  ADD COLUMN IF NOT EXISTS patient_name TEXT,
  ADD COLUMN IF NOT EXISTS patient_email TEXT,
  ADD COLUMN IF NOT EXISTS patient_phone TEXT;

-- Add constraint to ensure contact info is provided for anonymous bookings
-- (either patient_id is set OR all contact fields are provided)
ALTER TABLE public.appointments ADD CONSTRAINT require_contact_info_for_anonymous
  CHECK (
    patient_id IS NOT NULL OR 
    (patient_name IS NOT NULL AND patient_email IS NOT NULL AND patient_phone IS NOT NULL)
  );

-- Add unique constraint to prevent double-booking the same time slot
ALTER TABLE public.appointments ADD CONSTRAINT unique_appointment_slot 
  UNIQUE (doctor_id, appointment_date, appointment_time);