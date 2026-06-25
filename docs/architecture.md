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
├── theme.ts                # Système de thème (light/dark) avec Context + AsyncStorage
├── expense-categories.ts   # Constantes partagées : labels, couleurs, icônes par catégorie
├── recurrence.ts           # Matching jours français pour rappels
├── chores-logic.ts         # Logique pure : cycle d'intensité, filtrage tâches
├── recipes-logic.ts        # Logique pure : avancement étapes, progression
├── nav-preferences-logic.ts # Logique pure : parsing préférences navbar
├── household-logic.ts      # Logique pure : permissions admin, gestion membres
└── hooks/                  # Hooks React
    ├── useAuth.ts          # Session + profil utilisateur
    ├── useHousehold.ts     # Gestion colocation + membres + admin (rename, kick, promote)
    ├── useMessages.ts      # Chat temps réel
    ├── useExpenses.ts      # Dépenses + calcul soldes
    ├── useChores.ts        # Ménage + tâches + rappels
    ├── useEvents.ts        # Événements
    ├── useFiles.ts         # Documents partagés
    └── useNavPreferences.ts # Préférences onglets navbar

__tests__/                  # Tests automatisés
├── setup.ts                # Mocks globaux (AsyncStorage, Supabase)
├── recurrence.test.ts      # Tests matching jours français
├── expenses.test.ts        # Tests calcul soldes et remboursements
├── expense-categories.test.ts # Tests constantes catégories (labels, couleurs, icônes)
├── theme.test.ts           # Tests palettes thème et résolution isDark
├── notifications.test.ts   # Tests logique notifications accueil
├── chores-logic.test.ts    # Tests cycle intensité et filtrage
├── recipes-logic.test.ts   # Tests avancement recettes et progression
├── useNavPreferences.test.ts # Tests parsing préférences navbar
├── household-logic.test.ts # Tests permissions admin, kick, promote, demote
└── integration/            # Tests d'intégration (Supabase réel)
    ├── setup.ts            # Chargement .env via dotenv
    ├── supabase-client.ts  # Infrastructure : user/household de test
    ├── chores.integration.test.ts
    ├── expenses.integration.test.ts
    ├── shopping.integration.test.ts
    └── recipes.integration.test.ts

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

### Rôles

Chaque profil a un champ `role` (`admin` | `member`) :
- Le créateur d'un household est automatiquement admin (trigger `set_admin_on_create`)
- Un admin peut : renommer la coloc, régénérer le code d'invitation, exclure un membre, promouvoir/rétrograder, supprimer la coloc
- Un membre exclu conserve son historique (dépenses, contributions) mais perd l'accès
- Le rôle est réinitialisé à `member` quand on quitte un household

### Sécurité (RLS)

Chaque table avec `household_id` a des policies qui restreignent l'accès aux données du household de l'utilisateur connecté. La fonction helper `my_household_id()` est utilisée dans toutes les policies.

Cas spéciaux :
- `profiles` : UPDATE limité à son propre profil + les admins peuvent modifier les membres de leur household
- `households` : UPDATE et DELETE réservés aux admins
- `chores` : DELETE limité à ses propres contributions
- Tables de jointure (`message_reads`, `expense_participants`) : policies basées sur JOIN avec la table parente

## Patterns de développement

### Hooks

Chaque feature a un hook dédié (`useMessages`, `useExpenses`, etc.) qui :
1. Fetch les données initiales depuis Supabase
2. Souscrit au canal Realtime pour les mises à jour en temps réel
3. Expose des fonctions de mutation (create, update, delete)
4. Se désinscrit du canal au unmount

### Thème (dark mode)

Le système de thème (`lib/theme.ts`) utilise un React Context + AsyncStorage :
- **ThemeMode** : `"system"` | `"light"` | `"dark"` — persisté dans AsyncStorage
- **`useTheme()`** retourne l'objet `Theme` (palette active) pour les composants
- **`useThemeMode()`** retourne `{ mode, setMode, isDark }` pour le toggle dans les paramètres
- Les palettes light/dark sont des objets plats avec les mêmes clés (21 tokens : background, card, accent, text, danger, success, etc.)
- Pattern d'application : `StyleSheet` contient les valeurs statiques light, les styles inline utilisent les tokens `t.*` pour surcharger

### Temps réel

Le chat utilise Supabase Realtime (WebSocket) pour une synchronisation instantanée. Les autres features (dépenses, ménage, etc.) utilisent aussi Realtime mais sont moins critiques en latence.

`useHousehold` souscrit aussi aux changements de la table `profiles` pour propager en temps réel les modifications de couleur/nom entre colocataires. Un `profileVersion` computed key (`${id}:${display_name}:${color}`) déclenche un re-fetch des membres quand le profil local change.

### Stockage fichiers

Deux buckets Supabase Storage :
- `chat-images` — Images envoyées dans le chat
- `shared-files` — Documents partagés

Les fichiers sont organisés par household : `{bucket}/{household_id}/{filename}`.

### Logique pure extraite

Pour la testabilité, la logique métier complexe est extraite des hooks dans des modules purs (sans dépendances React ni Supabase) :

| Module | Fonctions | Utilisé par |
|--------|-----------|-------------|
| `lib/recurrence.ts` | `recurrenceMatchesDay`, `recurrenceMatchesToday` | `ChoreReminder` |
| `lib/chores-logic.ts` | `resolveIntensityAction`, `filterVisibleTasks` | `useChores` |
| `lib/recipes-logic.ts` | `canAdvanceStep`, `isLastStep`, `getInstanceProgress` | `useRecipes` |
| `lib/nav-preferences-logic.ts` | `parseStoredTabs` | `useNavPreferences` |
| `lib/household-logic.ts` | `canKick`, `canPromote`, `canDemote`, `canManageHousehold`, `isLastAdmin` | `ProfileSettings` |
| `lib/expense-categories.ts` | `CATEGORY_LABELS`, `CATEGORY_COLORS`, `CATEGORY_ICONS` | `ExpenseForm`, `ExpenseCard`, `BalancesView` |

## Tests

### Stack de test

| Outil | Rôle |
|-------|------|
| Jest | Runner + assertions |
| jest-expo | Preset pour l'environnement React Native/Expo |
| dotenv | Chargement des variables d'environnement pour les tests d'intégration |

### Commandes

```bash
npm test                    # Tests unitaires (98 tests, ~3s)
npm run test:integration    # Tests d'intégration Supabase (24 tests, ~12s)
```

### Tests unitaires (98 tests)

Tests de la logique métier pure, sans appel réseau ni composant React.

| Suite | Tests | Description |
|-------|-------|-------------|
| `recurrence.test.ts` | 9 | Matching des jours français (lundi, mardi...) avec la récurrence des rappels |
| `expenses.test.ts` | 12 | Calcul des balances nettes et optimisation des remboursements (settlements) |
| `expense-categories.test.ts` | 5 | Constantes catégories : labels sans emoji, couleurs hex valides, icônes Ionicons, cohérence des clés |
| `theme.test.ts` | 8 | Palettes light/dark (structure, contrastes, tokens requis) et résolution isDark par ThemeMode |
| `notifications.test.ts` | 8 | Logique des notifications de la page d'accueil (rappels dus, événements à venir) |
| `chores-logic.test.ts` | 13 | Cycle d'intensité des tâches (0→1→2→3→suppression) et filtrage de visibilité |
| `recipes-logic.test.ts` | 15 | Avancement des étapes de recette, détection dernière étape, calcul de progression |
| `useNavPreferences.test.ts` | 9 | Parsing des préférences navbar depuis AsyncStorage, injection du tab home, fallback sur données corrompues |
| `household-logic.test.ts` | 19 | Permissions admin (kick, promote, demote), gestion du dernier admin, génération de code d'invitation |

### Tests d'intégration (24 tests)

Tests CRUD contre une instance Supabase réelle, avec création/nettoyage automatique d'un utilisateur et household de test.

| Suite | Tests | Description |
|-------|-------|-------------|
| `chores.integration.test.ts` | 7 | Création tâche, ajout entrée avec intensité, mise à jour, lecture filtrée, rappels, visibilité, suppression |
| `expenses.integration.test.ts` | 4 | Création dépense + participants, lecture avec jointure, suppression en cascade |
| `shopping.integration.test.ts` | 5 | Ajout item, toggle checked, tri, suppression bulk des cochés, suppression unitaire |
| `recipes.integration.test.ts` | 8 | Création recette, démarrage instance, avancement étape, notes, lecture, suppression instance/recette |

### Configuration des tests d'intégration

Les tests d'intégration nécessitent un accès à Supabase. Ajouter dans `.env` :

```
TEST_USER_EMAIL=email-utilisateur-test@exemple.com
TEST_USER_PASSWORD=mot-de-passe-test
```

L'utilisateur peut être créé depuis le dashboard Supabase (Authentication > Users > Add user, avec "Auto Confirm" coché). Les tests créent un household temporaire, exécutent les opérations CRUD, puis nettoient toutes les données créées.
