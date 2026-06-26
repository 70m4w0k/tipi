import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Expense, ExpenseCategory, Profile } from "../lib/types";
import { useTheme } from "../lib/theme";
import { CATEGORY_LABELS, CATEGORY_COLORS, CATEGORY_ICONS } from "../lib/expense-categories";

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
  const t = useTheme();
  const share =
    participants.includes(currentUserId) && participants.length > 0
      ? expense.amount / participants.length
      : 0;
  const iAmPayer = expense.payer_id === currentUserId;

  const participantNames = participants
    .map((id) => getName(id, members))
    .join(", ");

  return (
    <View style={[styles.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
      <View style={styles.cardHeader}>
        <View
          style={[
            styles.categoryDot,
            { backgroundColor: CATEGORY_COLORS[expense.category] ?? "#6B7280" },
          ]}
        />
        <View style={styles.cardMain}>
          <Text style={[styles.cardTitle, { color: t.text }]}>{expense.title}</Text>
          <Text style={[styles.cardSub, { color: t.textSecondary }]}>
            {CATEGORY_LABELS[expense.category]} ·{" "}
            {formatDate(expense.created_at)}
          </Text>
          {expense.note ? (
            <View style={styles.noteRow}>
              <Ionicons name="document-text-outline" size={12} color={t.textSecondary} />
              <Text style={[styles.cardNote, { color: t.textSecondary }]}>{expense.note}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.cardRight}>
          <Text style={[styles.cardAmount, { color: t.text }]}>{expense.amount.toFixed(2)} €</Text>
          <Text style={[styles.cardPayer, { color: t.textSecondary }]}>
            payé par {getName(expense.payer_id, members)}
          </Text>
        </View>
      </View>

      <View style={[styles.cardFooter, { borderTopColor: t.separator }]}>
        <View style={styles.participantsRow}>
          <Ionicons name="people-outline" size={14} color={t.textSecondary} />
          <Text style={[styles.participants, { color: t.textSecondary }]}>{participantNames}</Text>
        </View>
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
          <Ionicons name="trash-outline" size={18} color={t.danger} />
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
  noteRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  cardNote: { fontSize: 12, color: "#6B7280" },
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
  participantsRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 4 },
  participants: { flex: 1, fontSize: 12, color: "#6B7280" },
  myShare: { fontSize: 12, fontWeight: "600" },
  sharePositive: { color: "#10B981" },
  shareNegative: { color: "#EF4444" },
  deleteButton: { padding: 4 },
});
