import { RecipeStep } from "./types";

export type CalendarItemType = "event" | "birthday" | "recipe_planned" | "recipe_active";

export type CalendarStepInfo = {
  index: number;
  title: string;
  status: "completed" | "current" | "upcoming";
  date: string;
  duration: string;
};

export type CalendarItem = {
  id: string;
  type: CalendarItemType;
  title: string;
  subtitle?: string;
  date: string;
  color: string;
  instanceId?: string;
  recipeSteps?: CalendarStepInfo[];
  delay?: number;
};

export const FILTER_COLORS: Record<CalendarItemType, string> = {
  event: "#2563EB",
  birthday: "#EC4899",
  recipe_planned: "#F97316",
  recipe_active: "#FDBA74",
};

export const FILTER_LABELS: Record<CalendarItemType, string> = {
  event: "Événements",
  birthday: "Anniversaires",
  recipe_planned: "Recettes",
  recipe_active: "Recettes",
};

export function stepDurationInDays(step: RecipeStep): number {
  const v = step.duration_value ?? 0;
  switch (step.duration_unit) {
    case "days":
      return v;
    case "hours":
      return v >= 24 ? Math.ceil(v / 24) : 0;
    case "minutes":
    default:
      return 0;
  }
}

export function formatDuration(step: RecipeStep): string {
  const v = step.duration_value ?? 0;
  if (v <= 0) return "";
  switch (step.duration_unit) {
    case "days":
      return `${v} jour${v > 1 ? "s" : ""}`;
    case "hours":
      return `${v}h`;
    case "minutes":
      return `${v} min`;
    default:
      return "";
  }
}

export function computePlannedStepDates(
  steps: RecipeStep[],
  targetDate: string,
  stepCompletions: string[],
  currentStep: number,
  stepStartedAt: string,
): string[] {
  const target = new Date(targetDate);
  const dates: string[] = new Array(steps.length);

  const lastCompletedIdx = stepCompletions.length - 1;

  if (lastCompletedIdx >= 0) {
    for (let i = 0; i <= lastCompletedIdx && i < steps.length; i++) {
      const days = i > 0 ? stepDurationInDays(steps[i - 1]) : 0;
      const startDate = new Date(stepCompletions[i > 0 ? i - 1 : 0] || stepStartedAt);
      startDate.setDate(startDate.getDate() + days);
      dates[i] = formatDateISO(startDate);
    }

    const lastCompletionDate = new Date(stepCompletions[lastCompletedIdx]);
    const daysAfterLast = stepDurationInDays(steps[lastCompletedIdx]);
    let cursor = new Date(lastCompletionDate);
    cursor.setDate(cursor.getDate() + daysAfterLast);

    for (let i = lastCompletedIdx + 1; i < steps.length; i++) {
      dates[i] = formatDateISO(cursor);
      const days = stepDurationInDays(steps[i]);
      cursor = new Date(cursor);
      cursor.setDate(cursor.getDate() + days);
    }
  } else {
    let totalDays = 0;
    for (const step of steps) {
      totalDays += stepDurationInDays(step);
    }

    const cursor = new Date(target);
    cursor.setDate(cursor.getDate() - totalDays);

    for (let i = 0; i < steps.length; i++) {
      dates[i] = formatDateISO(cursor);
      cursor.setDate(cursor.getDate() + stepDurationInDays(steps[i]));
    }
  }

  return dates;
}

export function computeTotalDays(steps: RecipeStep[]): number {
  let total = 0;
  for (const step of steps) {
    total += stepDurationInDays(step);
  }
  return total;
}

export function getDelayDays(targetDate: string, steps: RecipeStep[], stepCompletions: string[], currentStep: number, stepStartedAt: string): number {
  const dates = computePlannedStepDates(steps, targetDate, stepCompletions, currentStep, stepStartedAt);
  if (dates.length === 0) return 0;
  const lastPlanned = new Date(dates[dates.length - 1]);
  const target = new Date(targetDate);
  const days = stepDurationInDays(steps[steps.length - 1]);
  lastPlanned.setDate(lastPlanned.getDate() + days);
  const diff = Math.ceil((lastPlanned.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

export function formatDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getBirthdayThisYear(birthday: string): string {
  const now = new Date();
  const bd = new Date(birthday);
  const thisYear = new Date(now.getFullYear(), bd.getMonth(), bd.getDate());
  return formatDateISO(thisYear);
}

export function getAge(birthday: string): number {
  const now = new Date();
  const bd = new Date(birthday);
  let age = now.getFullYear() - bd.getFullYear();
  const m = now.getMonth() - bd.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < bd.getDate())) age--;
  return age;
}
