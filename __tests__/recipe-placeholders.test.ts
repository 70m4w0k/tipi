import { RECIPE_ICONS, getRecipePlaceholder } from "../lib/recipe-placeholders";

describe("getRecipePlaceholder", () => {
  it("returns a fallback icon and background color", () => {
    const result = getRecipePlaceholder("some-id");
    expect(result.icon).toBeTruthy();
    expect(result.bg).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it("uses the provided icon instead of fallback", () => {
    const result = getRecipePlaceholder("some-id", "flame-outline");
    expect(result.icon).toBe("flame-outline");
  });

  it("falls back when icon is null", () => {
    const result = getRecipePlaceholder("some-id", null);
    expect(RECIPE_ICONS.map((i) => i.name)).toContain(result.icon);
  });

  it("returns deterministic results for same id", () => {
    const a = getRecipePlaceholder("abc");
    const b = getRecipePlaceholder("abc");
    expect(a).toEqual(b);
  });

  it("varies output for different ids", () => {
    const a = getRecipePlaceholder("a");
    const b = getRecipePlaceholder("zzzzzz");
    expect(a.bg !== b.bg || a.icon !== b.icon).toBe(true);
  });
});

describe("RECIPE_ICONS", () => {
  it("all icons end with -outline", () => {
    for (const icon of RECIPE_ICONS) {
      expect(icon.name).toMatch(/-outline$/);
    }
  });

  it("all icons have a label", () => {
    for (const icon of RECIPE_ICONS) {
      expect(icon.label.length).toBeGreaterThan(0);
    }
  });
});
