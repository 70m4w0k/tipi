import { Recipe, RecipeInstance, Ingredient } from "./types";

/** Met une quantité à l'échelle du nombre de portions cible (arrondi à 2 décimales) */
export function scaleAmount(amount: number, baseServings: number, targetServings: number): number {
  if (baseServings <= 0) return amount;
  return Math.round(amount * (targetServings / baseServings) * 100) / 100;
}

/** Quantité affichable : "400 g", "2 c. à s.", "1", ou l'unité seule si amount null ("à volonté") */
export function formatQuantity(amount: number | null, unit: string): string {
  const u = unit.trim();
  if (amount == null) return u;
  const a = Number.isInteger(amount) ? String(amount) : String(amount);
  return u ? `${a} ${u}` : a;
}

export type ShoppingAddition = {
  name: string;
  quantity: string; // mise à l'échelle + formatée
  alreadyInList: boolean;
};

function normalizeName(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * Prépare la checklist d'ajout aux courses : quantités mises à l'échelle des
 * portions cible, et articles déjà présents dans les courses repérés (par nom).
 */
export function computeShoppingAdditions(
  ingredients: Ingredient[],
  baseServings: number,
  targetServings: number,
  existingTitles: string[]
): ShoppingAddition[] {
  const taken = new Set(existingTitles.map(normalizeName));
  return ingredients
    .filter((i) => i.name.trim().length > 0)
    .map((i) => {
      const amount = i.amount != null ? scaleAmount(i.amount, baseServings, targetServings) : null;
      return {
        name: i.name.trim(),
        quantity: formatQuantity(amount, i.unit),
        alreadyInList: taken.has(normalizeName(i.name)),
      };
    });
}

export function canAdvanceStep(
  instances: RecipeInstance[],
  recipes: Recipe[],
  instanceId: string
): { canAdvance: boolean; nextStep: number } {
  const inst = instances.find((i) => i.id === instanceId);
  if (!inst) return { canAdvance: false, nextStep: -1 };

  const recipe = recipes.find((r) => r.id === inst.recipe_id);
  if (!recipe) return { canAdvance: false, nextStep: -1 };

  const nextStep = inst.current_step + 1;
  if (nextStep >= recipe.steps.length) {
    return { canAdvance: false, nextStep: inst.current_step };
  }

  return { canAdvance: true, nextStep };
}

export function isLastStep(
  instance: RecipeInstance,
  recipe: Recipe
): boolean {
  return instance.current_step >= recipe.steps.length - 1;
}

export function getInstanceProgress(
  instance: RecipeInstance,
  recipe: Recipe
): { current: number; total: number; percent: number } {
  const total = recipe.steps.length;
  const current = instance.current_step + 1;
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;
  return { current, total, percent };
}
