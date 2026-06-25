export type ShoppingAisle = "frais" | "epicerie" | "hygiene" | "menage" | "autre";

export const AISLE_LABELS: Record<ShoppingAisle, string> = {
  frais: "Frais",
  epicerie: "Épicerie",
  hygiene: "Hygiène",
  menage: "Ménage",
  autre: "Autre",
};

export const AISLE_ICONS: Record<ShoppingAisle, string> = {
  frais: "snow-outline",
  epicerie: "basket-outline",
  hygiene: "sparkles-outline",
  menage: "home-outline",
  autre: "cube-outline",
};

export const AISLE_COLORS: Record<ShoppingAisle, string> = {
  frais: "#3B82F6",
  epicerie: "#F59E0B",
  hygiene: "#EC4899",
  menage: "#10B981",
  autre: "#6B7280",
};

const KEYWORD_MAP: Array<{ keywords: string[]; aisle: ShoppingAisle }> = [
  {
    aisle: "frais",
    keywords: [
      "lait", "yaourt", "fromage", "beurre", "crème", "oeuf", "oeufs", "viande",
      "poulet", "porc", "boeuf", "jambon", "saumon", "poisson", "crevette",
      "salade", "tomate", "carotte", "courgette", "poivron", "oignon", "ail",
      "pomme", "banane", "orange", "citron", "fraise", "raisin", "poire",
      "avocat", "concombre", "légume", "fruit", "champignon", "herbe",
      "persil", "basilic", "menthe", "jus", "compote",
    ],
  },
  {
    aisle: "epicerie",
    keywords: [
      "pâte", "pates", "riz", "pain", "farine", "sucre", "sel", "poivre",
      "huile", "vinaigre", "sauce", "ketchup", "moutarde", "mayonnaise",
      "conserve", "boîte", "céréale", "biscuit", "chocolat", "café", "thé",
      "confiture", "miel", "chips", "gâteau", "bonbon", "eau", "soda",
      "bière", "vin", "nouille", "semoule", "lentille", "haricot", "pois",
      "épice", "curry", "paprika", "cumin", "cannelle",
    ],
  },
  {
    aisle: "hygiene",
    keywords: [
      "shampo", "shampoing", "savon", "gel douche", "dentifrice", "brosse à dent",
      "déodorant", "déo", "rasoir", "mousse", "coton", "mouchoir",
      "papier toilette", "pq", "serviette", "crème solaire", "crème hydratante",
      "parfum", "protège", "tampon",
    ],
  },
  {
    aisle: "menage",
    keywords: [
      "lessive", "adoucissant", "javel", "éponge", "liquide vaisselle",
      "nettoyant", "désinfectant", "balai", "serpillère", "sac poubelle",
      "sopalin", "essuie", "filtre", "ampoule", "pile", "scotch", "aluminium",
      "film alimentaire", "cellophane",
    ],
  },
];

export function guessAisle(title: string): ShoppingAisle {
  const lower = title.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  for (const { keywords, aisle } of KEYWORD_MAP) {
    for (const kw of keywords) {
      const normalizedKw = kw.normalize("NFD").replace(/[̀-ͯ]/g, "");
      const pattern = new RegExp(`(?:^|[\\s,;:.'"-])${escapeRegex(normalizedKw)}(?:$|[\\s,;:.'"-es])`, "i");
      if (pattern.test(lower) || lower === normalizedKw) return aisle;
    }
  }
  return "autre";
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
