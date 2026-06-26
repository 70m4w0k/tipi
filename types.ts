export type MessageType = "text" | "image" | "poll";

export type ChatMessage = {
  id: string;
  author: string;
  type: MessageType;
  content: string;
  poll?: {
    question: string;
    options: Array<{
      id: string;
      text: string;
      votes: string[];
    }>;
  };
  reactions: Record<string, string[]>;
  sentAt: string;
  readBy: string[];
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
  title: string;
  amount: number;
  payer: string;
  participants: string[];
  category: ExpenseCategory;
  note: string;
  createdAt: string;
};

export type Chore = {
  id: string;
  taskName: string;
  week: number;
  year: number;
  user: string;
  intensity: 0 | 1 | 2 | 3;
  performedAt: string;
};

export type ChoreTask = {
  id: string;
  name: string;
  createdAt: string;
};

export type ChoreReminder = {
  id: string;
  title: string;
  recurrence: string;
  lastDoneDate: string;
};

export type HouseEvent = {
  id: string;
  title: string;
  date: string;
  note: string;
};

export type SharedFile = {
  id: string;
  name: string;
  uri: string;
  uploadedBy: string;
  uploadedAt: string;
};

export type AppData = {
  messages: ChatMessage[];
  expenses: Expense[];
  chores: Chore[];
  choreTasks: ChoreTask[];
  choreReminder: ChoreReminder;
  events: HouseEvent[];
  files: SharedFile[];
};
