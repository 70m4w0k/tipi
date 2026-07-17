-- Modèle unifié : un rappel (chore_reminders) est toujours porté par une tâche (chore_tasks).
-- Ajoute task_id (FK ON DELETE CASCADE) → supprimer une tâche supprime son rappel, plus
-- aucun rappel orphelin. Rattache les rappels existants par nom, convertit les orphelins
-- en tâche cachée, puis rend task_id obligatoire.
-- À exécuter dans l'éditeur SQL Supabase (prod).

ALTER TABLE chore_reminders
  ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES chore_tasks(id) ON DELETE CASCADE;

-- 1) Rattache par nom (titre du rappel = nom de la tâche).
UPDATE chore_reminders r SET task_id = t.id
  FROM chore_tasks t
  WHERE r.task_id IS NULL AND t.household_id = r.household_id AND t.name = r.title;

-- 2) Rappels orphelins : crée une tâche cachée du même nom, puis rattache.
INSERT INTO chore_tasks (household_id, name, show_in_grid)
  SELECT DISTINCT r.household_id, r.title, false
  FROM chore_reminders r
  WHERE r.task_id IS NULL
  ON CONFLICT (household_id, name) DO NOTHING;

UPDATE chore_reminders r SET task_id = t.id
  FROM chore_tasks t
  WHERE r.task_id IS NULL AND t.household_id = r.household_id AND t.name = r.title;

-- 3) Rend le lien obligatoire.
ALTER TABLE chore_reminders ALTER COLUMN task_id SET NOT NULL;

NOTIFY pgrst, 'reload schema';
