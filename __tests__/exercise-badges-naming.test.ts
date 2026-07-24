import { buildDefaultBadges, medallionMotif, DEFAULT_BADGE_TIERS } from "../lib/sport-logic";

describe("medallionMotif — nouveaux exercices", () => {
  it("associe chaque exercice du parcours Haltères à son motif", () => {
    expect(medallionMotif("Développé couché")).toBe("bench");
    expect(medallionMotif("Développé militaire")).toBe("military");
    expect(medallionMotif("Curl haltères")).toBe("curl");
    expect(medallionMotif("Soulevé de terre roumain")).toBe("deadlift");
    expect(medallionMotif("Bird dog")).toBe("birddog");
    expect(medallionMotif("Superman")).toBe("superman");
  });

  it("garde les motifs d'origine et le générique pour les customs", () => {
    expect(medallionMotif("Pompes")).toBe("pompes");
    expect(medallionMotif("Gainage")).toBe("gainage");
    expect(medallionMotif("Rameur maison")).toBe("generic");
  });
});

describe("buildDefaultBadges — noms drôles", () => {
  const cases: [string, string, string][] = [
    ["Développé couché", "Stagiaire Pectoral", "Architecte Pectoral"],
    ["Développé militaire", "Bidasse", "Maréchal Deltoïde"],
    ["Curl haltères", "Biscoto", "Biceps Divin"],
    ["Soulevé de terre roumain", "Terrassier", "Soulève-Montagne"],
    ["Bird dog", "Toutou", "Cerbère"],
    ["Superman", "Clark Kent", "Homme d'Acier"],
  ];

  it.each(cases)("%s : 5 paliers du plus petit au plus grand titre", (name, first, last) => {
    const badges = buildDefaultBadges(name);
    expect(badges).toHaveLength(DEFAULT_BADGE_TIERS.length);
    expect(badges[0].title).toBe(first);
    expect(badges[badges.length - 1].title).toBe(last);
    // seuils alignés sur le barème générique
    expect(badges.map((b) => b.threshold)).toEqual(DEFAULT_BADGE_TIERS.map((t) => t.threshold));
  });

  it("retombe sur les titres génériques pour un exercice custom", () => {
    const badges = buildDefaultBadges("Rameur maison");
    expect(badges[0].title).toBe("Rameur maison — Centurion");
  });
});
