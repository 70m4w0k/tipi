import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../lib/hooks/useAuth";
import { useShoppingList } from "../../lib/hooks/useShoppingList";
import { useTheme } from "../../lib/theme";
import { supabase } from "../../lib/supabase";
import { haptic } from "../../lib/haptics";
import { ShoppingItem } from "../../lib/types";
import {
  ShoppingAisle,
  AISLE_LABELS,
  AISLE_ICONS,
  AISLE_COLORS,
  guessAisle,
} from "../../lib/shopping-categories";

const AISLE_ORDER: ShoppingAisle[] = ["frais", "epicerie", "hygiene", "menage", "autre"];

export default function ShoppingScreen() {
  const { profile } = useAuth();
  const { items, suggestions, loading, addItem, toggleItem, deleteItem, clearChecked, fetchItems } =
    useShoppingList(profile?.household_id);
  const t = useTheme();
  const [newItem, setNewItem] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [shoppingMode, setShoppingMode] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchItems();
    setRefreshing(false);
  }, [fetchItems]);

  const checkedCount = items.filter((i) => i.checked).length;
  const uncheckedCount = items.filter((i) => !i.checked).length;

  const groupedItems = useMemo(() => {
    const groups: Record<ShoppingAisle, ShoppingItem[]> = {
      frais: [], epicerie: [], hygiene: [], menage: [], autre: [],
    };
    for (const item of items) {
      const aisle = (item.category as ShoppingAisle) || "autre";
      const target = groups[aisle] ?? groups.autre;
      target.push(item);
    }
    return groups;
  }, [items]);

  const filteredSuggestions = useMemo(() => {
    const currentTitles = new Set(items.map((i) => i.title.toLowerCase().trim()));
    return suggestions.filter((s) => !currentTitles.has(s));
  }, [suggestions, items]);

  const handleAdd = async (title?: string) => {
    const value = title ?? newItem;
    if (!value.trim()) return;
    void haptic.light();
    await addItem(value.trim());
    if (!title) setNewItem("");
  };

  const handleDelete = (id: string, title: string) => {
    void haptic.warning();
    Alert.alert("Supprimer", `Supprimer "${title}" ?`, [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: () => void deleteItem(id) },
    ]);
  };

  const handleClearChecked = () => {
    void haptic.warning();
    Alert.alert("Vider", "Supprimer tous les articles cochés ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Vider", style: "destructive", onPress: () => void clearChecked() },
    ]);
  };

  const handleGoShopping = async () => {
    void haptic.medium();
    setShoppingMode(true);
    if (!profile?.household_id) return;
    const name = profile?.display_name ?? "Quelqu'un";
    await supabase.from("messages").insert({
      household_id: profile.household_id,
      author_id: profile.id,
      type: "text",
      content: `${name} est parti(e) faire les courses ! (${uncheckedCount} article${uncheckedCount > 1 ? "s" : ""} sur la liste)`,
      reactions: {},
    });
  };

  const renderItem = (item: ShoppingItem) => (
    <Pressable
      key={item.id}
      style={[styles.itemRow, { backgroundColor: t.card, borderColor: t.cardBorder }, item.checked && { backgroundColor: t.separator }]}
      onPress={() => { void haptic.light(); void toggleItem(item.id); }}
      onLongPress={() => handleDelete(item.id, item.title)}
    >
      <Ionicons
        name={item.checked ? "checkbox" : "square-outline"}
        size={22}
        color={item.checked ? t.success : t.textMuted}
      />
      <Text style={[styles.itemText, { color: t.text }, item.checked && { color: t.textMuted, textDecorationLine: "line-through" }]}>
        {item.title}
      </Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.background }]} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
      <View style={[styles.header, { backgroundColor: t.card, borderBottomColor: t.cardBorder }]}>
        <Text style={[styles.headerTitle, { color: t.text }]}>Liste de courses</Text>
        <View style={styles.headerActions}>
          {checkedCount > 0 && (
            <Pressable onPress={handleClearChecked} hitSlop={8}>
              <Ionicons name="trash-outline" size={20} color={t.danger} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.addRow}>
        <TextInput
          style={[styles.addInput, { borderColor: t.inputBorder, backgroundColor: t.inputBg, color: t.text }]}
          placeholder="Ajouter un article..."
          placeholderTextColor={t.textMuted}
          value={newItem}
          onChangeText={setNewItem}
          onSubmitEditing={() => void handleAdd()}
          returnKeyType="done"
        />
        <Pressable
          style={[styles.addButton, { backgroundColor: t.accent }, !newItem.trim() && styles.addButtonDisabled]}
          onPress={() => void handleAdd()}
          disabled={!newItem.trim()}
        >
          <Ionicons name="add" size={22} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Auto-categorization preview */}
      {newItem.trim().length > 0 && (
        <View style={styles.categoryPreview}>
          {(() => {
            const aisle = guessAisle(newItem);
            return (
              <View style={[styles.categoryBadge, { backgroundColor: AISLE_COLORS[aisle] + "20" }]}>
                <Ionicons name={AISLE_ICONS[aisle] as any} size={14} color={AISLE_COLORS[aisle]} />
                <Text style={[styles.categoryBadgeText, { color: AISLE_COLORS[aisle] }]}>
                  {AISLE_LABELS[aisle]}
                </Text>
              </View>
            );
          })()}
        </View>
      )}

      {/* Suggestions */}
      {filteredSuggestions.length > 0 && !newItem.trim() && (
        <View style={styles.suggestionsRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionsContent}>
            <Ionicons name="bulb-outline" size={14} color={t.textMuted} style={{ marginRight: 4 }} />
            {filteredSuggestions.map((s) => (
              <Pressable
                key={s}
                style={[styles.suggestionChip, { backgroundColor: t.card, borderColor: t.cardBorder }]}
                onPress={() => void handleAdd(s)}
              >
                <Ionicons name="add" size={14} color={t.accent} />
                <Text style={[styles.suggestionText, { color: t.text }]}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.accent} colors={[t.accent]} />}
      >
        {items.length === 0 && !loading && (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconCircle, { backgroundColor: t.accentLight }]}>
              <Ionicons name="cart-outline" size={40} color={t.accent} />
            </View>
            <Text style={[styles.emptyTitle, { color: t.text }]}>Liste vide</Text>
            <Text style={[styles.emptyText, { color: t.textSecondary }]}>
              Ajoute des articles pour ne rien oublier au supermarché
            </Text>
          </View>
        )}

        {items.length > 0 && AISLE_ORDER.map((aisle) => {
          const aisleItems = groupedItems[aisle];
          if (aisleItems.length === 0) return null;
          const unchecked = aisleItems.filter((i) => !i.checked);
          const checked = aisleItems.filter((i) => i.checked);
          return (
            <View key={aisle} style={styles.aisleSection}>
              <View style={styles.aisleHeader}>
                <Ionicons name={AISLE_ICONS[aisle] as any} size={16} color={AISLE_COLORS[aisle]} />
                <Text style={[styles.aisleTitle, { color: t.text }]}>{AISLE_LABELS[aisle]}</Text>
                <Text style={[styles.aisleCount, { color: t.textMuted }]}>
                  {unchecked.length}/{aisleItems.length}
                </Text>
              </View>
              {unchecked.map(renderItem)}
              {checked.map(renderItem)}
            </View>
          );
        })}
      </ScrollView>

      {/* "J'y vais !" FAB */}
      {uncheckedCount > 0 && !shoppingMode && (
        <Pressable
          style={[styles.goButton, { backgroundColor: t.accent }]}
          onPress={() => void handleGoShopping()}
        >
          <Ionicons name="cart" size={20} color="#FFFFFF" />
          <Text style={styles.goButtonText}>J'y vais !</Text>
        </Pressable>
      )}

      {shoppingMode && (
        <Pressable
          style={[styles.goButton, { backgroundColor: t.success }]}
          onPress={() => { void haptic.light(); setShoppingMode(false); }}
        >
          <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
          <Text style={styles.goButtonText}>Courses terminées</Text>
        </Pressable>
      )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    borderBottomWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  headerActions: { flexDirection: "row", gap: 12, alignItems: "center" },
  addRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  addInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  addButton: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonDisabled: { opacity: 0.5 },
  categoryPreview: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: { fontSize: 12, fontWeight: "600" },
  suggestionsRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  suggestionsContent: {
    alignItems: "center",
    gap: 6,
    paddingRight: 16,
  },
  suggestionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  suggestionText: { fontSize: 13 },
  list: { paddingHorizontal: 16, paddingBottom: 90 },
  aisleSection: { marginBottom: 16 },
  aisleHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  aisleTitle: { fontSize: 14, fontWeight: "700", flex: 1 },
  aisleCount: { fontSize: 12 },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 6,
  },
  itemText: { fontSize: 15, flex: 1 },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 48,
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptyText: { fontSize: 14, textAlign: "center" },
  goButton: {
    position: "absolute",
    bottom: 24,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  goButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 16 },
});
