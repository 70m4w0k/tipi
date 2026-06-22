import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { ChatScreen } from "./ChatScreen";
import { ExpensesScreen } from "./ExpensesScreen";
import { Expense, Chore, HouseEvent, SharedFile, AppData } from "./types";

type MainTab = "chat" | "expenses" | "chores" | "other";
type OtherTab = "events" | "files";

const STORAGE_KEY = "coloc-app-v1";
const ROOMMATES = ["Thomas", "Camille", "Youssef"];

export default function App() {
  const [ready, setReady] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState<MainTab>("chat");
  const [activeOtherTab, setActiveOtherTab] = useState<OtherTab>("events");
  const [currentUser, setCurrentUser] = useState(ROOMMATES[0]);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [chores, setChores] = useState<Chore[]>([]);
  const [events, setEvents] = useState<HouseEvent[]>([]);
  const [files, setFiles] = useState<SharedFile[]>([]);

  const [choreTitle, setChoreTitle] = useState("");
  const [choreDueAt, setChoreDueAt] = useState("");
  const [choreAssignee, setChoreAssignee] = useState(ROOMMATES[0]);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventNote, setEventNote] = useState("");

  useEffect(() => {
    const hydrate = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const data = JSON.parse(raw) as AppData;
          setExpenses(data.expenses ?? []);
          setChores(data.chores ?? []);
          setEvents(data.events ?? []);
          setFiles(data.files ?? []);
        }
      } finally {
        setReady(true);
      }
    };
    void hydrate();
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }
    const data: AppData = {
      messages: [], // Messages gérés par le serveur
      expenses,
      chores,
      events,
      files,
    };
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [ready, expenses, chores, events, files]);


  const addChore = () => {
    if (!choreTitle.trim() || !choreDueAt.trim()) {
      Alert.alert("Tache invalide", "Ajoute un titre et une date.");
      return;
    }
    const item: Chore = {
      id: `${Date.now()}`,
      title: choreTitle.trim(),
      dueAt: choreDueAt.trim(),
      assignee: choreAssignee,
      done: false,
    };
    setChores((prev) => [item, ...prev]);
    setChoreTitle("");
    setChoreDueAt("");
  };

  const addEvent = () => {
    if (!eventTitle.trim() || !eventDate.trim()) {
      Alert.alert("Evenement invalide", "Ajoute un titre et une date.");
      return;
    }
    const item: HouseEvent = {
      id: `${Date.now()}`,
      title: eventTitle.trim(),
      date: eventDate.trim(),
      note: eventNote.trim(),
    };
    setEvents((prev) => [item, ...prev]);
    setEventTitle("");
    setEventDate("");
    setEventNote("");
  };

  const addSharedFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
      });
      if (result.canceled || result.assets.length === 0) {
        return;
      }
      const picked = result.assets[0];
      const folder = `${FileSystem.documentDirectory ?? ""}shared`;
      await FileSystem.makeDirectoryAsync(folder, { intermediates: true });
      const safeName = (picked.name ?? "document").replace(/[^\w.-]+/g, "_");
      const destination = `${folder}/${Date.now()}-${safeName}`;
      await FileSystem.copyAsync({ from: picked.uri, to: destination });
      const item: SharedFile = {
        id: `${Date.now()}`,
        name: picked.name ?? safeName,
        uri: destination,
        uploadedBy: currentUser,
        uploadedAt: new Date().toISOString(),
      };
      setFiles((prev) => [item, ...prev]);
    } catch {
      Alert.alert("Erreur", "Le fichier n'a pas pu etre enregistre.");
    }
  };

  if (!ready) {
    return (
      <SafeAreaProvider>
        <View style={styles.loader}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Maison Coloc</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.userRow}
            >
              {ROOMMATES.map((member) => (
                <Pressable
                  key={member}
                  style={[
                    styles.chip,
                    currentUser === member && styles.chipActive,
                  ]}
                  onPress={() => setCurrentUser(member)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      currentUser === member && styles.chipTextActive,
                    ]}
                  >
                    {member}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentInner}
          >
            {activeMainTab === "chat" && (
              <ChatScreen currentUser={currentUser} />
            )}

            {activeMainTab === "expenses" && (
              <ExpensesScreen
                expenses={expenses}
                setExpenses={setExpenses}
                currentUser={currentUser}
                roommates={ROOMMATES}
              />
            )}

            {activeMainTab === "chores" && (
              <View style={styles.panel}>
                <Text style={styles.panelTitle}>Taches menageres</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Salle de bain"
                  value={choreTitle}
                  onChangeText={setChoreTitle}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Date/heure (ex: 2026-06-23 18:00)"
                  value={choreDueAt}
                  onChangeText={setChoreDueAt}
                />
                <View style={styles.wrapRow}>
                  {ROOMMATES.map((member) => (
                    <Pressable
                      key={member}
                      style={[
                        styles.chip,
                        choreAssignee === member && styles.chipActive,
                      ]}
                      onPress={() => setChoreAssignee(member)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          choreAssignee === member && styles.chipTextActive,
                        ]}
                      >
                        {member}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Pressable style={styles.fullButton} onPress={addChore}>
                  <Text style={styles.actionButtonText}>Ajouter la tache</Text>
                </Pressable>
                {chores.map((chore) => (
                  <Pressable
                    key={chore.id}
                    style={styles.card}
                    onPress={() =>
                      setChores((prev) =>
                        prev.map((item) =>
                          item.id === chore.id
                            ? { ...item, done: !item.done }
                            : item,
                        ),
                      )
                    }
                  >
                    <Text style={styles.cardTitle}>
                      {chore.done ? "✓ Terminee" : "⏱ A faire"} - {chore.title}
                    </Text>
                    <Text>
                      {chore.assignee} - {chore.dueAt}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {activeMainTab === "other" && activeOtherTab === "events" && (
              <View style={styles.panel}>
                <Text style={styles.panelTitle}>Calendrier d'evenements</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Sortir les poubelles"
                  value={eventTitle}
                  onChangeText={setEventTitle}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Date/heure (ex: 2026-06-24 20:00)"
                  value={eventDate}
                  onChangeText={setEventDate}
                />
                <TextInput
                  style={[styles.input, styles.multilineInput]}
                  placeholder="Note optionnelle"
                  value={eventNote}
                  onChangeText={setEventNote}
                  multiline
                />
                <Pressable style={styles.fullButton} onPress={addEvent}>
                  <Text style={styles.actionButtonText}>
                    Ajouter l'evenement
                  </Text>
                </Pressable>
                {events.map((event) => (
                  <View key={event.id} style={styles.card}>
                    <Text style={styles.cardTitle}>{event.title}</Text>
                    <Text>{event.date}</Text>
                    {event.note ? <Text>{event.note}</Text> : null}
                  </View>
                ))}
              </View>
            )}

            {activeMainTab === "other" && activeOtherTab === "files" && (
              <View style={styles.panel}>
                <Text style={styles.panelTitle}>Documents partages</Text>
                <Pressable
                  style={styles.fullButton}
                  onPress={() => void addSharedFile()}
                >
                  <Text style={styles.actionButtonText}>
                    Importer un document
                  </Text>
                </Pressable>
                {files.length === 0 ? (
                  <Text style={styles.empty}>Aucun document partage.</Text>
                ) : (
                  files.map((file) => (
                    <Pressable
                      key={file.id}
                      style={styles.card}
                      onPress={() => void Linking.openURL(file.uri)}
                    >
                      <Text style={styles.cardTitle}>{file.name}</Text>
                      <Text>
                        Ajoute par {file.uploadedBy} -{" "}
                        {formatDate(file.uploadedAt)}
                      </Text>
                    </Pressable>
                  ))
                )}
              </View>
            )}
          </ScrollView>

          {activeMainTab === "other" && (
            <View style={styles.subTabRow}>
              <Pressable
                style={[
                  styles.subTab,
                  activeOtherTab === "events" && styles.subTabActive,
                ]}
                onPress={() => setActiveOtherTab("events")}
              >
                <Text
                  style={[
                    styles.subTabText,
                    activeOtherTab === "events" && styles.subTabTextActive,
                  ]}
                >
                  Evenements
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.subTab,
                  activeOtherTab === "files" && styles.subTabActive,
                ]}
                onPress={() => setActiveOtherTab("files")}
              >
                <Text
                  style={[
                    styles.subTabText,
                    activeOtherTab === "files" && styles.subTabTextActive,
                  ]}
                >
                  Documents
                </Text>
              </Pressable>
            </View>
          )}

          <View style={styles.bottomTabBar}>
            <BottomTabButton
              label="Discussions"
              active={activeMainTab === "chat"}
              onPress={() => setActiveMainTab("chat")}
            />
            <BottomTabButton
              label="Depenses"
              active={activeMainTab === "expenses"}
              onPress={() => setActiveMainTab("expenses")}
            />
            <BottomTabButton
              label="Menage"
              active={activeMainTab === "chores"}
              onPress={() => setActiveMainTab("chores")}
            />
            <BottomTabButton
              label="Autres"
              active={activeMainTab === "other"}
              onPress={() => setActiveMainTab("other")}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function BottomTabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.bottomTab, active && styles.bottomTabActive]}
      onPress={onPress}
    >
      <Text
        style={[styles.bottomTabText, active && styles.bottomTabTextActive]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("fr-FR");
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F4F6FA" },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  flex: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 26, fontWeight: "700", marginBottom: 8, color: "#1F2937" },
  userRow: { gap: 8, paddingBottom: 4 },
  content: { flex: 1 },
  contentInner: { padding: 16, paddingBottom: 30 },
  panel: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  panelTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
  },
  multilineInput: { minHeight: 80, textAlignVertical: "top" },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  wrapRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: "#9CA3AF",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipActive: { backgroundColor: "#111827", borderColor: "#111827" },
  chipText: { color: "#374151", fontWeight: "600" },
  chipTextActive: { color: "#FFFFFF" },
  actionButton: {
    backgroundColor: "#1D4ED8",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  fullButton: {
    backgroundColor: "#1D4ED8",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  actionButtonText: { color: "#FFFFFF", fontWeight: "700" },
  card: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 10,
    gap: 4,
    backgroundColor: "#FAFAFA",
  },
  cardTitle: { fontWeight: "700", color: "#111827" },
  label: { marginTop: 6, fontWeight: "600", color: "#374151" },
  empty: { color: "#6B7280" },
  subTabRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  subTab: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
  },
  subTabActive: { backgroundColor: "#1D4ED8" },
  subTabText: { color: "#374151", fontWeight: "600", fontSize: 13 },
  subTabTextActive: { color: "#FFFFFF" },
  bottomTabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  bottomTab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomTabActive: { borderBottomWidth: 3, borderBottomColor: "#1D4ED8" },
  bottomTabText: { color: "#6B7280", fontWeight: "600", fontSize: 11 },
  bottomTabTextActive: { color: "#1D4ED8", fontWeight: "700" },
});
