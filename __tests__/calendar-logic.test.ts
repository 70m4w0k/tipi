import {
  computePlannedStepDates,
  computeTotalDays,
  getDelayDays,
  getBirthdayThisYear,
  getAge,
  formatDateISO,
} from "../lib/calendar-logic";
import { RecipeStep } from "../lib/types";

function makeStep(title: string, days: number): RecipeStep {
  return { title, description: "", duration_value: days, duration_unit: "days" };
}

describe("computeTotalDays", () => {
  it("sums duration days across all steps", () => {
    const steps = [makeStep("A", 7), makeStep("B", 3), makeStep("C", 0)];
    expect(computeTotalDays(steps)).toBe(10);
  });

  it("returns 0 for steps with no rest", () => {
    const steps = [makeStep("A", 0), makeStep("B", 0)];
    expect(computeTotalDays(steps)).toBe(0);
  });
});

describe("computePlannedStepDates", () => {
  it("calculates dates by counting back from target", () => {
    const steps = [makeStep("Saler", 12), makeStep("Sécher", 2), makeStep("Prêt", 0)];
    const dates = computePlannedStepDates(steps, "2026-12-25", [], 0, "");
    expect(dates[0]).toBe("2026-12-11");
    expect(dates[1]).toBe("2026-12-23");
    expect(dates[2]).toBe("2026-12-25");
  });

  it("recalculates from actual completions when steps are done", () => {
    const steps = [makeStep("Saler", 1), makeStep("Rincer", 1), makeStep("Prêt", 0)];
    const completions = ["2026-12-24T10:00:00Z"];
    const dates = computePlannedStepDates(steps, "2026-12-25", completions, 1, "2026-12-22T10:00:00Z");
    expect(dates[1]).toBe("2026-12-25");
    expect(dates[2]).toBe("2026-12-26");
  });
});

describe("getDelayDays", () => {
  it("returns 0 when on schedule", () => {
    const steps = [makeStep("A", 2), makeStep("B", 0)];
    const delay = getDelayDays("2026-12-25", steps, [], 0, "");
    expect(delay).toBe(0);
  });

  it("returns positive delay when behind schedule", () => {
    const steps = [makeStep("A", 1), makeStep("B", 0)];
    const completions = ["2026-12-26T10:00:00Z"];
    const delay = getDelayDays("2026-12-25", steps, completions, 1, "2026-12-24T10:00:00Z");
    expect(delay).toBeGreaterThan(0);
  });
});

describe("getBirthdayThisYear", () => {
  it("returns the birthday date in the current year", () => {
    const result = getBirthdayThisYear("1995-03-15");
    const year = new Date().getFullYear();
    expect(result).toBe(`${year}-03-15`);
  });
});

describe("getAge", () => {
  it("calculates age correctly", () => {
    const thisYear = new Date().getFullYear();
    const age = getAge(`${thisYear - 25}-01-01`);
    expect(age).toBeGreaterThanOrEqual(24);
    expect(age).toBeLessThanOrEqual(25);
  });
});

describe("formatDateISO", () => {
  it("returns YYYY-MM-DD format", () => {
    const d = new Date(2026, 11, 25);
    expect(formatDateISO(d)).toBe("2026-12-25");
  });
});
