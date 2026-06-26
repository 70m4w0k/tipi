import { Recipe, RecipeInstance } from "./types";

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
