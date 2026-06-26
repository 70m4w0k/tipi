-- Tipi — Seed Data
-- Run after schema.sql. Users must be created via Supabase Auth dashboard first.
-- This seeds non-auth tables with default data for a test household.

-- Create a test household (use this invite code to join)
INSERT INTO households (id, name, invite_code) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Coloc Test', 'ABC123');

-- Default chore tasks for the test household
INSERT INTO chore_tasks (household_id, name) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Plan de travail'),
  ('00000000-0000-0000-0000-000000000001', 'Sol cuisine'),
  ('00000000-0000-0000-0000-000000000001', 'Plaques + evier'),
  ('00000000-0000-0000-0000-000000000001', 'Frigo'),
  ('00000000-0000-0000-0000-000000000001', 'Poubelles'),
  ('00000000-0000-0000-0000-000000000001', 'Salle de bain'),
  ('00000000-0000-0000-0000-000000000001', 'Toilettes');

-- Default chore reminder
INSERT INTO chore_reminders (household_id, title, recurrence) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Sortir les poubelles', 'Tous les lundis, mercredis et vendredis');
