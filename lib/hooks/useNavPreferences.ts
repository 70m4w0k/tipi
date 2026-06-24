import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "tipi_nav_tabs";
const DEFAULT_TABS = ["home", "chat", "expenses", "chores"];

export type NavTab = "home" | "chat" | "expenses" | "chores" | "shopping" | "recipes" | "documents";

export const ALL_TABS: { key: NavTab; label: string; icon: string }[] = [
  { key: "home", label: "Accueil", icon: "home-outline" },
  { key: "chat", label: "Chat", icon: "chatbubbles-outline" },
  { key: "expenses", label: "Dépenses", icon: "wallet-outline" },
  { key: "chores", label: "Ménage", icon: "sparkles-outline" },
  { key: "shopping", label: "Courses", icon: "cart-outline" },
  { key: "recipes", label: "Recettes", icon: "restaurant-outline" },
  { key: "documents", label: "Documents", icon: "document-text-outline" },
];

export function useNavPreferences() {
  const [enabledTabs, setEnabledTabs] = useState<NavTab[]>(DEFAULT_TABS as NavTab[]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val) {
        try {
          const parsed = JSON.parse(val) as NavTab[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            setEnabledTabs(parsed);
          }
        } catch {
          // ignore
        }
      }
      setLoaded(true);
    });
  }, []);

  const setTabs = useCallback(async (tabs: NavTab[]) => {
    setEnabledTabs(tabs);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
  }, []);

  return { enabledTabs, setTabs, loaded };
}
