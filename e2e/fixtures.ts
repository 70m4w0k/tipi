import { createClient, SupabaseClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Comptes de test dédiés (créés à la volée via signUp, auto-confirmés).
export const FIX_PW = "azertyuiop";
export const MAIN_EMAIL = "e2e-main@test.com";   // utilisateur principal (login par défaut), a un household
export const SOLO_EMAIL = "e2e-solo@test.com";   // jamais de household
export const ADMIN_EMAIL = "e2e-admin@test.com"; // admin du household fixture
export const MEMBER_EMAIL = "e2e-member@test.com"; // membre du household fixture
export const LEAVER_EMAIL = "e2e-leaver@test.com"; // possède son propre household jetable
export const DELETER_EMAIL = "e2e-deleter@test.com"; // admin d'un household jetable à supprimer

async function clientFor(email: string): Promise<{ c: SupabaseClient; uid: string }> {
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  let r = await c.auth.signInWithPassword({ email, password: FIX_PW });
  if (r.error) {
    const su = await c.auth.signUp({ email, password: FIX_PW });
    if (su.error && !/already/i.test(su.error.message)) throw su.error;
    r = await c.auth.signInWithPassword({ email, password: FIX_PW });
    if (r.error) throw new Error(`fixture login ${email}: ${r.error.message}`);
  }
  return { c, uid: r.data.user!.id };
}

/** Garantit que l'utilisateur principal existe et possède un household. */
export async function ensureMainUser(): Promise<void> {
  const { c, uid } = await clientFor(MAIN_EMAIL);
  const { data } = await c.from("profiles").select("household_id").eq("id", uid).single();
  if (!data?.household_id) {
    const { data: h } = await c.from("households").insert({ name: "E2E-Main" }).select().single();
    await c.from("profiles").update({ household_id: h!.id }).eq("id", uid);
  }
  await c.auth.signOut();
}

/** Remet l'utilisateur solo SANS household (et purge les colocs qu'il a créées). */
export async function resetSolo(): Promise<void> {
  const { c, uid } = await clientFor(SOLO_EMAIL);
  await c.from("profiles").update({ household_id: null }).eq("id", uid);
  await c.from("households").delete().like("name", "E2E-solo%");
  await c.auth.signOut();
}

/**
 * Garantit un household fixture avec admin + membre (rôle « member » réinitialisé).
 * Réutilise le household existant de l'admin s'il y en a un.
 */
export async function ensureFixtureHousehold(): Promise<{
  householdId: string;
  inviteCode: string;
  adminUid: string;
  memberUid: string;
}> {
  const { c: ac, uid: adminUid } = await clientFor(ADMIN_EMAIL);
  const { data: ap } = await ac.from("profiles").select("household_id").eq("id", adminUid).single();
  let householdId = (ap?.household_id as string | null) ?? "";
  if (!householdId) {
    const { data: h, error } = await ac.from("households").insert({ name: "E2E-Fixture" }).select().single();
    if (error || !h) throw new Error(`création household fixture: ${error?.message}`);
    householdId = h.id as string;
    await ac.from("profiles").update({ household_id: householdId }).eq("id", adminUid);
  }
  const { data: h2 } = await ac.from("households").select("invite_code").eq("id", householdId).single();
  const inviteCode = h2!.invite_code as string;

  // Le membre (re)joint lui-même (RLS : l'admin ne peut pas ré-ajouter un membre sorti).
  const { c: mc, uid: memberUid } = await clientFor(MEMBER_EMAIL);
  await mc.from("profiles").update({ household_id: householdId }).eq("id", memberUid);
  await mc.auth.signOut();
  // L'admin réinitialise le rôle du membre à « member ».
  await ac.from("profiles").update({ role: "member" }).eq("id", memberUid);
  await ac.auth.signOut();

  return { householdId, inviteCode, adminUid, memberUid };
}

/** Garantit que le leaver possède un household (en recrée un s'il l'a quitté). */
export async function resetLeaver(): Promise<void> {
  const { c, uid } = await clientFor(LEAVER_EMAIL);
  const { data } = await c.from("profiles").select("household_id").eq("id", uid).single();
  if (!data?.household_id) {
    const { data: h } = await c.from("households").insert({ name: "E2E-Leaver" }).select().single();
    await c.from("profiles").update({ household_id: h!.id }).eq("id", uid);
  }
  await c.auth.signOut();
}

/** Garantit que le deleter est admin d'un household jetable (recréé s'il l'a supprimé). */
export async function resetDeleter(): Promise<void> {
  const { c, uid } = await clientFor(DELETER_EMAIL);
  const { data } = await c.from("profiles").select("household_id").eq("id", uid).single();
  if (!data?.household_id) {
    const { data: h } = await c.from("households").insert({ name: "E2E-Deleter" }).select().single();
    await c.from("profiles").update({ household_id: h!.id }).eq("id", uid);
  }
  await c.auth.signOut();
}

/** Ajoute un membre en attente au household fixture (pour l'écran claim). */
export async function seedPending(householdId: string, name: string): Promise<void> {
  const { c } = await clientFor(ADMIN_EMAIL);
  await c.from("pending_members").insert({ household_id: householdId, display_name: name });
  await c.auth.signOut();
}
