export type NavTab = "home" | "chat" | "expenses" | "chores" | "shopping" | "recipes" | "documents";

export const DEFAULT_TABS: NavTab[] = ["home", "chores", "shopping", "recipes"];

export function parseStoredTabs(raw: string | null): NavTab[] {
  if (!raw) return DEFAULT_TABS;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_TABS;
    const tabs = parsed as NavTab[];
    return tabs.includes("home") ? tabs : ["home" as NavTab, ...tabs];
  } catch {
    return DEFAULT_TABS;
  }
}
