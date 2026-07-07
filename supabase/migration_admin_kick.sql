-- Allow admins to update profiles of members in their household (kick, promote, demote)
CREATE POLICY "admin_update_member" ON profiles FOR UPDATE
  USING (
    household_id = my_household_id()
    AND EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin' AND p.household_id = my_household_id()
    )
  );

NOTIFY pgrst, 'reload schema';
