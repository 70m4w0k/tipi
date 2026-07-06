-- Migration: add week_parity to chore_reminders for bi-weekly recurrence
-- Run this in the Supabase SQL Editor

ALTER TABLE chore_reminders ADD COLUMN IF NOT EXISTS week_parity smallint CHECK (week_parity IN (0, 1));
