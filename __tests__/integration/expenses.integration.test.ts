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

describe("Expenses integration", () => {
  let expenseId: string;

  it("creates an expense", async () => {
    const { data, error } = await testSupabase
      .from("expenses")
      .insert({
        household_id: householdId,
        title: "Courses Lidl",
        amount: 45.5,
        payer_id: userId,
        category: "courses",
        note: "courses de la semaine",
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data!.title).toBe("Courses Lidl");
    expect(data!.amount).toBe(45.5);
    expect(data!.category).toBe("courses");
    expenseId = data!.id;
  });

  it("creates expense participants", async () => {
    const { error } = await testSupabase
      .from("expense_participants")
      .insert([
        { expense_id: expenseId, user_id: userId },
      ]);

    expect(error).toBeNull();
  });

  it("reads expense with participants", async () => {
    const { data: expense } = await testSupabase
      .from("expenses")
      .select("*")
      .eq("id", expenseId)
      .single();

    const { data: participants } = await testSupabase
      .from("expense_participants")
      .select("user_id")
      .eq("expense_id", expenseId);

    expect(expense!.title).toBe("Courses Lidl");
    expect(participants!.length).toBe(1);
    expect(participants![0].user_id).toBe(userId);
  });

  it("deletes expense cascades participants", async () => {
    const { error } = await testSupabase
      .from("expenses")
      .delete()
      .eq("id", expenseId);

    expect(error).toBeNull();

    const { data: remainingParticipants } = await testSupabase
      .from("expense_participants")
      .select("*")
      .eq("expense_id", expenseId);

    expect(remainingParticipants).toEqual([]);
  });
});
