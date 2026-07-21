import React, { useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { useTheme } from "../lib/theme";
import { haptic } from "../lib/haptics";
import { useKeepAwakeSafe } from "../lib/use-keep-awake-safe";

const TAP_DEBOUNCE = 180; // ms — évite de compter deux fois un même contact
const HOLD_MS = 800;

type Props = {
  visible: boolean;
  exerciseName: string;
  onClose: () => void;
  /** Nombre de répétitions à enregistrer comme nouvelle série */
  onFinish: (count: number) => void;
};

/**
 * Compteur mains-libres plein écran : toute la zone centrale incrémente au tap
 * (pensé pour taper avec le nez), appui long ou bandeau "Terminer" pour finir.
 */
export function ExerciseCounter({ visible, exerciseName, onClose, onFinish }: Props) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      {visible && <CounterScreen exerciseName={exerciseName} onClose={onClose} onFinish={onFinish} />}
    </Modal>
  );
}

function CounterScreen({ exerciseName, onClose, onFinish }: Omit<Props, "visible">) {
  useKeepAwakeSafe();
  const t = useTheme();
  const [count, setCount] = useState(0);
  const countRef = useRef(0);
  const lastTap = useRef(0);
  const flash = useSharedValue(0);
  const scale = useSharedValue(1);

  const set = (n: number) => { countRef.current = n; setCount(n); };

  const onTap = () => {
    const now = Date.now();
    if (now - lastTap.current < TAP_DEBOUNCE) return;
    lastTap.current = now;
    set(countRef.current + 1);
    void haptic.light();
    flash.value = withSequence(withTiming(0.12, { duration: 40 }), withTiming(0, { duration: 160 }));
    scale.value = withSequence(
      withSpring(1.15, { damping: 6, stiffness: 220 }),
      withSpring(1, { damping: 6, stiffness: 220 })
    );
  };

  const finish = () => {
    void haptic.success();
    if (countRef.current > 0) onFinish(countRef.current);
    onClose();
  };

  const dec = () => { if (countRef.current > 0) { set(countRef.current - 1); void haptic.light(); } };

  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));
  const numStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: t.card }]} edges={["top", "bottom"]}>
      {/* Bande de contrôles en haut (zone hors de portée du nez) */}
      <View style={styles.topRow}>
        <Pressable testID="counter-close" onPress={onClose} hitSlop={10} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color={t.textSecondary} />
        </Pressable>
        <Pressable testID="counter-finish" style={[styles.finishBar, { backgroundColor: t.accent }]} onPress={finish}>
          <Ionicons name="checkmark" size={18} color="#FFFFFF" />
          <Text style={styles.finishText}>Terminer</Text>
        </Pressable>
      </View>

      {/* Grande zone de comptage */}
      <Pressable
        testID="counter-tapzone"
        style={styles.tapZone}
        onPress={onTap}
        onLongPress={finish}
        delayLongPress={HOLD_MS}
      >
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: t.accent }, flashStyle]} />
        <Text style={[styles.exerciseName, { color: t.textMuted }]} numberOfLines={1}>{exerciseName}</Text>
        <Animated.Text testID="counter-value" style={[styles.num, { color: t.accent }, numStyle]}>{count}</Animated.Text>
        <Text style={[styles.hint, { color: t.textMuted }]}>
          Touche l'écran à chaque répétition{"\n"}· appui long pour terminer ·
        </Text>
      </Pressable>

      {/* Correction d'un faux compte (coin bas, hors zone du nez) */}
      <Pressable
        testID="counter-minus"
        style={[styles.minus, { backgroundColor: t.card, borderColor: t.cardBorder }]}
        onPress={dec}
        hitSlop={8}
      >
        <Ionicons name="remove" size={22} color={t.textSecondary} />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 8 },
  closeBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  finishBar: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderRadius: 12, paddingVertical: 14,
  },
  finishText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800", letterSpacing: 0.2 },
  tapZone: { flex: 1, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  exerciseName: { position: "absolute", top: 16, fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  num: { fontSize: 120, fontWeight: "800", lineHeight: 132, fontVariant: ["tabular-nums"] },
  hint: { position: "absolute", bottom: 28, fontSize: 11, fontWeight: "600", textAlign: "center", paddingHorizontal: 24 },
  minus: {
    position: "absolute", left: 16, bottom: 16,
    width: 44, height: 44, borderRadius: 22, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
});
