# Couverture E2E — Interactions par page

Inventaire de **toutes les interactions utilisateur** de l'app, avec l'état de couverture
Playwright actuel. Objectif : choisir lesquelles ajouter aux tests de non-régression avant
de les intégrer au workflow de déploiement.

Légende : ✅ couvert · ⬜ non couvert · 🔒 difficile à tester sur web (natif : image picker,
partage, fichiers, haptique).

> **État actuel : voir la table « Déjà couvert » ci-dessous** (source de vérité). Les tables
> détaillées par page qui suivent sont l'**inventaire initial** des interactions (avant écriture
> des tests) et ne sont pas maintenues case par case.

## Déjà couvert (`e2e/`) — 40 tests, 100 % verts

| Spec | Tests |
|------|-------|
| `auth.spec.ts` | login s'affiche · login valide · identifiants invalides · formulaire vide |
| `login.spec.ts` | bascule login↔inscription · inscription sans nom · lien magique sans email |
| `navigation.spec.ts` | barre d'onglets visible après login |
| `onboarding.spec.ts` | `/invite?code=` → login · `/join` → login |
| `home.spec.ts` | carte Courses → liste · bouton profil → paramètres · tuile → page non-onglet |
| `shopping.spec.ts` | ajouter · cocher · supprimer (appui long) · vider les cochés |
| `chores.spec.ts` | onglet · ajouter tâche · cellule · renommer · masquer/afficher · supprimer · **tâche récurrente + cocher rappel** |
| `expenses.spec.ts` | bascule onglets · ajouter · vue Bilans · supprimer |
| `chat.spec.ts` | envoyer message · réagir · retour · créer sondage + voter |
| `calendar.spec.ts` | ajouter/filtrer/supprimer événement · planifier une recette |
| `recipes.spec.ts` | créer · déplier · lancer · avancer/revenir/terminer · notes · modifier |
| `profile.spec.ts` | thème · config nav · éditer profil · tutoriel · membres en attente · renommer coloc · régénérer (annuler) · déconnexion |
| `onboarding-flow.spec.ts` | créer une coloc · rejoindre via code → claim · claim (membre pré-ajouté) |
| `household-leave.spec.ts` | quitter la coloc → onboarding |
| `household-members.spec.ts` | promouvoir/rétrograder · **exclure un membre** |
| `household-delete.spec.ts` | **supprimer la coloc** → onboarding |

**48 tests, 100 % verts.**

**Infra tests** : `e2e/helpers.ts` (login + neutralisation onboarding), `e2e/db.ts` (nettoyage
Supabase + seed), `e2e/fixtures.ts` (comptes créés via `signUp` : solo sans household,
admin+membre, leaver, deleter ; households fixtures réinitialisés en `beforeEach`). `testID` sur
tous les éléments sans texte.

### Non couvert et pourquoi

| Interaction | Raison |
|-------------|--------|
| Documents : importer / ouvrir / supprimer | Import = picker natif 🔒 → impossible de créer un doc à supprimer |
| Supprimer une **recette** (appui long) | La carte est navigable : en web headless l'appui long déclenche la navigation |
| Envoi effectif du lien magique | Rate-limit email Supabase → instable |
| Courses : suggestions, « J'y vais », états vides | Dépendent de données seedées / historique ; faible valeur |
| Ménage : « une semaine sur deux » (biweekly) | Non asserté (la récurrence hebdo + rappel sont couverts) |
| Partage (`Share`), image picker, `Linking`, drag&drop, haptique | 🔒 natif, non simulable en web headless |

### Corrections apportées pendant l'écriture des tests

- **recipes.icon** manquant en base → création de recette cassée (migration appliquée).
- **useEvents** : ajout/suppression ne rafraîchissaient que via realtime (fragile) → refetch + dédup.
- **useMessages** : envoi ne rafraîchissait que via realtime → refetch après insert.
- **ProfileSettings** : le champ de renommage coloc ne se pré-remplissait pas avec le nom actuel.
- **join → claim** : après un join manuel, un `useEffect` redirigeait vers l'accueil avant `/claim`
  (écran d'identité inatteignable) → garde `autoJoining` posé avant le refresh.
- **createHousehold / joinHousehold** : crash `Cannot read properties of null` si `profile` non
  chargé au clic → garde-fou `if (!profile) return`.
- **Exclusion de membre cassée en prod** : le RLS applique le `USING` (`household_id = my_household_id()`)
  de `admin_update_member` à la nouvelle ligne → un admin ne peut jamais mettre `household_id = null`.
  Corrigé par une fonction `SECURITY DEFINER` `kick_member()` (`migration_kick_member_rpc.sql`).
- **Suppression de coloc cassée en prod** : `deleteHousehold` nullait les membres puis le `DELETE`
  ne matchait plus le RLS (coloc fantôme) ; en plus les FK des données bloquaient. Corrigé par
  `delete_household()` (`SECURITY DEFINER`, purge complète, `migration_delete_household.sql`) + refresh
  du profil après suppression (sinon l'index restait sur l'accueil).
- **Alert.alert** partout → `ConfirmDialog` / `ErrorBanner` (no-op web).

**`Alert.alert` supprimé** (2026-07-07) : toutes les confirmations passent désormais par le
composant `ConfirmDialog` et les erreurs par `ErrorBanner` (inline). Les suppressions
(courses/dépenses/documents), auparavant 🔒 car `Alert` est un no-op web, sont donc maintenant
testables.

### Bug trouvé par les tests P1 (corrigé)

**Création de recette cassée en prod.** La table `recipes` déployée n'avait pas la colonne `icon`
(présente dans `schema.sql` mais migration jamais appliquée). `addRecipe` envoyait `icon: null` →
PostgREST rejetait l'INSERT → la recette n'était jamais créée, **sans message d'erreur**.
✅ Corrigé le 2026-07-07 via `supabase/migration_recipes_icon.sql`. `recipes.spec.ts` passe.

---

## 1. Login — `app/(auth)/login.tsx`

| Interaction | État |
|-------------|------|
| Se connecter (email + mdp) | ✅ |
| Erreur identifiants invalides | ✅ |
| Champs vides → message d'erreur | ✅ |
| Basculer login ↔ inscription ("Créer un compte") | ✅ |
| Inscription : nom vide → erreur | ✅ |
| Inscription complète → crée le compte | ⬜ (créerait un vrai compte) |
| "Recevoir un lien de connexion" (magic link) sans email → erreur | ✅ |
| Magic link avec email → confirmation "Lien envoyé" | ⬜ (rate-limit email) |

## 2. Join / Créer coloc — `app/(auth)/join.tsx`

| Interaction | État |
|-------------|------|
| Redirection login si pas de session | ✅ |
| Créer une coloc sans nom → erreur | ⬜ |
| Créer une coloc → affiche le code d'invitation | ✅ |
| Rejoindre sans code → erreur | ⬜ |
| Rejoindre avec code invalide → erreur | ⬜ |
| Rejoindre avec code valide → redirige vers `/claim` | ✅ |
| Auto-join via code d'invitation en attente | ⬜ |
| Se déconnecter | ⬜ |

## 3. Claim / Identité — `app/(auth)/claim.tsx`

| Interaction | État |
|-------------|------|
| Sélectionner un membre pré-ajouté | ✅ |
| Choisir une couleur (désélection possible) | ⬜ |
| Couleur déjà prise → non sélectionnable | ⬜ |
| "C'est moi !" / "Continuer" → home (auto-couleur si aucune) | ✅ |
| "Je ne suis pas dans la liste" (skip) | ⬜ |

## 4. Accueil — `app/(app)/home.tsx`

| Interaction | État |
|-------------|------|
| Carte "Courses" → navigue vers /shopping | ✅ |
| Bouton profil → /other | ✅ |
| Rappels du jour : cocher fait/pas fait | ⬜ (données à seeder) |
| Notification recette → navigue vers /recipes | ⬜ (données à seeder) |
| Fermer (dismiss) une notification | ⬜ (données à seeder) |
| Carte "Invite tes colocs" (Share) | 🔒 |
| Tuiles d'accès rapide (pages hors nav) → navigation | ✅ |
| Pull-to-refresh | ⬜ |

## 5. Courses — `app/(app)/shopping.tsx`

| Interaction | État |
|-------------|------|
| Ajouter un article (bouton +) | ⬜ (couvert via Entrée) |
| Ajouter via "Entrée" (submit) | ✅ |
| Aperçu de catégorie auto pendant la saisie | ⬜ |
| Ajouter depuis une suggestion (chip) | ⬜ (historique) |
| Cocher / décocher un article | ✅ |
| Supprimer un article (appui long → ConfirmDialog) | ✅ |
| Vider les articles cochés (ConfirmDialog) | ✅ |
| "J'y vais !" → poste un message dans le chat + mode courses | ⬜ (message non nettoyable) |
| "Courses terminées" | ⬜ |
| État vide affiché | ⬜ |

## 6. Ménage — `app/(app)/chores.tsx`

| Interaction | État |
|-------------|------|
| Onglet présent | ✅ |
| FAB → ouvrir modal "Nouvelle tâche" | ✅ |
| Ajouter une tâche (nom) | ✅ |
| Toggle "Afficher dans le tableau" | ⬜ |
| Toggle "Tâche récurrente" → calendrier | ✅ |
| Choisir date de début (+ "une semaine sur deux") | ✅ (date ; biweekly ⬜) |
| Cliquer une cellule de la grille (intensité 0-3) | ✅ |
| Appui sur une tâche → modal actions | ✅ |
| Renommer une tâche | ✅ |
| Masquer / afficher une tâche | ✅ |
| Supprimer une tâche | ✅ |
| Afficher / masquer les tâches cachées | ✅ |
| Cocher un rappel | ✅ |
| État vide + CTA "Ajouter une tâche" | ⬜ |

## 7. Dépenses — `app/(app)/expenses.tsx`

| Interaction | État |
|-------------|------|
| Onglets internes Liste / Bilans | ✅ |
| FAB → formulaire d'ajout | ✅ |
| Ajouter une dépense (montant, participants…) | ✅ |
| Supprimer une dépense (ConfirmDialog) | ✅ |
| Résumé "Total" + "Mon solde" corrects | ⬜ |
| Vue Bilans (qui doit quoi) | ✅ |
| État vide + CTA | ⬜ |

## 8. Chat — `app/(app)/chat.tsx`

| Interaction | État |
|-------------|------|
| Retour (chevron) | ✅ |
| Envoyer un message texte | ✅ |
| Bouton envoyer désactivé si vide | ⬜ |
| Envoyer une image | 🔒 |
| Créer un sondage (PollCreator) | ✅ |
| Voter dans un sondage | ✅ |
| Réagir à un message (emoji) | ✅ |
| Rafraîchir (état vide) | ⬜ |

## 9. Calendrier — `app/(app)/calendar.tsx`

| Interaction | État |
|-------------|------|
| Filtres Événements / Anniversaires / Recettes | ✅ |
| Sélectionner un jour | ⬜ |
| FAB → menu (Événement / Planifier recette) | ✅ |
| Ajouter un événement (titre, date, note) | ✅ |
| Supprimer un événement | ✅ |
| Planifier une recette (choix, date cible, faisabilité) | ✅ |
| Erreur si délai insuffisant | ⬜ |
| Item recette → détail instance | ⬜ |

## 10. Recettes (liste) — `app/(app)/recipes/index.tsx`

| Interaction | État |
|-------------|------|
| FAB → formulaire nouvelle recette | ✅ |
| Créer une recette (titre, icône, ingrédients, étapes) | ✅ |
| Ajouter une étape (titre, durée, unité) | ✅ |
| Réordonner les étapes (drag) | 🔒 |
| Supprimer une étape du formulaire | ⬜ |
| Éditer une recette (bouton crayon) | ✅ |
| Appui long → confirmer suppression | ⬜ (carte navigable, cf. non couvert) |
| Carte recette → détail | ✅ |
| État vide + CTA | ⬜ |

## 11. Recette (détail) — `app/(app)/recipes/[id].tsx`

| Interaction | État |
|-------------|------|
| Retour | ⬜ |
| Déplier / replier les étapes | ✅ |
| "Lancer" → modal préparation | ✅ |
| Choisir quantité (batch +/-) | ⬜ |
| Choisir étape de départ + date cible | ⬜ |
| Lancer 1 ou N instances | ✅ (1) |
| Éditer la recette | ✅ |
| Instance → détail | ✅ |
| Supprimer une instance (confirm) | ⬜ |

## 12. Instance de recette — `app/(app)/recipes/instance/[id].tsx`

| Interaction | État |
|-------------|------|
| Retour | ⬜ |
| "Démarrer" (instance planifiée) | ⬜ |
| "Étape suivante" | ✅ |
| Revenir à l'étape précédente | ✅ |
| "Terminer" à la dernière étape | ✅ |
| Éditer les notes + enregistrer | ✅ |

## 13. Documents — `app/(app)/documents.tsx`

| Interaction | État |
|-------------|------|
| FAB → importer un document | 🔒 |
| Ouvrir un document (Linking) | 🔒 |
| Supprimer un document (ConfirmDialog) | ⬜ |
| État vide | ⬜ |

## 14. Profil / Paramètres — `components/ProfileSettings.tsx`

| Interaction | État |
|-------------|------|
| Page se charge | ✅ |
| Modifier nom / date de naissance / couleur → "Enregistrer" | ✅ (date) |
| Renommer la coloc (admin) | ✅ |
| Régénérer le code (admin, confirm) | ✅ (annulation) |
| Partager l'invitation (Share) | 🔒 |
| Quitter la coloc (confirm) → redirige | ✅ |
| Promouvoir / rétrograder un membre (admin) | ✅ |
| Exclure un membre (admin, confirm) | ✅ |
| Ajouter / retirer un membre en attente (admin) | ✅ |
| Supprimer la coloc (admin, confirm) | ✅ |
| Changer le thème (auto / clair / sombre) | ✅ |
| Configurer la barre de nav (max 4, min 1, erreur au-delà) | ✅ |
| Revoir le tutoriel | ✅ |
| Se déconnecter | ✅ |

## 15. Install — `app/install.tsx`

| Interaction | État |
|-------------|------|
| Bouton APK Android (Linking) | 🔒 |
| Bouton PWA (alert) | ⬜ |
| Continuer sur le web (Linking) | 🔒 |

---

## État final

Les parcours P1/P2 ainsi que la quasi-totalité des interactions hors 🔒 sont couverts
(**48 tests E2E, 100 % verts** — voir la table « Déjà couvert » en tête de fichier).

Restent volontairement non couverts :
- Le 🔒 natif (image picker, `Share`, `Linking`, drag&drop, haptique) — à couvrir en tests
  unitaires (`__tests__/`) plutôt qu'en E2E.
- Quelques cas à faible valeur / dépendants de données seedées (suggestions courses, états vides,
  « une semaine sur deux », suppression de recette par appui long sur carte navigable).

## Intégration CI (pré-requis)

Une fois les tests choisis :
1. `playwright install --with-deps chromium` dans le job CI.
2. Job GitHub Actions : build web (`expo export -p web`) **ou** dev server, puis `npx playwright test`.
3. Bloquer le merge/déploiement si la suite échoue.
> Note : garder `workers: 1` et `Accept-Encoding: identity` (contournement gzip Metro) déjà en place.
