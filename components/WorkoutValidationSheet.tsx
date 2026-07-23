import React, { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../lib/theme";
import { Workout, Exercise } from "../lib/types";
import { buildWorkoutPlan, countPlannedSeries, planToLogEntries, WorkoutPlanRow } from "../lib/sport-logic";
import { haptic } from "../lib/haptics";

type Props = {
  visible: boolean;
  workout: Workout | null;
  exercises: Exercise[];
  onClose: () => void;
  onConfirm: (entries: { exercise_id: string; count: number; weight: number | null }[]) => void;
};

/** Feuille de validation d'un parcours : compteur de séries + dépliage pour les reps. */
export function WorkoutValidationSheet({ visible, workout, exercises, onClose, onConfirm }: Props) {
  const t = useTheme();
  const [plan, setPlan] = useState<WorkoutPlanRow[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (visible && workout) {
      setPlan(buildWorkoutPlan(workout, exercises));
      setExpanded(new Set());
    }
  }, [visible, workout]);

  const patchRow = (idx: number, fn: (r: WorkoutPlanRow) => WorkoutPlanRow) =>
    setPlan((prev) => prev.map((r, i) => (i === idx ? fn(r) : r)));

  const setDone = (idx: number, delta: number) => {
    void haptic.light();
    patchRow(idx, (r) => {
      const series = r.series.map((s) => ({ ...s }));
      if (delta < 0) {
        for (let i = series.length - 1; i >= 0; i--) if (series[i].done) { series[i].done = false; break; }
      } else {
        for (let i = 0; i < series.length; i++) if (!series[i].done) { series[i].done = true; break; }
      }
      return { ...r, series };
    });
  };

  const toggleSeries = (idx: number, si: number) =>
    patchRow(idx, (r) => ({ ...r, series: r.series.map((s, i) => (i === si ? { ...s, done: !s.done } : s)) }));

  const bumpReps = (idx: number, si: number, delta: number) =>
    patchRow(idx, (r) => ({ ...r, series: r.series.map((s, i) => (i === si ? { ...s, reps: Math.max(0, s.reps + delta) } : s)) }));

  const total = countPlannedSeries(plan);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: t.card }]} onPress={() => {}}>
          <Text style={[styles.title, { color: t.text }]}>{workout?.name ?? "Parcours"}</Text>
          <Text style={[styles.sub, { color: t.textSecondary }]}>Ajuste les séries, déplie pour corriger les reps.</Text>

          <ScrollView style={{ maxHeight: 380 }}>
            {plan.map((r, idx) => {
              const done = r.series.filter((s) => s.done).length;
              const isOpen = expanded.has(idx);
              const unitShort = r.unit === "secondes" ? "s" : r.unit === "minutes" ? "min" : "reps";
              return (
                <View key={idx} style={[styles.row, { borderTopColor: t.cardBorder }]}>
                  <View style={styles.rowTop}>
                    <Pressable
                      testID={`workout-row-${idx}`}
                      style={styles.rowName}
                      onPress={() => setExpanded((prev) => { const n = new Set(prev); n.has(idx) ? n.delete(idx) : n.add(idx); return n; })}
                    >
                      <Text style={[styles.name, { color: done > 0 ? t.text : t.textMuted }]} numberOfLines={1}>
                        {r.exerciseName}{r.variant ? ` · ${r.variant}` : ""}
                      </Text>
                      <Text style={[styles.meta, { color: t.textMuted }]}>
                        × {r.series[0]?.reps ?? 0} {unitShort}{r.perSide ? " /côté" : ""}
                      </Text>
                    </Pressable>
                    {r.weight != null && (
                      <Text style={[styles.weight, { color: t.warning }]}>{r.weight} kg</Text>
                    )}
                    <View style={styles.stepper}>
                      <Pressable testID={`workout-sets-minus-${idx}`} style={[styles.stepBtn, { borderColor: t.cardBorder }]} onPress={() => setDone(idx, -1)} hitSlop={4}>
                        <Ionicons name="remove" size={15} color={t.accent} />
                      </Pressable>
                      <Text style={[styles.stepVal, { color: done > 0 ? t.text : t.textMuted }]}>{done}/{r.series.length}</Text>
                      <Pressable testID={`workout-sets-plus-${idx}`} style={[styles.stepBtn, { borderColor: t.cardBorder }]} onPress={() => setDone(idx, 1)} hitSlop={4}>
                        <Ionicons name="add" size={15} color={t.accent} />
                      </Pressable>
                    </View>
                  </View>

                  {isOpen && (
                    <View style={styles.series}>
                      {r.series.map((s, si) => (
                        <View key={si} style={styles.sRow}>
                          <Pressable onPress={() => toggleSeries(idx, si)} hitSlop={6}>
                            <Ionicons name={s.done ? "checkbox" : "square-outline"} size={19} color={s.done ? t.accent : t.textMuted} />
                          </Pressable>
                          <Text style={[styles.sLabel, { color: t.textSecondary }]}>Série {si + 1}</Text>
                          <Pressable style={[styles.repBtn, { borderColor: t.cardBorder }]} onPress={() => bumpReps(idx, si, -1)} hitSlop={4}>
                            <Ionicons name="remove" size={13} color={t.accent} />
                          </Pressable>
                          <Text style={[styles.repVal, { color: t.text }]}>{s.reps}</Text>
                          <Pressable style={[styles.repBtn, { borderColor: t.cardBorder }]} onPress={() => bumpReps(idx, si, 1)} hitSlop={4}>
                            <Ionicons name="add" size={13} color={t.accent} />
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>

          <Pressable
            testID="workout-validate"
            style={[styles.validate, total === 0 ? { backgroundColor: t.cardBorder } : { backgroundColor: t.accent }]}
            onPress={() => { if (total > 0) { void haptic.success(); onConfirm(planToLogEntries(plan)); onClose(); } }}
          >
            <Text style={[styles.validateText, { color: total === 0 ? t.textMuted : "#FFFFFF" }]}>
              {total === 0 ? "Sélectionne des séries" : `Valider · ${total} série${total > 1 ? "s" : ""}`}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, paddingBottom: 28 },
  title: { fontSize: 17, fontWeight: "800" },
  sub: { fontSize: 12, marginTop: 2, marginBottom: 8 },
  row: { borderTopWidth: 1, paddingVertical: 10 },
  rowTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowName: { flex: 1 },
  name: { fontSize: 13, fontWeight: "700" },
  meta: { fontSize: 10.5, marginTop: 1 },
  weight: { fontSize: 11, fontWeight: "800" },
  stepper: { flexDirection: "row", alignItems: "center", gap: 7 },
  stepBtn: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  stepVal: { fontSize: 12, fontWeight: "800", minWidth: 34, textAlign: "center", fontVariant: ["tabular-nums"] },
  series: { marginTop: 8, gap: 6, paddingLeft: 2 },
  sRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sLabel: { flex: 1, fontSize: 12, fontWeight: "600" },
  repBtn: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  repVal: { fontSize: 13, fontWeight: "800", minWidth: 22, textAlign: "center", fontVariant: ["tabular-nums"] },
  validate: { marginTop: 12, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  validateText: { fontSize: 14, fontWeight: "800" },
});
