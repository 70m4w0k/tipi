import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Expense, ExpenseCategory, Profile } from "../lib/types";
import { computeBalances, computeSettlements } from "../lib/hooks/useExpenses";
import { useTheme } from "../lib/theme";
import { CATEGORY_LABELS, CATEGORY_ICONS } from "../lib/expense-categories";

type ExpenseWithParticipants = Expense & { participants: string[] };

type Props = {
  expenses: ExpenseWithParticipants[];
  members: Profile[];
  currentUserId: string;
};

function getName(userId: string, members: Profile[]): string {
  const m = members.find((p) => p.id === userId);
  return m?.display_name ?? "Inconnu";
}

export function BalancesView({ expenses, members, currentUserId }: Props) {
  const t = useTheme();
  const balances = useMemo(
    () => computeBalances(expenses, members),
    [expenses, members]
  );

  const settlements = useMemo(
    () => computeSettlements(expenses, members),
    [expenses, members]
  );

  const maxAbsBalance = Math.max(
    ...Object.values(balances).map(Math.abs),
    1
  );

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: t.text }]}>Balances</Text>
      {members.map((member) => {
        const bal = balances[member.id] ?? 0;
        const barWidth =
          maxAbsBalance > 0 ? (Math.abs(bal) / maxAbsBalance) * 100 : 0;
        const isPositive = bal >= 0;
        return (
          <View key={member.id} style={styles.balanceRow}>
            <Text style={[styles.balanceName, { color: t.textSecondary }]}>{member.display_name}</Text>
            <View style={[styles.barTrack, { backgroundColor: t.cardBorder }]}>
              <View
                style={[
                  styles.bar,
                  {
                    width: `${barWidth}%`,
                    backgroundColor: isPositive ? t.success : t.danger,
                  },
                ]}
              />
            </View>
            <Text
              style={[
                styles.balanceAmount,
                { color: isPositive ? t.success : t.danger },
              ]}
            >
              {isPositive ? "+" : ""}
              {bal.toFixed(2)} €
            </Text>
          </View>
        );
      })}

      <View style={[styles.sectionHeader, { marginTop: 24 }]}>
        <Ionicons name="swap-horizontal-outline" size={18} color={t.text} />
        <Text style={[styles.sectionTitle, { color: t.text }]}>Remboursements suggérés</Text>
      </View>
      {settlements.length === 0 ? (
        <View style={styles.emptyRow}>
          <Ionicons name="checkmark-circle-outline" size={18} color={t.success} />
          <Text style={[styles.empty, { color: t.textSecondary }]}>
            Tout le monde est à l'équilibre
          </Text>
        </View>
      ) : (
        settlements.map((s, i) => (
          <View key={i} style={[styles.settlementCard, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
            <Text style={[styles.settlementText, { color: t.textSecondary }]}>
              <Text style={[styles.settlementFrom, { color: t.danger }]}>
                {getName(s.from, members)}
              </Text>
              {"  →  "}
              <Text style={[styles.settlementTo, { color: t.success }]}>
                {getName(s.to, members)}
              </Text>
            </Text>
            <Text style={[styles.settlementAmount, { color: t.text }]}>
              {s.amount.toFixed(2)} €
            </Text>
          </View>
        ))
      )}

      <View style={[styles.sectionHeader, { marginTop: 24 }]}>
        <Ionicons name="stats-chart-outline" size={18} color={t.text} />
        <Text style={[styles.sectionTitle, { color: t.text }]}>Par catégorie</Text>
      </View>
      {(Object.keys(CATEGORY_LABELS) as ExpenseCategory[]).map((cat) => {
        const total = expenses
          .filter((e) => e.category === cat)
          .reduce((sum, e) => sum + e.amount, 0);
        if (total === 0) return null;
        return (
          <View key={cat} style={[styles.catRow, { borderBottomColor: t.separator }]}>
            <View style={styles.catLabelRow}>
              <Ionicons name={CATEGORY_ICONS[cat] as any} size={14} color={t.textSecondary} />
              <Text style={[styles.catLabel, { color: t.textSecondary }]}>{CATEGORY_LABELS[cat]}</Text>
            </View>
            <Text style={[styles.catTotal, { color: t.text }]}>{total.toFixed(2)} €</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  emptyRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 24 },
  empty: { color: "#6B7280" },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  balanceName: { width: 80, fontWeight: "600", color: "#374151", fontSize: 13 },
  barTrack: {
    flex: 1,
    height: 12,
    backgroundColor: "#E5E7EB",
    borderRadius: 6,
    overflow: "hidden",
  },
  bar: { height: "100%", borderRadius: 6 },
  balanceAmount: { width: 80, textAlign: "right", fontWeight: "700" },
  positive: { color: "#10B981" },
  negative: { color: "#EF4444" },
  settlementCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  settlementText: { fontSize: 14, color: "#374151" },
  settlementFrom: { fontWeight: "700", color: "#EF4444" },
  settlementTo: { fontWeight: "700", color: "#10B981" },
  settlementAmount: { fontWeight: "700", color: "#111827", fontSize: 16 },
  catRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  catLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  catLabel: { color: "#374151" },
  catTotal: { fontWeight: "700", color: "#111827" },
});
