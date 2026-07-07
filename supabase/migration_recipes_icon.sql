-- Ajoute la colonne `icon` manquante sur `recipes`.
-- Présente dans schema.sql mais absente de la base déployée : sans elle, tout
-- INSERT depuis addRecipe (qui envoie `icon: null`) est rejeté par PostgREST
-- ("Could not find the 'icon' column"), donc la création de recette échoue
-- silencieusement. À exécuter dans l'éditeur SQL Supabase.
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS icon text;
NOTIFY pgrst, 'reload schema';
