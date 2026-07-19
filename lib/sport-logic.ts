import { Exercise, ExerciseLog, ExerciseBadge, TemporalBadge } from "./types";

export const DEFAULT_EXERCISES: Omit<Exercise, "id" | "household_id" | "created_by" | "created_at">[] = [
  { name: "Pompes", icon: "barbell-outline", unit: "répétitions" },
  { name: "Abdos", icon: "fitness-outline", unit: "répétitions" },
  { name: "Squats", icon: "barbell-outline", unit: "répétitions" },
  { name: "Gainage", icon: "timer-outline", unit: "secondes" },
];

export const COLLECTIVE_THRESHOLDS = [
  { threshold: 1000, title: "Équipe de choc", icon: "people-outline" },
  { threshold: 5000, title: "Brigade sportive", icon: "people" },
  { threshold: 25000, title: "Légion", icon: "fitness" },
  { threshold: 100000, title: "Armée de Tipi", icon: "flag" },
];

/** Badges permanents débloqués pour un total donné */
export function computeUnlockedBadges(total: number, badges: ExerciseBadge[]): ExerciseBadge[] {
  return badges
    .filter((b) => total >= b.threshold)
    .sort((a, b) => a.threshold - b.threshold);
}

/** Prochain badge à débloquer, ou null si tous débloqués */
export function computeNextBadge(total: number, badges: ExerciseBadge[]): ExerciseBadge | null {
  const next = badges
    .filter((b) => total < b.threshold)
    .sort((a, b) => a.threshold - b.threshold);
  return next.length > 0 ? next[0] : null;
}

/** Titres temporels actifs (fenêtre glissante + période de grâce) */
export function computeTemporalTitles(
  logs: ExerciseLog[],
  userId: string,
  badges: TemporalBadge[],
  now: Date = new Date()
): { badge: TemporalBadge; currentTotal: number }[] {
  return badges
    .map((badge) => {
      const graceMs = badge.grace_hours * 3600 * 1000;
      const windowStart = new Date(now.getTime() - badge.window_days * 86400 * 1000);
      const effectiveStart = new Date(windowStart.getTime() - graceMs);
      const total = logs
        .filter((l) => l.user_id === userId && new Date(l.logged_at).getTime() >= effectiveStart.getTime())
        .reduce((s, l) => s + l.count, 0);
      return { badge, currentTotal: total };
    })
    .filter((t) => t.currentTotal >= t.badge.threshold);
}

/** Titre collectif le plus élevé atteint */
export function computeCollectiveTitles(
  total: number,
  thresholds: { threshold: number; title: string; icon: string }[]
): { threshold: number; title: string; icon: string } | null {
  const reached = thresholds
    .filter((t) => total >= t.threshold)
    .sort((a, b) => b.threshold - a.threshold);
  return reached.length > 0 ? reached[0] : null;
}