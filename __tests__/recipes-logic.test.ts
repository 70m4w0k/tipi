import { canAdvanceStep, isLastStep, getInstanceProgress } from "../lib/recipes-logic";
import { Recipe, RecipeInstance, RecipeStep } from "../lib/types";

const step: RecipeStep = { title: "Étape", description: "", duration_hint: "" };

function makeRecipe(id: string, stepCount: number): Recipe {
  return {
    id,
    household_id: "h1",
    title: `Recipe ${id}`,
    description: "",
    ingredients: [],
    steps: Array.from({ length: stepCount }, (_, i) => ({
      ...step,
      title: `Étape ${i + 1}`,
    })),
    created_by: null,
    created_at: "",
  };
}

function makeInstance(id: string, recipeId: string, currentStep: number): RecipeInstance {
  return {
    id,
    household_id: "h1",
    recipe_id: recipeId,
    label: "Mon batch",
    current_step: currentStep,
    notes: "",
    started_at: "",
    step_started_at: "",
    created_at: "",
  };
}

describe("canAdvanceStep", () => {
  const recipes = [makeRecipe("r1", 4)];

  it("can advance from step 0 to 1", () => {
    const instances = [makeInstance("i1", "r1", 0)];
    const result = canAdvanceStep(instances, recipes, "i1");
    expect(result).toEqual({ canAdvance: true, nextStep: 1 });
  });

  it("can advance from step 2 to 3 (last step)", () => {
    const instances = [makeInstance("i1", "r1", 2)];
    const result = canAdvanceStep(instances, recipes, "i1");
    expect(result).toEqual({ canAdvance: true, nextStep: 3 });
  });

  it("cannot advance past the last step", () => {
    const instances = [makeInstance("i1", "r1", 3)];
    const result = canAdvanceStep(instances, recipes, "i1");
    expect(result).toEqual({ canAdvance: false, nextStep: 3 });
  });

  it("returns false for unknown instance", () => {
    const instances = [makeInstance("i1", "r1", 0)];
    const result = canAdvanceStep(instances, recipes, "unknown");
    expect(result).toEqual({ canAdvance: false, nextStep: -1 });
  });

  it("returns false for instance with missing recipe", () => {
    const instances = [makeInstance("i1", "unknown-recipe", 0)];
    const result = canAdvanceStep(instances, recipes, "i1");
    expect(result).toEqual({ canAdvance: false, nextStep: -1 });
  });

  it("handles single-step recipe", () => {
    const singleStepRecipes = [makeRecipe("r2", 1)];
    const instances = [makeInstance("i1", "r2", 0)];
    const result = canAdvanceStep(instances, singleStepRecipes, "i1");
    expect(result).toEqual({ canAdvance: false, nextStep: 0 });
  });
});

describe("isLastStep", () => {
  it("returns true on the last step", () => {
    const recipe = makeRecipe("r1", 3);
    const instance = makeInstance("i1", "r1", 2);
    expect(isLastStep(instance, recipe)).toBe(true);
  });

  it("returns false before the last step", () => {
    const recipe = makeRecipe("r1", 3);
    const instance = makeInstance("i1", "r1", 1);
    expect(isLastStep(instance, recipe)).toBe(false);
  });

  it("returns true on first step of a single-step recipe", () => {
    const recipe = makeRecipe("r1", 1);
    const instance = makeInstance("i1", "r1", 0);
    expect(isLastStep(instance, recipe)).toBe(true);
  });

  it("returns true when step index exceeds steps length", () => {
    const recipe = makeRecipe("r1", 2);
    const instance = makeInstance("i1", "r1", 5);
    expect(isLastStep(instance, recipe)).toBe(true);
  });
});

describe("getInstanceProgress", () => {
  it("computes progress at step 0 of 4", () => {
    const recipe = makeRecipe("r1", 4);
    const instance = makeInstance("i1", "r1", 0);
    const progress = getInstanceProgress(instance, recipe);
    expect(progress).toEqual({ current: 1, total: 4, percent: 25 });
  });

  it("computes progress at step 1 of 4", () => {
    const recipe = makeRecipe("r1", 4);
    const instance = makeInstance("i1", "r1", 1);
    const progress = getInstanceProgress(instance, recipe);
    expect(progress).toEqual({ current: 2, total: 4, percent: 50 });
  });

  it("computes 100% at last step", () => {
    const recipe = makeRecipe("r1", 4);
    const instance = makeInstance("i1", "r1", 3);
    const progress = getInstanceProgress(instance, recipe);
    expect(progress).toEqual({ current: 4, total: 4, percent: 100 });
  });

  it("computes progress for single-step recipe", () => {
    const recipe = makeRecipe("r1", 1);
    const instance = makeInstance("i1", "r1", 0);
    const progress = getInstanceProgress(instance, recipe);
    expect(progress).toEqual({ current: 1, total: 1, percent: 100 });
  });

  it("rounds percent to integer", () => {
    const recipe = makeRecipe("r1", 3);
    const instance = makeInstance("i1", "r1", 0);
    const progress = getInstanceProgress(instance, recipe);
    expect(progress).toEqual({ current: 1, total: 3, percent: 33 });
  });
});
