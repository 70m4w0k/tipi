@AGENTS.md

# Tipi — App de gestion de colocation

## Stack
- React Native (Expo SDK 56), TypeScript strict, Expo Router (file-based)
- Backend : Supabase (PostgreSQL, Auth, Realtime, Storage) — pas de serveur custom
- Client Supabase initialisé dans `lib/supabase.ts`, session persistée via AsyncStorage
- Doc Expo versionnée : https://docs.expo.dev/versions/v56.0.0/

## Structure
- `app/` — Routes Expo Router : `(auth)/` (login, join) et `(app)/` (pages à tabs)
- `components/` — Composants UI réutilisables
- `lib/hooks/` — Un hook par feature (useAuth, useMessages, useExpenses, useChores, useEvents, useFiles, useHousehold)
- `lib/types.ts` — Types TypeScript miroir du schéma DB
- `lib/theme.ts` — Tokens de thème (light + dark, 21 tokens)
- `lib/household-logic.ts` — Constantes partagées (COLOR_PRESETS, pickAvailableColor)
- `lib/chores-logic.ts` — Constantes ménage (DEFAULT_CHORE_TASKS)
- `supabase/schema.sql` — Schéma complet + RLS + triggers
- `__tests__/` — Tests unitaires et d'intégration

## Conventions de code
- **Langue de l'UI** : français (labels, messages d'erreur, placeholders)
- **Langue du code** : anglais (noms de variables, fonctions, composants)
- **Icônes** : exclusivement Ionicons via `@expo/vector-icons` (pas d'emojis dans l'UI)
- **Styles** : utiliser les tokens de `useTheme()` — jamais de couleurs en dur dans le JSX
  - Tokens principaux : `t.background`, `t.card`, `t.accent`, `t.text`, `t.danger`, `t.dangerLight`, `t.success`, `t.successLight`
- **Erreurs utilisateur** : affichage inline avec bannière stylée — pas de `Alert.alert` (incompatible web mobile)
- **Boutons d'ajout** : FAB positionné en bas à droite, `paddingBottom: 100` sur les listes pour éviter le chevauchement

## Base de données & sécurité
- Toutes les tables ont RLS activé, policies basées sur `my_household_id()`
- Un utilisateur ne peut requêter que les données de son propre household
- **Ordre des opérations** : un utilisateur doit d'abord rejoindre un household (`update household_id`) AVANT de pouvoir requêter les membres (RLS bloque sinon)
- Toute modification de schéma doit être reflétée dans `supabase/migrations/` (source de vérité), `supabase/schema.sql` (instantané) ET `lib/types.ts`
- `kick_member(target)` et `delete_household()` sont des fonctions SECURITY DEFINER — le RLS empêche les UPDATE/DELETE directs qui nullifient `household_id` (le USING s'applique à la nouvelle ligne)

## Environnements
Deux environnements, zéro coût :

| Env | Supabase | Données | Usage |
|-----|----------|---------|-------|
| **prod** | Projet cloud Free (`rlhkgrhgbnpbxjblyetw`) | Réelles | App publiée (APK / web) |
| **test / dev** | Supabase local (CLI + Docker) | Jetables, recréées par `db reset` | Dev local, E2E, CI |

### Supabase local (dev / test)
- Prérequis : Docker Desktop lancé
- `npx supabase start` → stack complète (PostgreSQL, Auth, Storage, Realtime) sur `127.0.0.1:54321`
- Migrations appliquées depuis `supabase/migrations/`, données de test depuis `supabase/seed.sql`
- `npx supabase db reset` → repart d'une base propre
- `npx supabase status` → affiche URL + clés (à mettre dans `.env`)
- Auth : `signUp` auto-confirme les comptes (pas besoin de vérification email)
- **Attention** : Expo Go sur mobile ne peut pas accéder à `127.0.0.1` → utiliser l'IP LAN dans `.env`

### Migrations versionnées
- Source de vérité : `supabase/migrations/` (fichiers horodatés, appliqués par le CLI)
- `supabase/schema.sql` = instantané de référence (pas utilisé par le CLI)
- `supabase/migration_*.sql` (racine) = migrations héritées, déjà appliquées en prod manuellement, ignorées par le CLI
- Nouvelle migration : `npx supabase migration new <nom>`
- Appliquer en prod : `npx supabase db push` (après `supabase link`)

### CI (GitHub Actions)
- `_e2e.yml` (réutilisable) : démarre Supabase local → exporte env → Playwright → stop
- `e2e.yml` : lance `_e2e.yml` sur chaque PR vers master
- `eas-build.yml` : sur push master → E2E d'abord (`needs: e2e`) → puis build APK
- `paths-ignore` : les changements `docs/**` et `*.md` ne déclenchent pas les workflows

## Hooks
- Pattern : fetch initial + subscription Realtime + fonctions de mutation
- Utiliser `useRef` pour les guards de race condition (ex: `hasFetched`, `seededRef`)
- `AppState` listener pour auto-refresh au retour au premier plan

## Système de ménage
- Contribution-based (PAS assignment-based) : les utilisateurs indiquent ce qu'ils ont fait
- Intensité 0-3 par cellule, chaque utilisateur a sa couleur
- Couleurs auto-assignées à l'inscription (première disponible parmi `COLOR_PRESETS`)

## Builds & déploiement
- Expo requiert des icônes au format PNG (pas JPG)
- Les fichiers `.env` sont gitignorés : utiliser `eas env:create` pour les variables de build EAS (`eas secret:create` est deprecated)
- Variables requises : `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `process.env.EXPO_PUBLIC_*` doit utiliser `?? ""` (pas `!`) pour éviter les crashs si absent

## Tests
- Tests unitaires : `npx jest` (182 tests, `__tests__/`)
- Tests E2E : `npx playwright test` (48 tests, `e2e/`) — nécessite Supabase local lancé
- Tests d'intégration : `npx jest --testPathPattern integration` (`__tests__/integration/`)
- Extraire la logique testable dans des modules séparés (`lib/*-logic.ts`)
- E2E : comptes créés à la volée via `signUp` dans `e2e/global-setup.ts` + `e2e/fixtures.ts`

## Compatibilité React Native
- **Cible principale = Expo Go sur Android/iOS** — le web est secondaire
- Avant d'utiliser une API visuelle (transforms 3D, animations, gestures), vérifier qu'elle fonctionne sur RN Android :
  - `backfaceVisibility: "hidden"` → **NON FIABLE sur Android** ; utiliser opacity + shared value pour swap face/dos
  - `overflow: "hidden"` avec `borderRadius` → buggy sur Android ancien ; tester
  - Transforms 3D (rotateY, perspective) → fonctionnent mais pas avec backfaceVisibility
- En cas de doute sur le support d'une prop CSS/style sur Android, chercher les issues connues avant d'implémenter
- **Les tests Playwright ne valident que la version web** — les bugs mobile ne seront pas détectés par la CI

## Workflow
- Vérifier qu'il n'y a pas d'erreurs de compilation avec `npx tsc --noEmit`
- **Toujours vérifier le bundling** avec `npx expo export --platform web 2>&1 | head -20` après ajout de dépendances ou nouveaux imports (`tsc` ne détecte pas les erreurs de résolution de modules Metro)
- **Lancer les tests E2E** (`npx playwright test`) quand les changements touchent la logique métier, les hooks, ou les interactions utilisateur — ils valident le fonctionnement sur web
- Quand l'utilisateur dit "push", "pusher" ou "pousser" :
  1. Mettre à jour les fichiers du dossier `docs/` si les changements impactent l'architecture ou les features
  2. Commiter tous les changements (`git add -A && git commit`)
  3. Si on est sur une branche autre que `master`, merger dans `master`
  4. Pousser sur GitHub (`git push`)
