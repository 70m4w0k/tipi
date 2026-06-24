import { useColorScheme } from "react-native";

const light = {
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

const dark: typeof light = {
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

export type Theme = typeof light;

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === "dark" ? dark : light;
}
