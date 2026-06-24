-- Migration: add role column to profiles + household management helpers
-- Run this in the Supabase SQL Editor

-- 1. Add role column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'member'
  CHECK (role IN ('admin', 'member'));

-- 2. Set current household creators as admin
-- (best-effort: promote the earliest member of each household)
UPDATE profiles SET role = 'admin'
WHERE id IN (
  SELECT DISTINCT ON (household_id) id
  FROM profiles
  WHERE household_id IS NOT NULL
  ORDER BY household_id, created_at ASC
);

-- 3. RLS: allow admin to update other members' profiles (for kick/promote)
CREATE POLICY "admin_update_members" ON profiles FOR UPDATE USING (
  household_id = my_household_id()
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin' AND household_id = my_household_id()
  )
);

-- 4. RLS: allow admin to update household (rename, regenerate code)
CREATE POLICY "admin_update" ON households FOR UPDATE USING (
  id = my_household_id()
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin' AND household_id = households.id
  )
);

-- 5. RLS: allow admin to delete household
CREATE POLICY "admin_delete" ON households FOR DELETE USING (
  id = my_household_id()
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin' AND household_id = households.id
  )
);

-- 6. Auto-assign admin role when creating a household
-- (the user who creates it becomes admin when they set their household_id)
CREATE OR REPLACE FUNCTION set_admin_on_create()
RETURNS trigger AS $$
BEGIN
  IF NEW.household_id IS NOT NULL AND OLD.household_id IS NULL THEN
    -- Check if this is the first member (creator)
    IF NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE household_id = NEW.household_id AND id != NEW.id
    ) THEN
      NEW.role := 'admin';
    END IF;
  END IF;
  -- Reset role when leaving household
  IF NEW.household_id IS NULL AND OLD.household_id IS NOT NULL THEN
    NEW.role := 'member';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_household_change
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  WHEN (OLD.household_id IS DISTINCT FROM NEW.household_id)
  EXECUTE FUNCTION set_admin_on_create();
