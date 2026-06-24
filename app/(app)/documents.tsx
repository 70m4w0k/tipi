import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../lib/hooks/useAuth";
import { useHousehold } from "../../lib/hooks/useHousehold";
import { useFiles } from "../../lib/hooks/useFiles";
import { SharedFile } from "../../lib/types";

export default function DocumentsScreen() {
  const { profile } = useAuth();
  const { household, members } = useHousehold(profile);
  const { files, loading, uploadFile, getFileUrl, deleteFile } = useFiles(household?.id);

  const getMemberName = (userId: string | null) => {
    if (!userId) return "Inconnu";
    const member = members.find((m) => m.id === userId);
    return member?.display_name ?? "Inconnu";
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  const handleUploadFile = async () => {
    try {
      await uploadFile();
    } catch {
      Alert.alert("Erreur", "Impossible d'importer le document.");
    }
  };

  const handleOpenFile = async (storagePath: string) => {
    const url = await getFileUrl(storagePath);
    if (url) {
      await Linking.openURL(url);
    } else {
      Alert.alert("Erreur", "Impossible d'ouvrir le document.");
    }
  };

  const handleDeleteFile = (id: string, storagePath: string) => {
    Alert.alert("Supprimer", "Supprimer ce document ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: () => void deleteFile(id, storagePath) },
    ]);
  };

  const renderFile = ({ item }: { item: SharedFile }) => (
    <Pressable style={styles.card} onPress={() => void handleOpenFile(item.storage_path)}>
      <View style={styles.cardRow}>
        <Ionicons name="document-text-outline" size={24} color="#1D4ED8" />
        <View style={styles.fileInfo}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.cardMeta}>
            {getMemberName(item.uploaded_by)} · {formatDate(item.uploaded_at)}
          </Text>
        </View>
        <Pressable onPress={() => handleDeleteFile(item.id, item.storage_path)} hitSlop={8}>
          <Ionicons name="trash-outline" size={18} color="#EF4444" />
        </Pressable>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Documents</Text>
        <Pressable onPress={() => void handleUploadFile()} hitSlop={8}>
          <Ionicons name="add" size={24} color="#1D4ED8" />
        </Pressable>
      </View>

      <FlatList
        data={files}
        keyExtractor={(item) => item.id}
        renderItem={renderFile}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={styles.loader} color="#1D4ED8" />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>Aucun document</Text>
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
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  fileInfo: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: "600", color: "#111827" },
  cardMeta: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  emptyContainer: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: "#9CA3AF" },
  loader: { marginTop: 32 },
});
