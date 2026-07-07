# Couverture E2E — Interactions par page

Inventaire de **toutes les interactions utilisateur** de l'app, avec l'état de couverture
Playwright actuel. Objectif : choisir lesquelles ajouter aux tests de non-régression avant
de les intégrer au workflow de déploiement.

Légende : ✅ couvert · ⬜ non couvert · 🔒 difficile à tester sur web (natif : image picker,
partage, fichiers, haptique).

## Déjà couvert (`e2e/`)

| Spec | Test |
|------|------|
| `auth.spec.ts` | Page login s'affiche · login valide · identifiants invalides · formulaire vide |
| `login.spec.ts` **(P1)** | Bascule login↔inscription · inscription sans nom (erreur) · lien magique sans email (erreur) |
| `navigation.spec.ts` | Barre d'onglets visible après login (Ménage, Courses, Recettes) |
| `onboarding.spec.ts` | `/invite?code=` redirige vers login · `/join` redirige vers login |
| `shopping.spec.ts` **(P1)** | Ajouter un article (Entrée) · cocher (barré) |
| `chores.spec.ts` **(P1)** | Onglet présent · ajouter une tâche (FAB+modal) · renseigner une cellule |
| `expenses.spec.ts` **(P1)** | Bascule Liste/Bilans · ajouter une dépense |
| `recipes.spec.ts` **(P1)** | Créer une recette · lancer une instance · avancer les étapes |
| `profile.spec.ts` **(P1)** | Changer le thème · configurer la barre de nav · se déconnecter |

**Infra tests** : `e2e/helpers.ts` (login + neutralisation onboarding), `e2e/db.ts` (nettoyage
Supabase en teardown, robuste et indépendant de l'UI). `testID` ajoutés sur les éléments sans
texte (FABs, bouton profil, cellules de grille, lignes de config nav, boutons du modal recette,
`confirm-dialog-confirm` pour les confirmations).

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
| Basculer login ↔ inscription ("Créer un compte") | ⬜ |
| Inscription : nom vide → erreur | ⬜ |
| Inscription complète → crée le compte | ⬜ |
| "Recevoir un lien de connexion" (magic link) sans email → erreur | ⬜ |
| Magic link avec email → confirmation "Lien envoyé" | ⬜ |

## 2. Join / Créer coloc — `app/(auth)/join.tsx`

| Interaction | État |
|-------------|------|
| Redirection login si pas de session | ✅ |
| Créer une coloc sans nom → erreur | ⬜ |
| Créer une coloc → affiche le code d'invitation | ⬜ |
| Rejoindre sans code → erreur | ⬜ |
| Rejoindre avec code invalide → erreur | ⬜ |
| Rejoindre avec code valide → redirige vers `/claim` | ⬜ |
| Auto-join via code d'invitation en attente | ⬜ |
| Se déconnecter | ⬜ |

## 3. Claim / Identité — `app/(auth)/claim.tsx`

| Interaction | État |
|-------------|------|
| Sélectionner un membre pré-ajouté | ⬜ |
| Choisir une couleur (désélection possible) | ⬜ |
| Couleur déjà prise → non sélectionnable | ⬜ |
| "C'est moi !" / "Continuer" → home (auto-couleur si aucune) | ⬜ |
| "Je ne suis pas dans la liste" (skip) | ⬜ |

## 4. Accueil — `app/(app)/home.tsx`

| Interaction | État |
|-------------|------|
| Carte "Courses" → navigue vers /shopping | ⬜ |
| Bouton profil → /other | ⬜ |
| Rappels du jour : cocher fait/pas fait | ⬜ |
| Notification recette → navigue vers /recipes | ⬜ |
| Fermer (dismiss) une notification | ⬜ |
| Carte "Invite tes colocs" (Share) | 🔒 |
| Tuiles d'accès rapide (pages hors nav) → navigation | ⬜ |
| Pull-to-refresh | ⬜ |

## 5. Courses — `app/(app)/shopping.tsx`

| Interaction | État |
|-------------|------|
| Ajouter un article (bouton +) | ⬜ |
| Ajouter via "Entrée" (submit) | ⬜ |
| Aperçu de catégorie auto pendant la saisie | ⬜ |
| Ajouter depuis une suggestion (chip) | ⬜ |
| Cocher / décocher un article | ⬜ |
| Supprimer un article (appui long → ConfirmDialog) | ⬜ |
| Vider les articles cochés (ConfirmDialog) | ⬜ |
| "J'y vais !" → poste un message dans le chat + mode courses | ⬜ |
| "Courses terminées" | ⬜ |
| État vide affiché | ⬜ |

## 6. Ménage — `app/(app)/chores.tsx`

| Interaction | État |
|-------------|------|
| Onglet présent | ✅ |
| FAB → ouvrir modal "Nouvelle tâche" | ⬜ |
| Ajouter une tâche (nom) | ⬜ |
| Toggle "Afficher dans le tableau" | ⬜ |
| Toggle "Tâche récurrente" → calendrier | ⬜ |
| Choisir date de début + "une semaine sur deux" | ⬜ |
| Cliquer une cellule de la grille (intensité 0-3) | ⬜ |
| Appui sur une tâche → modal actions | ⬜ |
| Renommer une tâche | ⬜ |
| Masquer / afficher une tâche | ⬜ |
| Supprimer une tâche | ⬜ |
| Afficher / masquer les tâches cachées | ⬜ |
| Cocher un rappel | ⬜ |
| État vide + CTA "Ajouter une tâche" | ⬜ |

## 7. Dépenses — `app/(app)/expenses.tsx`

| Interaction | État |
|-------------|------|
| Onglets internes Liste / Bilans | ⬜ |
| FAB → formulaire d'ajout | ⬜ |
| Ajouter une dépense (montant, participants…) | ⬜ |
| Supprimer une dépense (ConfirmDialog) | ⬜ |
| Résumé "Total" + "Mon solde" corrects | ⬜ |
| Vue Bilans (qui doit quoi) | ⬜ |
| État vide + CTA | ⬜ |

## 8. Chat — `app/(app)/chat.tsx`

| Interaction | État |
|-------------|------|
| Retour (chevron) | ⬜ |
| Envoyer un message texte | ⬜ |
| Bouton envoyer désactivé si vide | ⬜ |
| Envoyer une image | 🔒 |
| Créer un sondage (PollCreator) | ⬜ |
| Voter dans un sondage | ⬜ |
| Réagir à un message (emoji) | ⬜ |
| Rafraîchir (état vide) | ⬜ |

## 9. Calendrier — `app/(app)/calendar.tsx`

| Interaction | État |
|-------------|------|
| Filtres Événements / Anniversaires / Recettes | ⬜ |
| Sélectionner un jour | ⬜ |
| FAB → menu (Événement / Planifier recette) | ⬜ |
| Ajouter un événement (titre, date, note) | ⬜ |
| Supprimer un événement | ⬜ |
| Planifier une recette (choix, date cible, faisabilité) | ⬜ |
| Erreur si délai insuffisant | ⬜ |
| Item recette → détail instance | ⬜ |

## 10. Recettes (liste) — `app/(app)/recipes/index.tsx`

| Interaction | État |
|-------------|------|
| FAB → formulaire nouvelle recette | ⬜ |
| Créer une recette (titre, icône, ingrédients, étapes) | ⬜ |
| Ajouter une étape (titre, durée, unité) | ⬜ |
| Réordonner les étapes (drag) | 🔒 |
| Supprimer une étape du formulaire | ⬜ |
| Éditer une recette (bouton crayon) | ⬜ |
| Appui long → confirmer suppression | ⬜ |
| Carte recette → détail | ⬜ |
| État vide + CTA | ⬜ |

## 11. Recette (détail) — `app/(app)/recipes/[id].tsx`

| Interaction | État |
|-------------|------|
| Retour | ⬜ |
| Déplier / replier les étapes | ⬜ |
| "Lancer" → modal préparation | ⬜ |
| Choisir quantité (batch +/-) | ⬜ |
| Choisir étape de départ + date cible | ⬜ |
| Lancer 1 ou N instances | ⬜ |
| Éditer la recette | ⬜ |
| Instance → détail | ⬜ |
| Supprimer une instance (confirm) | ⬜ |

## 12. Instance de recette — `app/(app)/recipes/instance/[id].tsx`

| Interaction | État |
|-------------|------|
| Retour | ⬜ |
| "Démarrer" (instance planifiée) | ⬜ |
| "Étape suivante" | ⬜ |
| Revenir à l'étape précédente | ⬜ |
| "Terminer" à la dernière étape | ⬜ |
| Éditer les notes + enregistrer | ⬜ |

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
| Page se charge | ✅ (souple) |
| Modifier nom / date de naissance / couleur → "Enregistrer" | ⬜ |
| Renommer la coloc (admin) | ⬜ |
| Régénérer le code (admin, confirm) | ⬜ |
| Partager l'invitation (Share) | 🔒 |
| Quitter la coloc (confirm) → redirige | ⬜ |
| Promouvoir / rétrograder un membre (admin) | ⬜ |
| Exclure un membre (admin, confirm) | ⬜ |
| Ajouter / retirer un membre en attente (admin) | ⬜ |
| Supprimer la coloc (admin, confirm) | ⬜ |
| Changer le thème (auto / clair / sombre) | ⬜ |
| Configurer la barre de nav (max 4, min 1, erreur au-delà) | ⬜ |
| Revoir le tutoriel | ⬜ |
| Se déconnecter | ⬜ |

## 15. Install — `app/install.tsx`

| Interaction | État |
|-------------|------|
| Bouton APK Android (Linking) | 🔒 |
| Bouton PWA (alert) | ⬜ |
| Continuer sur le web (Linking) | 🔒 |

---

## Priorisation proposée

**P1 — parcours critiques (à faire en premier)**
- Login : inscription + bascule de mode
- Courses : ajouter / cocher / supprimer un article (CRUD le plus simple à tester)
- Ménage : ajouter une tâche via le modal + cliquer une cellule
- Dépenses : bascule d'onglets + ajouter une dépense
- Recettes : créer une recette + lancer une instance + avancer les étapes
- Profil : changer de thème + configurer la nav + se déconnecter

**P2 — parcours secondaires**
- Chat : envoyer un message, créer/voter un sondage
- Calendrier : filtres, ajout/suppression d'événement
- Home : navigations par cartes/tuiles

**P3 — à ignorer ou tester en unitaire**
- Tout ce qui est 🔒 (image picker, Share, fichiers, drag) : non testable de façon fiable
  sur le web headless → couvrir la logique en tests unitaires (`__tests__/`) plutôt qu'en E2E.

## Intégration CI (pré-requis)

Une fois les tests choisis :
1. `playwright install --with-deps chromium` dans le job CI.
2. Job GitHub Actions : build web (`expo export -p web`) **ou** dev server, puis `npx playwright test`.
3. Bloquer le merge/déploiement si la suite échoue.
> Note : garder `workers: 1` et `Accept-Encoding: identity` (contournement gzip Metro) déjà en place.
