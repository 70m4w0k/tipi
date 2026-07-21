import React, { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../lib/theme";
import { ShoppingAddition } from "../lib/recipes-logic";

type Scope = "shared" | "personal";

type Props = {
  visible: boolean;
  recipeTitle: string;
  additions: ShoppingAddition[];
  onClose: () => void;
  /** noms sélectionnés + destination (partagée coloc ou perso) */
  onConfirm: (selectedNames: string[], scope: Scope) => void;
};

/** Checklist d'ajout aux courses : coché par défaut sauf ce qui est déjà dans la liste. */
export function AddToShoppingSheet({ visible, recipeTitle, additions, onClose, onConfirm }: Props) {
  const t = useTheme();
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [scope, setScope] = useState<Scope>("shared");

  // À l'ouverture : tout coché sauf ce qui est déjà dans la liste.
  useEffect(() => {
    if (visible) {
      setChecked(new Set(additions.filter((a) => !a.alreadyInList).map((a) => a.name)));
      setScope("shared");
    }
  }, [visible]);

  const toggle = (name: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  const count = checked.size;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: t.card }]} onPress={() => {}}>
          <Text style={[styles.title, { color: t.text }]}>Ajouter aux courses</Text>
          <Text style={[styles.sub, { color: t.textSecondary }]} numberOfLines={1}>
            {recipeTitle} — décoche ce que tu as déjà
          </Text>

          {/* Destination */}
          <View style={[styles.seg, { backgroundColor: t.separator }]}>
            {(["shared", "personal"] as Scope[]).map((s) => (
              <Pressable
                key={s}
                testID={`shop-scope-${s}`}
                style={[styles.segBtn, scope === s && { backgroundColor: t.card }]}
                onPress={() => setScope(s)}
              >
                <Text style={[styles.segText, { color: scope === s ? t.text : t.textMuted }]}>
                  {s === "shared" ? "Partagée (coloc)" : "Perso"}
                </Text>
              </Pressable>
            ))}
          </View>

          <ScrollView style={{ maxHeight: 320 }}>
            {additions.map((a) => {
              const on = checked.has(a.name);
              return (
                <Pressable
                  key={a.name}
                  testID={`shop-add-${a.name}`}
                  style={styles.row}
                  onPress={() => toggle(a.name)}
                >
                  <View style={[styles.box, on ? { backgroundColor: t.accent, borderColor: t.accent } : { borderColor: t.textMuted }]}>
                    {on && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                  </View>
                  <Text style={[styles.name, { color: on ? t.text : t.textMuted }]} numberOfLines={1}>{a.name}</Text>
                  {a.alreadyInList && <Text style={[styles.inlist, { color: t.success, backgroundColor: t.successLight }]}>déjà dans la liste</Text>}
                  {!!a.quantity && <Text style={[styles.qty, { color: on ? t.textSecondary : t.textMuted }]}>{a.quantity}</Text>}
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable
            testID="shop-confirm"
            style={[styles.confirm, count === 0 ? { backgroundColor: t.cardBorder } : { backgroundColor: t.accent }]}
            onPress={() => { if (count > 0) { onConfirm([...checked], scope); onClose(); } }}
          >
            <Text style={[styles.confirmText, { color: count === 0 ? t.textMuted : "#FFFFFF" }]}>
              {count === 0 ? "Sélectionne des articles" : `Ajouter ${count} article${count > 1 ? "s" : ""}`}
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
  sub: { fontSize: 12, marginTop: 2, marginBottom: 12 },
  seg: { flexDirection: "row", borderRadius: 10, padding: 3, marginBottom: 10 },
  segBtn: { flex: 1, alignItems: "center", paddingVertical: 7, borderRadius: 8 },
  segText: { fontSize: 12, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 10 },
  box: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  name: { flex: 1, fontSize: 13.5, fontWeight: "600" },
  inlist: { fontSize: 8.5, fontWeight: "700", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  qty: { fontSize: 12, fontWeight: "700", fontVariant: ["tabular-nums"] },
  confirm: { marginTop: 12, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  confirmText: { fontSize: 14, fontWeight: "800" },
});
