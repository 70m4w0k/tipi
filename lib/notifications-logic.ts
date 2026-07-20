import { RecipeInstance, Recipe, TemporalBadge } from "./types";

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

/** Notifications sport : titres temporels portés par la période de grâce */
export function buildSportNotifications(
  threatened: { badge: TemporalBadge; missing: number }[],
  exercises: { id: string; unit: string }[],
): Notification[] {
  return threatened.map(({ badge, missing }) => ({
    id: `sport-threat-${badge.id}`,
    text: `Encore ${missing} ${exercises.find((e) => e.id === badge.exercise_id)?.unit ?? "répétitions"} pour garder « ${badge.title} »`,
    icon: "flame-outline",
    route: "/(app)/sport",
  }));
}
