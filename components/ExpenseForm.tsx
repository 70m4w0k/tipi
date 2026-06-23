import React, { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ExpenseCategory, Profile } from "../lib/types";

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

export type ExpenseFormData = {
  title: string;
  amount: number;
  payer_id: string;
  category: ExpenseCategory;
  note: string;
  participant_ids: string[];
};

type Props = {
  members: Profile[];
  currentUserId: string;
  onSubmit: (data: ExpenseFormData) => void;
};

export function ExpenseForm({ members, currentUserId, onSubmit }: Props) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [payer, setPayer] = useState(currentUserId);
  const [participants, setParticipants] = useState<string[]>(
    members.map((m) => m.id)
  );
  const [category, setCategory] = useState<ExpenseCategory>("autre");
  const [note, setNote] = useState("");

  const toggleParticipant = (id: string) => {
    setParticipants((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const selectAll = () => setParticipants(members.map((m) => m.id));
  const selectNone = () => setParticipants([]);

  const handleSubmit = () => {
    const parsed = Number(amount.replace(",", "."));
    if (
      !title.trim() ||
      isNaN(parsed) ||
      parsed <= 0 ||
      participants.length === 0
    ) {
      Alert.alert(
        "Dépense invalide",
        "Remplis le titre, le montant et sélectionne au moins un participant."
      );
      return;
    }
    onSubmit({
      title: title.trim(),
      amount: parsed,
      payer_id: payer,
      category,
      note: note.trim(),
      participant_ids: participants,
    });
    // Reset form
    setTitle("");
    setAmount("");
    setPayer(currentUserId);
    setParticipants(members.map((m) => m.id));
    setCategory("autre");
    setNote("");
  };

  const parsedAmount = Number(amount.replace(",", ".")) || 0;

  return (
    <View style={styles.section}>
      <Text style={styles.formLabel}>Titre *</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex : Courses Lidl, Loyer juillet..."
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.formLabel}>Montant (€) *</Text>
      <TextInput
        style={styles.input}
        placeholder="0.00"
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
      />

      <Text style={styles.formLabel}>Catégorie</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryRow}
      >
        {(Object.keys(CATEGORY_LABELS) as ExpenseCategory[]).map((cat) => (
          <Pressable
            key={cat}
            style={[
              styles.categoryChip,
              {
                borderColor: CATEGORY_COLORS[cat],
                backgroundColor:
                  category === cat ? CATEGORY_COLORS[cat] : "#F9FAFB",
              },
            ]}
            onPress={() => setCategory(cat)}
          >
            <Text
              style={[
                styles.categoryChipText,
                category === cat && styles.categoryChipTextActive,
              ]}
            >
              {CATEGORY_LABELS[cat]}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={styles.formLabel}>Payé par *</Text>
      <View style={styles.chipRow}>
        {members.map((member) => (
          <Pressable
            key={member.id}
            style={[styles.chip, payer === member.id && styles.chipActive]}
            onPress={() => setPayer(member.id)}
          >
            <Text
              style={[
                styles.chipText,
                payer === member.id && styles.chipTextActive,
              ]}
            >
              {member.display_name}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.labelRow}>
        <Text style={styles.formLabel}>Participants *</Text>
        <View style={styles.selectButtons}>
          <Pressable onPress={selectAll}>
            <Text style={styles.selectBtn}>Tous</Text>
          </Pressable>
          <Pressable onPress={selectNone}>
            <Text style={styles.selectBtn}>Aucun</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.chipRow}>
        {members.map((member) => {
          const selected = participants.includes(member.id);
          return (
            <Pressable
              key={member.id}
              style={[styles.checkChip, selected && styles.checkChipActive]}
              onPress={() => toggleParticipant(member.id)}
            >
              <Text style={styles.checkIcon}>{selected ? "☑" : "☐"}</Text>
              <Text
                style={[styles.chipText, selected && styles.chipTextActive]}
              >
                {member.display_name}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {participants.length > 0 && parsedAmount > 0 && (
        <Text style={styles.sharePreview}>
          ≈ {(parsedAmount / participants.length).toFixed(2)} € / pers.
        </Text>
      )}

      <Text style={styles.formLabel}>Note (optionnel)</Text>
      <TextInput
        style={[styles.input, styles.inputMultiline]}
        placeholder="Détails, justificatif..."
        value={note}
        onChangeText={setNote}
        multiline
      />

      <Pressable style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitText}>✅ Ajouter la dépense</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  formLabel: { fontWeight: "600", color: "#374151", marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
  },
  inputMultiline: { minHeight: 70, textAlignVertical: "top" },
  categoryRow: { gap: 8, paddingVertical: 6 },
  categoryChip: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  categoryChipText: { color: "#374151", fontWeight: "600", fontSize: 12 },
  categoryChipTextActive: { color: "#FFFFFF" },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  selectButtons: { flexDirection: "row", gap: 12 },
  selectBtn: { color: "#1D4ED8", fontWeight: "600", fontSize: 13 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: "#9CA3AF",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipActive: { backgroundColor: "#111827", borderColor: "#111827" },
  chipText: { color: "#374151", fontWeight: "600" },
  chipTextActive: { color: "#FFFFFF" },
  checkChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#9CA3AF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
  },
  checkChipActive: {
    backgroundColor: "#EEF2FF",
    borderColor: "#1D4ED8",
  },
  checkIcon: { fontSize: 16 },
  sharePreview: {
    color: "#1D4ED8",
    fontWeight: "600",
    textAlign: "center",
    fontSize: 13,
  },
  submitButton: {
    backgroundColor: "#1D4ED8",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  submitText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
});
