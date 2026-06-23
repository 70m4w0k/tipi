import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Expense, ExpenseCategory, Profile } from "../lib/types";

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  courses: "🛒 Courses",
  loyer: "🏠 Loyer",
  restaurant: "🍕 Restaurant",
  transport: "🚗 Transport",
  loisirs: "🎉 Loisirs",
  autre: "📦 Autre",
};

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  courses: "#10B981",
  loyer: "#3B82F6",
  restaurant: "#F59E0B",
  transport: "#8B5CF6",
  loisirs: "#EC4899",
  autre: "#6B7280",
};

type Props = {
  expense: Expense;
  participants: string[];
  currentUserId: string;
  members: Profile[];
  onDelete: (id: string) => void;
};

function getName(userId: string, members: Profile[]): string {
  const m = members.find((p) => p.id === userId);
  return m?.display_name ?? "Inconnu";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

export function ExpenseCard({
  expense,
  participants,
  currentUserId,
  members,
  onDelete,
}: Props) {
  const share =
    participants.includes(currentUserId) && participants.length > 0
      ? expense.amount / participants.length
      : 0;
  const iAmPayer = expense.payer_id === currentUserId;

  const participantNames = participants
    .map((id) => getName(id, members))
    .join(", ");

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View
          style={[
            styles.categoryDot,
            { backgroundColor: CATEGORY_COLORS[expense.category] ?? "#6B7280" },
          ]}
        />
        <View style={styles.cardMain}>
          <Text style={styles.cardTitle}>{expense.title}</Text>
          <Text style={styles.cardSub}>
            {CATEGORY_LABELS[expense.category]} ·{" "}
            {formatDate(expense.created_at)}
          </Text>
          {expense.note ? (
            <Text style={styles.cardNote}>📝 {expense.note}</Text>
          ) : null}
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.cardAmount}>{expense.amount.toFixed(2)} €</Text>
          <Text style={styles.cardPayer}>
            payé par {getName(expense.payer_id, members)}
          </Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.participants}>👥 {participantNames}</Text>
        <Text
          style={[
            styles.myShare,
            iAmPayer ? styles.sharePositive : styles.shareNegative,
          ]}
        >
          {iAmPayer
            ? `Tu récupères ${(expense.amount - share).toFixed(2)} €`
            : participants.includes(currentUserId)
              ? `Ta part : ${share.toFixed(2)} €`
              : "Non concerné"}
        </Text>
        <Pressable onPress={() => onDelete(expense.id)} style={styles.deleteButton}>
          <Text style={styles.deleteText}>🗑️</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  cardHeader: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
  },
  cardMain: { flex: 1 },
  cardTitle: { fontWeight: "700", color: "#111827", fontSize: 15 },
  cardSub: { fontSize: 12, color: "#6B7280" },
  cardNote: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  cardRight: { alignItems: "flex-end" },
  cardAmount: { fontWeight: "700", fontSize: 16, color: "#111827" },
  cardPayer: { fontSize: 11, color: "#6B7280" },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 8,
  },
  participants: { flex: 1, fontSize: 12, color: "#6B7280" },
  myShare: { fontSize: 12, fontWeight: "600" },
  sharePositive: { color: "#10B981" },
  shareNegative: { color: "#EF4444" },
  deleteButton: { padding: 4 },
  deleteText: { fontSize: 16 },
});
