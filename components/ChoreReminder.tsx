import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ChoreReminder as ChoreReminderType } from "../lib/types";

const FRENCH_DAYS: Record<number, string[]> = {
  0: ["dimanche", "dim"],
  1: ["lundi", "lun"],
  2: ["mardi", "mar"],
  3: ["mercredi", "mer"],
  4: ["jeudi", "jeu"],
  5: ["vendredi", "ven"],
  6: ["samedi", "sam"],
};

export function recurrenceMatchesToday(recurrence: string): boolean {
  if (!recurrence) return false;
  const today = new Date().getDay();
  const dayNames = FRENCH_DAYS[today];
  const lower = recurrence.toLowerCase();
  return dayNames.some((name) => lower.includes(name));
}

type Props = {
  reminder: ChoreReminderType;
  onToggleDone: (id: string) => void;
  onUpdateReminder: (id: string, title: string, recurrence: string) => void;
};

export default function ChoreReminderCard({ reminder, onToggleDone }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const isDoneToday = reminder.last_done_date === today;
  const matchesToday = recurrenceMatchesToday(reminder.recurrence);

  if (!matchesToday && !isDoneToday) return null;

  return (
    <Pressable
      style={[styles.card, isDoneToday && styles.cardDone]}
      onPress={() => onToggleDone(reminder.id)}
    >
      <View style={styles.row}>
        <Ionicons
          name={isDoneToday ? "checkmark-circle" : "ellipse-outline"}
          size={22}
          color={isDoneToday ? "#10B981" : "#1D4ED8"}
        />
        <View style={styles.info}>
          <Text style={[styles.title, isDoneToday && styles.titleDone]}>
            {reminder.title}
          </Text>
          <Text style={styles.recurrence}>{reminder.recurrence}</Text>
        </View>
        {isDoneToday && (
          <Text style={styles.doneLabel}>Fait</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  cardDone: {
    backgroundColor: "#F3F4F6",
    borderColor: "#E5E7EB",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  info: { flex: 1 },
  title: { fontSize: 14, fontWeight: "600", color: "#1E40AF" },
  titleDone: { color: "#9CA3AF", textDecorationLine: "line-through" },
  recurrence: { fontSize: 11, color: "#6B7280", marginTop: 1 },
  doneLabel: { fontSize: 12, fontWeight: "600", color: "#10B981" },
});
