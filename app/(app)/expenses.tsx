import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../lib/hooks/useAuth";
import { useHousehold } from "../../lib/hooks/useHousehold";
import { useExpenses, computeBalances } from "../../lib/hooks/useExpenses";
import { useTheme } from "../../lib/theme";
import { ExpenseCard } from "../../components/ExpenseCard";
import { ExpenseForm, ExpenseFormData } from "../../components/ExpenseForm";
import { BalancesView } from "../../components/BalancesView";
import { EmptyState } from "../../components/EmptyState";
import { haptic } from "../../lib/haptics";

type ActiveTab = "list" | "add" | "balances";

export default function ExpensesScreen() {
  const { profile } = useAuth();
  const { members } = useHousehold(profile);
  const { expenses, loading, addExpense, deleteExpense, fetchExpenses } = useExpenses(
    profile?.household_id
  );
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchExpenses();
    setRefreshing(false);
  }, [fetchExpenses]);
  const t = useTheme();

  const [view, setView] = useState<ActiveTab>("list");

  const currentUserId = profile?.id ?? "";

  const balances = useMemo(
    () => computeBalances(expenses, members),
    [expenses, members]
  );

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const myBalance = balances[currentUserId] ?? 0;

  const handleAddExpense = async (data: ExpenseFormData) => {
    await addExpense(data);
    void haptic.success();
    setView("list");
  };

  const handleDelete = (id: string) => {
    void haptic.warning();
    Alert.alert(
      "Supprimer ?",
      "Cette dépense sera définitivement supprimée.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () => void deleteExpense(id),
        },
      ]
    );
  };

  if (loading && expenses.length === 0) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: t.background }]}>
        <ActivityIndicator size="large" color={t.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.background }]} edges={["top"]}>
      <View style={[styles.header, { backgroundColor: t.card, borderBottomColor: t.cardBorder }]}>
        <Text style={[styles.headerTitle, { color: t.text }]}>Dépenses</Text>
      </View>

      {/* Header résumé */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
          <Text style={[styles.summaryLabel, { color: t.textSecondary }]}>Total dépenses</Text>
          <Text style={[styles.summaryValue, { color: t.text }]}>{totalSpent.toFixed(2)} €</Text>
        </View>
        <View
          style={[
            styles.summaryCard,
            myBalance >= 0
              ? { backgroundColor: t.successLight, borderColor: t.success }
              : { backgroundColor: t.dangerLight, borderColor: t.danger },
          ]}
        >
          <Text style={[styles.summaryLabel, { color: t.textSecondary }]}>Mon solde</Text>
          <Text style={[styles.summaryValueBig, { color: t.text }]}>
            {myBalance >= 0 ? "+" : ""}
            {myBalance.toFixed(2)} €
          </Text>
        </View>
      </View>

      {/* Onglets internes */}
      <View style={styles.tabRow}>
        {(["list", "balances"] as ActiveTab[]).map((v) => (
          <Pressable
            key={v}
            style={[styles.tab, { backgroundColor: t.tabBg }, view === v && { backgroundColor: t.accent }]}
            onPress={() => setView(v)}
          >
            <Text style={[styles.tabText, { color: t.text }, view === v && styles.tabTextActive]}>
              {v === "list" ? "Liste" : "Bilans"}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.accent} colors={[t.accent]} />}>
        {/* Liste */}
        {view === "list" && (
          <View style={styles.section}>
            {expenses.length === 0 ? (
              <EmptyState
                icon="wallet-outline"
                title="Aucune dépense"
                subtitle="Ajoute ta première dépense partagée pour suivre qui doit quoi."
                actionLabel="Ajouter une dépense"
                onAction={() => setView("add")}
              />
            ) : (
              expenses.map((expense) => (
                <ExpenseCard
                  key={expense.id}
                  expense={expense}
                  participants={expense.participants}
                  currentUserId={currentUserId}
                  members={members}
                  onDelete={handleDelete}
                />
              ))
            )}
          </View>
        )}

        {/* Formulaire */}
        {view === "add" && (
          <ExpenseForm
            members={members}
            currentUserId={currentUserId}
            onSubmit={handleAddExpense}
          />
        )}

        {/* Bilans */}
        {view === "balances" && (
          <BalancesView
            expenses={expenses}
            members={members}
            currentUserId={currentUserId}
          />
        )}
      </ScrollView>

      {/* FAB — Ajouter une dépense */}
      {view !== "add" && (
        <Pressable
          style={[styles.fab, { backgroundColor: t.accent }]}
          onPress={() => setView("add")}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    borderBottomWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    padding: 16,
    paddingBottom: 8,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  summaryLabel: { fontSize: 11, marginBottom: 4 },
  summaryValue: { fontSize: 18, fontWeight: "700" },
  summaryValueBig: { fontSize: 20, fontWeight: "700" },
  tabRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  tab: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  tabText: { fontWeight: "600", fontSize: 12 },
  tabTextActive: { color: "#FFFFFF" },
  scroll: { padding: 16, paddingBottom: 80 },
  section: { gap: 12 },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
});
