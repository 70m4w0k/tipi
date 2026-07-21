import { getContextualSuggestions, ChoreSuggestion } from "../lib/chores-logic";
import { Chore, ChoreTask } from "../lib/types";

const makeTask = (name: string, created_at?: string): ChoreTask => ({
  id: `task-${name}`,
  household_id: "h1",
  name,
  show_in_grid: true,
  created_at: created_at ?? new Date().toISOString(),
});

const makeChore = (taskName: string, daysAgo: number): Chore => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return {
    id: `chore-${taskName}-${daysAgo}`,
    household_id: "h1",
    user_id: "u1",
    task_name: taskName,
    week: 1,
    year: 2026,
    intensity: 2,
    performed_at: d.toISOString(),
  };
};

describe("getContextualSuggestions", () => {
  it("returns no suggestions when all tasks are recent", () => {
    const tasks = [makeTask("Sol")];
    const chores = [makeChore("Sol", 3)];
    expect(getContextualSuggestions(chores, tasks)).toHaveLength(0);
  });

  it("returns suggestion when task not done for 14+ days", () => {
    const tasks = [makeTask("SDB")];
    const chores = [makeChore("SDB", 20)];
    const result = getContextualSuggestions(chores, tasks);
    expect(result).toHaveLength(1);
    expect(result[0].taskName).toBe("SDB");
    expect(result[0].message).toMatch(/^rien depuis \d+ semaines?$/);
  });

  it("returns suggestion for task never done (created 14+ days ago)", () => {
    const created = new Date();
    created.setDate(created.getDate() - 21);
    const tasks = [makeTask("Poussière", created.toISOString())];
    const result = getContextualSuggestions([], tasks);
    expect(result).toHaveLength(1);
    expect(result[0].taskName).toBe("Poussière");
    expect(result[0].daysSince).toBeGreaterThanOrEqual(21);
  });

  it("does not suggest tasks done less than 14 days ago", () => {
    const tasks = [makeTask("Cuisine")];
    const chores = [makeChore("Cuisine", 10)];
    expect(getContextualSuggestions(chores, tasks)).toHaveLength(0);
  });

  it("sorts suggestions by daysSince descending", () => {
    const tasks = [makeTask("Sol"), makeTask("SDB")];
    const chores = [makeChore("Sol", 30), makeChore("SDB", 15)];
    const result = getContextualSuggestions(chores, tasks);
    expect(result).toHaveLength(2);
    expect(result[0].taskName).toBe("Sol");
    expect(result[1].taskName).toBe("SDB");
  });

  it("uses most recent chore entry, not oldest", () => {
    const tasks = [makeTask("Sol")];
    const chores = [makeChore("Sol", 30), makeChore("Sol", 5)];
    expect(getContextualSuggestions(chores, tasks)).toHaveLength(0);
  });

  it("ignores intensity-0 chores", () => {
    const tasks = [makeTask("Sol")];
    const chore: Chore = {
      ...makeChore("Sol", 5),
      intensity: 0,
    };
    const created = new Date();
    created.setDate(created.getDate() - 20);
    const taskWithOldDate = makeTask("Sol", created.toISOString());
    const result = getContextualSuggestions([chore], [taskWithOldDate]);
    expect(result).toHaveLength(1);
  });
});
