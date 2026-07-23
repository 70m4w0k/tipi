-- Parcours sportifs : modèle réutilisable d'exercices (séries × reps, poids), partagé au foyer
CREATE TABLE workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id),
  name text NOT NULL,
  icon text NOT NULL DEFAULT 'barbell-outline',
  -- items : [{ exercise_id, sets, reps, weight?, per_side? }]
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select" ON workouts FOR SELECT USING (household_id = my_household_id());
CREATE POLICY "insert" ON workouts FOR INSERT WITH CHECK (household_id = my_household_id());
CREATE POLICY "update" ON workouts FOR UPDATE USING (household_id = my_household_id());
CREATE POLICY "delete" ON workouts FOR DELETE USING (household_id = my_household_id());

-- Poids (kg) enregistré par série ; NULL = poids du corps / non renseigné
ALTER TABLE exercise_logs ADD COLUMN weight numeric;
