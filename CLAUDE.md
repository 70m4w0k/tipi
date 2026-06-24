@AGENTS.md

# Tipi — App de gestion de colocation

## Stack
- React Native (Expo SDK 56), TypeScript strict, Expo Router (file-based)
- Backend: Supabase (PostgreSQL, Auth, Realtime, Storage) — pas de serveur custom
- Client Supabase initialisé dans `lib/supabase.ts`, session persistée via AsyncStorage

## Structure
- `app/` — Routes Expo Router: `(auth)/` (login, join) et `(app)/` (chat, expenses, chores, other)
- `components/` — Composants UI réutilisables
- `lib/hooks/` — Un hook par feature (useAuth, useMessages, useExpenses, useChores, useEvents, useFiles, useHousehold)
- `lib/types.ts` — Types TypeScript miroir du schéma DB
- `supabase/schema.sql` — Schéma complet + RLS + triggers

## Conventions
- Langue de l'UI : français
- Toutes les tables ont RLS activé, policies basées sur `my_household_id()`
- Hooks: fetch initial + Realtime subscription + fonctions de mutation
- Styles: `#F4F6FA` background, `#FFFFFF` cards, `#1D4ED8` accent, `#E5E7EB` borders

## Système de ménage
Le système est contribution-based (PAS assignment-based). Les utilisateurs indiquent ce qu'ils ont fait (intensité 0-3), chacun avec sa couleur.
