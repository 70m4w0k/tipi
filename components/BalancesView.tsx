import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Expense, ExpenseCategory, Profile } from "../lib/types";
import { computeBalances, computeSettlements } from "../lib/hooks/useExpenses";

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  courses: "🛒 Courses",
  loyer: "🏠 Loyer",
  restaurant: "🍕 Restaurant",
  transport: "🚗 Transport",
  loisirs: "🎉 Loisirs",
  autre: "📦 Autre",
};

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
      <Text style={styles.sectionTitle}>Balances</Text>
      {members.map((member) => {
        const bal = balances[member.id] ?? 0;
        const barWidth =
          maxAbsBalance > 0 ? (Math.abs(bal) / maxAbsBalance) * 100 : 0;
        const isPositive = bal >= 0;
        return (
          <View key={member.id} style={styles.balanceRow}>
            <Text style={styles.balanceName}>{member.display_name}</Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.bar,
                  {
                    width: `${barWidth}%`,
                    backgroundColor: isPositive ? "#10B981" : "#EF4444",
                  },
                ]}
              />
            </View>
            <Text
              style={[
                styles.balanceAmount,
                isPositive ? styles.positive : styles.negative,
              ]}
            >
              {isPositive ? "+" : ""}
              {bal.toFixed(2)} €
            </Text>
          </View>
        );
      })}

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
        💸 Remboursements suggérés
      </Text>
      {settlements.length === 0 ? (
        <Text style={styles.empty}>
          Tout le monde est à l'équilibre 🎉
        </Text>
      ) : (
        settlements.map((s, i) => (
          <View key={i} style={styles.settlementCard}>
            <Text style={styles.settlementText}>
              <Text style={styles.settlementFrom}>
                {getName(s.from, members)}
              </Text>
              {"  →  "}
              <Text style={styles.settlementTo}>
                {getName(s.to, members)}
              </Text>
            </Text>
            <Text style={styles.settlementAmount}>
              {s.amount.toFixed(2)} €
            </Text>
          </View>
        ))
      )}

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
        📊 Par catégorie
      </Text>
      {(Object.keys(CATEGORY_LABELS) as ExpenseCategory[]).map((cat) => {
        const total = expenses
          .filter((e) => e.category === cat)
          .reduce((sum, e) => sum + e.amount, 0);
        if (total === 0) return null;
        return (
          <View key={cat} style={styles.catRow}>
            <Text style={styles.catLabel}>{CATEGORY_LABELS[cat]}</Text>
            <Text style={styles.catTotal}>{total.toFixed(2)} €</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  empty: { color: "#6B7280", textAlign: "center", paddingVertical: 24 },
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
  catLabel: { color: "#374151" },
  catTotal: { fontWeight: "700", color: "#111827" },
});
