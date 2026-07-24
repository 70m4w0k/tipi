import {
  workoutTonnage,
  sealForCount,
  nextSealTier,
  workoutStats,
  evaluateCompletion,
  formatKg,
  WORKOUT_SEAL_TIERS,
  DEFAULT_WORKOUTS,
} from "../lib/sport-logic";

type Completion = { workout_id: string; user_id: string; tonnage: number };
const comp = (workout_id: string, user_id: string, tonnage: number): Completion => ({ workout_id, user_id, tonnage });

describe("workoutTonnage", () => {
  it("somme reps × poids, ignore les séries au poids du corps", () => {
    expect(
      workoutTonnage([
        { count: 5, weight: 18 }, // 90
        { count: 5, weight: 18 }, // 90
        { count: 20, weight: null }, // 0
      ])
    ).toBe(180);
  });

  it("vaut 0 pour un parcours entièrement au poids du corps", () => {
    expect(workoutTonnage([{ count: 40, weight: null }, { count: 40, weight: null }])).toBe(0);
  });
});

describe("sealForCount", () => {
  it("retourne null en dessous du premier palier", () => {
    expect(sealForCount(0)).toBeNull();
    expect(sealForCount(4)).toBeNull();
  });

  it("retourne le palier le plus haut atteint", () => {
    expect(sealForCount(5)?.label).toBe("Bronze");
    expect(sealForCount(24)?.label).toBe("Bronze");
    expect(sealForCount(25)?.label).toBe("Argent");
    expect(sealForCount(99)?.label).toBe("Argent");
    expect(sealForCount(100)?.label).toBe("Or");
    expect(sealForCount(500)?.label).toBe("Or");
  });
});

describe("nextSealTier", () => {
  it("indique le prochain palier, null une fois l'or atteint", () => {
    expect(nextSealTier(0)?.threshold).toBe(5);
    expect(nextSealTier(5)?.threshold).toBe(25);
    expect(nextSealTier(25)?.threshold).toBe(100);
    expect(nextSealTier(100)).toBeNull();
  });
});

describe("workoutStats", () => {
  const completions = [
    comp("w1", "u1", 180),
    comp("w1", "u1", 240),
    comp("w1", "u2", 500), // autre membre → ignoré
    comp("w2", "u1", 0),
  ];

  it("compte les complétions et le record de tonnage de l'utilisateur", () => {
    const s = workoutStats(completions, "w1", "u1");
    expect(s.completions).toBe(2);
    expect(s.bestTonnage).toBe(240);
    expect(s.seal).toBeNull();
    expect(s.next?.threshold).toBe(5);
  });

  it("est isolé par utilisateur", () => {
    expect(workoutStats(completions, "w1", "u2").completions).toBe(1);
    expect(workoutStats(completions, "w1", "u2").bestTonnage).toBe(500);
  });
});

describe("evaluateCompletion", () => {
  it("détecte un record de tonnage battu", () => {
    const completions = [comp("w1", "u1", 180)];
    const out = evaluateCompletion(completions, "w1", "u1", 240);
    expect(out.isRecord).toBe(true);
    expect(out.newSeal).toBeNull();
  });

  it("ne signale pas de record si le tonnage n'améliore pas le meilleur", () => {
    const completions = [comp("w1", "u1", 240)];
    expect(evaluateCompletion(completions, "w1", "u1", 200).isRecord).toBe(false);
    expect(evaluateCompletion(completions, "w1", "u1", 240).isRecord).toBe(false);
  });

  it("ne signale jamais de record pour un tonnage nul (poids du corps)", () => {
    expect(evaluateCompletion([], "w1", "u1", 0).isRecord).toBe(false);
  });

  it("signale un premier record dès qu'il y a du tonnage", () => {
    expect(evaluateCompletion([], "w1", "u1", 180).isRecord).toBe(true);
  });

  it("franchit un sceau quand le compteur atteint pile un palier", () => {
    const four = Array.from({ length: 4 }, () => comp("w1", "u1", 0));
    const out = evaluateCompletion(four, "w1", "u1", 0);
    expect(out.newSeal?.label).toBe("Bronze"); // 5e complétion
  });

  it("ne franchit pas de sceau entre deux paliers", () => {
    const five = Array.from({ length: 5 }, () => comp("w1", "u1", 0));
    expect(evaluateCompletion(five, "w1", "u1", 0).newSeal).toBeNull(); // 6e
  });

  it("peut cumuler record et sceau sur la même complétion", () => {
    const four = Array.from({ length: 4 }, (_, i) => comp("w1", "u1", 100 + i)); // best 103
    const out = evaluateCompletion(four, "w1", "u1", 200);
    expect(out.isRecord).toBe(true);
    expect(out.newSeal?.label).toBe("Bronze");
  });
});

describe("formatKg", () => {
  it("formate avec un séparateur de milliers", () => {
    expect(formatKg(2340)).toBe("2 340 kg");
    expect(formatKg(180)).toBe("180 kg");
    expect(formatKg(1000000)).toBe("1 000 000 kg");
  });

  it("arrondit à l'entier", () => {
    expect(formatKg(180.4)).toBe("180 kg");
  });
});

describe("DEFAULT_WORKOUTS — Haltères", () => {
  const halteres = DEFAULT_WORKOUTS.find((w) => w.name === "Haltères — Full body")!;

  it("n'utilise plus d'exercices « Planche » séparés", () => {
    const names = halteres.items.map((i) => i.exercise);
    expect(names).not.toContain("Planche");
    expect(names).not.toContain("Planche latérale");
  });

  it("gaine via Gainage, avec la variante « Latéral » pour le côté", () => {
    const gainages = halteres.items.filter((i) => i.exercise === "Gainage");
    expect(gainages).toHaveLength(2);
    expect(gainages.map((g) => g.variant ?? null)).toEqual([null, "Latéral"]);
  });
});

describe("WORKOUT_SEAL_TIERS", () => {
  it("définit trois paliers croissants bronze/argent/or", () => {
    expect(WORKOUT_SEAL_TIERS.map((t) => t.label)).toEqual(["Bronze", "Argent", "Or"]);
    expect(WORKOUT_SEAL_TIERS.map((t) => t.threshold)).toEqual([5, 25, 100]);
  });
});
