-- Tipi — Supabase Schema
-- Run this entire file in the Supabase SQL Editor to set up the database.

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE households (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  invite_code text UNIQUE NOT NULL DEFAULT substr(md5(random()::text), 1, 6),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text NOT NULL,
  color text NOT NULL DEFAULT '#2563EB',
  avatar_url text,
  household_id uuid REFERENCES households(id),
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  birthday date,
  created_at timestamptz DEFAULT now()
);

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

CREATE TABLE message_reads (
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id),
  read_at timestamptz DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);

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

CREATE TABLE expense_participants (
  expense_id uuid REFERENCES expenses(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id),
  PRIMARY KEY (expense_id, user_id)
);

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

CREATE TABLE chore_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id),
  name text NOT NULL,
  show_in_grid boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE (household_id, name)
);

CREATE TABLE chore_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id),
  title text NOT NULL,
  recurrence text NOT NULL,
  last_done_date date
);

CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id),
  title text NOT NULL,
  date timestamptz NOT NULL,
  note text DEFAULT '',
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE shared_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id),
  name text NOT NULL,
  storage_path text NOT NULL,
  uploaded_by uuid REFERENCES profiles(id),
  uploaded_at timestamptz DEFAULT now()
);

CREATE TABLE shopping_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id),
  title text NOT NULL,
  category text DEFAULT '',
  checked boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id),
  title text NOT NULL,
  description text DEFAULT '',
  ingredients jsonb NOT NULL DEFAULT '[]'::jsonb,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE recipe_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id),
  recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  label text NOT NULL,
  current_step int NOT NULL DEFAULT 0,
  notes text DEFAULT '',
  target_date date,
  step_completions jsonb NOT NULL DEFAULT '[]'::jsonb,
  started_at timestamptz DEFAULT now(),
  step_started_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- TRIGGER: auto-create profile on signup
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
EXCEPTION WHEN others THEN
  RAISE LOG 'handle_new_user failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- RLS HELPER
-- ============================================================

CREATE OR REPLACE FUNCTION my_household_id()
RETURNS uuid AS $$
  SELECT household_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- ENABLE RLS
-- ============================================================

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
ALTER TABLE shopping_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_instances ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- households
CREATE POLICY "select_own" ON households FOR SELECT USING (true);
CREATE POLICY "insert_any" ON households FOR INSERT WITH CHECK (true);

-- profiles
CREATE POLICY "select_household" ON profiles FOR SELECT
  USING (household_id = my_household_id() OR id = auth.uid());
CREATE POLICY "update_own" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "insert_own" ON profiles FOR INSERT WITH CHECK (id = auth.uid());

-- messages
CREATE POLICY "select" ON messages FOR SELECT USING (household_id = my_household_id());
CREATE POLICY "insert" ON messages FOR INSERT WITH CHECK (household_id = my_household_id());
CREATE POLICY "update" ON messages FOR UPDATE USING (household_id = my_household_id());
CREATE POLICY "delete" ON messages FOR DELETE USING (household_id = my_household_id());

-- message_reads (join-based)
CREATE POLICY "select" ON message_reads FOR SELECT USING (
  EXISTS (SELECT 1 FROM messages WHERE messages.id = message_reads.message_id AND messages.household_id = my_household_id())
);
CREATE POLICY "insert" ON message_reads FOR INSERT WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (SELECT 1 FROM messages WHERE messages.id = message_reads.message_id AND messages.household_id = my_household_id())
);

-- expenses
CREATE POLICY "select" ON expenses FOR SELECT USING (household_id = my_household_id());
CREATE POLICY "insert" ON expenses FOR INSERT WITH CHECK (household_id = my_household_id());
CREATE POLICY "update" ON expenses FOR UPDATE USING (household_id = my_household_id());
CREATE POLICY "delete" ON expenses FOR DELETE USING (household_id = my_household_id());

-- expense_participants (join-based)
CREATE POLICY "select" ON expense_participants FOR SELECT USING (
  EXISTS (SELECT 1 FROM expenses WHERE expenses.id = expense_participants.expense_id AND expenses.household_id = my_household_id())
);
CREATE POLICY "insert" ON expense_participants FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM expenses WHERE expenses.id = expense_participants.expense_id AND expenses.household_id = my_household_id())
);
CREATE POLICY "delete" ON expense_participants FOR DELETE USING (
  EXISTS (SELECT 1 FROM expenses WHERE expenses.id = expense_participants.expense_id AND expenses.household_id = my_household_id())
);

-- chores (delete restricted to own contributions)
CREATE POLICY "select" ON chores FOR SELECT USING (household_id = my_household_id());
CREATE POLICY "insert" ON chores FOR INSERT WITH CHECK (household_id = my_household_id());
CREATE POLICY "update" ON chores FOR UPDATE USING (household_id = my_household_id());
CREATE POLICY "delete_own" ON chores FOR DELETE USING (household_id = my_household_id() AND user_id = auth.uid());

-- chore_tasks
CREATE POLICY "select" ON chore_tasks FOR SELECT USING (household_id = my_household_id());
CREATE POLICY "insert" ON chore_tasks FOR INSERT WITH CHECK (household_id = my_household_id());
CREATE POLICY "update" ON chore_tasks FOR UPDATE USING (household_id = my_household_id());
CREATE POLICY "delete" ON chore_tasks FOR DELETE USING (household_id = my_household_id());

-- chore_reminders
CREATE POLICY "select" ON chore_reminders FOR SELECT USING (household_id = my_household_id());
CREATE POLICY "insert" ON chore_reminders FOR INSERT WITH CHECK (household_id = my_household_id());
CREATE POLICY "update" ON chore_reminders FOR UPDATE USING (household_id = my_household_id());
CREATE POLICY "delete" ON chore_reminders FOR DELETE USING (household_id = my_household_id());

-- events
CREATE POLICY "select" ON events FOR SELECT USING (household_id = my_household_id());
CREATE POLICY "insert" ON events FOR INSERT WITH CHECK (household_id = my_household_id());
CREATE POLICY "update" ON events FOR UPDATE USING (household_id = my_household_id());
CREATE POLICY "delete" ON events FOR DELETE USING (household_id = my_household_id());

-- shared_files
CREATE POLICY "select" ON shared_files FOR SELECT USING (household_id = my_household_id());
CREATE POLICY "insert" ON shared_files FOR INSERT WITH CHECK (household_id = my_household_id());
CREATE POLICY "update" ON shared_files FOR UPDATE USING (household_id = my_household_id());
CREATE POLICY "delete" ON shared_files FOR DELETE USING (household_id = my_household_id());

-- shopping_items
CREATE POLICY "select" ON shopping_items FOR SELECT USING (household_id = my_household_id());
CREATE POLICY "insert" ON shopping_items FOR INSERT WITH CHECK (household_id = my_household_id());
CREATE POLICY "update" ON shopping_items FOR UPDATE USING (household_id = my_household_id());
CREATE POLICY "delete" ON shopping_items FOR DELETE USING (household_id = my_household_id());

-- recipes
CREATE POLICY "select" ON recipes FOR SELECT USING (household_id = my_household_id());
CREATE POLICY "insert" ON recipes FOR INSERT WITH CHECK (household_id = my_household_id());
CREATE POLICY "update" ON recipes FOR UPDATE USING (household_id = my_household_id());
CREATE POLICY "delete" ON recipes FOR DELETE USING (household_id = my_household_id());

-- recipe_instances
CREATE POLICY "select" ON recipe_instances FOR SELECT USING (household_id = my_household_id());
CREATE POLICY "insert" ON recipe_instances FOR INSERT WITH CHECK (household_id = my_household_id());
CREATE POLICY "update" ON recipe_instances FOR UPDATE USING (household_id = my_household_id());
CREATE POLICY "delete" ON recipe_instances FOR DELETE USING (household_id = my_household_id());

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

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

-- ============================================================
-- REALTIME
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE messages, expenses, chores, chore_tasks, chore_reminders, events, shared_files, shopping_items, recipes, recipe_instances, profiles;
