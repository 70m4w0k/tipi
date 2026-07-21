import { computeUnlockedBadges, computeNextBadge, computeNextBadgeProgress } from "../lib/sport-logic";
import { ExerciseLog, ExerciseBadge } from "../lib/types";

const makeLog = (exerciseId: string, userId: string, count: number): ExerciseLog => ({
  id: "log-1",
  household_id: "h1",
  exercise_id: exerciseId,
  user_id: userId,
  count,
  logged_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  variant: null,
});

const makeBadge = (id: string, exerciseId: string, threshold: number): ExerciseBadge => ({
  id,
  exercise_id: exerciseId,
  household_id: "h1",
  threshold,
  title: "Test",
  icon: "shield-outline",
});

describe("computeUnlockedBadges", () => {
  it("débloque les badges quand le total par exercice atteint le seuil", () => {
    const badges = [
      makeBadge("b1", "pompes", 100),
      makeBadge("b2", "pompes", 500),
      makeBadge("b3", "abdos", 100),
    ];
    const logs = [
      makeLog("pompes", "u1", 80),
      makeLog("pompes", "u1", 30), // total pompes = 110
      makeLog("abdos", "u1", 20),  // total abdos = 20
    ];

    const unlocked = computeUnlockedBadges(logs, "u1", badges);
    expect(unlocked).toHaveLength(1);
    expect(unlocked[0].id).toBe("b1"); // threshold 100, pompes total 110
  });

  it("ne débloque pas un badge si le total de l'exercice est insuffisant", () => {
    const badges = [makeBadge("b1", "pompes", 100)];
    const logs = [makeLog("pompes", "u1", 99)];

    expect(computeUnlockedBadges(logs, "u1", badges)).toHaveLength(0);
  });

  it("ne débloque pas un badge d'un autre exercice avec le même total", () => {
    const badges = [
      makeBadge("b1", "pompes", 100),
      makeBadge("b2", "abdos", 100),
    ];
    const logs = [makeLog("pompes", "u1", 150)];

    const unlocked = computeUnlockedBadges(logs, "u1", badges);
    expect(unlocked).toHaveLength(1);
    expect(unlocked[0].id).toBe("b1");
  });

  it("ne mélange pas les utilisateurs", () => {
    const badges = [makeBadge("b1", "pompes", 100)];
    const logs = [makeLog("pompes", "u2", 200)];

    expect(computeUnlockedBadges(logs, "u1", badges)).toHaveLength(0);
  });

  it("trie les badges par seuil croissant", () => {
    const badges = [
      makeBadge("b3", "pompes", 10000),
      makeBadge("b1", "pompes", 100),
      makeBadge("b2", "pompes", 1000),
    ];
    const logs = [makeLog("pompes", "u1", 15000)];

    const unlocked = computeUnlockedBadges(logs, "u1", badges);
    expect(unlocked).toHaveLength(3);
    expect(unlocked[0].threshold).toBe(100);
    expect(unlocked[1].threshold).toBe(1000);
    expect(unlocked[2].threshold).toBe(10000);
  });
});

describe("computeNextBadge", () => {
  it("retourne le prochain badge à débloquer", () => {
    const badges = [
      makeBadge("b1", "pompes", 100),
      makeBadge("b2", "pompes", 500),
    ];
    const logs = [makeLog("pompes", "u1", 120)];

    const next = computeNextBadge(logs, "u1", badges);
    expect(next).not.toBeNull();
    expect(next!.threshold).toBe(500);
  });

  it("retourne null si tous les badges sont débloqués", () => {
    const badges = [makeBadge("b1", "pompes", 100)];
    const logs = [makeLog("pompes", "u1", 200)];

    expect(computeNextBadge(logs, "u1", badges)).toBeNull();
  });
});

describe("computeNextBadgeProgress", () => {
  it("calcule la progression vers le prochain badge", () => {
    const badges = [
      makeBadge("b1", "pompes", 100),
      makeBadge("b2", "pompes", 500),
    ];
    const logs = [makeLog("pompes", "u1", 200)]; // 200/500, progress = (200-100)/(500-100) = 0.25

    const result = computeNextBadgeProgress(logs, "u1", badges);
    expect(result.badge!.threshold).toBe(500);
    expect(result.progress).toBeCloseTo(0.25, 1);
  });
});
describe("buildDefaultBadges", () => {
  const { buildDefaultBadges, buildDefaultTemporalBadges, DEFAULT_BADGE_TIERS, DEFAULT_TEMPORAL_TIERS } = require("../lib/sport-logic");

  it("utilise les titres spécifiques pour les exercices par défaut", () => {
    const badges = buildDefaultBadges("Pompes");
    expect(badges).toHaveLength(DEFAULT_BADGE_TIERS.length);
    expect(badges[0]).toEqual({ threshold: 100, title: "Pompier", icon: "shield-outline" });
    expect(badges[4]).toEqual({ threshold: 10000, title: "Pompéi", icon: "trophy" });
  });

  it("génère des titres génériques pour un exercice custom", () => {
    const badges = buildDefaultBadges("Tractions");
    expect(badges[0].title).toBe("Tractions — Centurion");
    expect(badges[4].title).toBe("Tractions — Légende");
    expect(badges.map((b: { threshold: number }) => b.threshold)).toEqual([100, 500, 1000, 5000, 10000]);
  });

  it("génère les titres temporels avec préfixe spécifique ou nom brut", () => {
    const pompes = buildDefaultTemporalBadges("Pompes");
    expect(pompes).toHaveLength(DEFAULT_TEMPORAL_TIERS.length);
    expect(pompes[0]).toMatchObject({ threshold: 100, window_days: 7, title: "Pompeur Régulier", grace_hours: 48 });

    const custom = buildDefaultTemporalBadges("Tractions");
    expect(custom[1].title).toBe("Tractions Assidu");
  });
});
