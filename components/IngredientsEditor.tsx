import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../lib/theme";
import { Ingredient } from "../lib/types";

/** "1,5" / "250" → nombre ; vide ou invalide → null (non quantifiable) */
export function parseAmount(s: string): number | null {
  const cleaned = s.replace(",", ".").trim();
  if (cleaned === "") return null;
  const n = parseFloat(cleaned);
  return Number.isNaN(n) ? null : n;
}

/** Éditeur d'ingrédients structurés : nom + quantité + unité par ligne. */
export function IngredientsEditor({
  ingredients, onChange,
}: { ingredients: Ingredient[]; onChange: (i: Ingredient[]) => void }) {
  const t = useTheme();
  const update = (idx: number, patch: Partial<Ingredient>) =>
    onChange(ingredients.map((ing, i) => (i === idx ? { ...ing, ...patch } : ing)));
  const remove = (idx: number) => onChange(ingredients.filter((_, i) => i !== idx));
  const add = () => onChange([...ingredients, { name: "", amount: null, unit: "" }]);

  const field = { borderColor: t.inputBorder, backgroundColor: t.inputBg, color: t.text };

  return (
    <View style={{ gap: 8 }}>
      {ingredients.map((ing, i) => (
        <View key={i} style={styles.row}>
          <TextInput
            testID={`ingredient-name-${i}`}
            style={[styles.f, styles.name, field]}
            value={ing.name}
            onChangeText={(v) => update(i, { name: v })}
            placeholder="Ingrédient"
            placeholderTextColor={t.textMuted}
          />
          <TextInput
            testID={`ingredient-amount-${i}`}
            style={[styles.f, styles.amount, field]}
            value={ing.amount == null ? "" : String(ing.amount)}
            onChangeText={(v) => update(i, { amount: parseAmount(v) })}
            placeholder="Qté"
            placeholderTextColor={t.textMuted}
            keyboardType="numeric"
          />
          <TextInput
            testID={`ingredient-unit-${i}`}
            style={[styles.f, styles.unit, field]}
            value={ing.unit}
            onChangeText={(v) => update(i, { unit: v })}
            placeholder="unité"
            placeholderTextColor={t.textMuted}
          />
          <Pressable testID={`ingredient-remove-${i}`} onPress={() => remove(i)} hitSlop={6} style={styles.del}>
            <Ionicons name="close" size={18} color={t.textMuted} />
          </Pressable>
        </View>
      ))}
      <Pressable testID="ingredient-add" style={styles.addRow} onPress={add}>
        <Ionicons name="add-circle-outline" size={18} color={t.accent} />
        <Text style={[styles.addText, { color: t.accent }]}>Ajouter un ingrédient</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  f: { borderWidth: 1, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14 },
  name: { flex: 1 },
  amount: { width: 56, textAlign: "center" },
  unit: { width: 62 },
  del: { padding: 2 },
  addRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4 },
  addText: { fontSize: 13, fontWeight: "700" },
});
