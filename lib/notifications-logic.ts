import { RecipeInstance, Recipe } from "./types";

export type Notification = {
  id: string;
  text: string;
  icon: string;
  route: string;
};

export function buildRecipeNotifications(
  instances: RecipeInstance[],
  recipes: Recipe[],
): Notification[] {
  const active = instances.filter((inst) => {
    if (inst.completed_at) return false;
    const recipe = recipes.find((rc) => rc.id === inst.recipe_id);
    return recipe && inst.current_step >= recipe.steps.length - 1;
  });

  if (active.length === 0) return [];

  const label = active.length === 1
    ? `${active[0].label} — dernière étape !`
    : `${active.length} recettes à la dernière étape`;

  return [{
    id: "recipe-last-step",
    text: label,
    icon: "restaurant-outline",
    route: "/(app)/recipes",
  }];
}
