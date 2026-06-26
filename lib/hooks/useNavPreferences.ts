import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { parseStoredTabs, DEFAULT_TABS, type NavTab } from "../nav-preferences-logic";

export type { NavTab } from "../nav-preferences-logic";

const STORAGE_KEY = "tipi_nav_tabs";

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
  const [enabledTabs, setEnabledTabs] = useState<NavTab[]>(DEFAULT_TABS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      setEnabledTabs(parseStoredTabs(val));
      setLoaded(true);
    });
  }, []);

  const setTabs = useCallback(async (tabs: NavTab[]) => {
    setEnabledTabs(tabs);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
  }, []);

  return { enabledTabs, setTabs, loaded };
}
