-- Exclusion d'un membre par un admin.
--
-- Pourquoi une fonction et pas un simple UPDATE : la policy RLS `admin_update_member`
-- a un USING `household_id = my_household_id()`. Sur un UPDATE, Postgres exige que la
-- NOUVELLE ligne reste couverte par ce USING → mettre `household_id = NULL` (sortir le
-- membre) échoue toujours, même avec `WITH CHECK (true)`. Une fonction SECURITY DEFINER
-- contourne le RLS après avoir vérifié que l'appelant est admin de la même coloc.

CREATE OR REPLACE FUNCTION kick_member(target uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM profiles admin_p
    JOIN profiles target_p ON target_p.household_id = admin_p.household_id
    WHERE admin_p.id = auth.uid()
      AND admin_p.role = 'admin'
      AND target_p.id = target
      AND target_p.id <> admin_p.id
  ) THEN
    RAISE EXCEPTION 'not allowed: caller must be an admin of the member''s household';
  END IF;

  UPDATE profiles SET household_id = NULL WHERE id = target;
END;
$$;

GRANT EXECUTE ON FUNCTION kick_member(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
