import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
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
import { ExpenseCard } from "../../components/ExpenseCard";
import { ExpenseForm, ExpenseFormData } from "../../components/ExpenseForm";
import { BalancesView } from "../../components/BalancesView";

type ActiveTab = "list" | "add" | "balances";

export default function ExpensesScreen() {
  const { profile } = useAuth();
  const { members } = useHousehold(profile);
  const { expenses, loading, addExpense, deleteExpense } = useExpenses(
    profile?.household_id
  );

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
    setView("list");
  };

  const handleDelete = (id: string) => {
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
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1D4ED8" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dépenses</Text>
      </View>

      {/* Header résumé */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total dépenses</Text>
          <Text style={styles.summaryValue}>{totalSpent.toFixed(2)} €</Text>
        </View>
        <View
          style={[
            styles.summaryCard,
            myBalance >= 0 ? styles.summaryGreen : styles.summaryRed,
          ]}
        >
          <Text style={styles.summaryLabel}>Mon solde</Text>
          <Text style={styles.summaryValueBig}>
            {myBalance >= 0 ? "+" : ""}
            {myBalance.toFixed(2)} €
          </Text>
        </View>
      </View>

      {/* Onglets internes */}
      <View style={styles.tabRow}>
        {(["list", "add", "balances"] as ActiveTab[]).map((v) => (
          <Pressable
            key={v}
            style={[styles.tab, view === v && styles.tabActive]}
            onPress={() => setView(v)}
          >
            <Text style={[styles.tabText, view === v && styles.tabTextActive]}>
              {v === "list"
                ? "Liste"
                : v === "add"
                  ? "Ajouter"
                  : "Bilans"}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Liste */}
        {view === "list" && (
          <View style={styles.section}>
            {expenses.length === 0 ? (
              <Text style={styles.empty}>
                Aucune dépense pour le moment.
              </Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F6FA" },
  header: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#F4F6FA",
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
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  summaryGreen: { backgroundColor: "#ECFDF5", borderColor: "#10B981" },
  summaryRed: { backgroundColor: "#FEF2F2", borderColor: "#EF4444" },
  summaryLabel: { fontSize: 11, color: "#6B7280", marginBottom: 4 },
  summaryValue: { fontSize: 18, fontWeight: "700", color: "#111827" },
  summaryValueBig: { fontSize: 20, fontWeight: "700", color: "#111827" },
  tabRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  tab: {
    flex: 1,
    backgroundColor: "#E5E7EB",
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  tabActive: { backgroundColor: "#1D4ED8" },
  tabText: { fontWeight: "600", color: "#374151", fontSize: 12 },
  tabTextActive: { color: "#FFFFFF" },
  scroll: { padding: 16, paddingBottom: 40 },
  section: { gap: 12 },
  empty: { color: "#6B7280", textAlign: "center", paddingVertical: 24 },
});
