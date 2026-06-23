# Tipi Supabase Migration — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Tipi from local-only storage to Supabase backend so multiple roommates can share data in real time.

**Architecture:** Expo Router for file-based navigation with auth gate. Supabase for auth, PostgreSQL, Realtime subscriptions, and file storage. All shared data synced via Supabase; AsyncStorage kept only for Supabase session persistence.

**Tech Stack:** Expo SDK 56, React Native, TypeScript, Supabase (Auth + DB + Realtime + Storage), Expo Router.

**Spec:** `docs/superpowers/specs/2026-06-23-tipi-supabase-backend-design.md`

---

## Chunk 1: Foundation (Supabase + Auth + Routing)

### Task 1: Install dependencies and configure Expo Router

**Files:**
- Modify: `package.json`
- Modify: `app.json`
- Modify: `tsconfig.json`
- Delete: `index.ts`
- Create: `app/_layout.tsx`

- [ ] **Step 1: Install new packages**

Run:
```bash
npx expo install expo-router expo-linking expo-splash-screen react-native-screens react-native-gesture-handler react-native-safe-area-context @supabase/supabase-js react-native-url-polyfill expo-image-picker expo-document-picker
```

- [ ] **Step 2: Configure app.json for Expo Router**

Replace `app.json` content — add `scheme`, change `main` entry point:

```json
{
  "expo": {
    "name": "tipi",
    "slug": "tipi",
    "version": "1.0.0",
    "scheme": "tipi",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "ios": {
      "supportsTablet": true
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#E6F4FE",
        "foregroundImage": "./assets/android-icon-foreground.png",
        "backgroundImage": "./assets/android-icon-background.png",
        "monochromeImage": "./assets/android-icon-monochrome.png"
      },
      "predictiveBackGestureEnabled": false
    },
    "web": {
      "favicon": "./assets/favicon.png",
      "bundler": "metro"
    },
    "plugins": ["expo-router"]
  }
}
```

- [ ] **Step 3: Update package.json main entry**

Change `"main"` from `"index.ts"` to `"expo-router/entry"`.

- [ ] **Step 4: Update tsconfig.json**

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

- [ ] **Step 5: Delete old entry point**

Delete `index.ts` (Expo Router provides its own entry).

- [ ] **Step 6: Create root layout**

Create `app/_layout.tsx` — minimal placeholder that renders child routes:

```tsx
import { Slot } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "react-native-url-polyfill/auto";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Slot />
    </SafeAreaProvider>
  );
}
```

- [ ] **Step 7: Create placeholder index route**

Create `app/index.tsx`:

```tsx
import { Text, View } from "react-native";

export default function Index() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Tipi — loading...</Text>
    </View>
  );
}
```

- [ ] **Step 8: Verify app boots**

Run: `npx expo start`
Expected: App loads and shows "Tipi — loading..." placeholder.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: migrate to Expo Router, install Supabase deps"
```

---

### Task 2: Supabase client + environment config

**Files:**
- Create: `lib/supabase.ts`
- Modify: `.env` (add Supabase vars)
- Modify: `.gitignore` (ensure `.env` is ignored)

- [ ] **Step 1: Update .gitignore**

Ensure `.env` is listed in `.gitignore`.

- [ ] **Step 2: Create .env template**

Create `.env.example`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

- [ ] **Step 3: Create Supabase client**

Create `lib/supabase.ts`:

```tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === "web",
  },
});
```

- [ ] **Step 4: Commit**

```bash
git add lib/supabase.ts .env.example .gitignore
git commit -m "feat: add Supabase client and env config"
```

---

### Task 3: Database schema SQL

**Files:**
- Create: `supabase/schema.sql`

- [ ] **Step 1: Write full schema SQL**

Create `supabase/schema.sql` containing:
1. All tables from spec (households, profiles, messages, message_reads, expenses, expense_participants, chores, chore_tasks, chore_reminders, events, shared_files)
2. Trigger to auto-create profile on auth.users INSERT
3. Function to generate 6-char invite codes
4. All RLS policies (including junction table policies from spec)
5. Storage bucket creation

The SQL must be copy-pasteable into Supabase SQL Editor as a single script.

Write the full SQL inline. It must include:

**Tables (in order for FK resolution):**

```sql
-- 1. households
CREATE TABLE households (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  invite_code text UNIQUE NOT NULL DEFAULT substr(md5(random()::text), 1, 6),
  created_at timestamptz DEFAULT now()
);

-- 2. profiles (linked to auth.users)
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text NOT NULL,
  color text NOT NULL DEFAULT '#2563EB',
  avatar_url text,
  household_id uuid REFERENCES households(id),
  created_at timestamptz DEFAULT now()
);

-- 3. messages
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id),
  author_id uuid NOT NULL REFERENCES profiles(id),
  type text NOT NULL CHECK (type IN ('text', 'image', 'poll')),
  content text,
  poll jsonb,
  reactions jsonb DEFAULT '{}'::jsonb,
  sent_at timestamptz DEFAULT now()
);

-- 4. message_reads
CREATE TABLE message_reads (
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id),
  read_at timestamptz DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);

-- 5. expenses
CREATE TABLE expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id),
  title text NOT NULL,
  amount numeric(10,2) NOT NULL,
  payer_id uuid NOT NULL REFERENCES profiles(id),
  category text NOT NULL CHECK (category IN ('courses','loyer','restaurant','transport','loisirs','autre')),
  note text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- 6. expense_participants
CREATE TABLE expense_participants (
  expense_id uuid REFERENCES expenses(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id),
  PRIMARY KEY (expense_id, user_id)
);

-- 7. chores
CREATE TABLE chores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id),
  user_id uuid NOT NULL REFERENCES profiles(id),
  task_name text NOT NULL,
  week int NOT NULL,
  year int NOT NULL,
  intensity smallint NOT NULL CHECK (intensity BETWEEN 0 AND 3),
  performed_at timestamptz,
  UNIQUE (household_id, user_id, task_name, week, year)
);

-- 8. chore_tasks
CREATE TABLE chore_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (household_id, name)
);

-- 9. chore_reminders
CREATE TABLE chore_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id),
  title text NOT NULL,
  recurrence text NOT NULL,
  last_done_date date
);

-- 10. events
CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id),
  title text NOT NULL,
  date timestamptz NOT NULL,
  note text DEFAULT '',
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- 11. shared_files
CREATE TABLE shared_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id),
  name text NOT NULL,
  storage_path text NOT NULL,
  uploaded_by uuid REFERENCES profiles(id),
  uploaded_at timestamptz DEFAULT now()
);
```

**Trigger for auto-creating profile on signup:**

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

**RLS policies (enable on all tables, then create policies):**

```sql
-- Enable RLS on all tables
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chores ENABLE ROW LEVEL SECURITY;
ALTER TABLE chore_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chore_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_files ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's household_id
CREATE OR REPLACE FUNCTION my_household_id()
RETURNS uuid AS $$
  SELECT household_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- households: SELECT own, INSERT to create
CREATE POLICY "select_own" ON households FOR SELECT USING (id = my_household_id());
CREATE POLICY "insert_any" ON households FOR INSERT WITH CHECK (true);

-- profiles: SELECT household members, UPDATE own row only
CREATE POLICY "select_household" ON profiles FOR SELECT USING (household_id = my_household_id() OR id = auth.uid());
CREATE POLICY "update_own" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "insert_own" ON profiles FOR INSERT WITH CHECK (id = auth.uid());

-- Standard household CRUD for: messages, expenses, chore_tasks, chore_reminders, events, shared_files
-- (macro pattern — repeat for each table)
```

Then for each of messages, expenses, chore_tasks, chore_reminders, events, shared_files:
```sql
CREATE POLICY "select" ON <table> FOR SELECT USING (household_id = my_household_id());
CREATE POLICY "insert" ON <table> FOR INSERT WITH CHECK (household_id = my_household_id());
CREATE POLICY "update" ON <table> FOR UPDATE USING (household_id = my_household_id());
CREATE POLICY "delete" ON <table> FOR DELETE USING (household_id = my_household_id());
```

Special: chores DELETE restricted to own contributions:
```sql
CREATE POLICY "select" ON chores FOR SELECT USING (household_id = my_household_id());
CREATE POLICY "insert" ON chores FOR INSERT WITH CHECK (household_id = my_household_id());
CREATE POLICY "update" ON chores FOR UPDATE USING (household_id = my_household_id());
CREATE POLICY "delete_own" ON chores FOR DELETE USING (household_id = my_household_id() AND user_id = auth.uid());
```

Junction tables (JOIN-based):
```sql
-- message_reads
CREATE POLICY "select" ON message_reads FOR SELECT USING (
  EXISTS (SELECT 1 FROM messages WHERE messages.id = message_reads.message_id AND messages.household_id = my_household_id())
);
CREATE POLICY "insert" ON message_reads FOR INSERT WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (SELECT 1 FROM messages WHERE messages.id = message_reads.message_id AND messages.household_id = my_household_id())
);

-- expense_participants
CREATE POLICY "select" ON expense_participants FOR SELECT USING (
  EXISTS (SELECT 1 FROM expenses WHERE expenses.id = expense_participants.expense_id AND expenses.household_id = my_household_id())
);
CREATE POLICY "insert" ON expense_participants FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM expenses WHERE expenses.id = expense_participants.expense_id AND expenses.household_id = my_household_id())
);
CREATE POLICY "delete" ON expense_participants FOR DELETE USING (
  EXISTS (SELECT 1 FROM expenses WHERE expenses.id = expense_participants.expense_id AND expenses.household_id = my_household_id())
);
```

**Storage buckets:**
```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('shared-files', 'shared-files', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-images', 'chat-images', false);

CREATE POLICY "household_read" ON storage.objects FOR SELECT USING (
  bucket_id IN ('shared-files', 'chat-images') AND
  (storage.foldername(name))[1] = my_household_id()::text
);
CREATE POLICY "household_insert" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id IN ('shared-files', 'chat-images') AND
  (storage.foldername(name))[1] = my_household_id()::text
);
CREATE POLICY "household_delete" ON storage.objects FOR DELETE USING (
  bucket_id IN ('shared-files', 'chat-images') AND
  (storage.foldername(name))[1] = my_household_id()::text
);
```

**Realtime:** Enable realtime on tables that need live sync:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE messages, expenses, chores, chore_tasks, chore_reminders, events, shared_files;
```

- [ ] **Step 2: Create seed.sql for test data**

Create `supabase/seed.sql` with sample data:
- 1 household ("Coloc Test", invite_code "ABC123")
- Default chore tasks (Plan de travail, Sol cuisine, etc.)
- 1 chore reminder ("Sortir les poubelles", recurrence "Tous les lundis, mercredis et vendredis")

Note: test users must be created via Supabase Auth dashboard — seed.sql only populates non-auth tables.

- [ ] **Step 3: Commit**

```bash
git add supabase/schema.sql supabase/seed.sql
git commit -m "feat: add Supabase schema with RLS policies and seed data"
```

---

### Task 4: TypeScript types

**Files:**
- Create: `lib/types.ts`
- Delete: `types.ts` (root level)

- [ ] **Step 1: Write new types matching DB schema**

Create `lib/types.ts` with types for all DB tables, plus utility types. Types must match the Supabase schema exactly (uuid strings, ISO date strings, etc.).

Key types:
- `Profile` (id, email, display_name, color, avatar_url, household_id)
- `Household` (id, name, invite_code, created_at)
- `Message` (id, household_id, author_id, type, content, poll, reactions, sent_at)
- `Expense` (id, household_id, title, amount, payer_id, category, note, created_at)
- `ExpenseCategory` (union type — keep existing values)
- `Chore` (id, household_id, user_id, task_name, week, year, intensity, performed_at)
- `ChoreTask` (id, household_id, name, created_at)
- `ChoreReminder` (id, household_id, title, recurrence, last_done_date)
- `HouseEvent` (id, household_id, title, date, note, created_by, created_at)
- `SharedFile` (id, household_id, name, storage_path, uploaded_by, uploaded_at)

- [ ] **Step 2: Delete old types.ts**

Delete root-level `types.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git rm types.ts
git commit -m "feat: add Supabase-aligned TypeScript types"
```

---

### Task 5: Auth hook + auth screens

**Files:**
- Create: `lib/hooks/useAuth.ts`
- Create: `app/(auth)/_layout.tsx`
- Create: `app/(auth)/login.tsx`
- Modify: `app/_layout.tsx` (add auth gate)

- [ ] **Step 1: Create useAuth hook**

Create `lib/hooks/useAuth.ts`:
- Exposes: `session`, `profile`, `loading`, `signUp`, `signIn`, `signInWithMagicLink`, `signOut`
- Listens to `supabase.auth.onAuthStateChange`
- Fetches `profiles` row when session exists
- Returns `{ session, profile, loading }` for the auth gate

- [ ] **Step 2: Create auth layout**

Create `app/(auth)/_layout.tsx` — simple Stack layout for auth screens.

- [ ] **Step 3: Create login screen**

Create `app/(auth)/login.tsx`:
- Email + password form with "Créer un compte" / "Se connecter" toggle
- Magic link option ("Recevoir un lien de connexion")
- Error display
- Uses `useAuth` hook

**Important:** For magic link to work, configure the Supabase dashboard redirect URL to `tipi://` (matching the `scheme` in `app.json`). Add a note in the README about this.

Port the existing visual style (colors `#1D4ED8`, `#F4F6FA`, rounded inputs).

- [ ] **Step 4: Update root layout with auth gate**

Modify `app/_layout.tsx`:
- Use `useAuth` hook
- If loading → show splash/loading
- If no session → redirect to `/(auth)/login`
- If session but no `profile.household_id` → redirect to `/(auth)/join` (Task 6)
- If session + household → render `/(app)` group

- [ ] **Step 5: Verify auth flow**

Run: `npx expo start`
Expected: App shows login screen. Can create account (if Supabase project configured). After login, shows placeholder since join screen doesn't exist yet.

- [ ] **Step 6: Commit**

```bash
git add lib/hooks/useAuth.ts app/_layout.tsx "app/(auth)/"
git commit -m "feat: add auth flow with login screen"
```

---

### Task 6: Household creation + join screen

**Files:**
- Create: `lib/hooks/useHousehold.ts`
- Create: `app/(auth)/join.tsx`

- [ ] **Step 1: Create useHousehold hook**

Create `lib/hooks/useHousehold.ts`:
- `createHousehold(name: string)` — inserts into `households`, generates invite code, updates own `profiles.household_id`
- `joinHousehold(inviteCode: string)` — looks up household by code, updates own `profiles.household_id`
- `getHouseholdMembers()` — fetches profiles with same `household_id`
- `members` state — list of household profiles (used app-wide by expenses, chores, chat for names and colors)
- This hook is used both in the join screen AND in the main app screens (Tasks 8-11)

- [ ] **Step 2: Create join screen**

Create `app/(auth)/join.tsx`:
- Two sections: "Créer une coloc" (name input + button) and "Rejoindre une coloc" (invite code input + button)
- On success → auth gate in `_layout.tsx` detects `household_id` and redirects to main app
- Shows invite code after creation so user can share it

- [ ] **Step 3: Verify household flow**

Run: `npx expo start`
Expected: After login, shows join screen. Can create household, sees invite code. Can join with code from another device/account.

- [ ] **Step 4: Commit**

```bash
git add lib/hooks/useHousehold.ts "app/(auth)/join.tsx"
git commit -m "feat: add household creation and join flow"
```

---

## Chunk 2: Feature Migration (Chat, Expenses, Chores, Other)

### Task 7: App tab layout

**Files:**
- Create: `app/(app)/_layout.tsx`

- [ ] **Step 1: Create tab navigator layout**

Create `app/(app)/_layout.tsx`:
- Uses Expo Router `Tabs` component
- 4 tabs: Discussions, Dépenses, Ménage, Autres
- Style matching current bottom tab bar (colors, font sizes from existing `App.tsx` styles)
- Each tab references its screen file

- [ ] **Step 2: Create placeholder screens**

Create minimal placeholder files:
- `app/(app)/chat.tsx` — "Chat coming soon"
- `app/(app)/expenses.tsx` — "Expenses coming soon"
- `app/(app)/chores.tsx` — "Chores coming soon"
- `app/(app)/other.tsx` — "Other coming soon"

- [ ] **Step 3: Verify tab navigation**

Run: `npx expo start`
Expected: After login + household, shows 4 tabs. Can switch between them.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/"
git commit -m "feat: add tab navigator with placeholder screens"
```

---

### Task 8: Chat feature (real-time)

**Files:**
- Create: `lib/hooks/useMessages.ts`
- Create: `components/MessageBubble.tsx`
- Create: `components/PollCreator.tsx`
- Create: `components/ReactionPicker.tsx`
- Modify: `app/(app)/chat.tsx`

- [ ] **Step 1: Create useMessages hook**

Create `lib/hooks/useMessages.ts`:
- `messages` state, `loading` state
- Fetches messages from `supabase.from('messages')` filtered by `household_id`, ordered by `sent_at DESC`
- Subscribes to Realtime channel `messages:household_id=eq.{id}` for INSERT/UPDATE
- `sendMessage(type, content, poll?)` — inserts into messages
- `addReaction(messageId, emoji)` — updates `reactions` JSONB
- `vote(messageId, optionId)` — updates `poll` JSONB
- `markAsRead(messageId)` — inserts into `message_reads`
- Cleanup: unsubscribes on unmount

- [ ] **Step 2: Extract MessageBubble component**

Create `components/MessageBubble.tsx`:
- Port rendering logic from existing `ChatScreen.tsx` FlatList renderItem
- Props: `message`, `currentUserId`, `userProfiles` (for displaying author name + color), `onReaction`, `onVote`
- Handles text, image, and poll message types
- Shows reactions and read receipts

- [ ] **Step 3: Extract PollCreator and ReactionPicker**

Create `components/PollCreator.tsx`:
- Port poll creation modal from `ChatScreen.tsx`
- Props: `onCreatePoll`, `onClose`

Create `components/ReactionPicker.tsx`:
- Port reaction picker overlay from `ChatScreen.tsx`
- Props: `onSelectEmoji`, `onClose`

- [ ] **Step 4: Build chat screen**

Modify `app/(app)/chat.tsx`:
- Use `useMessages` hook + `useAuth` for current user
- FlatList with `MessageBubble` components
- Input bar with text input, image picker button, poll button, send button
- Image upload: pick image → upload to Supabase Storage `chat-images/{household_id}/` → send message with storage URL as content
- Wire up PollCreator and ReactionPicker modals

- [ ] **Step 5: Verify chat works**

Run: `npx expo start` on two devices/emulators with different accounts in same household.
Expected: Messages appear in real time on both devices. Reactions, polls, and read receipts sync.

- [ ] **Step 6: Commit**

```bash
git add lib/hooks/useMessages.ts components/MessageBubble.tsx components/PollCreator.tsx components/ReactionPicker.tsx "app/(app)/chat.tsx"
git commit -m "feat: migrate chat to Supabase Realtime"
```

---

### Task 9: Expenses feature

**Files:**
- Create: `lib/hooks/useExpenses.ts`
- Create: `components/ExpenseCard.tsx`
- Create: `components/ExpenseForm.tsx`
- Create: `components/BalancesView.tsx`
- Modify: `app/(app)/expenses.tsx`

- [ ] **Step 1: Create useExpenses hook**

Create `lib/hooks/useExpenses.ts`:
- Fetches expenses + expense_participants from Supabase, filtered by `household_id`
- Realtime subscription for INSERT/DELETE on `expenses`
- `addExpense(data)` — inserts expense + participant rows (in a transaction or sequential)
- `deleteExpense(id)` — deletes expense (CASCADE handles participants)
- `computeBalances(expenses, members)` — port existing balance calculation logic
- `computeSettlements(expenses, members)` — port existing settlement algorithm

- [ ] **Step 2: Extract components**

Create `components/ExpenseCard.tsx`:
- Port single expense card rendering from `ExpensesScreen.tsx`
- Props: `expense`, `currentUserId`, `members`, `onDelete`

Create `components/ExpenseForm.tsx`:
- Port expense creation form from `ExpensesScreen.tsx`
- Props: `members`, `currentUserId`, `onSubmit`

Create `components/BalancesView.tsx`:
- Port balances + settlements + category breakdown from `ExpensesScreen.tsx`
- Props: `expenses`, `members`, `currentUserId`

- [ ] **Step 3: Build expenses screen**

Modify `app/(app)/expenses.tsx`:
- Use `useExpenses` hook + `useAuth` + `useHousehold` (for members list)
- 3 sub-tabs: Dépenses, Ajouter, Bilans (port existing tab logic)
- Summary header with total and personal balance

- [ ] **Step 4: Verify expenses sync**

Run: `npx expo start` on two devices.
Expected: Adding an expense on device A appears on device B. Balances update in real time.

- [ ] **Step 5: Commit**

```bash
git add lib/hooks/useExpenses.ts components/ExpenseCard.tsx components/ExpenseForm.tsx components/BalancesView.tsx "app/(app)/expenses.tsx"
git commit -m "feat: migrate expenses to Supabase"
```

---

### Task 10: Chores feature

**Files:**
- Create: `lib/hooks/useChores.ts`
- Create: `components/ChoreGrid.tsx`
- Create: `components/ChoreReminder.tsx`
- Modify: `app/(app)/chores.tsx`

- [ ] **Step 1: Create useChores hook**

Create `lib/hooks/useChores.ts`:
- Fetches `chores`, `chore_tasks`, `chore_reminders` from Supabase, filtered by `household_id`
- Realtime subscriptions for all three tables
- `setCellIntensity(taskName, week, year)` — upserts chore entry (cycles intensity 0→1→2→3→delete)
- `addTask(name)` — inserts into `chore_tasks`
- `editTask(id, newName)` — updates `chore_tasks` + renames in `chores`
- `removeTask(id)` — deletes from `chore_tasks` + associated `chores`
- `toggleReminderDone()` — updates `last_done_date` on `chore_reminders`
- `updateReminder(title, recurrence)` — updates `chore_reminders`

- [ ] **Step 2: Extract ChoreGrid component**

Create `components/ChoreGrid.tsx`:
- Port the grid rendering from `ChoresScreen.tsx` (tasks × weeks matrix)
- Props: `chores`, `tasks`, `weeks`, `currentUserId`, `members` (with colors), `filterMode`, `onCellPress`
- Uses member `color` from profiles for segment coloring
- Contains week-building logic, intensity-to-opacity mapping

- [ ] **Step 3: Extract ChoreReminder component**

Create `components/ChoreReminder.tsx`:
- Port the "A faire aujourd'hui" card + reminder editor from `ChoresScreen.tsx`
- Props: `reminder`, `onToggleDone`, `onUpdateReminder`
- Contains `recurrenceMatchesToday` logic

- [ ] **Step 4: Build chores screen**

Modify `app/(app)/chores.tsx`:
- Use `useChores` hook + `useAuth` + `useHousehold`
- ChoreReminder at top
- Add task input row
- Filter buttons (Moi / Tous)
- ChoreGrid
- Legend row (user colors from profiles)

- [ ] **Step 5: Verify chores sync**

Run: `npx expo start` on two devices.
Expected: Tapping a cell on device A shows the colored contribution on device B. Task management syncs.

- [ ] **Step 6: Commit**

```bash
git add lib/hooks/useChores.ts components/ChoreGrid.tsx components/ChoreReminder.tsx "app/(app)/chores.tsx"
git commit -m "feat: migrate chores to Supabase"
```

---

### Task 11: Events + Files + Other tab

**Files:**
- Create: `lib/hooks/useEvents.ts`
- Create: `lib/hooks/useFiles.ts`
- Modify: `app/(app)/other.tsx`

- [ ] **Step 1: Create useEvents hook**

Create `lib/hooks/useEvents.ts`:
- CRUD on `events` table, filtered by `household_id`
- Realtime subscription
- `addEvent(title, date, note)` — inserts event
- `deleteEvent(id)` — deletes event

- [ ] **Step 2: Create useFiles hook**

Create `lib/hooks/useFiles.ts`:
- Fetches from `shared_files` table, filtered by `household_id`
- Realtime subscription
- `uploadFile()` — uses DocumentPicker, uploads to Supabase Storage `shared-files/{household_id}/`, inserts metadata row
- `getFileUrl(storagePath)` — creates signed URL for download
- `deleteFile(id, storagePath)` — deletes from Storage + DB

- [ ] **Step 3: Build other screen**

Modify `app/(app)/other.tsx`:
- Sub-tab toggle: Événements / Documents (port from current `App.tsx`)
- Events section: form + list (port from current `App.tsx`)
- Files section: upload button + file list with download links (port from current)

- [ ] **Step 4: Verify events and files**

Run: `npx expo start` on two devices.
Expected: Events sync. Files uploaded on one device visible on the other.

- [ ] **Step 5: Commit**

```bash
git add lib/hooks/useEvents.ts lib/hooks/useFiles.ts "app/(app)/other.tsx"
git commit -m "feat: migrate events and files to Supabase"
```

---

## Chunk 3: Profile Settings, Cleanup + Documentation

### Task 12: User profile settings (color picker)

**Files:**
- Create: `components/ProfileSettings.tsx`
- Modify: `app/(app)/_layout.tsx` or `app/(app)/other.tsx` (add settings access)

- [ ] **Step 1: Create ProfileSettings component**

Create `components/ProfileSettings.tsx`:
- Shows current user's display name, email, color
- Color picker: grid of 8-10 preset colors, tap to select
- "Enregistrer" button → updates `profiles` row via Supabase
- "Se déconnecter" button → calls `signOut`
- "Quitter la coloc" button → sets `household_id` to null (with confirmation)
- Shows household invite code (copyable)

- [ ] **Step 2: Add settings access**

Add a settings icon/button in the app header or in the "Autres" tab that opens ProfileSettings as a modal or section.

- [ ] **Step 3: Verify profile updates**

Test: change color → chore grid shows new color. Change name → chat shows new name.

- [ ] **Step 4: Commit**

```bash
git add components/ProfileSettings.tsx "app/(app)/"
git commit -m "feat: add profile settings with color picker"
```

---

### Task 13: Remove old code

**Files:**
- Delete: `App.tsx`
- Delete: `api.ts`
- Delete: `ChatScreen.tsx`
- Delete: `ExpensesScreen.tsx`
- Delete: `ChoresScreen.tsx`
- Delete: `server/` directory

- [ ] **Step 1: Delete old files**

```bash
git rm App.tsx api.ts ChatScreen.tsx ExpensesScreen.tsx ChoresScreen.tsx
git rm -r server/
```

- [ ] **Step 2: Remove @expo/ngrok from package.json**

Run: `npm uninstall @expo/ngrok`

- [ ] **Step 3: Verify app still works**

Run: `npx expo start`
Expected: App boots, auth flow works, all tabs and profile settings functional.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove old Express server and legacy screen files"
```

---

### Task 14: Documentation

**Files:**
- Create: `README.md`
- Create: `docs/architecture.md`
- Create: `docs/features.md`
- Modify: `CLAUDE.md`
- Modify: `AGENTS.md`

- [ ] **Step 1: Write README.md**

Contents:
- Project description (colocation management app)
- Prerequisites (Node.js, Expo CLI, Supabase account)
- Supabase setup instructions (create project, run schema.sql, copy URL + anon key)
- Local dev setup (clone, npm install, create .env, npx expo start)
- How to invite roommates (share invite code)
- Project structure overview

- [ ] **Step 2: Write docs/architecture.md**

LLM context file covering:
- Tech stack (Expo SDK 56, Supabase, Expo Router)
- Project structure with file responsibilities
- Data flow (app → Supabase client → PostgREST/Realtime/Storage)
- Auth flow
- RLS security model
- Key conventions (hooks pattern, component extraction)

- [ ] **Step 3: Write docs/features.md**

LLM context file covering:
- Chat: real-time messaging, polls, reactions, read receipts, image sharing
- Expenses: tricount-like, categories, settlement algorithm, balance visualization
- Chores: contribution-based grid (not assignment), intensity levels, user colors, weekly view
- Events: simple calendar
- Files: shared document storage
- Auth: email+password, magic link, household invite codes

- [ ] **Step 4: Update CLAUDE.md**

Replace current CLAUDE.md with project conventions:
- Tech stack reference
- File structure
- Key patterns (hooks in `lib/hooks/`, components in `components/`, routes in `app/`)
- Supabase usage patterns
- Reference to docs/ for detailed context

- [ ] **Step 5: Commit**

```bash
git add README.md docs/architecture.md docs/features.md CLAUDE.md AGENTS.md
git commit -m "docs: add README, architecture, and feature documentation"
```

---

### Task 15: Final verification

- [ ] **Step 1: Full test pass**

Test on device/emulator:
1. Fresh install → login screen appears
2. Create account with email+password
3. Create household → invite code shown
4. Second account joins with invite code
5. Chat: send text, image, poll — appears on both devices
6. Expenses: add expense — balance updates on both
7. Chores: tap grid cell — contribution appears on both (with correct colors)
8. Events: add event — syncs
9. Files: upload document — visible on both
10. Profile: change color — reflected in chore grid
11. Sign out and back in — session persists

- [ ] **Step 2: Commit any fixes**

```bash
git add -A
git commit -m "fix: final adjustments from integration testing"
```
