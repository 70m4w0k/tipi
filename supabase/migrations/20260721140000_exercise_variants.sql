-- Variantes d'exercices (étiquette optionnelle sur la série)
-- exercises.variants : liste de { name, color } (couleur auto-assignée côté client)
ALTER TABLE exercises ADD COLUMN variants jsonb NOT NULL DEFAULT '[]'::jsonb;
-- exercise_logs.variant : nom de la variante de la série (NULL = Standard)
ALTER TABLE exercise_logs ADD COLUMN variant text;
