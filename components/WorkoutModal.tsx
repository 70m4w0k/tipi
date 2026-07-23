import React from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../lib/theme";
import { Workout, Exercise } from "../lib/types";
import { workoutSummary } from "../lib/sport-logic";

type Props = {
  visible: boolean;
  workouts: Workout[];
  exercises: Exercise[];
  onClose: () => void;
  onLaunch: (w: Workout) => void;
  onEdit: (w: Workout) => void;
  onCreate: () => void;
};

/** Liste des parcours (bottom sheet ouvert depuis le bouton "Parcours" de la page Sport). */
export function WorkoutModal({ visible, workouts, exercises, onClose, onLaunch, onEdit, onCreate }: Props) {
  const t = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: t.card }]} onPress={() => {}}>
          <View style={styles.head}>
            <Text style={[styles.title, { color: t.text }]}>Parcours</Text>
            <Pressable onPress={onClose} hitSlop={8}><Ionicons name="close" size={22} color={t.textMuted} /></Pressable>
          </View>

          <ScrollView style={{ maxHeight: 360 }}>
            {workouts.length === 0 && (
              <Text style={[styles.empty, { color: t.textMuted }]}>Aucun parcours. Crée ton premier enchaînement d'exercices.</Text>
            )}
            {workouts.map((w) => {
              const s = workoutSummary(w, exercises);
              return (
                <View key={w.id} style={[styles.card, { backgroundColor: t.background, borderColor: t.cardBorder }]}>
                  <Pressable testID={`workout-launch-${w.name}`} style={styles.cardMain} onPress={() => onLaunch(w)}>
                    <View style={[styles.icon, { backgroundColor: t.accentLight }]}>
                      <Ionicons name={w.icon as any} size={20} color={t.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>{w.name}</Text>
                      <Text style={[styles.sub, { color: t.textMuted }]}>{s.exercises} exercice{s.exercises > 1 ? "s" : ""} · {s.series} série{s.series > 1 ? "s" : ""}</Text>
                    </View>
                  </Pressable>
                  <Pressable testID={`workout-edit-${w.name}`} onPress={() => onEdit(w)} hitSlop={8} style={styles.editBtn}>
                    <Ionicons name="pencil-outline" size={16} color={t.textMuted} />
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>

          <Pressable testID="workout-create" style={[styles.create, { borderColor: t.cardBorder }]} onPress={onCreate}>
            <Ionicons name="add-circle-outline" size={20} color={t.accent} />
            <Text style={[styles.createText, { color: t.accent }]}>Créer un parcours</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, paddingBottom: 28 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  title: { fontSize: 17, fontWeight: "800" },
  empty: { fontSize: 13, textAlign: "center", paddingVertical: 24, paddingHorizontal: 16 },
  card: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 14, marginBottom: 8 },
  cardMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 11, padding: 11 },
  icon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 14, fontWeight: "700" },
  sub: { fontSize: 10.5, fontWeight: "600", marginTop: 1 },
  editBtn: { padding: 12 },
  create: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1.5, borderStyle: "dashed", borderRadius: 14, paddingVertical: 13, marginTop: 4 },
  createText: { fontSize: 14, fontWeight: "700" },
});
