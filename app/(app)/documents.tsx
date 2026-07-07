import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../lib/hooks/useAuth";
import { useHousehold } from "../../lib/hooks/useHousehold";
import { useFiles } from "../../lib/hooks/useFiles";
import { useTheme } from "../../lib/theme";
import { SharedFile } from "../../lib/types";
import { haptic } from "../../lib/haptics";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { ErrorBanner } from "../../components/ErrorBanner";

export default function DocumentsScreen() {
  const { profile } = useAuth();
  const { household, members } = useHousehold(profile);
  const { files, loading, uploadFile, getFileUrl, deleteFile, fetchFiles } = useFiles(household?.id);
  const t = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; storagePath: string } | null>(null);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchFiles();
    setRefreshing(false);
  }, [fetchFiles]);

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
      void haptic.medium();
    } catch {
      setErrorMsg("Impossible d'importer le document.");
    }
  };

  const handleOpenFile = async (storagePath: string) => {
    const url = await getFileUrl(storagePath);
    if (url) {
      await Linking.openURL(url);
    } else {
      setErrorMsg("Impossible d'ouvrir le document.");
    }
  };

  const handleDeleteFile = (id: string, storagePath: string) => {
    void haptic.warning();
    setDeleteTarget({ id, storagePath });
  };

  const renderFile = ({ item }: { item: SharedFile }) => (
    <Pressable style={[styles.card, { backgroundColor: t.card, borderColor: t.cardBorder }]} onPress={() => void handleOpenFile(item.storage_path)}>
      <View style={styles.cardRow}>
        <Ionicons name="document-text-outline" size={24} color={t.accent} />
        <View style={styles.fileInfo}>
          <Text style={[styles.cardTitle, { color: t.text }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.cardMeta, { color: t.textSecondary }]}>
            {getMemberName(item.uploaded_by)} · {formatDate(item.uploaded_at)}
          </Text>
        </View>
        <Pressable onPress={() => handleDeleteFile(item.id, item.storage_path)} hitSlop={8}>
          <Ionicons name="trash-outline" size={18} color={t.danger} />
        </Pressable>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.background }]} edges={["top"]}>
      <View style={[styles.header, { backgroundColor: t.card, borderBottomColor: t.cardBorder }]}>
        <Text style={[styles.headerTitle, { color: t.text }]}>Documents</Text>
      </View>

      {!!errorMsg && (
        <View style={styles.bannerWrap}>
          <ErrorBanner message={errorMsg} onDismiss={() => setErrorMsg("")} />
        </View>
      )}

      <FlatList
        data={files}
        keyExtractor={(item) => item.id}
        renderItem={renderFile}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.accent} colors={[t.accent]} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={styles.loader} color={t.accent} />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={48} color={t.emptyIcon} />
              <Text style={[styles.emptyText, { color: t.textMuted }]}>Aucun document</Text>
            </View>
          )
        }
      />

      {/* FAB — Importer un document */}
      <Pressable
        style={[styles.fab, { backgroundColor: t.accent }]}
        onPress={() => void handleUploadFile()}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </Pressable>

      <ConfirmDialog
        visible={!!deleteTarget}
        title="Supprimer"
        message="Supprimer ce document ?"
        confirmLabel="Supprimer"
        destructive
        onConfirm={() => {
          if (deleteTarget) void deleteFile(deleteTarget.id, deleteTarget.storagePath);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
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
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  bannerWrap: { paddingHorizontal: 16, paddingTop: 12 },
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 100 },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
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
