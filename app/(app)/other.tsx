import { useState } from "react";
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
import { useAuth } from "../../lib/hooks/useAuth";
import { useHousehold } from "../../lib/hooks/useHousehold";
import { useFiles } from "../../lib/hooks/useFiles";
import { SharedFile } from "../../lib/types";
import { ProfileSettings } from "../../components/ProfileSettings";

type Tab = "files" | "profil";

export default function OtherScreen() {
  const { profile, signOut, refreshProfile } = useAuth();
  const { household, members } = useHousehold(profile);
  const { files, loading: filesLoading, uploadFile, getFileUrl, deleteFile } = useFiles(household?.id);

  const [tab, setTab] = useState<Tab>("files");

  const getMemberName = (userId: string | null) => {
    if (!userId) return "Inconnu";
    const member = members.find((m) => m.id === userId);
    return member?.display_name ?? "Inconnu";
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
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
      {
        text: "Supprimer",
        style: "destructive",
        onPress: () => void deleteFile(id, storagePath),
      },
    ]);
  };

  const renderFile = ({ item }: { item: SharedFile }) => (
    <Pressable style={styles.card} onPress={() => void handleOpenFile(item.storage_path)}>
      <View style={styles.cardHeader}>
        <View style={styles.fileInfo}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.cardMeta}>
            {getMemberName(item.uploaded_by)} · {formatDate(item.uploaded_at)}
          </Text>
        </View>
        <Pressable onPress={() => handleDeleteFile(item.id, item.storage_path)} hitSlop={8}>
          <Text style={styles.deleteButton}>✕</Text>
        </Pressable>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Plus</Text>
      </View>

      {/* Tab toggle */}
      <View style={styles.tabRow}>
        <Pressable
          style={[styles.tabButton, tab === "files" && styles.tabButtonActive]}
          onPress={() => setTab("files")}
        >
          <Text style={[styles.tabText, tab === "files" && styles.tabTextActive]}>Documents</Text>
        </Pressable>
        <Pressable
          style={[styles.tabButton, tab === "profil" && styles.tabButtonActive]}
          onPress={() => setTab("profil")}
        >
          <Text style={[styles.tabText, tab === "profil" && styles.tabTextActive]}>Profil</Text>
        </Pressable>
      </View>

      {tab === "profil" && profile ? (
        <ProfileSettings
          profile={profile}
          household={household}
          onSignOut={signOut}
          onProfileUpdated={refreshProfile}
        />
      ) : (
        <FlatList
          data={files}
          keyExtractor={(item) => item.id}
          renderItem={renderFile}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Pressable style={styles.button} onPress={() => void handleUploadFile()}>
              <Text style={styles.buttonText}>Importer un document</Text>
            </Pressable>
          }
          ListEmptyComponent={
            filesLoading ? (
              <ActivityIndicator style={styles.loader} color="#1D4ED8" />
            ) : (
              <Text style={styles.emptyText}>Aucun document</Text>
            )
          }
        />
      )}
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
  tabRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: "#E5E7EB",
    borderRadius: 10,
    padding: 3,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  tabButtonActive: { backgroundColor: "#1D4ED8" },
  tabText: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  tabTextActive: { color: "#FFFFFF" },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  button: {
    backgroundColor: "#1D4ED8",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardTitle: { fontSize: 15, fontWeight: "600", color: "#111827", flex: 1, marginRight: 8 },
  cardMeta: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  fileInfo: { flex: 1, marginRight: 8 },
  deleteButton: { fontSize: 16, color: "#EF4444", fontWeight: "700", paddingLeft: 8 },
  emptyText: { textAlign: "center", color: "#9CA3AF", fontSize: 15, marginTop: 32 },
  loader: { marginTop: 32 },
});
