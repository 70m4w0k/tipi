-- Migration: add shopping_items, recipes, recipe_instances tables
-- and show_in_grid column to chore_tasks.
-- Run this in the Supabase SQL Editor.

-- Add show_in_grid to chore_tasks
ALTER TABLE chore_tasks ADD COLUMN IF NOT EXISTS show_in_grid boolean NOT NULL DEFAULT true;

-- Shopping items
CREATE TABLE IF NOT EXISTS shopping_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id),
  title text NOT NULL,
  category text DEFAULT '',
  checked boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE shopping_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select" ON shopping_items FOR SELECT USING (household_id = my_household_id());
CREATE POLICY "insert" ON shopping_items FOR INSERT WITH CHECK (household_id = my_household_id());
CREATE POLICY "update" ON shopping_items FOR UPDATE USING (household_id = my_household_id());
CREATE POLICY "delete" ON shopping_items FOR DELETE USING (household_id = my_household_id());

-- Recipes
CREATE TABLE IF NOT EXISTS recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id),
  title text NOT NULL,
  description text DEFAULT '',
  ingredients jsonb NOT NULL DEFAULT '[]'::jsonb,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select" ON recipes FOR SELECT USING (household_id = my_household_id());
CREATE POLICY "insert" ON recipes FOR INSERT WITH CHECK (household_id = my_household_id());
CREATE POLICY "update" ON recipes FOR UPDATE USING (household_id = my_household_id());
CREATE POLICY "delete" ON recipes FOR DELETE USING (household_id = my_household_id());

-- Recipe instances
CREATE TABLE IF NOT EXISTS recipe_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id),
  recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  label text NOT NULL,
  current_step int NOT NULL DEFAULT 0,
  notes text DEFAULT '',
  started_at timestamptz DEFAULT now(),
  step_started_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE recipe_instances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select" ON recipe_instances FOR SELECT USING (household_id = my_household_id());
CREATE POLICY "insert" ON recipe_instances FOR INSERT WITH CHECK (household_id = my_household_id());
CREATE POLICY "update" ON recipe_instances FOR UPDATE USING (household_id = my_household_id());
CREATE POLICY "delete" ON recipe_instances FOR DELETE USING (household_id = my_household_id());

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE shopping_items, recipes, recipe_instances;
