-- Add missing columns to recipe_instances
ALTER TABLE recipe_instances ADD COLUMN IF NOT EXISTS target_date date;
ALTER TABLE recipe_instances ADD COLUMN IF NOT EXISTS step_completions jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE recipe_instances ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Add icon column to recipes
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS icon text;
