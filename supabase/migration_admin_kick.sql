-- Drop old policy if it was already created without WITH CHECK
DROP POLICY IF EXISTS "admin_update_member" ON profiles;

-- Allow admins to update profiles of members in their household (kick, promote, demote)
-- WITH CHECK (true) is needed because kick sets household_id = null,
-- which would fail the USING check on the new row otherwise.
CREATE POLICY "admin_update_member" ON profiles FOR UPDATE
  USING (
    household_id = my_household_id()
    AND EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin' AND p.household_id = my_household_id()
    )
  )
  WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
