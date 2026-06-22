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
  title: string;
  dueAt: string;
  assignee: string;
  done: boolean;
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
  events: HouseEvent[];
  files: SharedFile[];
};
