import {
  testSupabase,
  setupTestUser,
  setupTestHousehold,
  cleanupTestData,
  getTestUserId,
  getTestHouseholdId,
} from "./supabase-client";

let userId: string;
let householdId: string;

beforeAll(async () => {
  userId = await setupTestUser();
  householdId = await setupTestHousehold();
}, 15000);

afterAll(async () => {
  await cleanupTestData();
}, 15000);

describe("Chores integration", () => {
  let taskId: string;

  it("creates a chore task", async () => {
    const { data, error } = await testSupabase
      .from("chore_tasks")
      .insert({ household_id: householdId, name: "Aspirateur", show_in_grid: true })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data!.name).toBe("Aspirateur");
    expect(data!.show_in_grid).toBe(true);
    taskId = data!.id;
  });

  it("creates a chore entry with intensity", async () => {
    const { data, error } = await testSupabase
      .from("chores")
      .insert({
        household_id: householdId,
        user_id: userId,
        task_name: "Aspirateur",
        week: 26,
        year: 2026,
        intensity: 1,
        performed_at: new Date().toISOString(),
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data!.intensity).toBe(1);
  });

  it("updates chore intensity", async () => {
    const { data: existing } = await testSupabase
      .from("chores")
      .select("*")
      .eq("household_id", householdId)
      .eq("task_name", "Aspirateur")
      .single();

    const { data, error } = await testSupabase
      .from("chores")
      .update({ intensity: 2 })
      .eq("id", existing!.id)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data!.intensity).toBe(2);
  });

  it("reads chore tasks filtered by household", async () => {
    const { data, error } = await testSupabase
      .from("chore_tasks")
      .select("*")
      .eq("household_id", householdId);

    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThanOrEqual(1);
    expect(data!.some((t: any) => t.name === "Aspirateur")).toBe(true);
  });

  it("creates and reads a chore reminder", async () => {
    const { data: created, error: createErr } = await testSupabase
      .from("chore_reminders")
      .insert({
        household_id: householdId,
        title: "Sortir poubelles",
        recurrence: "lundi, jeudi",
      })
      .select()
      .single();

    expect(createErr).toBeNull();
    expect(created!.title).toBe("Sortir poubelles");

    const { data: toggled, error: toggleErr } = await testSupabase
      .from("chore_reminders")
      .update({ last_done_date: "2026-06-24" })
      .eq("id", created!.id)
      .select()
      .single();

    expect(toggleErr).toBeNull();
    expect(toggled!.last_done_date).toBe("2026-06-24");
  });

  it("toggles task visibility", async () => {
    const { data, error } = await testSupabase
      .from("chore_tasks")
      .update({ show_in_grid: false })
      .eq("id", taskId)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data!.show_in_grid).toBe(false);
  });

  it("deletes chore entries and task", async () => {
    await testSupabase
      .from("chores")
      .delete()
      .eq("household_id", householdId)
      .eq("task_name", "Aspirateur");

    const { error } = await testSupabase
      .from("chore_tasks")
      .delete()
      .eq("id", taskId);

    expect(error).toBeNull();

    const { data: remaining } = await testSupabase
      .from("chore_tasks")
      .select("*")
      .eq("id", taskId);

    expect(remaining).toEqual([]);
  });
});
