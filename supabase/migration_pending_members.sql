-- Migration: pending_members table for pre-adding members before they join
-- Run this in the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS pending_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  claimed_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE pending_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select" ON pending_members FOR SELECT USING (household_id = my_household_id());
CREATE POLICY "insert" ON pending_members FOR INSERT WITH CHECK (household_id = my_household_id());
CREATE POLICY "update" ON pending_members FOR UPDATE USING (household_id = my_household_id());
CREATE POLICY "delete" ON pending_members FOR DELETE USING (household_id = my_household_id());

ALTER PUBLICATION supabase_realtime ADD TABLE pending_members;
