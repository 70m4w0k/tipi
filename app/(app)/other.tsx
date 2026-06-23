import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../lib/hooks/useAuth";
import { useHousehold } from "../../lib/hooks/useHousehold";
import { useFiles } from "../../lib/hooks/useFiles";
import { useNavPreferences, ALL_TABS, NavTab } from "../../lib/hooks/useNavPreferences";
import { SharedFile } from "../../lib/types";
import { ProfileSettings } from "../../components/ProfileSettings";

type Tab = "hub" | "files" | "profil";

const MAX_NAV_TABS = 4;

export default function OtherScreen() {
  const router = useRouter();
  const { profile, signOut, refreshProfile } = useAuth();
  const { household, members } = useHousehold(profile);
  const { files, loading: filesLoading, uploadFile, getFileUrl, deleteFile } = useFiles(household?.id);
  const { enabledTabs, setTabs } = useNavPreferences();

  const [tab, setTab] = useState<Tab>("hub");

  const nonNavTabs = ALL_TABS.filter((t) => !enabledTabs.includes(t.key));

  const toggleNavTab = async (key: NavTab) => {
    if (enabledTabs.includes(key)) {
      if (enabledTabs.length <= 1) return;
      await setTabs(enabledTabs.filter((k) => k !== key));
    } else {
      if (enabledTabs.length >= MAX_NAV_TABS) {
        Alert.alert("Maximum atteint", `Tu peux afficher ${MAX_NAV_TABS} pages maximum dans la barre de navigation.`);
        return;
      }
      await setTabs([...enabledTabs, key]);
    }
  };

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

      <View style={styles.tabRow}>
        {(["hub", "files", "profil"] as Tab[]).map((t) => (
          <Pressable
            key={t}
            style={[styles.tabButton, tab === t && styles.tabButtonActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === "hub" ? "Accueil" : t === "files" ? "Documents" : "Profil"}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === "hub" && (
        <ScrollView contentContainerStyle={styles.hubContent}>
          {/* Tiles for non-navbar pages */}
          {nonNavTabs.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Accès rapide</Text>
              <View style={styles.tileGrid}>
                {nonNavTabs.map((t) => (
                  <Pressable
                    key={t.key}
                    style={styles.tile}
                    onPress={() => router.push(`/(app)/${t.key}` as any)}
                  >
                    <Ionicons name={t.icon as any} size={28} color="#1D4ED8" />
                    <Text style={styles.tileLabel}>{t.label}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          {/* Navbar config */}
          <Text style={styles.sectionTitle}>Barre de navigation</Text>
          <Text style={styles.sectionHint}>
            Choisis jusqu'à {MAX_NAV_TABS} pages à afficher dans la barre du bas.
          </Text>
          <View style={styles.navConfigList}>
            {ALL_TABS.map((t) => {
              const isEnabled = enabledTabs.includes(t.key);
              return (
                <Pressable
                  key={t.key}
                  style={[styles.navConfigItem, isEnabled && styles.navConfigItemActive]}
                  onPress={() => void toggleNavTab(t.key)}
                >
                  <Ionicons name={t.icon as any} size={20} color={isEnabled ? "#1D4ED8" : "#9CA3AF"} />
                  <Text style={[styles.navConfigLabel, isEnabled && styles.navConfigLabelActive]}>
                    {t.label}
                  </Text>
                  <Ionicons
                    name={isEnabled ? "checkbox" : "square-outline"}
                    size={20}
                    color={isEnabled ? "#1D4ED8" : "#D1D5DB"}
                  />
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.reloadHint}>
            Redémarre l'app pour appliquer les changements de navigation.
          </Text>
        </ScrollView>
      )}

      {tab === "profil" && profile ? (
        <ProfileSettings
          profile={profile}
          household={household}
          onSignOut={signOut}
          onProfileUpdated={refreshProfile}
        />
      ) : null}

      {tab === "files" ? (
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
      ) : null}
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

  // Hub
  hubContent: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 8 },
  sectionHint: { fontSize: 13, color: "#6B7280", marginBottom: 12 },
  tileGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  tile: {
    width: "47%",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingVertical: 24,
    alignItems: "center",
    gap: 8,
  },
  tileLabel: { fontSize: 14, fontWeight: "600", color: "#374151" },
  navConfigList: { gap: 6, marginBottom: 8 },
  navConfigItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 14,
  },
  navConfigItemActive: { borderColor: "#BFDBFE", backgroundColor: "#F0F5FF" },
  navConfigLabel: { flex: 1, fontSize: 15, color: "#6B7280" },
  navConfigLabelActive: { color: "#111827", fontWeight: "600" },
  reloadHint: { fontSize: 12, color: "#9CA3AF", textAlign: "center", marginTop: 8 },

  // Files
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
