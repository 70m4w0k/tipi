import { Exercise } from "./types";

export const DEFAULT_EXERCISES: Omit<Exercise, "id" | "household_id" | "created_by" | "created_at">[] = [
  { name: "Pompes", icon: "barbell-outline", unit: "répétitions" },
  { name: "Abdos", icon: "fitness-outline", unit: "répétitions" },
  { name: "Squats", icon: "barbell-outline", unit: "répétitions" },
  { name: "Gainage", icon: "timer-outline", unit: "secondes" },
];