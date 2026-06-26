import { ChoreReminder, RecipeInstance, Recipe, RecipeStep } from "../lib/types";

type Notification = {
  id: string;
  text: string;
  route: string;
};

function buildNotifications(
  reminders: ChoreReminder[],
  instances: RecipeInstance[],
  recipes: Recipe[],
  today: string,
  matchesDay: (recurrence: string) => boolean
): Notification[] {
  const notifs: Notification[] = [];

  for (const r of reminders) {
    if (matchesDay(r.recurrence) && r.last_done_date !== today) {
      notifs.push({
        id: `reminder-${r.id}`,
        text: r.title,
        route: "/(app)/chores",
      });
    }
  }

  for (const inst of instances) {
    const recipe = recipes.find((rc) => rc.id === inst.recipe_id);
    if (!recipe) continue;
    if (inst.current_step >= recipe.steps.length - 1) {
      notifs.push({
        id: `recipe-${inst.id}`,
        text: `${inst.label} — dernière étape !`,
        route: "/(app)/recipes",
      });
    }
  }

  return notifs;
}

function makeReminder(
  id: string,
  title: string,
  recurrence: string,
  lastDone: string | null = null
): ChoreReminder {
  return { id, household_id: "h1", title, recurrence, last_done_date: lastDone };
}

const step: RecipeStep = { title: "Étape", description: "", duration_hint: "" };

function makeRecipe(id: string, stepCount: number): Recipe {
  return {
    id,
    household_id: "h1",
    title: `Recipe ${id}`,
    description: "",
    ingredients: [],
    steps: Array.from({ length: stepCount }, () => step),
    created_by: null,
    created_at: "",
  };
}

function makeInstance(
  id: string,
  recipeId: string,
  currentStep: number,
  label = "Mon batch"
): RecipeInstance {
  return {
    id,
    household_id: "h1",
    recipe_id: recipeId,
    label,
    current_step: currentStep,
    notes: "",
    started_at: "",
    step_started_at: "",
    created_at: "",
  };
}

describe("buildNotifications", () => {
  const today = "2026-06-24";
  const matchesAll = () => true;
  const matchesNone = () => false;

  it("shows undone reminders that match today", () => {
    const reminders = [makeReminder("r1", "Aspirateur", "lundi")];
    const notifs = buildNotifications(reminders, [], [], today, matchesAll);
    expect(notifs).toHaveLength(1);
    expect(notifs[0].text).toBe("Aspirateur");
    expect(notifs[0].route).toBe("/(app)/chores");
  });

  it("hides reminders already done today", () => {
    const reminders = [makeReminder("r1", "Aspirateur", "lundi", today)];
    const notifs = buildNotifications(reminders, [], [], today, matchesAll);
    expect(notifs).toHaveLength(0);
  });

  it("hides reminders that don't match today", () => {
    const reminders = [makeReminder("r1", "Aspirateur", "mardi")];
    const notifs = buildNotifications(reminders, [], [], today, matchesNone);
    expect(notifs).toHaveLength(0);
  });

  it("shows recipe instances on their last step", () => {
    const recipes = [makeRecipe("rec1", 3)];
    const instances = [makeInstance("i1", "rec1", 2)];
    const notifs = buildNotifications([], instances, recipes, today, matchesAll);
    expect(notifs).toHaveLength(1);
    expect(notifs[0].text).toContain("dernière étape");
    expect(notifs[0].route).toBe("/(app)/recipes");
  });

  it("does not show recipe instances not on last step", () => {
    const recipes = [makeRecipe("rec1", 3)];
    const instances = [makeInstance("i1", "rec1", 0)];
    const notifs = buildNotifications([], instances, recipes, today, matchesAll);
    expect(notifs).toHaveLength(0);
  });

  it("ignores instances with missing recipes", () => {
    const instances = [makeInstance("i1", "unknown", 5)];
    const notifs = buildNotifications([], instances, [], today, matchesAll);
    expect(notifs).toHaveLength(0);
  });

  it("combines reminders and recipe notifications", () => {
    const reminders = [makeReminder("r1", "Poubelles", "mercredi")];
    const recipes = [makeRecipe("rec1", 2)];
    const instances = [makeInstance("i1", "rec1", 1)];
    const notifs = buildNotifications(reminders, instances, recipes, today, matchesAll);
    expect(notifs).toHaveLength(2);
    expect(notifs[0].id).toBe("reminder-r1");
    expect(notifs[1].id).toBe("recipe-i1");
  });

  it("returns empty when nothing to show", () => {
    const notifs = buildNotifications([], [], [], today, matchesAll);
    expect(notifs).toHaveLength(0);
  });
});
