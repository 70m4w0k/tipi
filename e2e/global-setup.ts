import { ensureMainUser, ensureFixtureHousehold } from "./fixtures";

// Crée les comptes/households de base avant toute la suite (via signUp).
// Rend les tests indépendants de tout compte pré-existant → OK en local et en cloud.
export default async function globalSetup() {
  await ensureMainUser();
  await ensureFixtureHousehold();
}
