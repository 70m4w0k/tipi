import fs from "fs";
import path from "path";

/**
 * Garde-fou clavier (non-régression).
 *
 * Le clavier logiciel est un problème natif (iOS/Android) que Playwright web
 * headless ne peut pas simuler. On vérifie donc statiquement la *convention* qui
 * garantit l'UX demandée : quand l'utilisateur saisit du texte, il doit toujours
 * voir ce qu'il écrit et pouvoir atteindre les boutons sans scroller.
 *
 * Règle : tout fichier qui rend un <TextInput> doit
 *   1. remonter le contenu au-dessus du clavier  -> KeyboardAvoidingView
 *   2. garder les boutons tappables clavier ouvert -> keyboardShouldPersistTaps
 *
 * Exceptions documentées : composants qui délèguent la gestion à leur écran parent.
 */

// Composant -> écran parent qui fournit le KeyboardAvoidingView.
const HANDLED_BY_PARENT: Record<string, string> = {
  "components/ExpenseForm.tsx": "app/(app)/expenses.tsx",
  "components/RepStepper.tsx": "app/(app)/sport/[id].tsx",
  "components/IngredientsEditor.tsx": "app/(app)/recipes/[id].tsx",
};

const ROOT = path.resolve(__dirname, "..");
const SCAN_DIRS = ["app", "components"];

function listTsx(dir: string): string[] {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap((entry) => {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) return listTsx(rel);
    return entry.name.endsWith(".tsx") ? [rel] : [];
  });
}

const inputFiles = SCAN_DIRS.flatMap(listTsx).filter((rel) => {
  const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
  return /<TextInput[\s/>]/.test(src);
});

// Sanity : on scanne bien quelque chose.
test("des écrans avec saisie sont détectés", () => {
  expect(inputFiles.length).toBeGreaterThan(5);
});

describe("gestion du clavier sur les écrans de saisie", () => {
  for (const rel of inputFiles) {
    const norm = rel.split(path.sep).join("/");
    const delegate = HANDLED_BY_PARENT[norm];

    test(`${norm} remonte la saisie au-dessus du clavier`, () => {
      const target = delegate ?? norm;
      const src = fs.readFileSync(path.join(ROOT, target), "utf8");
      expect(src).toContain("KeyboardAvoidingView");
    });

    test(`${norm} garde les boutons tappables clavier ouvert`, () => {
      const target = delegate ?? norm;
      const src = fs.readFileSync(path.join(ROOT, target), "utf8");
      expect(src).toContain("keyboardShouldPersistTaps");
    });
  }
});
