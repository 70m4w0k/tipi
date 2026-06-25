import { CATEGORY_LABELS, CATEGORY_COLORS, CATEGORY_ICONS } from "../lib/expense-categories";
import { ExpenseCategory } from "../lib/types";

const ALL_CATEGORIES: ExpenseCategory[] = [
  "courses",
  "loyer",
  "restaurant",
  "transport",
  "loisirs",
  "autre",
];

describe("expense-categories", () => {
  it("CATEGORY_LABELS covers all categories", () => {
    for (const cat of ALL_CATEGORIES) {
      expect(CATEGORY_LABELS[cat]).toBeDefined();
      expect(typeof CATEGORY_LABELS[cat]).toBe("string");
      expect(CATEGORY_LABELS[cat].length).toBeGreaterThan(0);
    }
  });

  it("CATEGORY_COLORS covers all categories with valid hex colors", () => {
    for (const cat of ALL_CATEGORIES) {
      expect(CATEGORY_COLORS[cat]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("CATEGORY_ICONS covers all categories with Ionicon names", () => {
    for (const cat of ALL_CATEGORIES) {
      expect(CATEGORY_ICONS[cat]).toBeDefined();
      expect(CATEGORY_ICONS[cat]).toMatch(/-outline$/);
    }
  });

  it("labels do not contain emoji characters", () => {
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]/u;
    for (const cat of ALL_CATEGORIES) {
      expect(CATEGORY_LABELS[cat]).not.toMatch(emojiRegex);
    }
  });

  it("all three maps have the same keys", () => {
    const labelKeys = Object.keys(CATEGORY_LABELS).sort();
    const colorKeys = Object.keys(CATEGORY_COLORS).sort();
    const iconKeys = Object.keys(CATEGORY_ICONS).sort();
    expect(labelKeys).toEqual(colorKeys);
    expect(labelKeys).toEqual(iconKeys);
  });
});
