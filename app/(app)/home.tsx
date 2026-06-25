import React, { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
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
import { useExpenses, computeBalances } from "../../lib/hooks/useExpenses";
import { useShoppingList } from "../../lib/hooks/useShoppingList";
import { useNavPreferences, ALL_TABS } from "../../lib/hooks/useNavPreferences";
import { useTheme } from "../../lib/theme";
import { recurrenceMatchesToday } from "../../components/ChoreReminder";

type Notification = {
  id: string;
  text: string;
  icon: string;
  color: string;
  route: string;
  params?: Record<string, string>;
};

export default function HomeScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { household, members } = useHousehold(profile);
  const { reminders, fetchAll: fetchChores } = useChores(profile?.household_id);
  const { instances, recipes, fetchAll: fetchRecipes } = useRecipes(profile?.household_id);
  const { expenses, fetchExpenses } = useExpenses(profile?.household_id);
  const { items: shoppingItems, fetchItems: fetchShopping } = useShoppingList(profile?.household_id);
  const { enabledTabs } = useNavPreferences();
  const t = useTheme();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchChores(), fetchRecipes(), fetchExpenses(), fetchShopping()]);
    setRefreshing(false);
  }, [fetchChores, fetchRecipes, fetchExpenses, fetchShopping]);

  const todayReminders = useMemo(
    () => reminders.filter((r) => recurrenceMatchesToday(r.recurrence)),
    [reminders]
  );

  const allNonNavPages = useMemo(
    () => ALL_TABS.filter((tab) => !enabledTabs.includes(tab.key) && tab.key !== "home"),
    [enabledTabs]
  );

  const myBalance = useMemo(() => {
    if (!profile?.id) return 0;
    const balances = computeBalances(expenses, members);
    return balances[profile.id] ?? 0;
  }, [expenses, members, profile?.id]);

  const uncheckedShoppingCount = useMemo(
    () => shoppingItems.filter((i) => !i.checked).length,
    [shoppingItems]
  );

  const notifications = useMemo(() => {
    const notifs: Notification[] = [];
    const today = new Date().toISOString().slice(0, 10);

    for (const r of todayReminders) {
      if (r.last_done_date !== today) {
        notifs.push({
          id: `reminder-${r.id}`,
          text: r.title,
          icon: "alert-circle-outline",
          color: t.warning,
          route: "/(app)/chores",
        });
      }
    }

    for (const inst of instances) {
      const recipe = recipes.find((rc) => rc.id === inst.recipe_id);
      if (!recipe) continue;
      if (inst.current_step >= recipe.steps.length - 1) {
        notifs.push({
          id: `recipe-${inst.id}`,
          text: `${inst.label} — dernière étape !`,
          icon: "restaurant-outline",
          color: t.success,
          route: "/(app)/recipes",
          params: { tab: "active", instanceId: inst.id },
        });
      }
    }

    return notifs;
  }, [todayReminders, instances, recipes, t]);

  const visibleNotifs = notifications.filter((n) => !dismissed.has(n.id));

  const dismiss = (id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
  };

  const handleShareInvite = async () => {
    if (!household) return;
    await Share.share({
      message: `Rejoins notre coloc "${household.name}" sur Tipi ! Code d'invitation : ${household.invite_code}`,
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.background }]} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.accent} colors={[t.accent]} />}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.appName, { color: t.accent }]}>Tipi</Text>
            <Text style={[styles.houseName, { color: t.textSecondary }]}>{household?.name ?? ""}</Text>
          </View>
          <Pressable
            style={styles.profileButton}
            onPress={() => router.push("/(app)/other" as any)}
          >
            <Ionicons name="person-circle-outline" size={30} color={t.textSecondary} />
          </Pressable>
        </View>

        {/* Contexte rapide : solde + courses */}
        <View style={styles.contextRow}>
          <Pressable
            style={[styles.contextCard, { backgroundColor: t.card, borderColor: t.cardBorder }]}
            onPress={() => router.push("/(app)/expenses" as any)}
          >
            <Ionicons name="wallet-outline" size={18} color={myBalance >= 0 ? t.success : t.danger} />
            <Text style={[styles.contextLabel, { color: t.textSecondary }]}>Mon solde</Text>
            <Text style={[styles.contextValue, { color: myBalance >= 0 ? t.success : t.danger }]}>
              {myBalance >= 0 ? "+" : ""}{myBalance.toFixed(2)} €
            </Text>
          </Pressable>
          <Pressable
            style={[styles.contextCard, { backgroundColor: t.card, borderColor: t.cardBorder }]}
            onPress={() => router.push("/(app)/shopping" as any)}
          >
            <Ionicons name="cart-outline" size={18} color={t.accent} />
            <Text style={[styles.contextLabel, { color: t.textSecondary }]}>Courses</Text>
            <Text style={[styles.contextValue, { color: t.text }]}>
              {uncheckedShoppingCount > 0 ? `${uncheckedShoppingCount} article${uncheckedShoppingCount > 1 ? "s" : ""}` : "Liste vide"}
            </Text>
          </Pressable>
        </View>

        {/* Notifications */}
        {visibleNotifs.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: t.text }]}>Aujourd'hui</Text>
            {visibleNotifs.map((n) => (
              <Pressable
                key={n.id}
                style={[styles.notifCard, { backgroundColor: t.card, borderColor: t.cardBorder }]}
                onPress={() => router.push({ pathname: n.route as any, params: n.params })}
              >
                <Ionicons name={n.icon as any} size={20} color={n.color} />
                <Text style={[styles.notifText, { color: t.text }]}>{n.text}</Text>
                <Pressable
                  onPress={(e) => { e.stopPropagation(); dismiss(n.id); }}
                  hitSlop={8}
                  style={[styles.dismissBtn, { backgroundColor: t.separator }]}
                >
                  <Ionicons name="close" size={16} color={t.textMuted} />
                </Pressable>
              </Pressable>
            ))}
          </View>
        )}

        {visibleNotifs.length === 0 && (
          <View style={styles.emptyNotif}>
            <Ionicons name="checkmark-circle-outline" size={32} color={t.success} />
            <Text style={[styles.emptyNotifText, { color: t.textSecondary }]}>Rien de prévu pour aujourd'hui</Text>
          </View>
        )}

        {/* Inviter des colocs */}
        {household && members.length <= 1 && (
          <Pressable
            style={[styles.inviteCard, { backgroundColor: t.accentLight, borderColor: t.accent }]}
            onPress={handleShareInvite}
          >
            <View style={styles.inviteContent}>
              <Ionicons name="people-outline" size={24} color={t.accent} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.inviteTitle, { color: t.accent }]}>Invite tes colocs !</Text>
                <Text style={[styles.inviteSubtitle, { color: t.textSecondary }]}>
                  Partage le code d'invitation pour commencer
                </Text>
              </View>
              <Ionicons name="share-outline" size={20} color={t.accent} />
            </View>
          </Pressable>
        )}

        {/* Quick access */}
        {allNonNavPages.length > 0 && (
          <View style={styles.section}>
            <View style={styles.tileGrid}>
              {allNonNavPages.map((tab) => (
                <Pressable
                  key={tab.key}
                  style={[styles.tile, { backgroundColor: t.card, borderColor: t.cardBorder }]}
                  onPress={() => router.push(`/(app)/${tab.key}` as any)}
                >
                  <Ionicons name={tab.icon as any} size={28} color={t.accent} />
                  <Text style={[styles.tileLabel, { color: t.text }]}>{tab.label}</Text>
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
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingVertical: 8,
  },
  appName: { fontSize: 22, fontWeight: "800" },
  houseName: { fontSize: 13 },
  profileButton: { padding: 4 },
  contextRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  contextCard: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    gap: 4,
  },
  contextLabel: { fontSize: 11 },
  contextValue: { fontSize: 17, fontWeight: "700" },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10 },
  notifCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 6,
  },
  notifText: { fontSize: 14, flex: 1 },
  dismissBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyNotif: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 24,
    marginBottom: 16,
  },
  emptyNotifText: { fontSize: 14 },
  inviteCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  inviteContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  inviteTitle: { fontSize: 15, fontWeight: "700" },
  inviteSubtitle: { fontSize: 12, marginTop: 2 },
  tileGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  tile: {
    width: "47%",
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 24,
    alignItems: "center",
    gap: 8,
  },
  tileLabel: { fontSize: 14, fontWeight: "600" },
});
