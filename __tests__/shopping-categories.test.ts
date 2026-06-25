import { guessAisle, AISLE_LABELS, AISLE_COLORS, AISLE_ICONS, ShoppingAisle } from "../lib/shopping-categories";

describe("shopping categories", () => {
  const allAisles: ShoppingAisle[] = ["frais", "epicerie", "hygiene", "menage", "autre"];

  it("AISLE_LABELS covers all aisles", () => {
    expect(Object.keys(AISLE_LABELS).sort()).toEqual([...allAisles].sort());
  });

  it("AISLE_COLORS are valid hex colors", () => {
    for (const color of Object.values(AISLE_COLORS)) {
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("AISLE_ICONS end with -outline", () => {
    for (const icon of Object.values(AISLE_ICONS)) {
      expect(icon).toMatch(/-outline$/);
    }
  });

  it("guessAisle categorizes fresh products correctly", () => {
    expect(guessAisle("Lait demi-écrémé")).toBe("frais");
    expect(guessAisle("tomates")).toBe("frais");
    expect(guessAisle("Poulet rôti")).toBe("frais");
    expect(guessAisle("Bananes")).toBe("frais");
    expect(guessAisle("Fromage râpé")).toBe("frais");
  });

  it("guessAisle categorizes grocery items correctly", () => {
    expect(guessAisle("Pâtes penne")).toBe("epicerie");
    expect(guessAisle("Riz basmati")).toBe("epicerie");
    expect(guessAisle("Huile d'olive")).toBe("epicerie");
    expect(guessAisle("Café moulu")).toBe("epicerie");
    expect(guessAisle("Chocolat noir")).toBe("epicerie");
  });

  it("guessAisle categorizes hygiene items correctly", () => {
    expect(guessAisle("Shampoing")).toBe("hygiene");
    expect(guessAisle("Dentifrice")).toBe("hygiene");
    expect(guessAisle("Papier toilette")).toBe("hygiene");
    expect(guessAisle("Déodorant")).toBe("hygiene");
  });

  it("guessAisle categorizes cleaning items correctly", () => {
    expect(guessAisle("Lessive")).toBe("menage");
    expect(guessAisle("Éponge")).toBe("menage");
    expect(guessAisle("Sac poubelle")).toBe("menage");
    expect(guessAisle("Liquide vaisselle")).toBe("menage");
  });

  it("guessAisle defaults to autre for unknown items", () => {
    expect(guessAisle("Câble USB")).toBe("autre");
    expect(guessAisle("Tournevis")).toBe("autre");
    expect(guessAisle("xyz123")).toBe("autre");
  });

  it("guessAisle is case-insensitive", () => {
    expect(guessAisle("LAIT")).toBe("frais");
    expect(guessAisle("LESSIVE")).toBe("menage");
  });

  it("guessAisle handles accented characters", () => {
    expect(guessAisle("Épicerie pâtes")).toBe("epicerie");
    expect(guessAisle("Crème fraîche")).toBe("frais");
  });
});
