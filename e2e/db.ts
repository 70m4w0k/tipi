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
  await c.from("chores").delete().like("task_name", like);
  await c.from("chore_tasks").delete().like("name", like);
  await c.from("expenses").delete().like("title", like);
  await c.from("recipes").delete().like("title", like);
  await c.auth.signOut();
}

// Préfixe partagé par toutes les specs P1 pour reconnaître/purger les données de test.
export const TEST_PREFIX = "E2E-";
