-- Allow public read access to clinics
DROP POLICY IF EXISTS "Anyone can view clinics" ON public.clinics;
CREATE POLICY "Public can view clinics in Vizag"
ON public.clinics
FOR SELECT
TO anon, authenticated
USING (city = 'Vizag');

-- Allow public read access to doctors
DROP POLICY IF EXISTS "Anyone can view active doctors" ON public.doctors;
CREATE POLICY "Public can view active doctors"
ON public.doctors
FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- Allow public read access to doctor profiles
CREATE POLICY "Public can view doctor profiles"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (
  id IN (
    SELECT user_id FROM public.doctors WHERE is_active = true
  )
);

-- Allow public creation of appointments (without patient_id required)
DROP POLICY IF EXISTS "Patients can create their own appointments" ON public.appointments;
CREATE POLICY "Public can create appointments"
ON public.appointments
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow public creation of tokens
DROP POLICY IF EXISTS "System can create tokens for bookings" ON public.tokens;
CREATE POLICY "Public can create tokens for bookings"
ON public.tokens
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Make patient_id nullable in appointments table
ALTER TABLE public.appointments 
ALTER COLUMN patient_id DROP NOT NULL;

-- Make patient_id nullable in tokens table
ALTER TABLE public.tokens 
ALTER COLUMN patient_id DROP NOT NULL;