-- Tipi — Seed Data
-- Run after schema.sql. Users must be created via Supabase Auth dashboard first.
-- This seeds non-auth tables with default data for a test household.

-- Create a test household (rejoins-la avec le code d'invitation ci-dessous).
-- Code en minuscules : l'app met le code saisi en lowercase avant de matcher.
INSERT INTO households (id, name, invite_code) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Coloc Test', 'abc123');

-- Default chore tasks for the test household
INSERT INTO chore_tasks (household_id, name) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Plan de travail'),
  ('00000000-0000-0000-0000-000000000001', 'Sol cuisine'),
  ('00000000-0000-0000-0000-000000000001', 'Plaques + evier'),
  ('00000000-0000-0000-0000-000000000001', 'Frigo'),
  ('00000000-0000-0000-0000-000000000001', 'Poubelles'),
  ('00000000-0000-0000-0000-000000000001', 'Salle de bain'),
  ('00000000-0000-0000-0000-000000000001', 'Toilettes');

-- Default chore reminder
INSERT INTO chore_reminders (household_id, title, recurrence) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Sortir les poubelles', 'Tous les lundis, mercredis et vendredis');

-- Recettes de démo (cf. lib/recipe-seeds.md) — "recettes en cours" longue durée
INSERT INTO recipes (household_id, title, description, ingredients, steps) VALUES
(
  '00000000-0000-0000-0000-000000000001',
  'Ail au miel',
  'Ail fermenté dans du miel — à laisser reposer le plus longtemps possible.',
  '["2 gousses d''ail", "Miel", "Un pot"]',
  '[
    {"title": "Éplucher l''ail", "description": "Épluchez les gousses d''ail et retirez le cul.", "duration_value": 0, "duration_unit": "minutes"},
    {"title": "Mettre l''ail dans le pot", "description": "Placez les gousses d''ail dans le pot.", "duration_value": 0, "duration_unit": "minutes"},
    {"title": "Ajouter le miel", "description": "Ajoutez le miel à hauteur des gousses d''ail.", "duration_value": 0, "duration_unit": "minutes"},
    {"title": "Laisser reposer", "description": "Fermez le pot et laissez reposer. Ouvrir le pot tous les jours les premiers jours afin d''expulser les gaz.", "duration_value": 30, "duration_unit": "days"}
  ]'
),
(
  '00000000-0000-0000-0000-000000000001',
  'Limonade maison',
  'Pour 3 litres de limonade fermentée naturellement.',
  '["2 citrons", "200g de sucre", "1 CàS de riz", "1 CàS de raisins secs"]',
  '[
    {"title": "Mixer les citrons", "description": "Couper les citrons en quartiers et les passer au blender.", "duration_value": 0, "duration_unit": "minutes"},
    {"title": "Filtrer la pulpe", "description": "Filtrer la pulpe de citron.", "duration_value": 0, "duration_unit": "minutes"},
    {"title": "Mélanger et mouiller", "description": "Ajouter la pulpe, le sucre, le riz et les raisins secs dans un grand récipient. Mouiller à hauteur.", "duration_value": 0, "duration_unit": "minutes"},
    {"title": "Fermentation", "description": "Couvrir d''un linge et laisser reposer à température ambiante jusqu''à ce que les raisins remontent à la surface.", "duration_value": 3, "duration_unit": "days"},
    {"title": "Embouteiller", "description": "Filtrer la limonade et embouteiller.", "duration_value": 0, "duration_unit": "minutes"},
    {"title": "Repos au frigo", "description": "Laisser reposer au frigo. Servir bien frais.", "duration_value": 14, "duration_unit": "days"}
  ]'
),
(
  '00000000-0000-0000-0000-000000000001',
  'Poulet aux noix de cajou',
  'Poulet sauté aux noix de cajou, à servir chaud avec du riz. À chaque étape de cuisson, ajouter un peu de sauce.',
  '["Haut de cuisse ou blancs de poulet", "Noix de cajou", "Oignons", "Oignon vert", "Ail", "Gingembre", "Carottes", "Poivrons", "Sauce soja", "Sauce huître", "Fécule de maïs", "Sucre", "Piment", "Sel", "Poivre blanc", "Huile de sésame", "Huile neutre"]',
  '[
    {"title": "Préparer la marinade", "description": "Marinade : sauce soja, sauce huître, ail, gingembre, sel, poivre blanc, fécule de maïs, sucre, huile de sésame. Coupez le poulet en tranches et ajoutez la marinade.", "duration_value": 0, "duration_unit": "minutes"},
    {"title": "Mariner au frigo", "description": "Laissez mariner au frigo.", "duration_value": 24, "duration_unit": "hours"},
    {"title": "Préparer la sauce", "description": "Sauce : sauce soja, sauce huître, ail, gingembre, piment, sel, poivre blanc, sucre.", "duration_value": 0, "duration_unit": "minutes"},
    {"title": "Torréfier les noix de cajou", "description": "Torréfier les noix de cajou dans un fond d''huile neutre et réserver.", "duration_value": 5, "duration_unit": "minutes"},
    {"title": "Cuire le poulet", "description": "Faire revenir le poulet dans la poêle puis réserver.", "duration_value": 10, "duration_unit": "minutes"},
    {"title": "Cuire les légumes", "description": "Faire revenir les carottes, puis les oignons, puis les poivrons.", "duration_value": 10, "duration_unit": "minutes"},
    {"title": "Assembler et servir", "description": "Ajouter le poulet et les noix de cajou. Terminer par les oignons verts. Servir chaud avec du riz.", "duration_value": 0, "duration_unit": "minutes"}
  ]'
);
