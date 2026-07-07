import { buildRecipeNotifications } from "../lib/notifications-logic";
import { RecipeInstance, Recipe, RecipeStep } from "../lib/types";

const step: RecipeStep = { title: "Étape", description: "", duration_value: 0, duration_unit: "minutes" };

function makeRecipe(id: string, stepCount: number): Recipe {
  return {
    id,
    household_id: "h1",
    title: `Recipe ${id}`,
    description: "",
    ingredients: [],
    steps: Array.from({ length: stepCount }, () => step),
    icon: null,
    created_by: null,
    created_at: "",
  };
}

function makeInstance(
  id: string,
  recipeId: string,
  currentStep: number,
  label = "Mon batch",
  completedAt: string | null = null,
): RecipeInstance {
  return {
    id,
    household_id: "h1",
    recipe_id: recipeId,
    label,
    current_step: currentStep,
    notes: "",
    target_date: null,
    step_completions: [],
    started_at: "",
    step_started_at: "",
    completed_at: completedAt,
    created_at: "",
  };
}

describe("buildRecipeNotifications", () => {
  it("returns notification when instance is on last step", () => {
    const recipes = [makeRecipe("r1", 3)];
    const instances = [makeInstance("i1", "r1", 2)];
    const notifs = buildRecipeNotifications(instances, recipes);
    expect(notifs).toHaveLength(1);
    expect(notifs[0].text).toContain("dernière étape");
    expect(notifs[0].route).toBe("/(app)/recipes");
  });

  it("does not notify for instances not on last step", () => {
    const recipes = [makeRecipe("r1", 3)];
    const instances = [makeInstance("i1", "r1", 0)];
    expect(buildRecipeNotifications(instances, recipes)).toHaveLength(0);
  });

  it("ignores completed instances", () => {
    const recipes = [makeRecipe("r1", 3)];
    const instances = [makeInstance("i1", "r1", 2, "Mon batch", "2026-07-01T00:00:00Z")];
    expect(buildRecipeNotifications(instances, recipes)).toHaveLength(0);
  });

  it("ignores instances with missing recipes", () => {
    const instances = [makeInstance("i1", "unknown", 5)];
    expect(buildRecipeNotifications(instances, [])).toHaveLength(0);
  });

  it("groups multiple last-step instances into one notification", () => {
    const recipes = [makeRecipe("r1", 2), makeRecipe("r2", 1)];
    const instances = [
      makeInstance("i1", "r1", 1, "Batch A"),
      makeInstance("i2", "r2", 0, "Batch B"),
    ];
    const notifs = buildRecipeNotifications(instances, recipes);
    expect(notifs).toHaveLength(1);
    expect(notifs[0].text).toContain("2 recettes");
  });

  it("returns empty when no instances", () => {
    expect(buildRecipeNotifications([], [])).toHaveLength(0);
  });

  it("single instance shows its label", () => {
    const recipes = [makeRecipe("r1", 1)];
    const instances = [makeInstance("i1", "r1", 0, "Kimchi maison")];
    const notifs = buildRecipeNotifications(instances, recipes);
    expect(notifs[0].text).toContain("Kimchi maison");
  });
});
