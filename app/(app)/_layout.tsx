import { Platform } from "react-native";
import { Tabs, Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../lib/AuthContext";
import { useNavPreferences, ALL_TABS } from "../../lib/hooks/useNavPreferences";
import { useTheme } from "../../lib/theme";
import { TipiIcon } from "../../components/TipiIcon";

export default function AppLayout() {
  const { session, profile } = useAuth();
  const { enabledTabs, loaded } = useNavPreferences();
  const insets = useSafeAreaInsets();
  const t = useTheme();

  if (!session) return <Redirect href="/(auth)/login" />;
  if (!profile?.household_id) return <Redirect href="/(auth)/join" />;
  if (!loaded) return null;

  const isTabEnabled = (key: string) => enabledTabs.includes(key as any);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: t.tabBarBg,
          borderTopColor: t.tabBarBorder,
          borderTopWidth: 1,
          paddingBottom: Platform.OS === "android" ? Math.max(insets.bottom, 10) : undefined,
        },
        tabBarActiveTintColor: t.accent,
        tabBarInactiveTintColor: t.textMuted,
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
            ...(tab.key === "chat" ? { tabBarStyle: { display: "none" as const } } : {}),
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
