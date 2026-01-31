-- Migration V24: Fix RLS Permissions for Consultas (Agenda)
-- Rules based on User Feedback:
-- 1. Simple Plan (Owner): Sees EVERYTHING (Is Owner).
-- 2. Team Plan (Owner): Sees EVERYTHING.
-- 3. Team Plan (Secretary): Sees EVERYTHING (of the clinic they work for).
-- 4. Team Plan (Dentist): Sees ONLY THEIR OWN appointments.

-- 1. Enable RLS
alter table public.consultas enable row level security;

-- 2. Drop existing restrictive policies
drop policy if exists "Owners can manage their appointments" on public.consultas;
drop policy if exists "Users can view their own appointments" on public.consultas;
drop policy if exists "Clinic Owners Manage Own Appointments" on public.consultas;
drop policy if exists "Dono ve sua propria agenda" on public.consultas;

-- 3. Create Policy: View/Manage Appointments
-- This single policy handles all cases by checking relationships in specific order.
create policy "Agenda Access Policy"
on public.consultas
for all
to authenticated
using (
  -- CASE 1: I am the Clinic Owner of this appointment (Simple or Team Owner)
  auth.uid() = owner_id 
  
  -- CASE 2: I am the Dentist assigned to this appointment
  or auth.uid() = user_id
  
  -- CASE 3: I am a Secretary working for the Clinic Owner of this appointment
  or exists (
    select 1 from public.profiles my_profile
    where my_profile.id = auth.uid()
      and my_profile.role = 'secretary'
      and my_profile.owner_id = consultas.owner_id
  )
)
with check (
  -- Same logic for Insert/Update
  auth.uid() = owner_id 
  or auth.uid() = user_id
  or exists (
    select 1 from public.profiles my_profile
    where my_profile.id = auth.uid()
      and my_profile.role = 'secretary'
      and my_profile.owner_id = consultas.owner_id
  )
);
