import { stepDurationInDays, formatDuration } from "../lib/calendar-logic";
import { RecipeStep } from "../lib/types";

function makeStep(unit: RecipeStep["duration_unit"], value: number): RecipeStep {
  return { title: "Test", description: "", duration_value: value, duration_unit: unit };
}

describe("stepDurationInDays", () => {
  it("returns days directly for unit=days", () => {
    expect(stepDurationInDays(makeStep("days", 7))).toBe(7);
  });

  it("converts 24+ hours to days", () => {
    expect(stepDurationInDays(makeStep("hours", 24))).toBe(1);
    expect(stepDurationInDays(makeStep("hours", 48))).toBe(2);
    expect(stepDurationInDays(makeStep("hours", 25))).toBe(2);
  });

  it("returns 0 for hours < 24", () => {
    expect(stepDurationInDays(makeStep("hours", 12))).toBe(0);
    expect(stepDurationInDays(makeStep("hours", 0))).toBe(0);
  });

  it("returns 0 for minutes", () => {
    expect(stepDurationInDays(makeStep("minutes", 120))).toBe(0);
  });

  it("returns 0 for 0 value", () => {
    expect(stepDurationInDays(makeStep("days", 0))).toBe(0);
  });
});

describe("formatDuration", () => {
  it("formats days with plural", () => {
    expect(formatDuration(makeStep("days", 1))).toBe("1 jour");
    expect(formatDuration(makeStep("days", 7))).toBe("7 jours");
  });

  it("formats hours", () => {
    expect(formatDuration(makeStep("hours", 2))).toBe("2h");
  });

  it("formats minutes", () => {
    expect(formatDuration(makeStep("minutes", 30))).toBe("30 min");
  });

  it("returns empty for 0 value", () => {
    expect(formatDuration(makeStep("days", 0))).toBe("");
    expect(formatDuration(makeStep("hours", 0))).toBe("");
  });
});
