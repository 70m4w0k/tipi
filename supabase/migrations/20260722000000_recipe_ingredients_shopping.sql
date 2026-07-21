-- Recettes : portions de base + ingrédients structurés { name, amount, unit }
ALTER TABLE recipes ADD COLUMN servings int NOT NULL DEFAULT 4;

-- Convertit les ingrédients texte existants en objets (amount/unit vides)
UPDATE recipes SET ingredients = COALESCE((
  SELECT jsonb_agg(
    CASE WHEN jsonb_typeof(elem) = 'string'
      THEN jsonb_build_object('name', elem #>> '{}', 'amount', NULL, 'unit', '')
      ELSE elem
    END
  )
  FROM jsonb_array_elements(ingredients) AS elem
), '[]'::jsonb)
WHERE jsonb_array_length(ingredients) > 0;

-- Courses : quantité par article + propriétaire (NULL = partagé coloc, sinon perso)
ALTER TABLE shopping_items ADD COLUMN quantity text NOT NULL DEFAULT '';
ALTER TABLE shopping_items ADD COLUMN owner_id uuid REFERENCES profiles(id);

-- RLS : les articles perso ne sont visibles/modifiables que par leur propriétaire ;
-- les articles partagés (owner_id NULL) restent visibles à tout le foyer.
DROP POLICY "select" ON shopping_items;
DROP POLICY "insert" ON shopping_items;
DROP POLICY "update" ON shopping_items;
DROP POLICY "delete" ON shopping_items;

CREATE POLICY "select" ON shopping_items FOR SELECT
  USING (household_id = my_household_id() AND (owner_id IS NULL OR owner_id = auth.uid()));
CREATE POLICY "insert" ON shopping_items FOR INSERT
  WITH CHECK (household_id = my_household_id() AND (owner_id IS NULL OR owner_id = auth.uid()));
CREATE POLICY "update" ON shopping_items FOR UPDATE
  USING (household_id = my_household_id() AND (owner_id IS NULL OR owner_id = auth.uid()));
CREATE POLICY "delete" ON shopping_items FOR DELETE
  USING (household_id = my_household_id() AND (owner_id IS NULL OR owner_id = auth.uid()));
