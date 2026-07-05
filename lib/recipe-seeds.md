# Recettes de test

Données à insérer via le SQL Editor de Supabase. Remplacer `HOUSEHOLD_ID` par l'ID de votre household.

## Ail au miel

```sql
INSERT INTO recipes (household_id, title, description, ingredients, steps) VALUES (
  'HOUSEHOLD_ID',
  'Ail au miel',
  'Ail fermenté dans du miel — à laisser reposer le plus longtemps possible.',
  '["2 gousses d''ail", "Miel", "Un pot"]',
  '[
    {"title": "Éplucher l''ail", "description": "Épluchez les gousses d''ail et retirez le cul.", "duration_value": 0, "duration_unit": "minutes"},
    {"title": "Mettre l''ail dans le pot", "description": "Placez les gousses d''ail dans le pot.", "duration_value": 0, "duration_unit": "minutes"},
    {"title": "Ajouter le miel", "description": "Ajoutez le miel à hauteur des gousses d''ail.", "duration_value": 0, "duration_unit": "minutes"},
    {"title": "Laisser reposer", "description": "Fermez le pot et laissez reposer. Ouvrir le pot tous les jours les premiers jours afin d''expulser les gaz.", "duration_value": 30, "duration_unit": "days"}
  ]'
);
```

## Limonade maison

```sql
INSERT INTO recipes (household_id, title, description, ingredients, steps) VALUES (
  'HOUSEHOLD_ID',
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
);
```

## Poulet aux noix de cajou

```sql
INSERT INTO recipes (household_id, title, description, ingredients, steps) VALUES (
  'HOUSEHOLD_ID',
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
```
