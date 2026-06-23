# Architecture — Tipi

## Vue d'ensemble

Tipi est une application mobile React Native (Expo SDK 56) qui utilise Supabase comme backend-as-a-service. Il n'y a pas de serveur backend custom — l'app communique directement avec Supabase via son SDK JavaScript.

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Mobile | React Native 0.85, Expo SDK 56 |
| Routing | Expo Router (file-based) |
| Langage | TypeScript (strict) |
| Backend | Supabase (PostgreSQL + Auth + Realtime + Storage) |
| État | Hooks React locaux + Supabase Realtime subscriptions |
| Session | Supabase Auth avec persistance via AsyncStorage |

## Flux de données

```
App ──HTTPS──▶ Supabase Auth      (login/signup/session)
    ──HTTPS──▶ Supabase PostgREST (CRUD sur les tables)
    ──WS─────▶ Supabase Realtime  (sync temps réel)
    ──HTTPS──▶ Supabase Storage   (upload/download fichiers)
```

Toutes les requêtes passent par le client Supabase (`lib/supabase.ts`). La sécurité est assurée par les Row Level Security (RLS) policies — chaque utilisateur ne peut accéder qu'aux données de sa colocation.

## Structure du projet

```
app/                        # Routes Expo Router
├── _layout.tsx             # Layout racine (loading gate)
├── index.tsx               # Redirection selon état auth
├── (auth)/                 # Groupe non-authentifié
│   ├── _layout.tsx         # Stack navigator
│   ├── login.tsx           # Écran de connexion
│   └── join.tsx            # Créer/rejoindre une coloc
└── (app)/                  # Groupe authentifié
    ├── _layout.tsx         # Tab navigator (4 onglets)
    ├── chat.tsx            # Messagerie
    ├── expenses.tsx        # Dépenses
    ├── chores.tsx          # Ménage
    └── other.tsx           # Événements + Documents

components/                 # Composants UI réutilisables
├── MessageBubble.tsx
├── PollCreator.tsx
├── ReactionPicker.tsx
├── ExpenseCard.tsx
├── ExpenseForm.tsx
├── BalancesView.tsx
├── ChoreGrid.tsx
├── ChoreReminder.tsx
└── ProfileSettings.tsx

lib/                        # Logique métier
├── supabase.ts             # Initialisation client Supabase
├── types.ts                # Types TypeScript (miroir du schéma DB)
└── hooks/                  # Hooks React
    ├── useAuth.ts          # Session + profil utilisateur
    ├── useHousehold.ts     # Gestion colocation + membres
    ├── useMessages.ts      # Chat temps réel
    ├── useExpenses.ts      # Dépenses + calcul soldes
    ├── useChores.ts        # Ménage + tâches + rappels
    ├── useEvents.ts        # Événements
    └── useFiles.ts         # Documents partagés

supabase/
├── schema.sql              # Schéma complet + RLS + triggers
└── seed.sql                # Données de test
```

## Modèle de données

### Concepts clés

- **Household** — Une colocation. Chaque user appartient à un seul household.
- **Profile** — Lié 1:1 à `auth.users`. Contient nom, couleur, household_id.
- **invite_code** — Code à 6 caractères pour rejoindre un household.

### Tables

| Table | Description |
|-------|-------------|
| `households` | Colocations avec code d'invitation |
| `profiles` | Profils utilisateurs (lié à auth.users) |
| `messages` | Messages du chat (texte, image, sondage) |
| `message_reads` | Accusés de lecture |
| `expenses` | Dépenses partagées |
| `expense_participants` | Qui participe à chaque dépense |
| `chores` | Contributions ménage (user × tâche × semaine) |
| `chore_tasks` | Liste des tâches de ménage |
| `chore_reminders` | Rappels récurrents |
| `events` | Événements du calendrier |
| `shared_files` | Métadonnées des documents partagés |

### Sécurité (RLS)

Chaque table avec `household_id` a des policies qui restreignent l'accès aux données du household de l'utilisateur connecté. La fonction helper `my_household_id()` est utilisée dans toutes les policies.

Cas spéciaux :
- `profiles` : UPDATE limité à son propre profil
- `chores` : DELETE limité à ses propres contributions
- Tables de jointure (`message_reads`, `expense_participants`) : policies basées sur JOIN avec la table parente

## Patterns de développement

### Hooks

Chaque feature a un hook dédié (`useMessages`, `useExpenses`, etc.) qui :
1. Fetch les données initiales depuis Supabase
2. Souscrit au canal Realtime pour les mises à jour en temps réel
3. Expose des fonctions de mutation (create, update, delete)
4. Se désinscrit du canal au unmount

### Temps réel

Le chat utilise Supabase Realtime (WebSocket) pour une synchronisation instantanée. Les autres features (dépenses, ménage, etc.) utilisent aussi Realtime mais sont moins critiques en latence.

### Stockage fichiers

Deux buckets Supabase Storage :
- `chat-images` — Images envoyées dans le chat
- `shared-files` — Documents partagés

Les fichiers sont organisés par household : `{bucket}/{household_id}/{filename}`.
