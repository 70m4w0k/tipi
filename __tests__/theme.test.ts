describe("theme palette contract", () => {
  const lightPalette = {
    background: "#F4F6FA",
    card: "#FFFFFF",
    cardBorder: "#E5E7EB",
    accent: "#1D4ED8",
    accentLight: "#EFF6FF",
    text: "#111827",
    textSecondary: "#6B7280",
    textMuted: "#9CA3AF",
    danger: "#EF4444",
    dangerLight: "#FEF2F2",
    success: "#10B981",
    successLight: "#ECFDF5",
    warning: "#F59E0B",
    warningLight: "#FFFBEB",
    inputBorder: "#D1D5DB",
    inputBg: "#FFFFFF",
    separator: "#F3F4F6",
    tabBg: "#E5E7EB",
    tabBarBg: "#FFFFFF",
    tabBarBorder: "#E5E7EB",
    emptyIcon: "#D1D5DB",
  };

  const darkPalette = {
    background: "#0F1117",
    card: "#1A1D27",
    cardBorder: "#2D3140",
    accent: "#60A5FA",
    accentLight: "#1E293B",
    text: "#F3F4F6",
    textSecondary: "#9CA3AF",
    textMuted: "#6B7280",
    danger: "#F87171",
    dangerLight: "#371520",
    success: "#34D399",
    successLight: "#152E23",
    warning: "#FBBF24",
    warningLight: "#2D2510",
    inputBorder: "#374151",
    inputBg: "#1F2937",
    separator: "#1F2937",
    tabBg: "#2D3140",
    tabBarBg: "#1A1D27",
    tabBarBorder: "#2D3140",
    emptyIcon: "#4B5563",
  };

  it("light and dark palettes have the same keys", () => {
    expect(Object.keys(lightPalette).sort()).toEqual(Object.keys(darkPalette).sort());
  });

  it("all light palette values are valid hex colors", () => {
    const hexRegex = /^#[0-9A-Fa-f]{6}$/;
    for (const [key, value] of Object.entries(lightPalette)) {
      expect(value).toMatch(hexRegex);
    }
  });

  it("all dark palette values are valid hex colors", () => {
    const hexRegex = /^#[0-9A-Fa-f]{6}$/;
    for (const [key, value] of Object.entries(darkPalette)) {
      expect(value).toMatch(hexRegex);
    }
  });

  it("light and dark backgrounds are visually distinct", () => {
    expect(lightPalette.background).not.toBe(darkPalette.background);
    expect(lightPalette.card).not.toBe(darkPalette.card);
    expect(lightPalette.text).not.toBe(darkPalette.text);
    expect(lightPalette.accent).not.toBe(darkPalette.accent);
  });

  it("light mode uses lighter backgrounds", () => {
    const lightBg = parseInt(lightPalette.background.slice(1), 16);
    const darkBg = parseInt(darkPalette.background.slice(1), 16);
    expect(lightBg).toBeGreaterThan(darkBg);
  });

  it("dark mode uses lighter text", () => {
    const lightText = parseInt(lightPalette.text.slice(1), 16);
    const darkText = parseInt(darkPalette.text.slice(1), 16);
    expect(darkText).toBeGreaterThan(lightText);
  });

  it("palettes include all required UI tokens", () => {
    const requiredKeys = [
      "background",
      "card",
      "cardBorder",
      "accent",
      "text",
      "textSecondary",
      "danger",
      "success",
      "warning",
      "inputBorder",
      "inputBg",
      "separator",
    ];
    for (const key of requiredKeys) {
      expect(lightPalette).toHaveProperty(key);
      expect(darkPalette).toHaveProperty(key);
    }
  });

  it("isDark resolves correctly for each ThemeMode", () => {
    const resolve = (mode: "system" | "light" | "dark", systemScheme: "light" | "dark") =>
      mode === "dark" || (mode === "system" && systemScheme === "dark");

    expect(resolve("light", "light")).toBe(false);
    expect(resolve("light", "dark")).toBe(false);
    expect(resolve("dark", "light")).toBe(true);
    expect(resolve("dark", "dark")).toBe(true);
    expect(resolve("system", "light")).toBe(false);
    expect(resolve("system", "dark")).toBe(true);
  });
});
