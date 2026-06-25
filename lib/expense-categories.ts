import { ExpenseCategory } from "./types";

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  courses: "Courses",
  loyer: "Loyer",
  restaurant: "Restaurant",
  transport: "Transport",
  loisirs: "Loisirs",
  autre: "Autre",
};

export const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  courses: "#10B981",
  loyer: "#3B82F6",
  restaurant: "#F59E0B",
  transport: "#8B5CF6",
  loisirs: "#EC4899",
  autre: "#6B7280",
};

export const CATEGORY_ICONS: Record<ExpenseCategory, string> = {
  courses: "cart-outline",
  loyer: "home-outline",
  restaurant: "restaurant-outline",
  transport: "car-outline",
  loisirs: "game-controller-outline",
  autre: "cube-outline",
};
