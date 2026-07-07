import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ChoreReminder as ChoreReminderType } from "../lib/types";
import { recurrenceMatchesToday } from "../lib/recurrence";
import { useTheme } from "../lib/theme";
import { haptic } from "../lib/haptics";

export { recurrenceMatchesToday };

type Props = {
  reminder: ChoreReminderType;
  onToggleDone: (id: string) => void;
  onUpdateReminder: (id: string, title: string, recurrence: string) => void;
};

export default function ChoreReminderCard({ reminder, onToggleDone }: Props) {
  const t = useTheme();
  const today = new Date().toISOString().slice(0, 10);
  const isDoneToday = reminder.last_done_date === today;
  const matchesToday = recurrenceMatchesToday(reminder.recurrence, reminder.week_parity, reminder.start_date);

  if (!matchesToday && !isDoneToday) return null;

  return (
    <Pressable
      style={[
        styles.card,
        { backgroundColor: t.accentLight, borderColor: t.accent },
        isDoneToday && { backgroundColor: t.successLight, borderColor: t.success },
      ]}
      onPress={() => { void haptic.success(); onToggleDone(reminder.id); }}
    >
      <View style={styles.row}>
        <Ionicons
          name={isDoneToday ? "checkmark-circle" : "ellipse-outline"}
          size={22}
          color={isDoneToday ? t.success : t.accent}
        />
        <View style={styles.info}>
          <Text style={[
            styles.title,
            { color: t.accent },
            isDoneToday && { color: t.success, textDecorationLine: "line-through" },
          ]}>
            {reminder.title}
          </Text>
          <Text style={[styles.recurrence, { color: t.textMuted }]}>
            {reminder.recurrence}
            {reminder.week_parity != null ? " (1 sem. / 2)" : ""}
          </Text>
        </View>
        {isDoneToday && (
          <Text style={[styles.doneLabel, { color: t.success }]}>Fait</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  info: { flex: 1 },
  title: { fontSize: 14, fontWeight: "600" },
  recurrence: { fontSize: 11, marginTop: 1 },
  doneLabel: { fontSize: 12, fontWeight: "600" },
});
