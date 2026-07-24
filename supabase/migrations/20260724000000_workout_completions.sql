-- Complétions de parcours : une ligne par validation, par personne (record de tonnage + sceaux)
CREATE TABLE workout_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  household_id uuid NOT NULL REFERENCES households(id),
  user_id uuid NOT NULL REFERENCES profiles(id),
  -- tonnage de la séance : Σ (répétitions × poids) en kg ; 0 pour un parcours au poids du corps
  tonnage numeric NOT NULL DEFAULT 0,
  completed_at timestamptz DEFAULT now()
);

CREATE INDEX workout_completions_workout_user_idx ON workout_completions (workout_id, user_id);

ALTER TABLE workout_completions ENABLE ROW LEVEL SECURITY;
-- Visible par le foyer (comme les parcours), écrit uniquement pour soi
CREATE POLICY "select" ON workout_completions FOR SELECT USING (household_id = my_household_id());
CREATE POLICY "insert" ON workout_completions FOR INSERT WITH CHECK (household_id = my_household_id() AND user_id = auth.uid());
CREATE POLICY "delete" ON workout_completions FOR DELETE USING (household_id = my_household_id() AND user_id = auth.uid());
