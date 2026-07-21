import React from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../lib/theme";
import { ExerciseVariant } from "../lib/types";
import { VariantBreakdownRow } from "../lib/sport-logic";

const STANDARD = "Standard";

/** Sélecteur de la variante appliquée aux nouvelles séries (Standard + variantes). */
export function VariantSelector({
  variants, active, onChange,
}: { variants: ExerciseVariant[]; active: string | null; onChange: (v: string | null) => void }) {
  const t = useTheme();
  if (variants.length === 0) return null;
  const options: { name: string; value: string | null; color: string | null }[] = [
    { name: STANDARD, value: null, color: null },
    ...variants.map((v) => ({ name: v.name, value: v.name, color: v.color })),
  ];
  return (
    <View style={styles.selectorWrap}>
      <Text style={[styles.selectorLabel, { color: t.textMuted }]}>Variante de la prochaine série</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {options.map((o) => {
          const c = o.color ?? t.textMuted;
          const selected = active === o.value;
          return (
            <Pressable
              key={o.name}
              testID={`variant-chip-${o.name}`}
              onPress={() => onChange(o.value)}
              style={[
                styles.chip,
                { borderColor: selected ? c : t.cardBorder, backgroundColor: selected ? c : t.card },
              ]}
            >
              {!selected && <View style={[styles.dot, { backgroundColor: c }]} />}
              <Text style={[styles.chipText, { color: selected ? "#FFFFFF" : t.text }]} numberOfLines={1}>{o.name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

/** Petite étiquette de variante sur une série (tap pour changer). */
export function VariantTag({
  variant, variants, onPress,
}: { variant: string | null; variants: ExerciseVariant[]; onPress: () => void }) {
  const t = useTheme();
  const color = variant ? variants.find((v) => v.name === variant)?.color ?? t.textMuted : t.textMuted;
  return (
    <Pressable testID="series-variant-tag" onPress={onPress} style={styles.tag} hitSlop={6}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.tagText, { color: t.textSecondary }]} numberOfLines={1}>{variant ?? STANDARD}</Text>
    </Pressable>
  );
}

/** Modal de choix de variante pour une série existante. */
export function VariantPickerModal({
  visible, variants, current, onSelect, onClose,
}: {
  visible: boolean; variants: ExerciseVariant[]; current: string | null;
  onSelect: (v: string | null) => void; onClose: () => void;
}) {
  const t = useTheme();
  const options: { name: string; value: string | null; color: string | null }[] = [
    { name: STANDARD, value: null, color: null },
    ...variants.map((v) => ({ name: v.name, value: v.name, color: v.color })),
  ];
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: t.card }]} onPress={() => {}}>
          <Text style={[styles.sheetTitle, { color: t.text }]}>Variante de la série</Text>
          <ScrollView style={{ maxHeight: 320 }}>
            {options.map((o) => (
              <Pressable
                key={o.name}
                testID={`variant-option-${o.name}`}
                style={[styles.optionRow, { borderBottomColor: t.cardBorder }]}
                onPress={() => { onSelect(o.value); onClose(); }}
              >
                <View style={[styles.dot, { backgroundColor: o.color ?? t.textMuted }]} />
                <Text style={[styles.optionText, { color: t.text }]} numberOfLines={1}>{o.name}</Text>
                {current === o.value && <Ionicons name="checkmark" size={18} color={t.accent} />}
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Répartition du total par variante (barre empilée + légende). */
export function VariantBreakdown({ rows }: { rows: VariantBreakdownRow[] }) {
  const t = useTheme();
  if (rows.length < 2) return null; // rien à comparer s'il n'y a qu'une variante
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={[styles.sectionTitle, { color: t.textSecondary }]}>Répartition par variante</Text>
      <View style={[styles.stack, { backgroundColor: t.cardBorder }]}>
        {rows.map((r) => (
          <View key={r.name} style={{ width: `${Math.round(r.pct * 100)}%` as any, backgroundColor: r.color ?? t.textMuted, height: "100%" }} />
        ))}
      </View>
      <View style={styles.legend}>
        {rows.map((r) => (
          <View key={r.name} style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: r.color ?? t.textMuted }]} />
            <Text style={[styles.legendName, { color: t.text }]} numberOfLines={1}>{r.name}</Text>
            <Text style={[styles.legendVal, { color: t.textMuted }]}>{r.total} · {Math.round(r.pct * 100)}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  selectorWrap: { marginHorizontal: 16, marginBottom: 8 },
  selectorLabel: { fontSize: 9, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5, marginLeft: 2 },
  chips: { flexDirection: "row", gap: 6, paddingRight: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5 },
  chipText: { fontSize: 11, fontWeight: "700", maxWidth: 130 },
  dot: { width: 8, height: 8, borderRadius: 4 },

  tag: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  tagText: { fontSize: 10, fontWeight: "600", maxWidth: 90 },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
  sheet: { width: "100%", maxWidth: 360, borderRadius: 16, padding: 18 },
  sheetTitle: { fontSize: 16, fontWeight: "800", marginBottom: 8 },
  optionRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  optionText: { flex: 1, fontSize: 14, fontWeight: "600" },

  sectionTitle: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", marginBottom: 8 },
  stack: { height: 10, borderRadius: 5, overflow: "hidden", flexDirection: "row" },
  legend: { marginTop: 8, gap: 5 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  legendName: { flex: 1, fontSize: 12, fontWeight: "600" },
  legendVal: { fontSize: 11, fontWeight: "600", fontVariant: ["tabular-nums"] },
});
