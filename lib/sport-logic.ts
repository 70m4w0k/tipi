import { Exercise, ExerciseLog, ExerciseBadge, TemporalBadge, UserBadge, ExerciseVariant, Workout } from "./types";
import { pickAvailableColor } from "./household-logic";

// --- Parcours (workouts) ---

/** Item de parcours par défaut : référence l'exercice par nom (résolu/créé au seed) */
export type DefaultWorkoutItem = {
  exercise: string; unit: string; sets: number; reps: number;
  weight?: number; per_side?: boolean; variant?: string;
};
export type DefaultWorkout = { name: string; icon: string; items: DefaultWorkoutItem[] };

const ABDOS_8MIN = ["push through", "alternative curls", "4 times ABS", "crossed arms", "leg-up touch", "reverse crunch", "double crunch", "foot 2 foot"];

/** Parcours pré-remplis à la création d'un foyer */
export const DEFAULT_WORKOUTS: DefaultWorkout[] = [
  {
    name: "Abdos en 8 min",
    icon: "fitness-outline",
    items: ABDOS_8MIN.map((v) => ({ exercise: "Abdos", unit: "répétitions", sets: 1, reps: 40, variant: v })),
  },
  {
    name: "Haltères — Full body",
    icon: "barbell-outline",
    items: [
      { exercise: "Développé couché", unit: "répétitions", sets: 5, reps: 5, weight: 18 },
      { exercise: "Développé militaire", unit: "répétitions", sets: 5, reps: 5, weight: 14 },
      { exercise: "Curl haltères", unit: "répétitions", sets: 3, reps: 5, weight: 12 },
      { exercise: "Gainage", unit: "secondes", sets: 3, reps: 60 },
      { exercise: "Gainage", unit: "secondes", sets: 3, reps: 60, variant: "Latéral" },
      { exercise: "Soulevé de terre roumain", unit: "répétitions", sets: 4, reps: 8, weight: 18 },
      { exercise: "Bird dog", unit: "répétitions", sets: 3, reps: 10, per_side: true },
      { exercise: "Superman", unit: "répétitions", sets: 3, reps: 12 },
    ],
  },
];

export type WorkoutSeries = { reps: number; done: boolean };
export type WorkoutPlanRow = {
  exerciseId: string;
  exerciseName: string;
  variant: string | null;
  unit: string;
  weight: number | null;
  perSide: boolean;
  series: WorkoutSeries[];
};

/** Résumé d'un parcours pour sa carte (exercices existants + séries) */
export function workoutSummary(workout: Workout, exercises: Exercise[]): { exercises: number; series: number } {
  const items = workout.items.filter((i) => exercises.some((e) => e.id === i.exercise_id));
  return {
    exercises: items.length,
    series: items.reduce((n, i) => n + Math.max(0, i.sets), 0),
  };
}

/** Plan éditable d'un parcours : une ligne par exercice existant, séries dépliées */
export function buildWorkoutPlan(workout: Workout, exercises: Exercise[]): WorkoutPlanRow[] {
  const rows: WorkoutPlanRow[] = [];
  for (const item of workout.items) {
    const ex = exercises.find((e) => e.id === item.exercise_id);
    if (!ex) continue; // exercice supprimé → ignoré proprement
    rows.push({
      exerciseId: ex.id,
      exerciseName: ex.name,
      variant: item.variant ?? null,
      unit: ex.unit,
      weight: item.weight,
      perSide: item.per_side,
      series: Array.from({ length: Math.max(0, item.sets) }, () => ({ reps: item.reps, done: true })),
    });
  }
  return rows;
}

/** Nombre de séries cochées (pour « Valider · N séries ») */
export function countPlannedSeries(rows: WorkoutPlanRow[]): number {
  return rows.reduce((n, r) => n + r.series.filter((s) => s.done).length, 0);
}

/** Entrées à logger depuis le plan : une par série cochée, reps doublées si « par côté » */
export function planToLogEntries(rows: WorkoutPlanRow[]): { exercise_id: string; count: number; weight: number | null; variant: string | null }[] {
  const entries: { exercise_id: string; count: number; weight: number | null; variant: string | null }[] = [];
  for (const r of rows) {
    for (const s of r.series) {
      if (!s.done || s.reps <= 0) continue;
      entries.push({ exercise_id: r.exerciseId, count: r.perSide ? s.reps * 2 : s.reps, weight: r.weight, variant: r.variant });
    }
  }
  return entries;
}

/** Tonnage d'une séance : Σ (répétitions × poids). Les séries au poids du corps (weight null) comptent 0. */
export function workoutTonnage(entries: { count: number; weight: number | null }[]): number {
  return entries.reduce((s, e) => s + (e.weight != null ? e.count * e.weight : 0), 0);
}

// --- Sceaux de parcours (paliers de complétions, par personne) ---

export type SealTier = { threshold: number; label: string; color: string; rank: 1 | 2 | 3 };

/** Paliers de sceaux : trophée bronze → argent → or selon le nombre de complétions. */
export const WORKOUT_SEAL_TIERS: SealTier[] = [
  { threshold: 5, label: "Bronze", color: "#CD7F32", rank: 1 },
  { threshold: 25, label: "Argent", color: "#9AA0A6", rank: 2 },
  { threshold: 100, label: "Or", color: "#D4AF37", rank: 3 },
];

export const WORKOUT_SEAL_ICON = "trophy";

/** Tonnage formaté avec séparateur de milliers, ex. "2 340 kg". */
export function formatKg(kg: number): string {
  return `${Math.round(kg).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} kg`;
}

/** Sceau atteint pour un nombre de complétions donné (null en dessous du premier palier). */
export function sealForCount(count: number): SealTier | null {
  let reached: SealTier | null = null;
  for (const tier of WORKOUT_SEAL_TIERS) {
    if (count >= tier.threshold) reached = tier;
  }
  return reached;
}

/** Prochain sceau à atteindre (null si l'or est déjà décroché). */
export function nextSealTier(count: number): SealTier | null {
  return WORKOUT_SEAL_TIERS.find((tier) => count < tier.threshold) ?? null;
}

export type WorkoutStats = {
  completions: number;
  bestTonnage: number;
  seal: SealTier | null;
  next: SealTier | null;
};

/** Stats d'un parcours pour un utilisateur (complétions, record de tonnage, sceau). */
export function workoutStats(
  completions: { workout_id: string; user_id: string; tonnage: number }[],
  workoutId: string,
  userId: string
): WorkoutStats {
  const own = completions.filter((c) => c.workout_id === workoutId && c.user_id === userId);
  const count = own.length;
  const bestTonnage = own.reduce((m, c) => Math.max(m, c.tonnage), 0);
  return { completions: count, bestTonnage, seal: sealForCount(count), next: nextSealTier(count) };
}

export type CompletionOutcome = {
  /** Nouveau record de tonnage battu (tonnage > 0 et > meilleur précédent). */
  isRecord: boolean;
  tonnage: number;
  /** Sceau franchi par cette complétion (null si aucun palier atteint pile). */
  newSeal: SealTier | null;
};

/**
 * Ce qui est à célébrer après une complétion, d'après l'état AVANT insertion :
 * un record si le tonnage dépasse le meilleur précédent, un sceau si le compteur
 * atteint pile un palier.
 */
export function evaluateCompletion(
  completions: { workout_id: string; user_id: string; tonnage: number }[],
  workoutId: string,
  userId: string,
  tonnage: number
): CompletionOutcome {
  const prior = workoutStats(completions, workoutId, userId);
  const newCount = prior.completions + 1;
  const newSeal = WORKOUT_SEAL_TIERS.find((tier) => tier.threshold === newCount) ?? null;
  return {
    isRecord: tonnage > 0 && tonnage > prior.bestTonnage,
    tonnage,
    newSeal,
  };
}

export const DEFAULT_EXERCISES: Omit<Exercise, "id" | "household_id" | "created_by" | "created_at" | "variants">[] = [
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
  "Développé couché": ["Stagiaire Pectoral", "Développeur Junior", "Développeur Confirmé", "Développeur Senior", "Architecte Pectoral"],
  "Développé militaire": ["Bidasse", "Caporal", "Sergent-Chef", "Général des Épaules", "Maréchal Deltoïde"],
  "Curl haltères": ["Biscoto", "Gros Biscoto", "Bras d'Honneur", "Popeye", "Biceps Divin"],
  "Soulevé de terre roumain": ["Terrassier", "Déménageur", "Hercule", "Atlas", "Soulève-Montagne"],
  "Bird dog": ["Toutou", "Bon Chien", "Chien d'Arrêt", "Chien de Garde", "Cerbère"],
  Superman: ["Clark Kent", "Justicier", "Super-Héros", "Kryptonien", "Homme d'Acier"],
};

const SPECIFIC_TEMPORAL_PREFIXES: Record<string, string> = {
  Pompes: "Pompeur",
  Abdos: "Abdo",
  Squats: "Squat",
  Gainage: "Gainage",
  "Développé couché": "Développé",
  "Développé militaire": "Militaire",
  "Curl haltères": "Curl",
  "Soulevé de terre roumain": "Soulevé",
  "Bird dog": "Bird dog",
  Superman: "Superman",
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

// --- Variantes d'exercices (étiquette sur la série) ---

/** Variantes pré-remplies pour les exercices par défaut */
export const DEFAULT_VARIANTS: Record<string, string[]> = {
  Pompes: ["Diamant", "Pieds surélevés"],
  Gainage: ["Dorsal", "Latéral"],
  Abdos: [
    "push through", "alternative curls", "4 times ABS", "crossed arms", "leg-up touch",
    "reverse crunch", "double crunch", "foot 2 foot", "escalade", "russian twists",
  ],
  Squats: [],
};

/** Ajoute des variantes en assignant à chacune la première couleur libre (comme les membres) */
export function buildVariants(names: string[], existing: ExerciseVariant[] = []): ExerciseVariant[] {
  const result = [...existing];
  const taken = existing.map((v) => v.color);
  for (const name of names) {
    const trimmed = name.trim();
    if (!trimmed || result.some((v) => v.name === trimmed)) continue;
    const color = pickAvailableColor(taken);
    result.push({ name: trimmed, color });
    taken.push(color);
  }
  return result;
}

export type VariantBreakdownRow = { name: string; color: string | null; total: number; pct: number };

/**
 * Répartition du total (utilisateur + exercice) par variante, incluant Standard
 * (séries non étiquetées) et les variantes orphelines. `color: null` = rendu neutre.
 */
export function computeVariantBreakdown(
  logs: ExerciseLog[],
  userId: string,
  exerciseId: string,
  variants: ExerciseVariant[]
): VariantBreakdownRow[] {
  const totals = new Map<string | null, number>();
  let grand = 0;
  for (const l of logs) {
    if (l.user_id !== userId || l.exercise_id !== exerciseId) continue;
    const key = l.variant ?? null;
    totals.set(key, (totals.get(key) ?? 0) + l.count);
    grand += l.count;
  }
  if (grand === 0) return [];

  const rows: VariantBreakdownRow[] = [];
  const std = totals.get(null) ?? 0;
  if (std > 0) rows.push({ name: "Standard", color: null, total: std, pct: std / grand });
  for (const v of variants) {
    const tot = totals.get(v.name) ?? 0;
    if (tot > 0) rows.push({ name: v.name, color: v.color, total: tot, pct: tot / grand });
  }
  for (const [key, tot] of totals) {
    if (key == null) continue;
    if (!variants.some((v) => v.name === key)) rows.push({ name: key, color: null, total: tot, pct: tot / grand });
  }
  return rows.sort((a, b) => b.total - a.total);
}

// --- Médaillons de badges (famille "Médaillon" RPG) ---

export type MedallionMotif =
  | "pompes" | "abdos" | "squats" | "gainage"
  | "bench" | "military" | "curl" | "deadlift" | "birddog" | "superman"
  | "generic";

/** Motif du médaillon d'après le nom de l'exercice (générique pour les customs) */
export function medallionMotif(exerciseName: string): MedallionMotif {
  switch (exerciseName) {
    case "Pompes": return "pompes";
    case "Abdos": return "abdos";
    case "Squats": return "squats";
    case "Gainage": return "gainage";
    case "Développé couché": return "bench";
    case "Développé militaire": return "military";
    case "Curl haltères": return "curl";
    case "Soulevé de terre roumain": return "deadlift";
    case "Bird dog": return "birddog";
    case "Superman": return "superman";
    default: return "generic";
  }
}

/** Rang 1-5 d'un badge d'après son seuil (rang 1 pour un seuil hors barème) */
export function badgeTier(threshold: number): number {
  const i = DEFAULT_BADGE_TIERS.findIndex((tier) => tier.threshold === threshold);
  return i >= 0 ? i + 1 : 1;
}

/**
 * Mode de saisie rapide de la page détail selon l'exercice :
 * - "timer" pour les exercices en temps (secondes/minutes)
 * - "counter" (compteur mains-libres) pour les répétitions, sauf Abdos/Squats
 *   (le tap au nez ne colle pas à ces mouvements)
 * - null : pas de saisie rapide, seulement l'ajout manuel de séries
 */
export function quickLogMode(name: string, unit: string): "timer" | "counter" | null {
  if (unit === "secondes" || unit === "minutes") return "timer";
  if (unit === "répétitions" && name !== "Abdos" && name !== "Squats") return "counter";
  return null;
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

/**
 * Titres temporels menacés : encore actifs grâce à la période de grâce, mais
 * dont la fenêtre stricte est repassée sous le seuil. `missing` = ce qu'il
 * reste à faire pour re-sécuriser le titre.
 */
export function computeThreatenedTitles(
  logs: ExerciseLog[],
  userId: string,
  badges: TemporalBadge[],
  now: Date = new Date()
): { badge: TemporalBadge; missing: number }[] {
  return badges
    .map((badge) => {
      const windowStart = now.getTime() - badge.window_days * 86400 * 1000;
      const graceStart = windowStart - badge.grace_hours * 3600 * 1000;
      let strictTotal = 0;
      let graceTotal = 0;
      for (const l of logs) {
        if (l.user_id !== userId || l.exercise_id !== badge.exercise_id) continue;
        const ts = new Date(l.logged_at).getTime();
        if (ts >= graceStart) graceTotal += l.count;
        if (ts >= windowStart) strictTotal += l.count;
      }
      return { badge, strictTotal, graceTotal };
    })
    .filter((x) => x.graceTotal >= x.badge.threshold && x.strictTotal < x.badge.threshold)
    .map((x) => ({ badge: x.badge, missing: x.badge.threshold - x.strictTotal }));
}

/** Records personnels d'un utilisateur sur un exercice (gate niveau 3) */
export function computePersonalRecords(
  logs: ExerciseLog[],
  userId: string,
  exerciseId: string
): { bestDay: { day: string; total: number } | null; bestSeries: number | null } {
  const own = logs.filter((l) => l.user_id === userId && l.exercise_id === exerciseId);
  if (own.length === 0) return { bestDay: null, bestSeries: null };

  const byDay: Record<string, number> = {};
  let bestSeries = 0;
  for (const l of own) {
    const day = l.logged_at.slice(0, 10);
    byDay[day] = (byDay[day] ?? 0) + l.count;
    if (l.count > bestSeries) bestSeries = l.count;
  }
  const bestDay = Object.entries(byDay).reduce(
    (best, [day, total]) => (total > best.total ? { day, total } : best),
    { day: "", total: -1 }
  );
  return { bestDay: { day: bestDay.day, total: bestDay.total }, bestSeries };
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