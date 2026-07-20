-- Gamification: badges for exercises
CREATE TABLE exercise_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id uuid NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  household_id uuid NOT NULL REFERENCES households(id),
  threshold int NOT NULL,
  title text NOT NULL,
  icon text NOT NULL DEFAULT 'shield-outline',
  UNIQUE (exercise_id, threshold, household_id)
);

ALTER TABLE exercise_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select" ON exercise_badges FOR SELECT USING (household_id = my_household_id());
CREATE POLICY "insert" ON exercise_badges FOR INSERT WITH CHECK (household_id = my_household_id());

CREATE TABLE temporal_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id uuid NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  household_id uuid NOT NULL REFERENCES households(id),
  threshold int NOT NULL,
  window_days int NOT NULL,
  title text NOT NULL,
  icon text NOT NULL DEFAULT 'flame-outline',
  grace_hours int NOT NULL DEFAULT 48,
  UNIQUE (exercise_id, threshold, window_days, household_id)
);

ALTER TABLE temporal_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select" ON temporal_badges FOR SELECT USING (household_id = my_household_id());
CREATE POLICY "insert" ON temporal_badges FOR INSERT WITH CHECK (household_id = my_household_id());

CREATE TABLE user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id),
  badge_id uuid NOT NULL REFERENCES exercise_badges(id) ON DELETE CASCADE,
  unlocked_at timestamptz DEFAULT now(),
  UNIQUE (user_id, badge_id)
);

ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select" ON user_badges FOR SELECT USING (true);
CREATE POLICY "insert" ON user_badges FOR INSERT WITH CHECK (user_id = auth.uid());

-- NOTE: default badges are seeded client-side when exercises are created
-- (see seedBadgesForExercise in lib/hooks/useSport.ts) — exercises don't
-- exist yet at migration time, they are created per household by the app.
