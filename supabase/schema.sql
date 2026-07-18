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
  task_id uuid NOT NULL REFERENCES chore_tasks(id) ON DELETE CASCADE,
  title text NOT NULL,
  recurrence text NOT NULL,
  week_parity smallint CHECK (week_parity IN (0, 1)),
  start_date date,
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
  icon text,
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
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE pending_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  claimed_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id),
  name text NOT NULL,
  icon text NOT NULL DEFAULT 'barbell-outline',
  unit text NOT NULL DEFAULT 'répétitions',
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE (household_id, name)
);

CREATE TABLE exercise_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id),
  exercise_id uuid NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id),
  count int NOT NULL CHECK (count > 0),
  logged_at timestamptz DEFAULT now(),
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
ALTER TABLE pending_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_logs ENABLE ROW LEVEL SECURITY;

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
CREATE POLICY "admin_update_member" ON profiles FOR UPDATE
  USING (
    household_id = my_household_id()
    AND EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin' AND p.household_id = my_household_id()
    )
  )
  WITH CHECK (true);
CREATE POLICY "insert_own" ON profiles FOR INSERT WITH CHECK (id = auth.uid());

-- Exclusion d'un membre : le RLS applique le USING de admin_update_member à la nouvelle
-- ligne, ce qui bloque household_id = null. On passe par une fonction SECURITY DEFINER.
CREATE OR REPLACE FUNCTION kick_member(target uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM profiles admin_p
    JOIN profiles target_p ON target_p.household_id = admin_p.household_id
    WHERE admin_p.id = auth.uid()
      AND admin_p.role = 'admin'
      AND target_p.id = target
      AND target_p.id <> admin_p.id
  ) THEN
    RAISE EXCEPTION 'not allowed: caller must be an admin of the member''s household';
  END IF;
  UPDATE profiles SET household_id = NULL WHERE id = target;
END;
$$;
GRANT EXECUTE ON FUNCTION kick_member(uuid) TO authenticated;

-- Suppression de coloc : nuller les membres d'abord met my_household_id() à null, donc
-- le DELETE RLS ne matche plus. Fonction SECURITY DEFINER pour l'admin.
CREATE OR REPLACE FUNCTION delete_household()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hid uuid;
BEGIN
  SELECT household_id INTO hid FROM profiles WHERE id = auth.uid();
  IF hid IS NULL THEN
    RAISE EXCEPTION 'no household';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND household_id = hid
  ) THEN
    RAISE EXCEPTION 'not allowed: caller must be an admin of the household';
  END IF;
  DELETE FROM message_reads WHERE message_id IN (SELECT id FROM messages WHERE household_id = hid);
  DELETE FROM messages WHERE household_id = hid;
  DELETE FROM expenses WHERE household_id = hid;
  DELETE FROM chores WHERE household_id = hid;
  DELETE FROM chore_tasks WHERE household_id = hid;
  DELETE FROM chore_reminders WHERE household_id = hid;
  DELETE FROM events WHERE household_id = hid;
  DELETE FROM shared_files WHERE household_id = hid;
  DELETE FROM shopping_items WHERE household_id = hid;
  DELETE FROM recipe_instances WHERE household_id = hid;
  DELETE FROM recipes WHERE household_id = hid;
  UPDATE profiles SET household_id = NULL WHERE household_id = hid;
  DELETE FROM households WHERE id = hid;
END;
$$;
GRANT EXECUTE ON FUNCTION delete_household() TO authenticated;

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

-- pending_members
CREATE POLICY "select" ON pending_members FOR SELECT USING (household_id = my_household_id());
CREATE POLICY "insert" ON pending_members FOR INSERT WITH CHECK (household_id = my_household_id());
CREATE POLICY "update" ON pending_members FOR UPDATE USING (household_id = my_household_id());
CREATE POLICY "delete" ON pending_members FOR DELETE USING (household_id = my_household_id());

-- exercises
CREATE POLICY "select" ON exercises FOR SELECT USING (household_id = my_household_id());
CREATE POLICY "insert" ON exercises FOR INSERT WITH CHECK (household_id = my_household_id());
CREATE POLICY "update" ON exercises FOR UPDATE USING (household_id = my_household_id());
CREATE POLICY "delete" ON exercises FOR DELETE USING (household_id = my_household_id());

-- exercise_logs
CREATE POLICY "select" ON exercise_logs FOR SELECT USING (household_id = my_household_id());
CREATE POLICY "insert" ON exercise_logs FOR INSERT WITH CHECK (household_id = my_household_id());
CREATE POLICY "update" ON exercise_logs FOR UPDATE USING (household_id = my_household_id());
CREATE POLICY "delete" ON exercise_logs FOR DELETE USING (household_id = my_household_id());

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

ALTER PUBLICATION supabase_realtime ADD TABLE messages, expenses, chores, chore_tasks, chore_reminders, events, shared_files, shopping_items, recipes, recipe_instances, profiles, pending_members;

-- =====================================================================
-- Grants rôles Supabase (le RLS filtre ensuite les lignes). Nécessaire
-- pour que anon/authenticated accèdent aux tables sur une base fraîche
-- (le cloud les pose via des privilèges par défaut, pas le CLI local).
-- =====================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- =====================================================================
-- Premier membre d'une coloc = admin (réplique le comportement prod).
-- Sur un changement de household_id : admin si personne d'autre n'est
-- déjà dans la coloc, sinon member. Les updates de rôle seuls (promote/
-- demote) et le retrait (household_id -> null) ne sont pas affectés.
-- =====================================================================
CREATE OR REPLACE FUNCTION set_first_member_role()
RETURNS trigger AS $$
BEGIN
  IF NEW.household_id IS NOT NULL AND NEW.household_id IS DISTINCT FROM OLD.household_id THEN
    IF EXISTS (SELECT 1 FROM profiles WHERE household_id = NEW.household_id AND id <> NEW.id) THEN
      NEW.role := 'member';
    ELSE
      NEW.role := 'admin';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_first_member_role ON profiles;
CREATE TRIGGER trg_first_member_role
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_first_member_role();
