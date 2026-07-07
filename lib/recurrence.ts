const FRENCH_DAYS: Record<number, string[]> = {
  0: ["dimanche", "dim"],
  1: ["lundi", "lun"],
  2: ["mardi", "mar"],
  3: ["mercredi", "mer"],
  4: ["jeudi", "jeu"],
  5: ["vendredi", "ven"],
  6: ["samedi", "sam"],
};

export function recurrenceMatchesDay(recurrence: string, dayOfWeek: number): boolean {
  if (!recurrence) return false;
  const dayNames = FRENCH_DAYS[dayOfWeek];
  if (!dayNames) return false;
  const lower = recurrence.toLowerCase();
  return dayNames.some((name) => lower.includes(name));
}

export function recurrenceMatchesToday(recurrence: string, weekParity?: number | null, startDate?: string | null): boolean {
  if (!recurrenceMatchesDay(recurrence, new Date().getDay())) return false;
  if (startDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(startDate + "T00:00:00");
    if (today < start) return false;
  }
  if (weekParity == null) return true;
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(((now.getTime() - yearStart.getTime()) / 86400000 + yearStart.getDay() + 1) / 7);
  return week % 2 === weekParity;
}

const DAY_INDEX_TO_FRENCH: Record<number, string> = {
  0: "Dimanche", 1: "Lundi", 2: "Mardi", 3: "Mercredi",
  4: "Jeudi", 5: "Vendredi", 6: "Samedi",
};

export function dayNameFromDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return DAY_INDEX_TO_FRENCH[d.getDay()] ?? "";
}
