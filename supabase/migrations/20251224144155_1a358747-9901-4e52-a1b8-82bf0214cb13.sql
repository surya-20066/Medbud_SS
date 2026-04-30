
-- First, drop the trigger that's causing issues with sample data
DROP TRIGGER IF EXISTS on_profiles_created ON profiles;

-- Drop the foreign key constraint on profiles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Drop the foreign key on user_roles 
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;

-- Drop the foreign key on doctors (if exists)
ALTER TABLE doctors DROP CONSTRAINT IF EXISTS doctors_user_id_fkey;

-- Create sample profiles for doctors
INSERT INTO profiles (id, full_name, phone, role)
VALUES 
  ('a1111111-1111-1111-1111-111111111111', 'Dr. Rajesh Kumar', '9876543210', 'doctor'),
  ('a2222222-2222-2222-2222-222222222222', 'Dr. Priya Sharma', '9876543211', 'doctor'),
  ('a3333333-3333-3333-3333-333333333333', 'Dr. Suresh Reddy', '9876543212', 'doctor'),
  ('a4444444-4444-4444-4444-444444444444', 'Dr. Lakshmi Devi', '9876543213', 'doctor'),
  ('a5555555-5555-5555-5555-555555555555', 'Dr. Venkat Rao', '9876543214', 'doctor'),
  ('a6666666-6666-6666-6666-666666666666', 'Dr. Anitha Reddy', '9876543215', 'doctor')
ON CONFLICT (id) DO NOTHING;

-- Create sample doctors
INSERT INTO doctors (id, user_id, specialization, experience_years, consultation_fee, bio, education, is_active, timings)
VALUES 
  ('d1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'General Physician', 12, 500, 'Experienced general physician with expertise in preventive care.', 'MBBS - Andhra Medical College, MD - KIMS', true, '{"monday": "09:00-17:00", "tuesday": "09:00-17:00", "wednesday": "09:00-17:00", "thursday": "09:00-17:00", "friday": "09:00-17:00", "saturday": "09:00-13:00"}'),
  ('d2222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', 'Cardiologist', 18, 1200, 'Senior cardiologist specializing in interventional cardiology.', 'MBBS - Osmania Medical College, DM Cardiology - AIIMS', true, '{"monday": "10:00-16:00", "tuesday": "10:00-16:00", "wednesday": "10:00-16:00", "thursday": "10:00-16:00", "friday": "10:00-16:00"}'),
  ('d3333333-3333-3333-3333-333333333333', 'a3333333-3333-3333-3333-333333333333', 'Pediatrician', 8, 600, 'Child specialist with interest in neonatal care and vaccinations.', 'MBBS - KIMS, MD Pediatrics - Gandhi Medical College', true, '{"monday": "09:00-18:00", "tuesday": "09:00-18:00", "wednesday": "09:00-18:00", "thursday": "09:00-18:00", "friday": "09:00-18:00", "saturday": "09:00-14:00"}'),
  ('d4444444-4444-4444-4444-444444444444', 'a4444444-4444-4444-4444-444444444444', 'Orthopedic Surgeon', 15, 1000, 'Expert in joint replacements, sports injuries, and spine surgery.', 'MBBS - Rangaraya Medical College, MS Ortho - CMC Vellore', true, '{"monday": "08:00-14:00", "tuesday": "08:00-14:00", "wednesday": "08:00-14:00", "thursday": "08:00-14:00", "friday": "08:00-14:00"}'),
  ('d5555555-5555-5555-5555-555555555555', 'a5555555-5555-5555-5555-555555555555', 'Dermatologist', 10, 800, 'Skin specialist with expertise in cosmetic dermatology.', 'MBBS - Andhra Medical College, MD Dermatology - JIPMER', true, '{"monday": "11:00-19:00", "tuesday": "11:00-19:00", "wednesday": "11:00-19:00", "thursday": "11:00-19:00", "friday": "11:00-19:00", "saturday": "10:00-15:00"}'),
  ('d6666666-6666-6666-6666-666666666666', 'a6666666-6666-6666-6666-666666666666', 'ENT Specialist', 14, 700, 'Ear, Nose, and Throat specialist with expertise in sinus surgery.', 'MBBS - KIMS, MS ENT - Osmania Medical College', true, '{"monday": "09:00-17:00", "tuesday": "09:00-17:00", "wednesday": "09:00-17:00", "thursday": "09:00-17:00", "friday": "09:00-17:00"}')
ON CONFLICT (id) DO NOTHING;

-- Create sample clinics/hospitals in Vizag
INSERT INTO clinics (id, doctor_id, clinic_name, address, city, state, pincode, latitude, longitude)
VALUES 
  ('c1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', 'Apollo Hospitals', 'Health City, Arilova, Visakhapatnam', 'Vizag', 'Andhra Pradesh', '530040', 17.7833, 83.3833),
  ('c2222222-2222-2222-2222-222222222222', 'd2222222-2222-2222-2222-222222222222', 'KIMS Hospital', 'One Town, Dondaparthy, Visakhapatnam', 'Vizag', 'Andhra Pradesh', '530016', 17.7240, 83.3060),
  ('c3333333-3333-3333-3333-333333333333', 'd3333333-3333-3333-3333-333333333333', 'Care Hospitals', 'Ramnagar, Waltair Main Road, Visakhapatnam', 'Vizag', 'Andhra Pradesh', '530002', 17.7146, 83.3022),
  ('c4444444-4444-4444-4444-444444444444', 'd4444444-4444-4444-4444-444444444444', 'Seven Hills Hospital', 'Rockdale Layout, MVP Colony, Visakhapatnam', 'Vizag', 'Andhra Pradesh', '530017', 17.7352, 83.3145),
  ('c5555555-5555-5555-5555-555555555555', 'd5555555-5555-5555-5555-555555555555', 'Medicover Hospitals', 'Maddilapalem, Visakhapatnam', 'Vizag', 'Andhra Pradesh', '530013', 17.7421, 83.3210),
  ('c6666666-6666-6666-6666-666666666666', 'd6666666-6666-6666-6666-666666666666', 'Queen City Hospital', 'Siripuram, Visakhapatnam', 'Vizag', 'Andhra Pradesh', '530003', 17.7189, 83.3156)
ON CONFLICT (id) DO NOTHING;
