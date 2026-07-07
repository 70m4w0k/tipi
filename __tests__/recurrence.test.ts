import { recurrenceMatchesDay, recurrenceMatchesToday, dayNameFromDate } from "../lib/recurrence";

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

describe("recurrenceMatchesToday", () => {
  const realDate = Date;

  function mockDate(iso: string) {
    const fixed = new realDate(iso);
    jest.spyOn(globalThis, "Date").mockImplementation(
      (...args: any[]) => (args.length ? new realDate(...(args as [any])) : fixed) as any
    );
  }

  afterEach(() => jest.restoreAllMocks());

  it("returns true when day matches and no parity/startDate", () => {
    mockDate("2026-07-06T12:00:00"); // Monday
    expect(recurrenceMatchesToday("lundi")).toBe(true);
  });

  it("returns false when day does not match", () => {
    mockDate("2026-07-06T12:00:00"); // Monday
    expect(recurrenceMatchesToday("mardi")).toBe(false);
  });

  it("filters by weekParity — matching parity", () => {
    mockDate("2026-07-06T12:00:00"); // Monday
    const now = new realDate("2026-07-06T12:00:00");
    const yearStart = new realDate(now.getFullYear(), 0, 1);
    const week = Math.ceil(((now.getTime() - yearStart.getTime()) / 86400000 + yearStart.getDay() + 1) / 7);
    const parity = week % 2;
    expect(recurrenceMatchesToday("lundi", parity)).toBe(true);
  });

  it("filters by weekParity — non-matching parity", () => {
    mockDate("2026-07-06T12:00:00"); // Monday
    const now = new realDate("2026-07-06T12:00:00");
    const yearStart = new realDate(now.getFullYear(), 0, 1);
    const week = Math.ceil(((now.getTime() - yearStart.getTime()) / 86400000 + yearStart.getDay() + 1) / 7);
    const wrongParity = (week + 1) % 2;
    expect(recurrenceMatchesToday("lundi", wrongParity)).toBe(false);
  });

  it("filters by startDate — before start returns false", () => {
    mockDate("2026-07-06T12:00:00"); // Monday
    expect(recurrenceMatchesToday("lundi", null, "2026-07-13")).toBe(false);
  });

  it("filters by startDate — on or after start returns true", () => {
    mockDate("2026-07-06T12:00:00"); // Monday
    expect(recurrenceMatchesToday("lundi", null, "2026-07-06")).toBe(true);
    expect(recurrenceMatchesToday("lundi", null, "2026-06-01")).toBe(true);
  });

  it("null weekParity is treated as no filter", () => {
    mockDate("2026-07-06T12:00:00"); // Monday
    expect(recurrenceMatchesToday("lundi", null)).toBe(true);
    expect(recurrenceMatchesToday("lundi", undefined)).toBe(true);
  });
});

describe("dayNameFromDate", () => {
  it("returns French day name for a date string", () => {
    expect(dayNameFromDate("2026-07-06")).toBe("Lundi");
    expect(dayNameFromDate("2026-07-07")).toBe("Mardi");
    expect(dayNameFromDate("2026-07-05")).toBe("Dimanche");
    expect(dayNameFromDate("2026-07-11")).toBe("Samedi");
  });

  it("returns empty for invalid date", () => {
    expect(dayNameFromDate("invalid")).toBe("");
  });
});
