import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { haptic } from "../lib/haptics";
import { useTheme } from "../lib/theme";
import { PulseCount } from "./PulseCount";

const HOLD_DELAY = 400;
const HOLD_INTERVAL = 90;
const MAX_COUNT = 99999;

type RepStepperProps = {
  count: number;
  onCommit: (count: number) => void;
  /** Fired on every local change (during hold / typing) so the screen can reflect it live */
  onChange?: (count: number) => void;
};

/**
 * Stepper de répétitions : tap sur +/- pour ±1, appui long pour répéter,
 * tap sur le nombre pour saisir directement au clavier.
 * La valeur n'est commitée qu'au relâchement / à la validation (un seul write DB).
 */
export function RepStepper({ count, onCommit, onChange }: RepStepperProps) {
  const t = useTheme();
  const [localCount, setLocalCount] = useState(count);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(count));
  const valueRef = useRef(count);
  const holdingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync from server unless the user is interacting
  useEffect(() => {
    if (!holdingRef.current && !editing) {
      valueRef.current = count;
      setLocalCount(count);
    }
  }, [count, editing]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const step = (delta: number) => {
    const next = Math.min(MAX_COUNT, Math.max(0, valueRef.current + delta));
    if (next === valueRef.current) return;
    valueRef.current = next;
    setLocalCount(next);
    onChange?.(next);
    void haptic.light();
  };

  const startHold = (delta: number) => {
    holdingRef.current = true;
    step(delta);
    const repeat = () => {
      step(delta);
      timerRef.current = setTimeout(repeat, HOLD_INTERVAL);
    };
    timerRef.current = setTimeout(repeat, HOLD_DELAY);
  };

  const endHold = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    holdingRef.current = false;
    if (valueRef.current !== count) onCommit(valueRef.current);
  };

  const openEditor = () => {
    setDraft(String(valueRef.current));
    setEditing(true);
  };

  const submitDraft = () => {
    setEditing(false);
    const parsed = parseInt(draft, 10);
    if (!Number.isNaN(parsed) && parsed !== count) {
      const next = Math.min(MAX_COUNT, Math.max(0, parsed));
      valueRef.current = next;
      setLocalCount(next);
      onChange?.(next);
      onCommit(next);
    } else {
      setDraft(String(count));
    }
  };

  return (
    <View style={styles.controls}>
      <Pressable
        testID="rep-minus"
        style={[styles.btn, { backgroundColor: t.dangerLight }]}
        onPressIn={() => startHold(-1)}
        onPressOut={endHold}
      >
        <Ionicons name="remove" size={18} color={t.danger} />
      </Pressable>
      {editing ? (
        <TextInput
          testID="rep-input"
          style={[styles.input, { color: t.text, borderColor: t.accent }]}
          value={draft}
          onChangeText={(v) => setDraft(v.replace(/[^0-9]/g, ""))}
          keyboardType="number-pad"
          autoFocus
          selectTextOnFocus
          maxLength={5}
          onBlur={submitDraft}
          onSubmitEditing={submitDraft}
        />
      ) : (
        <Pressable testID="rep-count" onPress={openEditor} hitSlop={6}>
          <PulseCount value={localCount} style={styles.count} color={t.text} />
        </Pressable>
      )}
      <Pressable
        testID="rep-plus"
        style={[styles.btn, { backgroundColor: t.accentLight }]}
        onPressIn={() => startHold(1)}
        onPressOut={endHold}
      >
        <Ionicons name="add" size={18} color={t.accent} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  controls: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 14 },
  btn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
  },
  count: { fontSize: 20, fontWeight: "800", minWidth: 40, textAlign: "center" },
  input: {
    fontSize: 20, fontWeight: "800", minWidth: 64, textAlign: "center",
    borderBottomWidth: 2, paddingVertical: 2,
  },
});
