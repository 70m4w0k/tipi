import { useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
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
import { ShoppingItem } from "../../lib/types";

export default function ShoppingScreen() {
  const { profile } = useAuth();
  const { items, loading, addItem, toggleItem, deleteItem, clearChecked } =
    useShoppingList(profile?.household_id);
  const t = useTheme();
  const [newItem, setNewItem] = useState("");

  const checkedCount = items.filter((i) => i.checked).length;

  const handleAdd = async () => {
    if (!newItem.trim()) return;
    await addItem(newItem.trim());
    setNewItem("");
  };

  const handleDelete = (id: string, title: string) => {
    Alert.alert("Supprimer", `Supprimer "${title}" ?`, [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: () => void deleteItem(id) },
    ]);
  };

  const handleClearChecked = () => {
    Alert.alert("Vider", "Supprimer tous les articles cochés ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Vider", style: "destructive", onPress: () => void clearChecked() },
    ]);
  };

  const renderItem = ({ item }: { item: ShoppingItem }) => (
    <Pressable
      style={[styles.itemRow, { backgroundColor: t.card, borderColor: t.cardBorder }, item.checked && { backgroundColor: t.separator }]}
      onPress={() => void toggleItem(item.id)}
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
      <View style={[styles.header, { backgroundColor: t.card, borderBottomColor: t.cardBorder }]}>
        <Text style={[styles.headerTitle, { color: t.text }]}>Liste de courses</Text>
        {checkedCount > 0 && (
          <Pressable onPress={handleClearChecked} hitSlop={8}>
            <Ionicons name="trash-outline" size={20} color={t.danger} />
          </Pressable>
        )}
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

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconCircle, { backgroundColor: t.accentLight }]}>
                <Ionicons name="cart-outline" size={40} color={t.accent} />
              </View>
              <Text style={[styles.emptyTitle, { color: t.text }]}>Liste vide</Text>
              <Text style={[styles.emptyText, { color: t.textSecondary }]}>
                Ajoute des articles pour ne rien oublier au supermarché
              </Text>
            </View>
          )
        }
      />
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
  list: { paddingHorizontal: 16, paddingBottom: 24 },
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
});
