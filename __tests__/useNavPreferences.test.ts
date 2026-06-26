import { parseStoredTabs, DEFAULT_TABS, NavTab } from "../lib/nav-preferences-logic";

describe("parseStoredTabs", () => {
  it("returns default tabs when null", () => {
    expect(parseStoredTabs(null)).toEqual(DEFAULT_TABS);
  });

  it("returns default tabs when empty string", () => {
    expect(parseStoredTabs("")).toEqual(DEFAULT_TABS);
  });

  it("parses valid saved tabs", () => {
    const saved: NavTab[] = ["home", "chat", "shopping"];
    expect(parseStoredTabs(JSON.stringify(saved))).toEqual(saved);
  });

  it("injects home tab when missing", () => {
    const saved: NavTab[] = ["chat", "expenses"];
    const result = parseStoredTabs(JSON.stringify(saved));
    expect(result[0]).toBe("home");
    expect(result).toContain("chat");
    expect(result).toContain("expenses");
    expect(result).toHaveLength(3);
  });

  it("keeps home in place when already present", () => {
    const saved: NavTab[] = ["chat", "home", "expenses"];
    const result = parseStoredTabs(JSON.stringify(saved));
    expect(result).toEqual(saved);
  });

  it("falls back to defaults on corrupted JSON", () => {
    expect(parseStoredTabs("not json{{{")).toEqual(DEFAULT_TABS);
  });

  it("falls back to defaults on empty array", () => {
    expect(parseStoredTabs("[]")).toEqual(DEFAULT_TABS);
  });

  it("falls back to defaults on non-array JSON", () => {
    expect(parseStoredTabs('{"key": "value"}')).toEqual(DEFAULT_TABS);
  });

  it("falls back to defaults on JSON number", () => {
    expect(parseStoredTabs("42")).toEqual(DEFAULT_TABS);
  });
});
