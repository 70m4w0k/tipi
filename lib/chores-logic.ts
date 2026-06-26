import { Chore, ChoreTask } from "./types";

export const DEFAULT_CHORE_TASKS = [
  "Aspi haut", "Aspi bas", "Serp haut", "Serp bas",
  "WC haut", "WC bas", "Cuisine", "Véranda",
  "Verre", "SdB 1", "SdB 2", "SdB 3",
  "Escalier", "Poubelles",
];

export type IntensityAction =
  | { type: "insert"; intensity: 1 }
  | { type: "update"; id: string; intensity: 1 | 2 | 3 }
  | { type: "delete"; id: string };

export function resolveIntensityAction(
  chores: Chore[],
  taskName: string,
  week: number,
  year: number,
  userId: string
): IntensityAction {
  const existing = chores.find(
    (c) =>
      c.task_name === taskName &&
      c.week === week &&
      c.year === year &&
      c.user_id === userId
  );

  if (!existing) {
    return { type: "insert", intensity: 1 };
  }
  if (existing.intensity >= 3) {
    return { type: "delete", id: existing.id };
  }
  return {
    type: "update",
    id: existing.id,
    intensity: (existing.intensity + 1) as 1 | 2 | 3,
  };
}

export function filterVisibleTasks(tasks: ChoreTask[]): ChoreTask[] {
  return tasks.filter((t) => t.show_in_grid);
}

export type ChoreSuggestion = {
  taskName: string;
  daysSince: number;
  message: string;
};

export function getContextualSuggestions(
  chores: Chore[],
  tasks: ChoreTask[]
): ChoreSuggestion[] {
  const now = Date.now();
  const suggestions: ChoreSuggestion[] = [];

  for (const task of tasks) {
    const taskChores = chores.filter((c) => c.task_name === task.name && c.intensity > 0);
    if (taskChores.length === 0 && task.created_at) {
      const created = new Date(task.created_at).getTime();
      const daysSince = Math.floor((now - created) / 86400000);
      if (daysSince >= 14) {
        const weeks = Math.floor(daysSince / 7);
        suggestions.push({
          taskName: task.name,
          daysSince,
          message: `${weeks} semaine${weeks > 1 ? "s" : ""} sans ${task.name.toLowerCase()}`,
        });
      }
      continue;
    }

    let latestDate = 0;
    for (const c of taskChores) {
      if (c.performed_at) {
        const d = new Date(c.performed_at).getTime();
        if (d > latestDate) latestDate = d;
      } else {
        const isoDate = getDateFromWeekYear(c.week, c.year);
        if (isoDate > latestDate) latestDate = isoDate;
      }
    }

    if (latestDate > 0) {
      const daysSince = Math.floor((now - latestDate) / 86400000);
      if (daysSince >= 14) {
        const weeks = Math.floor(daysSince / 7);
        suggestions.push({
          taskName: task.name,
          daysSince,
          message: `${weeks} semaine${weeks > 1 ? "s" : ""} sans ${task.name.toLowerCase()}`,
        });
      }
    }
  }

  return suggestions.sort((a, b) => b.daysSince - a.daysSince);
}

function getDateFromWeekYear(week: number, year: number): number {
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const mondayOfWeek1 = new Date(jan4);
  mondayOfWeek1.setDate(jan4.getDate() - dayOfWeek + 1);
  const target = new Date(mondayOfWeek1);
  target.setDate(mondayOfWeek1.getDate() + (week - 1) * 7);
  return target.getTime();
}
