-- Sport: exercises tracking
-- Migration for feature/sport-page

CREATE TABLE exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id),
  name text NOT NULL,
  icon text NOT NULL DEFAULT 'barbell-outline',
  unit text NOT NULL DEFAULT 'répétitions',
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE (household_id, name)
);

ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select" ON exercises FOR SELECT USING (household_id = my_household_id());
CREATE POLICY "insert" ON exercises FOR INSERT WITH CHECK (household_id = my_household_id());
CREATE POLICY "update" ON exercises FOR UPDATE USING (household_id = my_household_id());
CREATE POLICY "delete" ON exercises FOR DELETE USING (household_id = my_household_id());

CREATE TABLE exercise_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id),
  exercise_id uuid NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id),
  count int NOT NULL CHECK (count > 0),
  logged_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE exercise_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select" ON exercise_logs FOR SELECT USING (household_id = my_household_id());
CREATE POLICY "insert" ON exercise_logs FOR INSERT WITH CHECK (household_id = my_household_id());
CREATE POLICY "update" ON exercise_logs FOR UPDATE USING (household_id = my_household_id());
CREATE POLICY "delete" ON exercise_logs FOR DELETE USING (household_id = my_household_id());