import { createClient, SupabaseClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import path from "path";
import { TEST_EMAIL, TEST_PASSWORD } from "./helpers";

// Charge EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY depuis .env (projet, indépendant du user).
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * Client Supabase authentifié comme l'utilisateur de test, pour le nettoyage
 * en teardown. Nécessaire car plusieurs suppressions passent par Alert.alert
 * (no-op sur le web) — impossible de nettoyer via l'UI.
 */
async function client(): Promise<SupabaseClient> {
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email: TEST_EMAIL, password: TEST_PASSWORD });
  if (error) throw new Error(`db login échoué : ${error.message}`);
  return c;
}

/**
 * Supprime toutes les données de test créées par les specs (identifiées par un
 * préfixe unique). RLS limite au household de l'utilisateur de test. À appeler
 * en afterAll — nettoie aussi les restes d'un run précédent échoué.
 */
export async function cleanupByPrefix(prefix: string): Promise<void> {
  const c = await client();
  const like = `${prefix}%`;
  // recipes -> recipe_instances et expenses -> expense_participants cascadent (ON DELETE CASCADE).
  await c.from("shopping_items").delete().like("title", like);
  // exercises -> exercise_logs, exercise_badges, temporal_badges (et user_badges via badges) cascadent.
  await c.from("exercises").delete().like("name", like);
  await c.from("chores").delete().like("task_name", like);
  await c.from("chore_tasks").delete().like("name", like);
  await c.from("chore_reminders").delete().like("title", like);
  await c.from("expenses").delete().like("title", like);
  await c.from("recipes").delete().like("title", like);
  await c.from("events").delete().like("title", like);
  await c.from("pending_members").delete().like("display_name", like);
  await c.from("messages").delete().like("content", like);
  await c.from("messages").delete().filter("poll->>question", "like", like);
  await c.auth.signOut();
}

// Préfixe partagé par toutes les specs pour reconnaître/purger les données de test.
export const TEST_PREFIX = "E2E-";

/**
 * Insère une recette (étapes sans durée -> planifiable à n'importe quelle date).
 * Utile pour tester la planification calendrier sans dépendre de l'UI recettes.
 * Nettoyée par cleanupByPrefix si le titre porte TEST_PREFIX.
 */
export async function seedRecipe(title: string): Promise<void> {
  const c = await client();
  const { data: u } = await c.auth.getUser();
  const { data: prof } = await c.from("profiles").select("household_id").eq("id", u.user!.id).single();
  await c.from("recipes").insert({
    household_id: prof!.household_id,
    title,
    description: "",
    icon: null,
    ingredients: [],
    steps: [{ title: "Etape", description: "", duration_value: 0, duration_unit: "minutes" }],
  });
  await c.auth.signOut();
}
