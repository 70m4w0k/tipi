import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ExpenseCategory, Profile } from "../lib/types";
import { useTheme } from "../lib/theme";
import { CATEGORY_LABELS, CATEGORY_COLORS, CATEGORY_ICONS } from "../lib/expense-categories";
import { haptic } from "../lib/haptics";
import { ErrorBanner } from "./ErrorBanner";

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
  const t = useTheme();
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [payer, setPayer] = useState(currentUserId);
  const [participants, setParticipants] = useState<string[]>(
    members.map((m) => m.id)
  );
  const [category, setCategory] = useState<ExpenseCategory>("autre");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

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
      setError("Remplis le titre, le montant et sélectionne au moins un participant.");
      return;
    }
    setError("");
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
      <ErrorBanner message={error} onDismiss={() => setError("")} />
      <Text style={[styles.formLabel, { color: t.text }]}>Titre *</Text>
      <TextInput
        style={[styles.input, { borderColor: t.inputBorder, backgroundColor: t.inputBg, color: t.text }]}
        placeholder="Ex : Courses Lidl, Loyer juillet..."
        placeholderTextColor={t.textMuted}
        value={title}
        onChangeText={setTitle}
      />

      <Text style={[styles.formLabel, { color: t.text }]}>Montant (€) *</Text>
      <TextInput
        style={[styles.input, { borderColor: t.inputBorder, backgroundColor: t.inputBg, color: t.text }]}
        placeholder="0.00"
        placeholderTextColor={t.textMuted}
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
      />

      <Text style={[styles.formLabel, { color: t.text }]}>Catégorie</Text>
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
                  category === cat ? CATEGORY_COLORS[cat] : t.separator,
              },
            ]}
            onPress={() => { void haptic.light(); setCategory(cat); }}
          >
            <View style={styles.categoryChipContent}>
              <Ionicons
                name={CATEGORY_ICONS[cat] as any}
                size={14}
                color={category === cat ? "#FFFFFF" : t.textSecondary}
              />
              <Text
                style={[
                  styles.categoryChipText,
                  { color: t.textSecondary },
                  category === cat && styles.categoryChipTextActive,
                ]}
              >
                {CATEGORY_LABELS[cat]}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={[styles.formLabel, { color: t.text }]}>Payé par *</Text>
      <View style={styles.chipRow}>
        {members.map((member) => (
          <Pressable
            key={member.id}
            style={[styles.chip, { borderColor: t.textMuted }, payer === member.id && { backgroundColor: t.accent, borderColor: t.accent }]}
            onPress={() => { void haptic.light(); setPayer(member.id); }}
          >
            <Text
              style={[
                styles.chipText,
                { color: t.text },
                payer === member.id && styles.chipTextActive,
              ]}
            >
              {member.display_name}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.labelRow}>
        <Text style={[styles.formLabel, { color: t.text }]}>Participants *</Text>
        <View style={styles.selectButtons}>
          <Pressable onPress={selectAll}>
            <Text style={[styles.selectBtn, { color: t.accent }]}>Tous</Text>
          </Pressable>
          <Pressable onPress={selectNone}>
            <Text style={[styles.selectBtn, { color: t.accent }]}>Aucun</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.chipRow}>
        {members.map((member) => {
          const selected = participants.includes(member.id);
          return (
            <Pressable
              key={member.id}
              style={[styles.checkChip, { backgroundColor: t.card, borderColor: t.inputBorder }, selected && { backgroundColor: t.accentLight, borderColor: t.accent }]}
              onPress={() => toggleParticipant(member.id)}
            >
              <Ionicons
                name={selected ? "checkbox" : "square-outline"}
                size={20}
                color={selected ? t.accent : t.textMuted}
              />
              <Text
                style={[styles.chipText, { color: t.text }, selected && { color: t.accent, fontWeight: "700" }]}
              >
                {member.display_name}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {participants.length > 0 && parsedAmount > 0 && (
        <Text style={[styles.sharePreview, { color: t.accent }]}>
          ≈ {(parsedAmount / participants.length).toFixed(2)} € / pers.
        </Text>
      )}

      <Text style={[styles.formLabel, { color: t.text }]}>Note (optionnel)</Text>
      <TextInput
        style={[styles.input, styles.inputMultiline, { borderColor: t.inputBorder, backgroundColor: t.inputBg, color: t.text }]}
        placeholder="Détails, justificatif..."
        placeholderTextColor={t.textMuted}
        value={note}
        onChangeText={setNote}
        multiline
      />

      <Pressable style={[styles.submitButton, { backgroundColor: t.accent }]} onPress={handleSubmit}>
        <Text style={styles.submitText}>Ajouter la dépense</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  formLabel: { fontWeight: "600", marginTop: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputMultiline: { minHeight: 70, textAlignVertical: "top" },
  categoryRow: { gap: 8, paddingVertical: 6 },
  categoryChip: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  categoryChipContent: { flexDirection: "row", alignItems: "center", gap: 4 },
  categoryChipText: { fontWeight: "600", fontSize: 12 },
  categoryChipTextActive: { color: "#FFFFFF" },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  selectButtons: { flexDirection: "row", gap: 12 },
  selectBtn: { fontWeight: "600", fontSize: 13 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipActive: {},
  chipText: { fontWeight: "600" },
  chipTextActive: { color: "#FFFFFF" },
  checkChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sharePreview: {
    fontWeight: "600",
    textAlign: "center",
    fontSize: 13,
  },
  submitButton: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  submitText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
});
