import React, { useMemo } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../lib/hooks/useAuth";
import { useHousehold } from "../../lib/hooks/useHousehold";
import { useChores } from "../../lib/hooks/useChores";
import { useRecipes } from "../../lib/hooks/useRecipes";
import { useNavPreferences, ALL_TABS } from "../../lib/hooks/useNavPreferences";
import { recurrenceMatchesToday } from "../../components/ChoreReminder";

function TipiLogo({ size = 64 }: { size?: number }) {
  return (
    <View style={[logoStyles.container, { width: size, height: size }]}>
      <View style={[logoStyles.triangle, {
        borderLeftWidth: size * 0.45,
        borderRightWidth: size * 0.45,
        borderBottomWidth: size * 0.7,
      }]} />
      <View style={[logoStyles.pole, {
        height: size * 0.15,
        top: size * 0.12,
        left: size * 0.47,
      }]} />
      <View style={[logoStyles.pole, {
        height: size * 0.15,
        top: size * 0.12,
        left: size * 0.47,
        transform: [{ rotate: "30deg" }],
      }]} />
      <View style={[logoStyles.pole, {
        height: size * 0.15,
        top: size * 0.12,
        left: size * 0.47,
        transform: [{ rotate: "-30deg" }],
      }]} />
      <View style={[logoStyles.door, {
        width: size * 0.18,
        height: size * 0.22,
        bottom: size * 0.15,
        left: size * 0.41,
        borderTopLeftRadius: size * 0.09,
        borderTopRightRadius: size * 0.09,
      }]} />
    </View>
  );
}

const logoStyles = StyleSheet.create({
  container: { alignItems: "center", justifyContent: "center" },
  triangle: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#1D4ED8",
    position: "absolute",
    bottom: "15%",
  },
  pole: {
    position: "absolute",
    width: 2,
    backgroundColor: "#92400E",
  },
  door: {
    position: "absolute",
    backgroundColor: "#DBEAFE",
  },
});

export default function HomeScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { household } = useHousehold(profile);
  const { reminders } = useChores(profile?.household_id);
  const { instances, recipes } = useRecipes(profile?.household_id);
  const { enabledTabs } = useNavPreferences();

  const todayReminders = useMemo(
    () => reminders.filter((r) => recurrenceMatchesToday(r.recurrence)),
    [reminders]
  );

  const allNonNavPages = useMemo(
    () => ALL_TABS.filter((t) => !enabledTabs.includes(t.key) && t.key !== "home"),
    [enabledTabs]
  );

  const notifications: Array<{ id: string; text: string; icon: string; color: string }> = [];

  for (const r of todayReminders) {
    const today = new Date().toISOString().slice(0, 10);
    const isDone = r.last_done_date === today;
    if (!isDone) {
      notifications.push({
        id: `reminder-${r.id}`,
        text: r.title,
        icon: "alert-circle-outline",
        color: "#F59E0B",
      });
    }
  }

  for (const inst of instances) {
    const recipe = recipes.find((r) => r.id === inst.recipe_id);
    if (!recipe) continue;
    if (inst.current_step >= recipe.steps.length - 1) {
      notifications.push({
        id: `recipe-${inst.id}`,
        text: `${inst.label} — dernière étape !`,
        icon: "restaurant-outline",
        color: "#10B981",
      });
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header with logo */}
        <View style={styles.logoSection}>
          <TipiLogo size={56} />
          <View>
            <Text style={styles.appName}>Tipi</Text>
            <Text style={styles.houseName}>{household?.name ?? ""}</Text>
          </View>
          <View style={{ flex: 1 }} />
          <Pressable
            style={styles.profileButton}
            onPress={() => router.push("/(app)/other" as any)}
          >
            <Ionicons name="person-circle-outline" size={30} color="#6B7280" />
          </Pressable>
        </View>

        {/* Notifications */}
        {notifications.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Aujourd'hui</Text>
            {notifications.map((n) => (
              <View key={n.id} style={styles.notifCard}>
                <Ionicons name={n.icon as any} size={20} color={n.color} />
                <Text style={styles.notifText}>{n.text}</Text>
              </View>
            ))}
          </View>
        )}

        {notifications.length === 0 && (
          <View style={styles.emptyNotif}>
            <Ionicons name="checkmark-circle-outline" size={32} color="#10B981" />
            <Text style={styles.emptyNotifText}>Rien de prévu pour aujourd'hui</Text>
          </View>
        )}

        {/* Quick access */}
        {allNonNavPages.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Accès rapide</Text>
            <View style={styles.tileGrid}>
              {allNonNavPages.map((t) => (
                <Pressable
                  key={t.key}
                  style={styles.tile}
                  onPress={() => router.push(`/(app)/${t.key}` as any)}
                >
                  <Ionicons name={t.icon as any} size={28} color="#1D4ED8" />
                  <Text style={styles.tileLabel}>{t.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F6FA" },
  content: { padding: 16, paddingBottom: 40 },
  logoSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
    paddingVertical: 8,
  },
  appName: { fontSize: 22, fontWeight: "800", color: "#1D4ED8" },
  houseName: { fontSize: 13, color: "#6B7280" },
  profileButton: { padding: 4 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 10 },
  notifCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 14,
    marginBottom: 6,
  },
  notifText: { fontSize: 14, color: "#1F2937", flex: 1 },
  emptyNotif: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 24,
    marginBottom: 16,
  },
  emptyNotifText: { fontSize: 14, color: "#6B7280" },
  tileGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  tile: {
    width: "47%",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingVertical: 24,
    alignItems: "center",
    gap: 8,
  },
  tileLabel: { fontSize: 14, fontWeight: "600", color: "#374151" },
});
