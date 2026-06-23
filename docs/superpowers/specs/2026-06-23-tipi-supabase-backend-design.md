# Tipi — Supabase Backend Design

## Overview

Migrate the Tipi colocation management app from local-only storage (AsyncStorage + a minimal Express chat server) to a shared Supabase backend. This enables multiple roommates on different devices to share data in real time.

**Scope:** Auth, database, real-time chat, file storage, code reorganization, documentation.  
**Out of scope (for now):** Push notifications, UI/style redesign.

## Context

### Current state

- **Frontend:** Expo SDK 56 React Native app with 4 tabs (Chat, Expenses, Chores, Other).
- **Backend:** Express server handling chat only (JSON file storage). All other data lives in AsyncStorage — not shared between devices.
- **Users:** Hardcoded `ROOMMATES` array. No authentication.
- **Chat:** HTTP polling every 2 seconds.
- **Files:** Stored locally on each device.

### Problems

1. No authentication — anyone can impersonate any user.
2. Expenses, chores, events, files are device-local — not synced.
3. Chat uses polling (wasteful, not real-time).
4. No concept of "household" — impossible to support multiple colocs.
5. No persistent database — server stores messages in a JSON file.

## Architecture

### Why Supabase

Supabase provides Auth, PostgreSQL, Realtime (WebSocket), and Storage in one managed service. The free tier is sufficient for a colocation (< 10 users). This avoids building and hosting a custom backend.

### High-level flow

```
App (Expo) ──HTTPS──▶ Supabase Auth    (login/signup)
           ──HTTPS──▶ Supabase DB      (CRUD via PostgREST)
           ──WS────▶ Supabase Realtime (live chat, live updates)
           ──HTTPS──▶ Supabase Storage  (file upload/download)
```

### Project structure (after migration)

```
tipi/
├── app/                    # Expo Router file-based routing
│   ├── _layout.tsx         # Root layout (auth gate)
│   ├── (auth)/             # Unauthenticated screens
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   └── join.tsx        # Create or join household
│   └── (app)/              # Authenticated screens
│       ├── _layout.tsx     # Tab navigator
│       ├── chat.tsx
│       ├── expenses.tsx
│       ├── chores.tsx
│       └── other.tsx
├── components/             # Reusable UI components
│   ├── ExpenseCard.tsx
│   ├── ChoreGrid.tsx
│   ├── MessageBubble.tsx
│   └── ...
├── lib/
│   ├── supabase.ts         # Supabase client init
│   ├── types.ts            # Shared TypeScript types
│   └── hooks/
│       ├── useAuth.ts
│       ├── useHousehold.ts
│       ├── useMessages.ts
│       ├── useExpenses.ts
│       ├── useChores.ts
│       ├── useEvents.ts
│       └── useFiles.ts
├── supabase/
│   ├── schema.sql          # Full DB schema + RLS policies
│   └── seed.sql            # Test data
├── docs/
│   ├── architecture.md     # LLM context: architecture overview
│   └── features.md         # LLM context: feature descriptions
├── README.md
├── CLAUDE.md
└── AGENTS.md
```

Files removed: `server/` directory, `api.ts`, `ChatScreen.tsx`, `ExpensesScreen.tsx`, `ChoresScreen.tsx` (code moves into `app/` and `components/`).

## Database Schema

### Tables

#### `households`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | default `gen_random_uuid()` |
| `name` | text NOT NULL | e.g. "Appart Rue de la Paix" |
| `invite_code` | text UNIQUE NOT NULL | 6-char code for joining |
| `created_at` | timestamptz | default `now()` |

#### `profiles`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | = `auth.users.id` |
| `email` | text NOT NULL | |
| `display_name` | text NOT NULL | |
| `color` | text NOT NULL | hex color, default `#2563EB` |
| `avatar_url` | text | nullable |
| `household_id` | uuid FK → households | nullable (null = not yet in a household) |
| `created_at` | timestamptz | default `now()` |

A trigger on `auth.users` INSERT creates the corresponding `profiles` row.

#### `messages`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `household_id` | uuid FK NOT NULL | |
| `author_id` | uuid FK → profiles NOT NULL | |
| `type` | text NOT NULL | 'text', 'image', 'poll' |
| `content` | text | text content or image URL |
| `poll` | jsonb | `{question, options: [{id, text, votes: [user_id]}]}` |
| `reactions` | jsonb | `{emoji: [user_id]}` default `{}` |
| `sent_at` | timestamptz | default `now()` |

#### `message_reads`
| Column | Type | Notes |
|--------|------|-------|
| `message_id` | uuid FK → messages | |
| `user_id` | uuid FK → profiles | |
| `read_at` | timestamptz | default `now()` |
| PK | composite | `(message_id, user_id)` |

#### `expenses`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `household_id` | uuid FK NOT NULL | |
| `title` | text NOT NULL | |
| `amount` | numeric(10,2) NOT NULL | |
| `payer_id` | uuid FK → profiles NOT NULL | |
| `category` | text NOT NULL | 'courses', 'loyer', 'restaurant', 'transport', 'loisirs', 'autre' |
| `note` | text | default `''` |
| `created_at` | timestamptz | default `now()` |

#### `expense_participants`
| Column | Type | Notes |
|--------|------|-------|
| `expense_id` | uuid FK → expenses ON DELETE CASCADE | |
| `user_id` | uuid FK → profiles | |
| PK | composite | `(expense_id, user_id)` |

#### `chores`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `household_id` | uuid FK NOT NULL | |
| `user_id` | uuid FK → profiles NOT NULL | |
| `task_name` | text NOT NULL | |
| `week` | int NOT NULL | ISO week number |
| `year` | int NOT NULL | ISO year |
| `intensity` | smallint NOT NULL | 0-3 |
| `performed_at` | timestamptz | |

Unique constraint: `(household_id, user_id, task_name, week, year)`.

#### `chore_tasks`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `household_id` | uuid FK NOT NULL | |
| `name` | text NOT NULL | |
| `created_at` | timestamptz | default `now()` |

Unique constraint: `(household_id, name)`.

#### `chore_reminders`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `household_id` | uuid FK NOT NULL | |
| `title` | text NOT NULL | |
| `recurrence` | text NOT NULL | free-text, e.g. "Tous les lundis" |
| `last_done_date` | date | nullable, null = not done |

#### `events`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `household_id` | uuid FK NOT NULL | |
| `title` | text NOT NULL | |
| `date` | timestamptz NOT NULL | event date/time |
| `note` | text | default `''` |
| `created_by` | uuid FK → profiles | |
| `created_at` | timestamptz | default `now()` |

#### `shared_files`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `household_id` | uuid FK NOT NULL | |
| `name` | text NOT NULL | display name |
| `storage_path` | text NOT NULL | path in Supabase Storage |
| `uploaded_by` | uuid FK → profiles | |
| `uploaded_at` | timestamptz | default `now()` |

### Row Level Security (RLS)

Every table with `household_id` gets the same policy pattern:

```sql
-- SELECT: user can read rows from their household
CREATE POLICY "read_own_household" ON <table>
  FOR SELECT USING (
    household_id = (SELECT household_id FROM profiles WHERE id = auth.uid())
  );

-- INSERT: user can insert into their household
CREATE POLICY "insert_own_household" ON <table>
  FOR INSERT WITH CHECK (
    household_id = (SELECT household_id FROM profiles WHERE id = auth.uid())
  );

-- UPDATE: user can update rows in their household
CREATE POLICY "update_own_household" ON <table>
  FOR UPDATE USING (
    household_id = (SELECT household_id FROM profiles WHERE id = auth.uid())
  );

-- DELETE: user can delete rows in their household
CREATE POLICY "delete_own_household" ON <table>
  FOR DELETE USING (
    household_id = (SELECT household_id FROM profiles WHERE id = auth.uid())
  );
```

Special cases:
- `profiles`: users can UPDATE their own row only (`id = auth.uid()`), but SELECT all profiles in their household.
- `households`: users can SELECT their own household, INSERT (to create), but not DELETE.
- `chores`: DELETE restricted to `user_id = auth.uid()` — a roommate can only delete their own contributions.
- `message_reads`: policy joins through `messages` to check `household_id`:
  ```sql
  CREATE POLICY "read_own_household" ON message_reads
    FOR SELECT USING (
      message_id IN (
        SELECT id FROM messages WHERE household_id = (
          SELECT household_id FROM profiles WHERE id = auth.uid()
        )
      )
    );
  ```
- `expense_participants`: policy joins through `expenses` to check `household_id`:
  ```sql
  CREATE POLICY "read_own_household" ON expense_participants
    FOR SELECT USING (
      expense_id IN (
        SELECT id FROM expenses WHERE household_id = (
          SELECT household_id FROM profiles WHERE id = auth.uid()
        )
      )
    );
  ```

### Storage buckets

- **`shared-files`**: One folder per household (`{household_id}/`). RLS policy: authenticated users can read/write files in their household's folder.

## Auth & Onboarding

### Flow

1. **App launch** → check Supabase session
2. **No session** → show login screen (email+password or magic link)
3. **Session but no `household_id`** → show join screen:
   - "Créer une coloc" → enter name → generates 6-char invite code
   - "Rejoindre une coloc" → enter invite code → joins existing household
4. **Session + household** → show main app (tabs)

### Session persistence

Supabase JS client handles session storage via AsyncStorage (configured at init). Tokens refresh automatically.

## Feature: Chat (real-time)

### Current → New

| Aspect | Current | New |
|--------|---------|-----|
| Transport | HTTP polling 2s | Supabase Realtime (WebSocket) |
| Storage | JSON file on Express | PostgreSQL `messages` table |
| Images | Local URI stored as content | Upload to Storage, store URL |
| Server | Express `server/` | None (direct DB access via RLS) |

### Implementation

- `useMessages` hook subscribes to Realtime channel filtered by `household_id`
- On new message: Supabase INSERT → Realtime broadcasts → all clients update
- Reactions and votes: UPDATE on `messages` row → Realtime broadcasts change
- Read receipts: INSERT into `message_reads`

## Feature: Chores (contribution grid)

### Philosophy

The chore system is **contribution-based, not assignment-based**. Roommates voluntarily log what they did, with intensity levels. The grid (tasks × weeks) shows who contributed and how much, encouraging responsible behavior rather than surveillance.

### Data model

- `chore_tasks`: the list of tasks the household has identified (editable)
- `chores`: individual contributions — one row per (user, task, week)
- `chore_reminders`: household-level reminders (e.g. "take out trash on Monday/Wednesday/Friday")
- Each user has a `color` in their `profiles` row, used in the grid visualization

### Grid behavior

- Tapping a cell cycles through intensities: empty → light → medium → full → empty
- Each user's contribution is shown as a colored segment (user's color × intensity opacity)
- Filter: "Moi" shows only current user's contributions, "Tous" shows everyone's
- Auto-scrolls to current week on mount

## Feature: Expenses

No logic changes. The settlement algorithm stays client-side. Data moves from AsyncStorage to Supabase `expenses` + `expense_participants` tables with Realtime sync.

## Feature: Events & Files

- **Events**: Simple CRUD on `events` table. Synced via Realtime.
- **Files**: Upload to Supabase Storage → metadata in `shared_files` table. Download via signed URLs.

## Dependencies

### New packages
- `@supabase/supabase-js` — Supabase client (uses `@react-native-async-storage/async-storage` for session persistence — already installed)
- `expo-router` — file-based routing (replace manual tab state)
- `react-native-url-polyfill` — required by Supabase on React Native

### Removed packages
- `@expo/ngrok` — no longer needed (no local server)

### Removed files
- `server/` directory (Express chat server)
- `api.ts` (replaced by `lib/supabase.ts` + hooks)

## Environment variables

```env
EXPO_PUBLIC_SUPABASE_URL=https://<project-id>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

## Error handling

- Network failures: hooks return loading/error states, UI shows retry option
- Auth expiry: Supabase client auto-refreshes tokens; on failure, redirect to login
- Realtime disconnect: Supabase client auto-reconnects with exponential backoff

## Testing strategy

- Manual testing on Android/iOS via Expo Go with two devices
- Verify: auth flow, household creation/joining, data sync between devices, chat real-time, file upload/download
