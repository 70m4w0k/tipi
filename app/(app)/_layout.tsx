import { Platform } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavPreferences, ALL_TABS } from "../../lib/hooks/useNavPreferences";
import { TipiIcon } from "../../components/TipiIcon";

export default function AppLayout() {
  const { enabledTabs, loaded } = useNavPreferences();
  const insets = useSafeAreaInsets();

  if (!loaded) return null;

  const isTabEnabled = (key: string) => enabledTabs.includes(key as any);

  const bottomPadding = Platform.OS === "android" ? Math.max(insets.bottom, 6) : insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: "#E5E7EB",
          borderTopWidth: 1,
          paddingTop: 4,
          paddingBottom: bottomPadding,
        },
        tabBarActiveTintColor: "#1D4ED8",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarLabelStyle: { fontWeight: "600", fontSize: 11 },
      }}
    >
      {ALL_TABS.map((tab) => (
        <Tabs.Screen
          key={tab.key}
          name={tab.key}
          options={{
            title: tab.label,
            href: isTabEnabled(tab.key) ? undefined : null,
            tabBarIcon: tab.key === "home"
              ? ({ color, size }) => (
                  <TipiIcon size={size} color={color as string} />
                )
              : ({ color, size }) => (
                  <Ionicons name={tab.icon as any} size={size} color={color} />
                ),
          }}
        />
      ))}
      {/* Profile page — not in tab bar, accessible from home */}
      <Tabs.Screen
        name="other"
        options={{
          title: "Profil",
          href: null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
