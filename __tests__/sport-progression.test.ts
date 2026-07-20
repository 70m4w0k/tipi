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
});

const makeLog = (exerciseId: string, userId: string, count: number): ExerciseLog => ({
  id: `log-${Math.random()}`,
  household_id: "h1",
  exercise_id: exerciseId,
  user_id: userId,
  count,
  logged_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
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
