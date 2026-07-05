export const RECIPE_ICONS = [
  { name: "restaurant-outline", label: "Restaurant" },
  { name: "pizza-outline", label: "Pizza" },
  { name: "cafe-outline", label: "Café" },
  { name: "wine-outline", label: "Vin" },
  { name: "fish-outline", label: "Poisson" },
  { name: "leaf-outline", label: "Végétal" },
  { name: "flame-outline", label: "Flamme" },
  { name: "nutrition-outline", label: "Fruit" },
  { name: "beer-outline", label: "Bière" },
  { name: "ice-cream-outline", label: "Glace" },
  { name: "water-outline", label: "Boisson" },
  { name: "egg-outline", label: "Oeuf" },
] as const;

const ICON_COLORS = [
  "#FEE2E2", "#FEF3C7", "#D1FAE5", "#EDE9FE",
  "#DBEAFE", "#ECFDF5", "#FFF7ED", "#FCE7F3",
] as const;

export type RecipeIconName = (typeof RECIPE_ICONS)[number]["name"];

export function getRecipePlaceholder(id: string, icon?: string | null) {
  const hash = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const bg = ICON_COLORS[hash % ICON_COLORS.length];
  const fallback = RECIPE_ICONS[hash % RECIPE_ICONS.length].name;
  return { icon: icon ?? fallback, bg };
}
