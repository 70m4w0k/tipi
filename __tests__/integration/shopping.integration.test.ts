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

describe("Shopping list integration", () => {
  let itemId: string;

  it("adds an item", async () => {
    const { data, error } = await testSupabase
      .from("shopping_items")
      .insert({
        household_id: householdId,
        title: "Lait",
        category: "frais",
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data!.title).toBe("Lait");
    expect(data!.checked).toBe(false);
    itemId = data!.id;
  });

  it("toggles item checked state", async () => {
    const { data, error } = await testSupabase
      .from("shopping_items")
      .update({ checked: true })
      .eq("id", itemId)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data!.checked).toBe(true);
  });

  it("lists items ordered by checked then created_at", async () => {
    await testSupabase
      .from("shopping_items")
      .insert({ household_id: householdId, title: "Pain", category: "" });

    const { data, error } = await testSupabase
      .from("shopping_items")
      .select("*")
      .eq("household_id", householdId)
      .order("checked", { ascending: true })
      .order("created_at", { ascending: false });

    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThanOrEqual(2);
    expect(data![0].checked).toBe(false);
  });

  it("deletes checked items in bulk", async () => {
    const { error } = await testSupabase
      .from("shopping_items")
      .delete()
      .eq("household_id", householdId)
      .eq("checked", true);

    expect(error).toBeNull();

    const { data } = await testSupabase
      .from("shopping_items")
      .select("*")
      .eq("household_id", householdId)
      .eq("checked", true);

    expect(data).toEqual([]);
  });

  it("deletes a single item", async () => {
    const { data: remaining } = await testSupabase
      .from("shopping_items")
      .select("*")
      .eq("household_id", householdId);

    if (remaining && remaining.length > 0) {
      const { error } = await testSupabase
        .from("shopping_items")
        .delete()
        .eq("id", remaining[0].id);

      expect(error).toBeNull();
    }
  });
});
