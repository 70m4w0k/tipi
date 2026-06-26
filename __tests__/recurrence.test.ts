import { recurrenceMatchesDay } from "../lib/recurrence";

describe("recurrenceMatchesDay", () => {
  it("matches full French day name", () => {
    expect(recurrenceMatchesDay("lundi, mercredi, vendredi", 1)).toBe(true);
    expect(recurrenceMatchesDay("lundi, mercredi, vendredi", 3)).toBe(true);
    expect(recurrenceMatchesDay("lundi, mercredi, vendredi", 5)).toBe(true);
  });

  it("does not match non-included days", () => {
    expect(recurrenceMatchesDay("lundi, mercredi, vendredi", 2)).toBe(false);
    expect(recurrenceMatchesDay("lundi, mercredi, vendredi", 4)).toBe(false);
    expect(recurrenceMatchesDay("lundi, mercredi, vendredi", 6)).toBe(false);
  });

  it("matches abbreviated day names", () => {
    expect(recurrenceMatchesDay("lun, mer, ven", 1)).toBe(true);
    expect(recurrenceMatchesDay("lun, mer, ven", 3)).toBe(true);
    expect(recurrenceMatchesDay("lun, mer, ven", 5)).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(recurrenceMatchesDay("LUNDI", 1)).toBe(true);
    expect(recurrenceMatchesDay("Lundi", 1)).toBe(true);
    expect(recurrenceMatchesDay("LuNdI", 1)).toBe(true);
  });

  it("matches Sunday (day 0)", () => {
    expect(recurrenceMatchesDay("dimanche", 0)).toBe(true);
    expect(recurrenceMatchesDay("dim", 0)).toBe(true);
  });

  it("matches Saturday (day 6)", () => {
    expect(recurrenceMatchesDay("samedi", 6)).toBe(true);
    expect(recurrenceMatchesDay("sam", 6)).toBe(true);
  });

  it("returns false for empty recurrence", () => {
    expect(recurrenceMatchesDay("", 1)).toBe(false);
  });

  it("returns false for invalid day number", () => {
    expect(recurrenceMatchesDay("lundi", 7)).toBe(false);
    expect(recurrenceMatchesDay("lundi", -1)).toBe(false);
  });

  it("matches when day is part of a longer string", () => {
    expect(recurrenceMatchesDay("tous les lundis et jeudis", 1)).toBe(true);
    expect(recurrenceMatchesDay("tous les lundis et jeudis", 4)).toBe(true);
    expect(recurrenceMatchesDay("tous les lundis et jeudis", 2)).toBe(false);
  });
});
