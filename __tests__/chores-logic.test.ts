import { resolveIntensityAction, filterVisibleTasks, DEFAULT_CHORE_TASKS } from "../lib/chores-logic";
import { Chore, ChoreTask } from "../lib/types";

function makeChore(
  id: string,
  taskName: string,
  week: number,
  year: number,
  userId: string,
  intensity: 0 | 1 | 2 | 3
): Chore {
  return {
    id,
    household_id: "h1",
    user_id: userId,
    task_name: taskName,
    week,
    year,
    intensity,
    performed_at: null,
  };
}

function makeTask(id: string, name: string, showInGrid: boolean): ChoreTask {
  return { id, household_id: "h1", name, show_in_grid: showInGrid, created_at: "" };
}

describe("resolveIntensityAction", () => {
  it("inserts with intensity 1 when no existing entry", () => {
    const result = resolveIntensityAction([], "Aspirateur", 25, 2026, "u1");
    expect(result).toEqual({ type: "insert", intensity: 1 });
  });

  it("increments intensity from 1 to 2", () => {
    const chores = [makeChore("c1", "Aspirateur", 25, 2026, "u1", 1)];
    const result = resolveIntensityAction(chores, "Aspirateur", 25, 2026, "u1");
    expect(result).toEqual({ type: "update", id: "c1", intensity: 2 });
  });

  it("increments intensity from 2 to 3", () => {
    const chores = [makeChore("c1", "Aspirateur", 25, 2026, "u1", 2)];
    const result = resolveIntensityAction(chores, "Aspirateur", 25, 2026, "u1");
    expect(result).toEqual({ type: "update", id: "c1", intensity: 3 });
  });

  it("deletes when intensity is 3 (cycle back to 0)", () => {
    const chores = [makeChore("c1", "Aspirateur", 25, 2026, "u1", 3)];
    const result = resolveIntensityAction(chores, "Aspirateur", 25, 2026, "u1");
    expect(result).toEqual({ type: "delete", id: "c1" });
  });

  it("does not match different task name", () => {
    const chores = [makeChore("c1", "Vaisselle", 25, 2026, "u1", 1)];
    const result = resolveIntensityAction(chores, "Aspirateur", 25, 2026, "u1");
    expect(result).toEqual({ type: "insert", intensity: 1 });
  });

  it("does not match different week", () => {
    const chores = [makeChore("c1", "Aspirateur", 24, 2026, "u1", 1)];
    const result = resolveIntensityAction(chores, "Aspirateur", 25, 2026, "u1");
    expect(result).toEqual({ type: "insert", intensity: 1 });
  });

  it("does not match different year", () => {
    const chores = [makeChore("c1", "Aspirateur", 25, 2025, "u1", 1)];
    const result = resolveIntensityAction(chores, "Aspirateur", 25, 2026, "u1");
    expect(result).toEqual({ type: "insert", intensity: 1 });
  });

  it("does not match different user", () => {
    const chores = [makeChore("c1", "Aspirateur", 25, 2026, "u2", 1)];
    const result = resolveIntensityAction(chores, "Aspirateur", 25, 2026, "u1");
    expect(result).toEqual({ type: "insert", intensity: 1 });
  });

  it("finds the correct entry among many chores", () => {
    const chores = [
      makeChore("c1", "Vaisselle", 25, 2026, "u1", 1),
      makeChore("c2", "Aspirateur", 24, 2026, "u1", 2),
      makeChore("c3", "Aspirateur", 25, 2026, "u2", 3),
      makeChore("c4", "Aspirateur", 25, 2026, "u1", 2),
    ];
    const result = resolveIntensityAction(chores, "Aspirateur", 25, 2026, "u1");
    expect(result).toEqual({ type: "update", id: "c4", intensity: 3 });
  });
});

describe("filterVisibleTasks", () => {
  it("returns only tasks with show_in_grid true", () => {
    const tasks = [
      makeTask("t1", "Aspirateur", true),
      makeTask("t2", "Poubelles", false),
      makeTask("t3", "Vaisselle", true),
    ];
    const visible = filterVisibleTasks(tasks);
    expect(visible).toHaveLength(2);
    expect(visible.map((t) => t.name)).toEqual(["Aspirateur", "Vaisselle"]);
  });

  it("returns empty array when no tasks are visible", () => {
    const tasks = [
      makeTask("t1", "A", false),
      makeTask("t2", "B", false),
    ];
    expect(filterVisibleTasks(tasks)).toHaveLength(0);
  });

  it("returns all tasks when all are visible", () => {
    const tasks = [
      makeTask("t1", "A", true),
      makeTask("t2", "B", true),
    ];
    expect(filterVisibleTasks(tasks)).toHaveLength(2);
  });

  it("returns empty array for empty input", () => {
    expect(filterVisibleTasks([])).toEqual([]);
  });
});

describe("DEFAULT_CHORE_TASKS", () => {
  it("contains 14 tasks", () => {
    expect(DEFAULT_CHORE_TASKS).toHaveLength(14);
  });

  it("has no duplicates", () => {
    const unique = new Set(DEFAULT_CHORE_TASKS);
    expect(unique.size).toBe(DEFAULT_CHORE_TASKS.length);
  });

  it("includes expected tasks", () => {
    expect(DEFAULT_CHORE_TASKS).toContain("Cuisine");
    expect(DEFAULT_CHORE_TASKS).toContain("Poubelles");
    expect(DEFAULT_CHORE_TASKS).toContain("Escalier");
    expect(DEFAULT_CHORE_TASKS).toContain("SdB 1");
  });
});
