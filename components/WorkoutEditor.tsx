import React, { useEffect, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../lib/theme";
import { Workout, WorkoutItem, Exercise } from "../lib/types";
import { parseAmount } from "./IngredientsEditor";
import { haptic } from "../lib/haptics";

const UNIT_OPTIONS = ["répétitions", "secondes", "minutes"];

type Props = {
  visible: boolean;
  workout: Workout | null; // null = création
  exercises: Exercise[];
  onClose: () => void;
  onSave: (name: string, icon: string, items: WorkoutItem[]) => void;
  onCreateExercise: (name: string, unit: string) => Promise<string | null>;
  onDelete?: () => void;
};

const intOr = (s: string, fallback: number) => { const n = parseInt(s, 10); return Number.isNaN(n) ? fallback : Math.max(0, n); };

export function WorkoutEditor({ visible, workout, exercises, onClose, onSave, onCreateExercise, onDelete }: Props) {
  const t = useTheme();
  const [name, setName] = useState("");
  const [items, setItems] = useState<WorkoutItem[]>([]);
  const [picker, setPicker] = useState(false);
  const [newExName, setNewExName] = useState("");
  const [newExUnit, setNewExUnit] = useState("répétitions");

  useEffect(() => {
    if (visible) {
      setName(workout?.name ?? "");
      setItems(workout?.items ?? []);
      setPicker(false); setNewExName("");
    }
  }, [visible]);

  const exName = (id: string) => exercises.find((e) => e.id === id)?.name ?? "(supprimé)";
  const patch = (idx: number, p: Partial<WorkoutItem>) => setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...p } : it)));
  const addItem = (exerciseId: string) => { setItems((prev) => [...prev, { exercise_id: exerciseId, sets: 3, reps: 10, weight: null, per_side: false, variant: null }]); setPicker(false); };

  const createAndAdd = async () => {
    if (!newExName.trim()) return;
    void haptic.light();
    const id = await onCreateExercise(newExName.trim(), newExUnit);
    if (id) addItem(id);
    setNewExName("");
  };

  const field = { borderColor: t.inputBorder, backgroundColor: t.inputBg, color: t.text };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.screen, { backgroundColor: t.background }]} edges={["top", "bottom"]}>
        <View style={[styles.header, { borderBottomColor: t.cardBorder }]}>
          <Pressable testID="workout-editor-close" onPress={onClose} hitSlop={10} style={styles.hBtn}><Ionicons name="close" size={24} color={t.textSecondary} /></Pressable>
          <Text style={[styles.hTitle, { color: t.text }]}>{workout ? "Modifier le parcours" : "Nouveau parcours"}</Text>
          <Pressable
            testID="workout-save"
            onPress={() => { if (name.trim()) { void haptic.medium(); onSave(name.trim(), workout?.icon ?? "barbell-outline", items.filter((i) => exercises.some((e) => e.id === i.exercise_id))); onClose(); } }}
            hitSlop={10} style={styles.hBtn}
          >
            <Text style={[styles.save, { color: name.trim() ? t.accent : t.textMuted }]}>OK</Text>
          </Pressable>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
          <TextInput
            testID="workout-name"
            style={[styles.nameInput, field]}
            value={name} onChangeText={setName}
            placeholder="Nom du parcours" placeholderTextColor={t.textMuted}
          />

          {items.map((it, idx) => {
            const ex = exercises.find((e) => e.id === it.exercise_id);
            const isTime = ex?.unit !== "répétitions";
            const variants = ex?.variants ?? [];
            return (
              <View key={idx} style={[styles.item, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
                <View style={styles.itemTop}>
                  <Text style={[styles.itemName, { color: t.text }]} numberOfLines={1}>{exName(it.exercise_id)}</Text>
                  <Pressable testID={`workout-item-remove-${idx}`} onPress={() => setItems((prev) => prev.filter((_, i) => i !== idx))} hitSlop={6}>
                    <Ionicons name="close" size={16} color={t.textMuted} />
                  </Pressable>
                </View>
                {variants.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.variantChips}>
                    {[{ name: "Standard", value: null as string | null, color: null as string | null }, ...variants.map((v) => ({ name: v.name, value: v.name, color: v.color }))].map((o) => {
                      const on = it.variant === o.value;
                      const c = o.color ?? t.textMuted;
                      return (
                        <Pressable
                          key={o.name}
                          testID={`workout-item-variant-${idx}-${o.name}`}
                          style={[styles.vChip, { borderColor: on ? c : t.cardBorder, backgroundColor: on ? c : t.card }]}
                          onPress={() => patch(idx, { variant: o.value })}
                        >
                          <Text style={[styles.vChipText, { color: on ? "#FFFFFF" : t.text }]} numberOfLines={1}>{o.name}</Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                )}
                <View style={styles.fieldsRow}>
                  <Labeled label="Séries"><TextInput testID={`workout-item-sets-${idx}`} style={[styles.num, field]} keyboardType="numeric" value={String(it.sets)} onChangeText={(v) => patch(idx, { sets: intOr(v, 0) })} /></Labeled>
                  <Labeled label={isTime ? "Durée" : "Reps"}><TextInput testID={`workout-item-reps-${idx}`} style={[styles.num, field]} keyboardType="numeric" value={String(it.reps)} onChangeText={(v) => patch(idx, { reps: intOr(v, 0) })} /></Labeled>
                  <Labeled label="Poids (kg)"><TextInput style={[styles.num, field]} keyboardType="numeric" value={it.weight == null ? "" : String(it.weight)} onChangeText={(v) => patch(idx, { weight: parseAmount(v) })} placeholder="—" placeholderTextColor={t.textMuted} /></Labeled>
                </View>
                {!isTime && (
                  <Pressable style={styles.perSide} onPress={() => patch(idx, { per_side: !it.per_side })}>
                    <Ionicons name={it.per_side ? "checkbox" : "square-outline"} size={20} color={it.per_side ? t.accent : t.textMuted} />
                    <Text style={[styles.perSideText, { color: t.textSecondary }]}>Reps par côté (comptées ×2)</Text>
                  </Pressable>
                )}
              </View>
            );
          })}

          {!picker ? (
            <Pressable testID="workout-add-exercise" style={[styles.addRow, { borderColor: t.cardBorder }]} onPress={() => setPicker(true)}>
              <Ionicons name="add-circle-outline" size={20} color={t.accent} />
              <Text style={[styles.addText, { color: t.accent }]}>Ajouter un exercice</Text>
            </Pressable>
          ) : (
            <View style={[styles.picker, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
              {exercises.map((e) => (
                <Pressable key={e.id} testID={`workout-pick-${e.name}`} style={[styles.pickRow, { borderBottomColor: t.cardBorder }]} onPress={() => addItem(e.id)}>
                  <Ionicons name={e.icon as any} size={18} color={t.accent} />
                  <Text style={[styles.pickText, { color: t.text }]}>{e.name}</Text>
                </Pressable>
              ))}
              <View style={styles.createBox}>
                <Text style={[styles.createLabel, { color: t.textSecondary }]}>Créer un exercice</Text>
                <TextInput
                  testID="workout-new-exercise-name"
                  style={[styles.nameInput, field]}
                  value={newExName} onChangeText={setNewExName}
                  placeholder="Nom du nouvel exercice" placeholderTextColor={t.textMuted}
                />
                <View style={styles.unitRow}>
                  {UNIT_OPTIONS.map((u) => (
                    <Pressable key={u} style={[styles.unitBtn, { borderColor: newExUnit === u ? t.accent : t.cardBorder }, newExUnit === u && { backgroundColor: t.accentLight }]} onPress={() => setNewExUnit(u)}>
                      <Text style={[styles.unitText, { color: newExUnit === u ? t.accent : t.textSecondary }]}>{u}</Text>
                    </Pressable>
                  ))}
                </View>
                <Pressable testID="workout-create-exercise" style={[styles.createBtn, { backgroundColor: newExName.trim() ? t.accent : t.cardBorder }]} onPress={() => void createAndAdd()}>
                  <Text style={[styles.createBtnText, { color: newExName.trim() ? "#FFFFFF" : t.textMuted }]}>Créer et ajouter</Text>
                </Pressable>
              </View>
            </View>
          )}

          {workout && onDelete && (
            <Pressable testID="workout-delete" style={[styles.delBtn, { backgroundColor: t.dangerLight }]} onPress={() => { onDelete(); onClose(); }}>
              <Ionicons name="trash-outline" size={17} color={t.danger} />
              <Text style={[styles.delText, { color: t.danger }]}>Supprimer le parcours</Text>
            </Pressable>
          )}
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, gap: 3 }}>
      <Text style={[styles.fieldLabel, { color: t.textMuted }]}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1 },
  hBtn: { minWidth: 44, justifyContent: "center" },
  hTitle: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "800" },
  save: { fontSize: 15, fontWeight: "800", textAlign: "right" },
  nameInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  item: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8 },
  itemTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  itemName: { flex: 1, fontSize: 14, fontWeight: "700" },
  variantChips: { flexDirection: "row", gap: 6, paddingVertical: 2 },
  vChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  vChipText: { fontSize: 11, fontWeight: "700", maxWidth: 130 },
  fieldsRow: { flexDirection: "row", gap: 8 },
  fieldLabel: { fontSize: 9.5, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4 },
  num: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 8, fontSize: 14, textAlign: "center" },
  perSide: { flexDirection: "row", alignItems: "center", gap: 8 },
  perSideText: { fontSize: 12, fontWeight: "600" },
  addRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1.5, borderStyle: "dashed", borderRadius: 12, paddingVertical: 13 },
  addText: { fontSize: 14, fontWeight: "700" },
  picker: { borderWidth: 1, borderRadius: 12, overflow: "hidden" },
  pickRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth },
  pickText: { fontSize: 14, fontWeight: "600" },
  createBox: { padding: 12, gap: 8 },
  createLabel: { fontSize: 12, fontWeight: "700" },
  unitRow: { flexDirection: "row", gap: 8 },
  unitBtn: { flex: 1, paddingVertical: 9, borderRadius: 9, borderWidth: 1, alignItems: "center" },
  unitText: { fontSize: 13, fontWeight: "600" },
  createBtn: { borderRadius: 10, paddingVertical: 11, alignItems: "center" },
  createBtnText: { fontSize: 13, fontWeight: "800" },
  delBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, paddingVertical: 13, marginTop: 8 },
  delText: { fontSize: 14, fontWeight: "700" },
});

