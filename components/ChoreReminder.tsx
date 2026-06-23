import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from "react-native";
import { ChoreReminder as ChoreReminderType } from "../lib/types";

// ── Recurrence matching ──

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

// ── Component ──

type Props = {
  reminder: ChoreReminderType | null;
  onToggleDone: (id: string) => void;
  onUpdateReminder: (id: string, title: string, recurrence: string) => void;
};

export default function ChoreReminderCard({
  reminder,
  onToggleDone,
  onUpdateReminder,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editRecurrence, setEditRecurrence] = useState("");

  if (!reminder) return null;

  const today = new Date().toISOString().slice(0, 10);
  const isDoneToday = reminder.last_done_date === today;
  const matchesToday = recurrenceMatchesToday(reminder.recurrence);

  if (!matchesToday && !isDoneToday) return null;

  const handleStartEdit = () => {
    setEditTitle(reminder.title);
    setEditRecurrence(reminder.recurrence);
    setEditing(true);
  };

  const handleSaveEdit = () => {
    onUpdateReminder(reminder.id, editTitle.trim(), editRecurrence.trim());
    setEditing(false);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>A faire aujourd'hui</Text>

      <View style={styles.reminderRow}>
        <View style={styles.reminderInfo}>
          <Text style={styles.reminderTitle}>{reminder.title}</Text>
          <Text style={styles.reminderRecurrence}>{reminder.recurrence}</Text>
        </View>

        <TouchableOpacity
          style={[styles.doneBtn, isDoneToday && styles.doneBtnActive]}
          onPress={() => onToggleDone(reminder.id)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.doneBtnText,
              isDoneToday && styles.doneBtnTextActive,
            ]}
          >
            {isDoneToday ? "Fait ✓" : "Marquer fait"}
          </Text>
        </TouchableOpacity>
      </View>

      {!editing && (
        <TouchableOpacity onPress={handleStartEdit} activeOpacity={0.7}>
          <Text style={styles.editLink}>Modifier rappel</Text>
        </TouchableOpacity>
      )}

      {editing && (
        <View style={styles.editSection}>
          <TextInput
            style={styles.editInput}
            value={editTitle}
            onChangeText={setEditTitle}
            placeholder="Titre du rappel"
            placeholderTextColor="#9CA3AF"
          />
          <TextInput
            style={styles.editInput}
            value={editRecurrence}
            onChangeText={setEditRecurrence}
            placeholder="Recurrence (ex: lundi, mercredi, vendredi)"
            placeholderTextColor="#9CA3AF"
          />
          <View style={styles.editBtnRow}>
            <TouchableOpacity
              style={styles.editSaveBtn}
              onPress={handleSaveEdit}
              activeOpacity={0.7}
            >
              <Text style={styles.editSaveBtnText}>Enregistrer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.editCancelBtn}
              onPress={() => setEditing(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.editCancelBtnText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 10,
  },
  reminderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  reminderInfo: {
    flex: 1,
    marginRight: 12,
  },
  reminderTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  reminderRecurrence: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  doneBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  doneBtnActive: {
    backgroundColor: "#DCFCE7",
    borderColor: "#16A34A",
  },
  doneBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  doneBtnTextActive: {
    color: "#16A34A",
  },
  editLink: {
    fontSize: 12,
    color: "#1D4ED8",
    fontWeight: "500",
    marginTop: 10,
  },
  editSection: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 12,
  },
  editInput: {
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1F2937",
    marginBottom: 8,
  },
  editBtnRow: {
    flexDirection: "row",
    gap: 8,
  },
  editSaveBtn: {
    flex: 1,
    backgroundColor: "#1D4ED8",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  editSaveBtnText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 13,
  },
  editCancelBtn: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  editCancelBtnText: {
    color: "#6B7280",
    fontWeight: "600",
    fontSize: 13,
  },
});
