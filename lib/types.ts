export type Profile = {
  id: string;
  email: string;
  display_name: string;
  color: string;
  avatar_url: string | null;
  household_id: string | null;
  created_at: string;
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
  title: string;
  recurrence: string;
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
  category: string;
  checked: boolean;
  created_by: string | null;
  created_at: string;
};

export type RecipeStep = {
  title: string;
  description: string;
  duration_hint: string;
};

export type Recipe = {
  id: string;
  household_id: string;
  title: string;
  description: string;
  ingredients: string[];
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
  started_at: string;
  step_started_at: string;
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
