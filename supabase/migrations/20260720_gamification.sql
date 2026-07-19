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

-- Seed default badges for default exercises
DO $$
DECLARE
  ex RECORD;
  thresholds int[] := ARRAY[100, 500, 1000, 5000, 10000];
  titles_100 text[];
  titles_500 text[];
  titles_1000 text[];
  titles_5000 text[];
  titles_10000 text[];
  tmp_thresholds int[] := ARRAY[100, 200, 500];
  tmp_titles_100 text[];
  tmp_titles_200 text[];
  tmp_titles_500 text[];
  i int;
BEGIN
  titles_100 := ARRAY['Pompier', 'Abdominable', 'Squatteur', 'Statue'];
  titles_500 := ARRAY['Pompiste', 'Abdominatus', 'Squatteur Pro', 'Statue Grecque'];
  titles_1000 := ARRAY['Pompinator', 'Abdominator', 'Squatman', 'Statue de Sel'];
  titles_5000 := ARRAY['Pompistador', 'Abdominator Suprême', 'Squatman Légendaire', 'Mégalithe'];
  titles_10000 := ARRAY['Pompéi', 'Plaque de Chocolat', 'Dieu du Squat', 'Mont Rushmore'];

  tmp_titles_100 := ARRAY['Pompeur Régulier', 'Abdo Régulier', 'Squat Régulier', 'Gainage Régulier'];
  tmp_titles_200 := ARRAY['Pompeur Assidu', 'Abdo Assidu', 'Squat Assidu', 'Gainage Assidu'];
  tmp_titles_500 := ARRAY['Pompeur Intense', 'Abdo Intense', 'Squat Intense', 'Gainage Intense'];

  i := 0;
  FOR ex IN SELECT id, name FROM exercises WHERE name IN ('Pompes','Abdos','Squats','Gainage') LOOP
    i := i + 1;
    -- Permanent badges
    INSERT INTO exercise_badges (exercise_id, household_id, threshold, title, icon)
    VALUES
      (ex.id, (SELECT household_id FROM exercises WHERE id = ex.id), 100, titles_100[i], 'shield-outline'),
      (ex.id, (SELECT household_id FROM exercises WHERE id = ex.id), 500, titles_500[i], 'shield-half'),
      (ex.id, (SELECT household_id FROM exercises WHERE id = ex.id), 1000, titles_1000[i], 'shield'),
      (ex.id, (SELECT household_id FROM exercises WHERE id = ex.id), 5000, titles_5000[i], 'ribbon'),
      (ex.id, (SELECT household_id FROM exercises WHERE id = ex.id), 10000, titles_10000[i], 'trophy');

    -- Temporal badges (7-day windows)
    INSERT INTO temporal_badges (exercise_id, household_id, threshold, window_days, title, icon, grace_hours)
    VALUES
      (ex.id, (SELECT household_id FROM exercises WHERE id = ex.id), 100, 7, tmp_titles_100[i], 'flame-outline', 48),
      (ex.id, (SELECT household_id FROM exercises WHERE id = ex.id), 200, 7, tmp_titles_200[i], 'flame', 48),
      (ex.id, (SELECT household_id FROM exercises WHERE id = ex.id), 500, 7, tmp_titles_500[i], 'flash', 48);
  END LOOP;
END $$;