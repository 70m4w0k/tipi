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

export function recurrenceMatchesToday(recurrence: string): boolean {
  return recurrenceMatchesDay(recurrence, new Date().getDay());
}
