import {
  testSupabase,
  setupTestUser,
  setupTestHousehold,
  cleanupTestData,
  getTestHouseholdId,
} from "./supabase-client";

let householdId: string;

beforeAll(async () => {
  await setupTestUser();
  householdId = await setupTestHousehold();
}, 15000);

afterAll(async () => {
  await cleanupTestData();
}, 15000);

describe("Recipes integration", () => {
  let recipeId: string;
  let instanceId: string;

  it("creates a recipe", async () => {
    const { data, error } = await testSupabase
      .from("recipes")
      .insert({
        household_id: householdId,
        title: "Pain maison",
        description: "Pain au levain",
        ingredients: ["farine", "eau", "sel", "levain"],
        steps: [
          { title: "Mélanger", description: "Mélanger les ingrédients", duration_value: 10, duration_unit: "minutes" },
          { title: "Pétrir", description: "Pétrir la pâte", duration_value: 15, duration_unit: "minutes" },
          { title: "Repos", description: "Laisser lever", duration_value: 4, duration_unit: "hours" },
          { title: "Cuisson", description: "Enfourner à 240°", duration_value: 35, duration_unit: "minutes" },
        ],
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data!.title).toBe("Pain maison");
    expect(data!.steps).toHaveLength(4);
    expect(data!.ingredients).toContain("levain");
    recipeId = data!.id;
  });

  it("starts a recipe instance", async () => {
    const now = new Date().toISOString();
    const { data, error } = await testSupabase
      .from("recipe_instances")
      .insert({
        household_id: householdId,
        recipe_id: recipeId,
        label: "Pain du dimanche",
        notes: "",
        started_at: now,
        step_started_at: now,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data!.current_step).toBe(0);
    expect(data!.label).toBe("Pain du dimanche");
    instanceId = data!.id;
  });

  it("advances instance step", async () => {
    const { data, error } = await testSupabase
      .from("recipe_instances")
      .update({ current_step: 1, step_started_at: new Date().toISOString() })
      .eq("id", instanceId)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data!.current_step).toBe(1);
  });

  it("updates instance notes", async () => {
    const { data, error } = await testSupabase
      .from("recipe_instances")
      .update({ notes: "Pâte un peu liquide, ajouter farine" })
      .eq("id", instanceId)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data!.notes).toBe("Pâte un peu liquide, ajouter farine");
  });

  it("reads recipe with its instances", async () => {
    const { data: recipe } = await testSupabase
      .from("recipes")
      .select("*")
      .eq("id", recipeId)
      .single();

    const { data: instances } = await testSupabase
      .from("recipe_instances")
      .select("*")
      .eq("recipe_id", recipeId);

    expect(recipe!.title).toBe("Pain maison");
    expect(instances!.length).toBe(1);
    expect(instances![0].current_step).toBe(1);
  });

  it("deletes instance (complete)", async () => {
    const { error } = await testSupabase
      .from("recipe_instances")
      .delete()
      .eq("id", instanceId);

    expect(error).toBeNull();
  });

  it("updates recipe", async () => {
    const { data, error } = await testSupabase
      .from("recipes")
      .update({ title: "Pain au levain maison" })
      .eq("id", recipeId)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data!.title).toBe("Pain au levain maison");
  });

  it("deletes recipe", async () => {
    const { error } = await testSupabase
      .from("recipes")
      .delete()
      .eq("id", recipeId);

    expect(error).toBeNull();

    const { data } = await testSupabase
      .from("recipes")
      .select("*")
      .eq("id", recipeId);

    expect(data).toEqual([]);
  });
});
