-- 0023: dentists can join (specialty 'Dentist', shown as "drg.").
alter table public.profiles drop constraint if exists profiles_specialty_check;
alter table public.profiles add constraint profiles_specialty_check check (specialty in (
  'Cardiology', 'Surgery', 'OBGYN', 'Orthopedics', 'Psychiatry', 'Neurosurgery', 'Neurology',
  'Anesthesiology', 'Dermatology', 'Radiology', 'Ophthalmology', 'PlasticSurgery', 'Pediatrics',
  'Pulmonology', 'GeneralPractitioner', 'Dentist', 'MedicalStudent'));
