import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../lib/hooks/useAuth";
import { useHousehold } from "../../lib/hooks/useHousehold";
import { useEvents } from "../../lib/hooks/useEvents";
import { useFiles } from "../../lib/hooks/useFiles";
import { HouseEvent, SharedFile } from "../../lib/types";
import { ProfileSettings } from "../../components/ProfileSettings";

type Tab = "events" | "files" | "profil";

export default function OtherScreen() {
  const { profile, signOut, refreshProfile } = useAuth();
  const { household, members } = useHousehold(profile);
  const { events, loading: eventsLoading, addEvent, deleteEvent } = useEvents(household?.id);
  const { files, loading: filesLoading, uploadFile, getFileUrl, deleteFile } = useFiles(household?.id);

  const [tab, setTab] = useState<Tab>("events");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleAddEvent = async () => {
    if (!title.trim() || !date.trim()) {
      Alert.alert("Champs requis", "Le titre et la date sont obligatoires.");
      return;
    }
    setSubmitting(true);
    try {
      await addEvent(title.trim(), date.trim(), note.trim());
      setTitle("");
      setDate("");
      setNote("");
    } catch {
      Alert.alert("Erreur", "Impossible d'ajouter l'événement.");
    }
    setSubmitting(false);
  };

  const handleDeleteEvent = (id: string) => {
    Alert.alert("Supprimer", "Supprimer cet événement ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: () => void deleteEvent(id),
      },
    ]);
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

  const getMemberName = (userId: string | null) => {
    if (!userId) return "Inconnu";
    const member = members.find((m) => m.id === userId);
    return member?.display_name ?? "Inconnu";
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("fr-FR", {
        weekday: "short",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const renderEvent = ({ item }: { item: HouseEvent }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Pressable onPress={() => handleDeleteEvent(item.id)} hitSlop={8}>
          <Text style={styles.deleteButton}>✕</Text>
        </Pressable>
      </View>
      <Text style={styles.cardDate}>{formatDate(item.date)}</Text>
      {item.note ? <Text style={styles.cardNote}>{item.note}</Text> : null}
    </View>
  );

  const renderFile = ({ item }: { item: SharedFile }) => (
    <Pressable style={styles.card} onPress={() => void handleOpenFile(item.storage_path)}>
      <View style={styles.cardHeader}>
        <View style={styles.fileInfo}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.cardMeta}>
            Par {getMemberName(item.uploaded_by)} · {formatDate(item.uploaded_at)}
          </Text>
        </View>
        <Pressable
          onPress={() => handleDeleteFile(item.id, item.storage_path)}
          hitSlop={8}
        >
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
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >

        {/* Tab toggle */}
        <View style={styles.tabRow}>
          <Pressable
            style={[styles.tabButton, tab === "events" && styles.tabButtonActive]}
            onPress={() => setTab("events")}
          >
            <Text
              style={[styles.tabText, tab === "events" && styles.tabTextActive]}
            >
              Événements
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tabButton, tab === "files" && styles.tabButtonActive]}
            onPress={() => setTab("files")}
          >
            <Text
              style={[styles.tabText, tab === "files" && styles.tabTextActive]}
            >
              Documents
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tabButton, tab === "profil" && styles.tabButtonActive]}
            onPress={() => setTab("profil")}
          >
            <Text
              style={[styles.tabText, tab === "profil" && styles.tabTextActive]}
            >
              Profil
            </Text>
          </Pressable>
        </View>

        {tab === "profil" && profile ? (
          <ProfileSettings
            profile={profile}
            household={household}
            onSignOut={signOut}
            onProfileUpdated={refreshProfile}
          />
        ) : tab === "events" ? (
          <FlatList
            data={events}
            keyExtractor={(item) => item.id}
            renderItem={renderEvent}
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              <View style={styles.form}>
                <TextInput
                  style={styles.input}
                  placeholder="Titre de l'événement"
                  placeholderTextColor="#9CA3AF"
                  value={title}
                  onChangeText={setTitle}
                />
                <TextInput
                  style={styles.input}
                  placeholder="2026-06-24 20:00"
                  placeholderTextColor="#9CA3AF"
                  value={date}
                  onChangeText={setDate}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Note (optionnel)"
                  placeholderTextColor="#9CA3AF"
                  value={note}
                  onChangeText={setNote}
                />
                <Pressable
                  style={[styles.button, submitting && styles.buttonDisabled]}
                  onPress={() => void handleAddEvent()}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.buttonText}>Ajouter l'événement</Text>
                  )}
                </Pressable>
              </View>
            }
            ListEmptyComponent={
              eventsLoading ? (
                <ActivityIndicator style={styles.loader} color="#1D4ED8" />
              ) : (
                <Text style={styles.emptyText}>Aucun événement</Text>
              )
            }
          />
        ) : (
          <FlatList
            data={files}
            keyExtractor={(item) => item.id}
            renderItem={renderFile}
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              <Pressable
                style={styles.button}
                onPress={() => void handleUploadFile()}
              >
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F6FA" },
  flex: { flex: 1 },
  header: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  tabRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: "#E5E7EB",
    borderRadius: 10,
    padding: 3,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  tabButtonActive: {
    backgroundColor: "#1D4ED8",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  tabTextActive: {
    color: "#FFFFFF",
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  form: {
    gap: 10,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    fontSize: 15,
    color: "#111827",
  },
  button: {
    backgroundColor: "#1D4ED8",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
    marginRight: 8,
  },
  cardDate: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
  },
  cardNote: {
    fontSize: 14,
    color: "#374151",
    marginTop: 6,
  },
  cardMeta: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  fileInfo: {
    flex: 1,
    marginRight: 8,
  },
  deleteButton: {
    fontSize: 16,
    color: "#EF4444",
    fontWeight: "700",
    paddingLeft: 8,
  },
  emptyText: {
    textAlign: "center",
    color: "#9CA3AF",
    fontSize: 15,
    marginTop: 32,
  },
  loader: {
    marginTop: 32,
  },
});
