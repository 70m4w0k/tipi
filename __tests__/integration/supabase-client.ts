import { createClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY.\n" +
    "Set them in .env or export them before running integration tests."
  );
}

export const testSupabase = createClient(url, key, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const testEmail = process.env.TEST_USER_EMAIL || `test-${Date.now()}@tipi-test.local`;
const testPassword = process.env.TEST_USER_PASSWORD || "Test1234!";
const useExistingUser = !!(process.env.TEST_USER_EMAIL && process.env.TEST_USER_PASSWORD);

let testUserId: string | null = null;
let testHouseholdId: string | null = null;

export async function setupTestUser() {
  if (useExistingUser) {
    const { data, error } = await testSupabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
    if (error) throw new Error(`Failed to sign in test user: ${error.message}`);
    testUserId = data.user?.id ?? null;
  } else {
    const { data, error } = await testSupabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });
    if (error) throw new Error(`Failed to create test user: ${error.message}`);
    testUserId = data.user?.id ?? null;
  }
  if (!testUserId) throw new Error("No user ID returned");

  await testSupabase
    .from("profiles")
    .update({ display_name: "Test User", color: "#2563EB" })
    .eq("id", testUserId);

  return testUserId;
}

export async function setupTestHousehold(): Promise<string> {
  if (!testUserId) throw new Error("Call setupTestUser first");

  const { data, error } = await testSupabase
    .from("households")
    .insert({ name: `Test Coloc ${Date.now()}` })
    .select()
    .single();
  if (error) throw new Error(`Failed to create household: ${error.message}`);
  testHouseholdId = data.id;

  await testSupabase
    .from("profiles")
    .update({ household_id: testHouseholdId })
    .eq("id", testUserId);

  return testHouseholdId!;
}

export async function cleanupTestData() {
  if (testHouseholdId) {
    await testSupabase.from("chores").delete().eq("household_id", testHouseholdId);
    await testSupabase.from("chore_tasks").delete().eq("household_id", testHouseholdId);
    await testSupabase.from("chore_reminders").delete().eq("household_id", testHouseholdId);
    await testSupabase.from("shopping_items").delete().eq("household_id", testHouseholdId);
    await testSupabase.from("recipes").delete().eq("household_id", testHouseholdId);
    await testSupabase.from("recipe_instances").delete().eq("household_id", testHouseholdId);
    await testSupabase.from("expenses").delete().eq("household_id", testHouseholdId);
    await testSupabase.from("shared_files").delete().eq("household_id", testHouseholdId);
    await testSupabase.from("profiles").update({ household_id: null }).eq("id", testUserId!);
    await testSupabase.from("households").delete().eq("id", testHouseholdId);
  }
}

export function getTestUserId() {
  return testUserId!;
}

export function getTestHouseholdId() {
  return testHouseholdId!;
}
