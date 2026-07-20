import { Exercise, ExerciseLog, ExerciseBadge, TemporalBadge, UserBadge } from "./types";

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

export const DEFAULT_BADGE_TIERS = [
  { threshold: 100, genericTitle: "Centurion", icon: "shield-outline" },
  { threshold: 500, genericTitle: "Vétéran", icon: "shield-half" },
  { threshold: 1000, genericTitle: "Champion", icon: "shield" },
  { threshold: 5000, genericTitle: "Maître", icon: "ribbon" },
  { threshold: 10000, genericTitle: "Légende", icon: "trophy" },
];

export const DEFAULT_TEMPORAL_TIERS = [
  { threshold: 100, window_days: 7, suffix: "Régulier", icon: "flame-outline", grace_hours: 48 },
  { threshold: 200, window_days: 7, suffix: "Assidu", icon: "flame", grace_hours: 48 },
  { threshold: 500, window_days: 7, suffix: "Intense", icon: "flash", grace_hours: 48 },
];

/** Titres spécifiques des exercices par défaut, alignés sur DEFAULT_BADGE_TIERS */
const SPECIFIC_BADGE_TITLES: Record<string, string[]> = {
  Pompes: ["Pompier", "Pompiste", "Pompinator", "Pompistador", "Pompéi"],
  Abdos: ["Abdominable", "Abdominatus", "Abdominator", "Abdominator Suprême", "Plaque de Chocolat"],
  Squats: ["Squatteur", "Squatteur Pro", "Squatman", "Squatman Légendaire", "Dieu du Squat"],
  Gainage: ["Statue", "Statue Grecque", "Statue de Sel", "Mégalithe", "Mont Rushmore"],
};

const SPECIFIC_TEMPORAL_PREFIXES: Record<string, string> = {
  Pompes: "Pompeur",
  Abdos: "Abdo",
  Squats: "Squat",
  Gainage: "Gainage",
};

/** Badges permanents par défaut d'un exercice (titres spécifiques ou génériques) */
export function buildDefaultBadges(exerciseName: string): { threshold: number; title: string; icon: string }[] {
  const specific = SPECIFIC_BADGE_TITLES[exerciseName];
  return DEFAULT_BADGE_TIERS.map((tier, i) => ({
    threshold: tier.threshold,
    title: specific?.[i] ?? `${exerciseName} — ${tier.genericTitle}`,
    icon: tier.icon,
  }));
}

/** Titres temporels par défaut d'un exercice */
export function buildDefaultTemporalBadges(
  exerciseName: string
): { threshold: number; window_days: number; title: string; icon: string; grace_hours: number }[] {
  const prefix = SPECIFIC_TEMPORAL_PREFIXES[exerciseName] ?? exerciseName;
  return DEFAULT_TEMPORAL_TIERS.map((tier) => ({
    threshold: tier.threshold,
    window_days: tier.window_days,
    title: `${prefix} ${tier.suffix}`,
    icon: tier.icon,
    grace_hours: tier.grace_hours,
  }));
}

// --- XP & niveaux (spec docs/sport-progression-spec.md §5.1) ---

export const UNIT_XP_WEIGHTS: Record<string, number> = {
  "répétitions": 1,
  "secondes": 0.5,
  "minutes": 30,
};

export const XP_PER_BADGE = 50;

/** XP cumulé requis pour atteindre chaque niveau (index 0 = niveau 2) */
export const LEVEL_THRESHOLDS = [150, 400, 800, 1500, 2600, 4200, 6500, 9500, 13500];

/** Au-delà du dernier palier : +5000 XP par niveau, sans plafond */
export const XP_PER_LEVEL_BEYOND = 5000;

/** XP d'un utilisateur : volume pondéré par unité + bonus par badge permanent débloqué */
export function computeXp(
  logs: ExerciseLog[],
  userId: string,
  exercises: Exercise[],
  userBadges: UserBadge[]
): number {
  const unitByExercise = new Map(exercises.map((e) => [e.id, e.unit]));
  const volume = logs
    .filter((l) => l.user_id === userId)
    .reduce((s, l) => {
      const weight = UNIT_XP_WEIGHTS[unitByExercise.get(l.exercise_id) ?? ""] ?? 1;
      return s + l.count * weight;
    }, 0);
  const badgeBonus = userBadges.filter((ub) => ub.user_id === userId).length * XP_PER_BADGE;
  return Math.round(volume) + badgeBonus;
}

export type LevelInfo = {
  level: number;
  /** XP cumulé au plancher du niveau courant */
  xpForCurrent: number;
  /** XP cumulé requis pour le niveau suivant */
  xpForNext: number;
  /** Progression 0-1 vers le niveau suivant */
  progress: number;
};

export function computeLevel(xp: number): LevelInfo {
  const top = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  let level: number;
  let floor: number;
  let next: number;
  if (xp >= top) {
    const extra = Math.floor((xp - top) / XP_PER_LEVEL_BEYOND);
    level = LEVEL_THRESHOLDS.length + 1 + extra;
    floor = top + extra * XP_PER_LEVEL_BEYOND;
    next = floor + XP_PER_LEVEL_BEYOND;
  } else {
    level = 1;
    floor = 0;
    for (const t of LEVEL_THRESHOLDS) {
      if (xp >= t) { level++; floor = t; } else break;
    }
    next = LEVEL_THRESHOLDS[level - 1];
  }
  const progress = Math.min(1, Math.max(0, (xp - floor) / (next - floor)));
  return { level, xpForCurrent: floor, xpForNext: next, progress };
}

/** Fonctionnalités débloquées par niveau (spec §5.2) */
export const LEVEL_UNLOCKS: Record<number, string> = {
  2: "Objectif du jour",
  3: "Records personnels",
  5: "Choix du titre affiché",
  7: "Badges du foyer",
  10: "Défis hebdomadaires",
};

// --- Objectif du jour (spec §5.4) ---

/**
 * Objectif quotidien pour un exercice : moyenne des 7 derniers jours actifs
 * (fenêtre de 14 jours, aujourd'hui exclu) × 1.1, plancher = plus petit seuil
 * de badge / 10. Null si l'exercice n'a pas été pratiqué sur la fenêtre.
 */
export function computeDailyGoal(
  logs: ExerciseLog[],
  userId: string,
  exerciseId: string,
  minBadgeThreshold: number,
  now: Date = new Date()
): number | null {
  const today = now.toISOString().slice(0, 10);
  const windowStart = new Date(now.getTime() - 14 * 86400 * 1000).toISOString().slice(0, 10);

  const byDay: Record<string, number> = {};
  for (const l of logs) {
    if (l.user_id !== userId || l.exercise_id !== exerciseId) continue;
    const day = l.logged_at.slice(0, 10);
    if (day >= today || day < windowStart) continue;
    byDay[day] = (byDay[day] ?? 0) + l.count;
  }

  const activeDays = Object.entries(byDay)
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .slice(0, 7);
  if (activeDays.length === 0) return null;

  const avg = activeDays.reduce((s, [, v]) => s + v, 0) / activeDays.length;
  return Math.max(Math.round(avg * 1.1), Math.round(minBadgeThreshold / 10));
}

// --- Badges cachés (spec §5.3) ---

export type BadgeDisplayState = "unlocked" | "next" | "hidden";

/**
 * Détermine l'état d'affichage de chaque badge : les débloqués sont visibles,
 * seul le premier verrouillé (par seuil croissant) est révélé, le reste est caché.
 */
export function computeBadgeVisibility<T extends { threshold: number; unlocked?: boolean }>(
  badges: T[]
): (T & { state: BadgeDisplayState })[] {
  const sorted = [...badges].sort((a, b) => a.threshold - b.threshold);
  let nextRevealed = false;
  return sorted.map((b) => {
    if (b.unlocked) return { ...b, state: "unlocked" as const };
    if (!nextRevealed) {
      nextRevealed = true;
      return { ...b, state: "next" as const };
    }
    return { ...b, state: "hidden" as const };
  });
}

/** Badges permanents débloqués (par exercice) */
export function computeUnlockedBadges(
  logs: ExerciseLog[],
  userId: string,
  badges: ExerciseBadge[]
): ExerciseBadge[] {
  return badges
    .filter((b) => {
      const total = logs
        .filter((l) => l.user_id === userId && l.exercise_id === b.exercise_id)
        .reduce((s, l) => s + l.count, 0);
      return total >= b.threshold;
    })
    .sort((a, b) => a.threshold - b.threshold);
}

/** Prochain badge à débloquer pour un exercice donné */
export function computeNextBadge(
  logs: ExerciseLog[],
  userId: string,
  badges: ExerciseBadge[]
): ExerciseBadge | null {
  const next = badges
    .filter((b) => {
      const total = logs
        .filter((l) => l.user_id === userId && l.exercise_id === b.exercise_id)
        .reduce((s, l) => s + l.count, 0);
      return total < b.threshold;
    })
    .sort((a, b) => a.threshold - b.threshold);
  return next.length > 0 ? next[0] : null;
}

/** Progression vers le prochain badge (0-1) */
export function computeNextBadgeProgress(
  logs: ExerciseLog[],
  userId: string,
  badges: ExerciseBadge[]
): { badge: ExerciseBadge | null; progress: number; current: number } {
  const next = computeNextBadge(logs, userId, badges);
  if (!next) return { badge: null, progress: 1, current: 0 };
  const current = logs
    .filter((l) => l.user_id === userId && l.exercise_id === next.exercise_id)
    .reduce((s, l) => s + l.count, 0);
  const prevThreshold = badges
    .filter((b) => b.exercise_id === next.exercise_id && b.threshold < next.threshold)
    .sort((a, b) => b.threshold - a.threshold)[0]?.threshold ?? 0;
  const range = next.threshold - prevThreshold;
  const progress = range > 0 ? (current - prevThreshold) / range : 0;
  return { badge: next, progress: Math.max(0, Math.min(1, progress)), current };
}

/** Titres temporels actifs (fenêtre glissante + période de grâce, filtré par exercice) */
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
        .filter((l) =>
          l.user_id === userId &&
          l.exercise_id === badge.exercise_id &&
          new Date(l.logged_at).getTime() >= effectiveStart.getTime()
        )
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