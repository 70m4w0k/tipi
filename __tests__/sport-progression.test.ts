import {
  computeXp,
  computeLevel,
  computeBadgeVisibility,
  LEVEL_THRESHOLDS,
  XP_PER_BADGE,
  XP_PER_LEVEL_BEYOND,
} from "../lib/sport-logic";
import { Exercise, ExerciseLog, UserBadge } from "../lib/types";

const makeExercise = (id: string, unit: string): Exercise => ({
  id,
  household_id: "h1",
  name: id,
  icon: "barbell-outline",
  unit,
  created_by: null,
  created_at: new Date().toISOString(),
  variants: [],
});

const makeLog = (exerciseId: string, userId: string, count: number): ExerciseLog => ({
  id: `log-${Math.random()}`,
  household_id: "h1",
  exercise_id: exerciseId,
  user_id: userId,
  count,
  logged_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  variant: null,
  weight: null,
});

const makeUserBadge = (userId: string, badgeId: string): UserBadge => ({
  id: `ub-${Math.random()}`,
  user_id: userId,
  badge_id: badgeId,
  unlocked_at: new Date().toISOString(),
});

describe("computeXp", () => {
  const exercises = [
    makeExercise("pompes", "répétitions"),
    makeExercise("gainage", "secondes"),
    makeExercise("course", "minutes"),
  ];

  it("pondère le volume par unité (répétitions=1, secondes=0.5, minutes=30)", () => {
    const logs = [
      makeLog("pompes", "u1", 100), // 100 XP
      makeLog("gainage", "u1", 60), // 30 XP
      makeLog("course", "u1", 2),   // 60 XP
    ];
    expect(computeXp(logs, "u1", exercises, [])).toBe(190);
  });

  it("ne compte que les logs de l'utilisateur demandé", () => {
    const logs = [makeLog("pompes", "u1", 100), makeLog("pompes", "u2", 500)];
    expect(computeXp(logs, "u1", exercises, [])).toBe(100);
    expect(computeXp(logs, "u2", exercises, [])).toBe(500);
  });

  it("ajoute le bonus par badge débloqué, filtré par utilisateur", () => {
    const logs = [makeLog("pompes", "u1", 100)];
    const badges = [makeUserBadge("u1", "b1"), makeUserBadge("u1", "b2"), makeUserBadge("u2", "b3")];
    expect(computeXp(logs, "u1", exercises, badges)).toBe(100 + 2 * XP_PER_BADGE);
  });

  it("utilise un poids de 1 pour une unité inconnue et retourne un entier", () => {
    const custom = [makeExercise("ex", "kilomètres")];
    expect(computeXp([makeLog("ex", "u1", 7)], "u1", custom, [])).toBe(7);
    expect(computeXp([makeLog("gainage", "u1", 3)], "u1", exercises, [])).toBe(2); // 1.5 arrondi
  });

  it("retourne 0 sans logs ni badges", () => {
    expect(computeXp([], "u1", exercises, [])).toBe(0);
  });
});

describe("computeLevel", () => {
  it("niveau 1 sous le premier palier", () => {
    expect(computeLevel(0)).toMatchObject({ level: 1, xpForCurrent: 0, xpForNext: 150 });
    expect(computeLevel(149).level).toBe(1);
  });

  it("franchit les paliers exactement au seuil", () => {
    expect(computeLevel(150)).toMatchObject({ level: 2, xpForCurrent: 150, xpForNext: 400 });
    expect(computeLevel(399).level).toBe(2);
    expect(computeLevel(400).level).toBe(3);
  });

  it("atteint le niveau 10 au dernier palier", () => {
    const top = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
    expect(computeLevel(top - 1).level).toBe(9);
    expect(computeLevel(top)).toMatchObject({ level: 10, xpForCurrent: top, xpForNext: top + XP_PER_LEVEL_BEYOND });
  });

  it("continue sans plafond au-delà du niveau 10", () => {
    const top = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
    expect(computeLevel(top + XP_PER_LEVEL_BEYOND).level).toBe(11);
    expect(computeLevel(top + 3 * XP_PER_LEVEL_BEYOND + 1).level).toBe(13);
  });

  it("calcule une progression 0-1 vers le niveau suivant", () => {
    const { progress } = computeLevel(275); // niveau 2, à mi-chemin entre 150 et 400
    expect(progress).toBeCloseTo(0.5);
    expect(computeLevel(150).progress).toBe(0);
  });
});

describe("computeBadgeVisibility", () => {
  const badge = (threshold: number, unlocked: boolean) => ({ threshold, unlocked });

  it("révèle uniquement le premier badge verrouillé, cache les suivants", () => {
    const result = computeBadgeVisibility([
      badge(100, false), badge(500, false), badge(1000, false),
    ]);
    expect(result.map((b) => b.state)).toEqual(["next", "hidden", "hidden"]);
  });

  it("affiche les débloqués et décale le prochain", () => {
    const result = computeBadgeVisibility([
      badge(100, true), badge(500, true), badge(1000, false), badge(5000, false),
    ]);
    expect(result.map((b) => b.state)).toEqual(["unlocked", "unlocked", "next", "hidden"]);
  });

  it("tout débloqué : aucun caché, aucun next", () => {
    const result = computeBadgeVisibility([badge(100, true), badge(500, true)]);
    expect(result.map((b) => b.state)).toEqual(["unlocked", "unlocked"]);
  });

  it("trie par seuil croissant même si l'entrée est désordonnée", () => {
    const result = computeBadgeVisibility([badge(1000, false), badge(100, true), badge(500, false)]);
    expect(result.map((b) => [b.threshold, b.state])).toEqual([
      [100, "unlocked"], [500, "next"], [1000, "hidden"],
    ]);
  });
});

describe("computeDailyGoal", () => {
  const { computeDailyGoal } = require("../lib/sport-logic");
  const now = new Date("2026-07-20T15:00:00Z");
  const dayLog = (daysAgo: number, count: number, userId = "u1", exerciseId = "ex1") => ({
    ...makeLog(exerciseId, userId, count),
    logged_at: new Date(now.getTime() - daysAgo * 86400 * 1000).toISOString(),
  });

  it("retourne null sans pratique sur les 14 derniers jours", () => {
    expect(computeDailyGoal([], "u1", "ex1", 100, now)).toBeNull();
    expect(computeDailyGoal([dayLog(20, 50)], "u1", "ex1", 100, now)).toBeNull();
  });

  it("ignore les logs d'aujourd'hui (objectif stable pendant la journée)", () => {
    expect(computeDailyGoal([dayLog(0, 500)], "u1", "ex1", 100, now)).toBeNull();
  });

  it("moyenne des jours actifs × 1.1, arrondi", () => {
    // 2 jours actifs : 100 et 60 -> moyenne 80 -> objectif 88
    const logs = [dayLog(1, 100), dayLog(3, 60)];
    expect(computeDailyGoal(logs, "u1", "ex1", 100, now)).toBe(88);
  });

  it("agrège plusieurs séries d'un même jour", () => {
    // Jour -1 : 30 + 20 = 50 -> objectif max(55, 10) = 55
    const logs = [dayLog(1, 30), dayLog(1, 20)];
    expect(computeDailyGoal(logs, "u1", "ex1", 100, now)).toBe(55);
  });

  it("applique le plancher minBadgeThreshold / 10", () => {
    // moyenne 5 -> 5.5 arrondi 6, mais plancher 100/10 = 10
    expect(computeDailyGoal([dayLog(1, 5)], "u1", "ex1", 100, now)).toBe(10);
  });

  it("ne considère que l'utilisateur et l'exercice demandés", () => {
    const logs = [dayLog(1, 100, "u2"), dayLog(1, 100, "u1", "ex2")];
    expect(computeDailyGoal(logs, "u1", "ex1", 100, now)).toBeNull();
  });

  it("ne garde que les 7 jours actifs les plus récents", () => {
    // 8 jours actifs à 10, plus un jour récent à 80 : le jour le plus ancien sort
    const logs = [dayLog(1, 80), ...[2, 3, 4, 5, 6, 8].map((d) => dayLog(d, 10))];
    // 7 jours retenus : 80 + 6×10 = 140 -> moyenne 20 -> 22
    expect(computeDailyGoal(logs, "u1", "ex1", 100, now)).toBe(22);
  });
});

describe("computeThreatenedTitles", () => {
  const { computeThreatenedTitles } = require("../lib/sport-logic");
  const now = new Date("2026-07-20T15:00:00Z");
  const badge = {
    id: "tb1", exercise_id: "ex1", household_id: "h1",
    threshold: 100, window_days: 7, title: "Régulier", icon: "flame", grace_hours: 48,
  };
  const logAt = (daysAgo: number, count: number) => ({
    id: `l-${Math.random()}`, household_id: "h1", exercise_id: "ex1", user_id: "u1",
    count, logged_at: new Date(now.getTime() - daysAgo * 86400 * 1000).toISOString(),
    created_at: new Date().toISOString(),
  });

  it("titre solide (fenêtre stricte suffisante) : pas menacé", () => {
    expect(computeThreatenedTitles([logAt(2, 150)], "u1", [badge], now)).toHaveLength(0);
  });

  it("titre porté par la grâce seule : menacé, avec le volume manquant", () => {
    // 150 reps il y a 8 jours : hors fenêtre 7j, dans la grâce (9j)
    const result = computeThreatenedTitles([logAt(8, 150)], "u1", [badge], now);
    expect(result).toHaveLength(1);
    expect(result[0].missing).toBe(100);
  });

  it("compte le partiel de la fenêtre stricte dans le manquant", () => {
    // 80 il y a 8j (grâce) + 30 il y a 2j (strict) : grâce 110 >= 100, strict 30 < 100
    const result = computeThreatenedTitles([logAt(8, 80), logAt(2, 30)], "u1", [badge], now);
    expect(result).toHaveLength(1);
    expect(result[0].missing).toBe(70);
  });

  it("titre perdu (même la grâce insuffisante) : pas menacé, juste perdu", () => {
    expect(computeThreatenedTitles([logAt(12, 150)], "u1", [badge], now)).toHaveLength(0);
  });
});

describe("computePersonalRecords", () => {
  const { computePersonalRecords } = require("../lib/sport-logic");

  it("null sans logs", () => {
    expect(computePersonalRecords([], "u1", "ex1")).toEqual({ bestDay: null, bestSeries: null });
  });

  it("meilleure journée agrégée et meilleure série", () => {
    const day1 = "2026-07-18";
    const day2 = "2026-07-19";
    const logs = [
      { ...makeLog("ex1", "u1", 40), logged_at: `${day1}T10:00:00Z` },
      { ...makeLog("ex1", "u1", 45), logged_at: `${day1}T18:00:00Z` }, // jour 85
      { ...makeLog("ex1", "u1", 60), logged_at: `${day2}T10:00:00Z` }, // jour 60, série max 60
      { ...makeLog("ex1", "u2", 999), logged_at: `${day2}T10:00:00Z` }, // autre user
      { ...makeLog("ex2", "u1", 999), logged_at: `${day2}T10:00:00Z` }, // autre exercice
    ];
    expect(computePersonalRecords(logs, "u1", "ex1")).toEqual({
      bestDay: { day: day1, total: 85 },
      bestSeries: 60,
    });
  });
});

describe("medallionMotif & badgeTier", () => {
  const { medallionMotif, badgeTier } = require("../lib/sport-logic");

  it("mappe les 4 exercices par défaut sur leur motif", () => {
    expect(medallionMotif("Pompes")).toBe("pompes");
    expect(medallionMotif("Abdos")).toBe("abdos");
    expect(medallionMotif("Squats")).toBe("squats");
    expect(medallionMotif("Gainage")).toBe("gainage");
  });

  it("retombe sur 'generic' pour un exercice custom", () => {
    expect(medallionMotif("Tractions")).toBe("generic");
    expect(medallionMotif("")).toBe("generic");
  });

  it("dérive le rang 1-5 depuis le seuil", () => {
    expect(badgeTier(100)).toBe(1);
    expect(badgeTier(500)).toBe(2);
    expect(badgeTier(1000)).toBe(3);
    expect(badgeTier(5000)).toBe(4);
    expect(badgeTier(10000)).toBe(5);
  });

  it("retombe sur le rang 1 pour un seuil hors barème", () => {
    expect(badgeTier(42)).toBe(1);
  });
});

describe("quickLogMode", () => {
  const { quickLogMode } = require("../lib/sport-logic");

  it("timer pour les exercices en temps", () => {
    expect(quickLogMode("Gainage", "secondes")).toBe("timer");
    expect(quickLogMode("Course", "minutes")).toBe("timer");
  });

  it("compteur pour les répétitions, sauf Abdos et Squats", () => {
    expect(quickLogMode("Pompes", "répétitions")).toBe("counter");
    expect(quickLogMode("Tractions", "répétitions")).toBe("counter");
    expect(quickLogMode("Abdos", "répétitions")).toBeNull();
    expect(quickLogMode("Squats", "répétitions")).toBeNull();
  });
});

describe("buildVariants & computeVariantBreakdown", () => {
  const { buildVariants, computeVariantBreakdown } = require("../lib/sport-logic");
  const { COLOR_PRESETS } = require("../lib/household-logic");

  it("assigne une couleur libre distincte à chaque variante", () => {
    const v = buildVariants(["Diamant", "Pieds surélevés"]);
    expect(v).toHaveLength(2);
    expect(v[0].color).toBe(COLOR_PRESETS[0]);
    expect(v[1].color).toBe(COLOR_PRESETS[1]);
    expect(v[0].name).toBe("Diamant");
  });

  it("ignore les doublons et complète les existantes sans réutiliser leur couleur", () => {
    const existing = [{ name: "Diamant", color: COLOR_PRESETS[0] }];
    const v = buildVariants(["Diamant", "Serrées"], existing);
    expect(v).toHaveLength(2);
    expect(v[1]).toEqual({ name: "Serrées", color: COLOR_PRESETS[1] });
  });

  it("répartit le total par variante, Standard inclus, trié décroissant", () => {
    const variants = [{ name: "Diamant", color: "#111" }];
    const logs = [
      { ...makeLog("ex1", "u1", 30) },              // Standard
      { ...makeLog("ex1", "u1", 70), variant: "Diamant" },
      { ...makeLog("ex1", "u2", 999), variant: "Diamant" }, // autre user
    ];
    const rows = computeVariantBreakdown(logs, "u1", "ex1", variants);
    expect(rows.map((r: any) => [r.name, r.total])).toEqual([["Diamant", 70], ["Standard", 30]]);
    expect(rows[0].pct).toBeCloseTo(0.7);
    expect(rows.find((r: any) => r.name === "Standard").color).toBeNull();
  });

  it("montre une variante orpheline (retirée de la liste) en neutre", () => {
    const logs = [{ ...makeLog("ex1", "u1", 40), variant: "Ancienne" }];
    const rows = computeVariantBreakdown(logs, "u1", "ex1", []);
    expect(rows).toEqual([{ name: "Ancienne", color: null, total: 40, pct: 1 }]);
  });

  it("retourne vide sans logs", () => {
    expect(computeVariantBreakdown([], "u1", "ex1", [])).toEqual([]);
  });
});

describe("parcours (workouts)", () => {
  const { buildWorkoutPlan, countPlannedSeries, planToLogEntries, workoutSummary } = require("../lib/sport-logic");
  const exercises = [makeExercise("dc", "répétitions"), makeExercise("bird", "répétitions")];
  const workout = {
    id: "w1", household_id: "h1", name: "Full body", icon: "barbell-outline",
    created_by: null, created_at: "",
    items: [
      { exercise_id: "dc", sets: 3, reps: 5, weight: 18, per_side: false, variant: null },
      { exercise_id: "bird", sets: 2, reps: 10, weight: null, per_side: true, variant: "Lesté" },
      { exercise_id: "supprimé", sets: 4, reps: 8, weight: null, per_side: false, variant: null },
    ],
  };

  it("résume en ignorant les exercices supprimés", () => {
    expect(workoutSummary(workout, exercises)).toEqual({ exercises: 2, series: 5 });
  });

  it("construit un plan : une ligne par exercice existant, séries dépliées, poids repris", () => {
    const plan = buildWorkoutPlan(workout, exercises);
    expect(plan).toHaveLength(2); // "supprimé" ignoré
    expect(plan[0]).toMatchObject({ exerciseId: "dc", weight: 18, perSide: false });
    expect(plan[0].series).toEqual([{ reps: 5, done: true }, { reps: 5, done: true }, { reps: 5, done: true }]);
    expect(plan[1].perSide).toBe(true);
    expect(countPlannedSeries(plan)).toBe(5);
  });

  it("génère une entrée par série cochée, reps doublées si par côté", () => {
    const plan = buildWorkoutPlan(workout, exercises);
    plan[0].series[2].done = false; // 2/3 séries au développé
    plan[0].series[1].reps = 3;     // reps corrigées sur la 2e
    const entries = planToLogEntries(plan);
    // dc: 2 séries (5 et 3) @18kg ; bird: 2 séries de 10 → 20 (par côté), variante "Lesté"
    expect(entries).toEqual([
      { exercise_id: "dc", count: 5, weight: 18, variant: null },
      { exercise_id: "dc", count: 3, weight: 18, variant: null },
      { exercise_id: "bird", count: 20, weight: null, variant: "Lesté" },
      { exercise_id: "bird", count: 20, weight: null, variant: "Lesté" },
    ]);
  });

  it("ignore les séries décochées ou à 0 rep", () => {
    const plan = buildWorkoutPlan(workout, exercises);
    plan[0].series.forEach((s: { done: boolean }) => (s.done = false));
    plan[1].series[0].reps = 0;
    const entries = planToLogEntries(plan);
    expect(entries).toEqual([{ exercise_id: "bird", count: 20, weight: null, variant: "Lesté" }]);
  });
});
