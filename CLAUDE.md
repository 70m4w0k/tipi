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
- **Langue du code** : anglais (noms de variables