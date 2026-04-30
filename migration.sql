-- SQL Migration for Doctor Verification System

-- 1. Update doctors table with new fields
ALTER TABLE public.doctors 
ADD COLUMN IF NOT EXISTS license_number TEXT,
ADD COLUMN IF NOT EXISTS document_url TEXT,
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'PENDING' 
CHECK (verification_status IN ('PENDING', 'APPROVED', 'REJECTED'));

-- 2. Create storage bucket for doctor documents
-- Note: Run this in the Supabase Dashboard Storage section if this fails
-- INSERT INTO storage.buckets (id, name, public) VALUES ('doctor-documents', 'doctor-documents', true);

-- 3. Storage Policies (Allow doctors to upload their own documents and admins to read all)
-- CREATE POLICY "Doctors can upload their own license" ON storage.objects 
-- FOR INSERT WITH CHECK (bucket_id = 'doctor-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Public Access to Licenses" ON storage.objects 
-- FOR SELECT USING (bucket_id = 'doctor-documents');

-- 4. RPC to update doctor status (optional, but good for security)
CREATE OR REPLACE FUNCTION public.update_doctor_verification(p_doctor_id UUID, p_status TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.doctors
  SET verification_status = p_status,
      is_active = (p_status = 'APPROVED')
  WHERE id = p_doctor_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
