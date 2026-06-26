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
- Toute modification de schéma doit être reflétée dans `supabase/schema.sql` ET `lib/types.ts`

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
- Tests unitaires dans `__tests__/`, lancer avec `npx jest`
- Extraire la logique testable dans des modules séparés (`lib/*-logic.ts`)

## Workflow
- Vérifier qu'il n'y a pas d'erreurs de compilation avec `npx expo start`
- Quand l'utilisateur dit "push", "pusher" ou "pousser" :
  1. Mettre à jour les fichiers du dossier `docs/` si les changements impactent l'architecture ou les features
  2. Commiter tous les changements (`git add -A && git commit`)
  3. Si on est sur une branche autre que `master`, merger dans `master`
  4. Pousser sur GitHub (`git push`)
