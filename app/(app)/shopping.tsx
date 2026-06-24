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
import { ShoppingItem } from "../../lib/types";

export default function ShoppingScreen() {
  const { profile } = useAuth();
  const { items, loading, addItem, toggleItem, deleteItem, clearChecked } =
    useShoppingList(profile?.household_id);
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
      style={[styles.itemRow, item.checked && styles.itemRowChecked]}
      onPress={() => void toggleItem(item.id)}
      onLongPress={() => handleDelete(item.id, item.title)}
    >
      <Ionicons
        name={item.checked ? "checkbox" : "square-outline"}
        size={22}
        color={item.checked ? "#10B981" : "#9CA3AF"}
      />
      <Text style={[styles.itemText, item.checked && styles.itemTextChecked]}>
        {item.title}
      </Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Liste de courses</Text>
        {checkedCount > 0 && (
          <Pressable onPress={handleClearChecked} hitSlop={8}>
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </Pressable>
        )}
      </View>

      <View style={styles.addRow}>
        <TextInput
          style={styles.addInput}
          placeholder="Ajouter un article..."
          placeholderTextColor="#9CA3AF"
          value={newItem}
          onChangeText={setNewItem}
          onSubmitEditing={() => void handleAdd()}
          returnKeyType="done"
        />
        <Pressable
          style={[styles.addButton, !newItem.trim() && styles.addButtonDisabled]}
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
              <Ionicons name="cart-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>Liste vide</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F6FA" },
  header: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  addRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  addInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: "#FFFFFF",
    color: "#111827",
  },
  addButton: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#1D4ED8",
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonDisabled: { backgroundColor: "#CBD5E1" },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 14,
    marginBottom: 6,
  },
  itemRowChecked: { backgroundColor: "#F9FAFB" },
  itemText: { fontSize: 15, color: "#111827", flex: 1 },
  itemTextChecked: { color: "#9CA3AF", textDecorationLine: "line-through" },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 60,
    gap: 12,
  },
  emptyText: { fontSize: 15, color: "#9CA3AF" },
});
