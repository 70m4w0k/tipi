import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useNavPreferences, ALL_TABS } from "../../lib/hooks/useNavPreferences";

export default function AppLayout() {
  const { enabledTabs, loaded } = useNavPreferences();

  if (!loaded) return null;

  const isTabEnabled = (key: string) => enabledTabs.includes(key as any);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: "#E5E7EB",
          borderTopWidth: 1,
          paddingTop: 4,
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
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={tab.icon as any} size={size} color={color} />
            ),
          }}
        />
      ))}
      <Tabs.Screen
        name="other"
        options={{
          title: "Plus",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ellipsis-horizontal-circle-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
