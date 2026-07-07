-- Migration: add start_date to chore_reminders for delayed recurrence
-- Run this in the Supabase SQL Editor

ALTER TABLE chore_reminders ADD COLUMN IF NOT EXISTS start_date date;

-- Force PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
