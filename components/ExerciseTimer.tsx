import React, { useEffect, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../lib/theme";
import { haptic } from "../lib/haptics";
import { useKeepAwakeSafe } from "../lib/use-keep-awake-safe";

function formatMMSS(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

type Props = {
  visible: boolean;
  exerciseName: string;
  unit: string; // "secondes" | "minutes"
  onClose: () => void;
  /** Valeur (dans l'unité de l'exercice) à enregistrer comme nouvelle série */
  onSave: (count: number) => void;
};

/** Chronomètre plein écran pour les exercices en temps (Départ / Stop). */
export function ExerciseTimer({ visible, exerciseName, unit, onClose, onSave }: Props) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      {visible && <TimerScreen exerciseName={exerciseName} unit={unit} onClose={onClose} onSave={onSave} />}
    </Modal>
  );
}

function TimerScreen({ exerciseName, unit, onClose, onSave }: Omit<Props, "visible">) {
  useKeepAwakeSafe();
  const t = useTheme();
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // secondes
  const startRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const start = () => {
    void haptic.medium();
    startRef.current = Date.now() - elapsed * 1000;
    setRunning(true);
    intervalRef.current = setInterval(() => {
      setElapsed((Date.now() - startRef.current) / 1000);
    }, 100);
  };

  const stop = () => {
    void haptic.success();
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setRunning(false);
    const value = Math.round(elapsed / (unit === "minutes" ? 60 : 1));
    if (value > 0) onSave(value);
    onClose();
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: t.background }]} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable testID="timer-close" onPress={onClose} hitSlop={12} style={styles.headerBtn}>
          <Ionicons name="close" size={26} color={t.textSecondary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: t.text }]} numberOfLines={1}>{exerciseName}</Text>
        <View style={styles.headerBtn} />
      </View>

      <View style={styles.center}>
        <Text testID="timer-display" style={[styles.time, { color: t.text }]}>{formatMMSS(elapsed)}</Text>
        <Text style={[styles.unit, { color: t.textMuted }]}>{unit}</Text>
      </View>

      <View style={styles.controls}>
        <Pressable
          testID="timer-toggle"
          style={[styles.bigBtn, { backgroundColor: running ? t.danger : t.accent }]}
          onPress={running ? stop : start}
        >
          <Text style={styles.bigBtnText}>{running ? "Stop" : "Départ"}</Text>
        </Pressable>
        <View style={styles.awake}>
          <Ionicons name="sunny-outline" size={12} color={t.textMuted} />
          <Text style={[styles.awakeText, { color: t.textMuted }]}>Écran maintenu allumé</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10 },
  headerBtn: { width: 44, height: 32, justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "700", marginHorizontal: 8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  time: { fontSize: 72, fontWeight: "800", letterSpacing: -1, fontVariant: ["tabular-nums"] },
  unit: { fontSize: 13, fontWeight: "600", marginTop: 6 },
  controls: { paddingHorizontal: 24, paddingBottom: 24, gap: 12 },
  bigBtn: { borderRadius: 16, paddingVertical: 18, alignItems: "center" },
  bigBtnText: { color: "#FFFFFF", fontSize: 17, fontWeight: "800" },
  awake: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  awakeText: { fontSize: 10, fontWeight: "600" },
});
