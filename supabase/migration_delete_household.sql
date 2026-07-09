-- Suppression d'une coloc par un admin.
--
-- Pourquoi une fonction : un DELETE direct est impossible. Il faut d'abord nuller
-- `household_id` de tous les membres (contrainte FK profiles -> households), mais dès
-- que l'admin nulle le sien, `my_household_id()` devient null et la policy RLS de
-- DELETE sur households ne matche plus la coloc → suppression silencieuse (0 ligne).
-- Une fonction SECURITY DEFINER contourne le RLS après vérification que l'appelant est
-- admin de la coloc.

CREATE OR REPLACE FUNCTION delete_household()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hid uuid;
BEGIN
  SELECT household_id INTO hid FROM profiles WHERE id = auth.uid();
  IF hid IS NULL THEN
    RAISE EXCEPTION 'no household';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND household_id = hid
  ) THEN
    RAISE EXCEPTION 'not allowed: caller must be an admin of the household';
  END IF;

  -- Purge des données rattachées (ordre FK-safe), sinon le DELETE households échoue.
  DELETE FROM message_reads WHERE message_id IN (SELECT id FROM messages WHERE household_id = hid);
  DELETE FROM messages WHERE household_id = hid;
  DELETE FROM expenses WHERE household_id = hid;          -- expense_participants : ON DELETE CASCADE
  DELETE FROM chores WHERE household_id = hid;
  DELETE FROM chore_tasks WHERE household_id = hid;
  DELETE FROM chore_reminders WHERE household_id = hid;
  DELETE FROM events WHERE household_id = hid;
  DELETE FROM shared_files WHERE household_id = hid;
  DELETE FROM shopping_items WHERE household_id = hid;
  DELETE FROM recipe_instances WHERE household_id = hid;
  DELETE FROM recipes WHERE household_id = hid;
  UPDATE profiles SET household_id = NULL WHERE household_id = hid;
  DELETE FROM households WHERE id = hid;                  -- pending_members : ON DELETE CASCADE
END;
$$;

GRANT EXECUTE ON FUNCTION delete_household() TO authenticated;

NOTIFY pgrst, 'reload schema';
