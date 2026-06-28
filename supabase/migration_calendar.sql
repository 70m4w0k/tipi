-- Migration: Calendar feature
-- Adds birthday to profiles, target_date and step_completions to recipe_instances

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birthday date;

ALTER TABLE recipe_instances ADD COLUMN IF NOT EXISTS target_date date;
ALTER TABLE recipe_instances ADD COLUMN IF NOT EXISTS step_completions jsonb NOT NULL DEFAULT '[]'::jsonb;
