export type Profile = {
  id: string;
  email: string;
  display_name: string;
  color: string;
  avatar_url: string | null;
  household_id: string | null;
  role: "admin" | "member";
  birthday: string | null;
  created_at: string;
  show_sport_level: boolean;
  sport_title: string | null;
};

export type Household = {
  id: string;
  name: string;
  invite_code: string;
  created_at: string;
};

export type MessageType = "text" | "image" | "poll";

export type PollOption = {
  id: string;
  text: string;
  votes: string[];
};

export type Poll = {
  question: string;
  options: PollOption[];
};

export type Message = {
  id: string;
  household_id: string;
  author_id: string;
  type: MessageType;
  content: string | null;
  poll: Poll | null;
  reactions: Record<string, string[]>;
  sent_at: string;
};

export type MessageRead = {
  message_id: string;
  user_id: string;
  read_at: string;
};

export type ExpenseCategory =
  | "courses"
  | "loyer"
  | "restaurant"
  | "transport"
  | "loisirs"
  | "autre";

export type Expense = {
  id: string;
  household_id: string;
  title: string;
  amount: number;
  payer_id: string;
  category: ExpenseCategory;
  note: string;
  created_at: string;
};

export type ExpenseParticipant = {
  expense_id: string;
  user_id: string;
};

export type Chore = {
  id: string;
  household_id: string;
  user_id: string;
  task_name: string;
  week: number;
  year: number;
  intensity: 0 | 1 | 2 | 3;
  performed_at: string | null;
};

export type ChoreTask = {
  id: string;
  household_id: string;
  name: string;
  show_in_grid: boolean;
  created_at: string;
};

export type ChoreReminder = {
  id: string;
  household_id: string;
  task_id: string;
  title: string;
  recurrence: string;
  week_parity: number | null;
  start_date: string | null;
  last_done_date: string | null;
};

export type HouseEvent = {
  id: string;
  household_id: string;
  title: string;
  date: string;
  note: string;
  created_by: string | null;
  created_at: string;
};

export type ShoppingItem = {
  id: string;
  household_id: string;
  title: string;
  quantity: string;
  category: string;
  checked: boolean;
  /** null = article partagé (coloc) ; sinon perso à ce membre */
  owner_id: string | null;
  created_by: string | null;
  created_at: string;
};

export type DurationUnit = "minutes" | "hours" | "days";

export type RecipeStep = {
  title: string;
  description: string;
  duration_value: number;
  duration_unit: DurationUnit;
};

export type Ingredient = {
  name: string;
  /** null = non quantifiable (ex. "à volonté") */
  amount: number | null;
  unit: string;
};

export type Recipe = {
  id: string;
  household_id: string;
  title: string;
  description: string;
  icon: string | null;
  servings: number;
  ingredients: Ingredient[];
  steps: RecipeStep[];
  created_by: string | null;
  created_at: string;
};

export type RecipeInstance = {
  id: string;
  household_id: string;
  recipe_id: string;
  label: string;
  current_step: number;
  notes: string;
  target_date: string | null;
  step_completions: string[];
  started_at: string;
  step_started_at: string;
  completed_at: string | null;
  created_at: string;
};

export type PendingMember = {
  id: string;
  household_id: string;
  display_name: string;
  claimed_by: string | null;
  created_at: string;
};

export type SharedFile = {
  id: string;
  household_id: string;
  name: string;
  storage_path: string;
  uploaded_by: string | null;
  uploaded_at: string;
};

export type ExerciseVariant = { name: string; color: string };

export type Exercise = {
  id: string;
  household_id: string;
  name: string;
  icon: string;
  unit: string;
  created_by: string | null;
  created_at: string;
  variants: ExerciseVariant[];
};

export type ExerciseLog = {
  id: string;
  household_id: string;
  exercise_id: string;
  user_id: string;
  count: number;
  logged_at: string;
  created_at: string;
  variant: string | null;
  /** poids en kg par série ; null = poids du corps / non renseigné */
  weight: number | null;
};

export type WorkoutItem = {
  exercise_id: string;
  sets: number;
  reps: number;
  weight: number | null;
  per_side: boolean;
};

export type Workout = {
  id: string;
  household_id: string;
  name: string;
  icon: string;
  items: WorkoutItem[];
  created_by: string | null;
  created_at: string;
};

export type ExerciseBadge = {
  id: string;
  exercise_id: string;
  household_id: string;
  threshold: number;
  title: string;
  icon: string;
};

export type TemporalBadge = {
  id: string;
  exercise_id: string;
  household_id: string;
  threshold: number;
  window_days: number;
  title: string;
  icon: string;
  grace_hours: number;
};

export type UserBadge = {
  id: string;
  user_id: string;
  badge_id: string;
  unlocked_at: string;
};
