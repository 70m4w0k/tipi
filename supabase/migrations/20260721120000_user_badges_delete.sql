-- Re-blocage des badges : un utilisateur doit pouvoir retirer ses propres badges
-- quand son total repasse sous le seuil (RLS refusait le DELETE par défaut).
CREATE POLICY "delete" ON user_badges FOR DELETE USING (user_id = auth.uid());
