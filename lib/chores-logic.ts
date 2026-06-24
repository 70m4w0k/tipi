import { Chore, ChoreTask } from "./types";

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
