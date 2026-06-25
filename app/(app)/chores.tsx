import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  RefreshControl,
  ScrollView,
  Alert,
  Modal,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../lib/hooks/useAuth";
import { useHousehold } from "../../lib/hooks/useHousehold";
import { useChores } from "../../lib/hooks/useChores";
import { useTheme } from "../../lib/theme";
import ChoreGrid from "../../components/ChoreGrid";
import ChoreReminderCard from "../../components/ChoreReminder";
import { EmptyState } from "../../components/EmptyState";
import { haptic } from "../../lib/haptics";
import { getContextualSuggestions } from "../../lib/chores-logic";

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export default function ChoresScreen() {
  const { profile } = useAuth();
  const { household, members } = useHousehold(profile);
  const {
    chores, tasks, reminders, loading,
    setCellIntensity, addTask, editTask, removeTask,
    toggleReminderDone, updateReminder, addReminder, toggleTaskVisibility,
    fetchAll,
  } = useChores(profile?.household_id);
  const t = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  const [filterMode, setFilterMode] = useState<"me" | "all">("all");

  // Add task modal
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [isRecurrent, setIsRecurrent] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [showInGrid, setShowInGrid] = useState(true);

  // Task action modal
  const [actionTask, setActionTask] = useState<{ id: string; name: string } | null>(null);
  const [editingName, setEditingName] = useState("");
  const [showEditInput, setShowEditInput] = useState(false);

  if (!profile || !household) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: t.background }]}>
        <Text style={[styles.emptyText, { color: t.textSecondary }]}>Rejoins une coloc pour accéder au ménage.</Text>
      </SafeAreaView>
    );
  }

  const handleAddTask = async () => {
    if (!newTaskName.trim()) return;
    void haptic.medium();
    await addTask(newTaskName.trim(), showInGrid);
    if (isRecurrent && selectedDays.length > 0) {
      const recurrence = selectedDays.join(", ");
      await addReminder(newTaskName.trim(), recurrence);
    }
    setNewTaskName("");
    setIsRecurrent(false);
    setSelectedDays([]);
    setShowInGrid(true);
    setShowAddTask(false);
  };

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleCellPress = (taskName: string, week: number, year: number) => {
    void haptic.light();
    setCellIntensity(taskName, week, year, profile.id);
  };

  const handleTaskPress = (taskId: string, taskName: string) => {
    setActionTask({ id: taskId, name: taskName });
    setEditingName(taskName);
    setShowEditInput(false);
  };

  const handleSaveEdit = async () => {
    if (!actionTask || !editingName.trim()) return;
    await editTask(actionTask.id, actionTask.name, editingName.trim());
    setActionTask(null);
  };

  const handleDeleteTask = () => {
    if (!actionTask) return;
    void haptic.warning();
    Alert.alert(
      "Supprimer",
      `Supprimer "${actionTask.name}" et ses contributions ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () => {
            removeTask(actionTask.id, actionTask.name);
            setActionTask(null);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: t.background }]} edges={["top"]}>
      <View style={[styles.header, { backgroundColor: t.card, borderBottomColor: t.cardBorder }]}>
        <Text style={[styles.headerTitle, { color: t.text }]}>Ménage</Text>
        <Pressable style={styles.headerBtn} onPress={() => setShowAddTask(true)}>
          <Ionicons name="add" size={24} color={t.accent} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.accent} colors={[t.accent]} />}>

        {/* Contextual suggestions */}
        {(() => {
          const sug = getContextualSuggestions(chores, tasks);
          if (sug.length === 0) return null;
          return sug.map((s) => (
            <View key={s.taskName} style={[styles.suggestionCard, { backgroundColor: t.warningLight, borderColor: t.warning }]}>
              <Ionicons name="alert-circle-outline" size={18} color={t.warning} />
              <Text style={[styles.suggestionText, { color: t.text }]}>{s.message}</Text>
            </View>
          ));
        })()}

        {/* Reminders */}
        {reminders.map((r) => (
          <ChoreReminderCard
            key={r.id}
            reminder={r}
            onToggleDone={toggleReminderDone}
            onUpdateReminder={updateReminder}
          />
        ))}

        {tasks.length === 0 && reminders.length === 0 ? (
          <EmptyState
            icon="sparkles-outline"
            title="Aucune tâche"
            subtitle="Ajoute des tâches ménagères pour suivre les contributions de chacun."
            actionLabel="Ajouter une tâche"
            onAction={() => setShowAddTask(true)}
          />
        ) : (
          <>
        {/* Filter */}
        <View style={styles.filterRow}>
          <Pressable
            style={[styles.filterBtn, { backgroundColor: t.card, borderColor: t.cardBorder }, filterMode === "me" && { backgroundColor: t.accent, borderColor: t.accent }]}
            onPress={() => setFilterMode("me")}
          >
            <Text style={[styles.filterBtnText, { color: t.text }, filterMode === "me" && styles.filterBtnTextActive]}>Moi</Text>
          </Pressable>
          <Pressable
            style={[styles.filterBtn, { backgroundColor: t.card, borderColor: t.cardBorder }, filterMode === "all" && { backgroundColor: t.accent, borderColor: t.accent }]}
            onPress={() => setFilterMode("all")}
          >
            <Text style={[styles.filterBtnText, { color: t.text }, filterMode === "all" && styles.filterBtnTextActive]}>Tous</Text>
          </Pressable>
        </View>

        <ChoreGrid
          chores={chores}
          tasks={tasks}
          currentUserId={profile.id}
          members={members}
          filterMode={filterMode}
          onCellPress={handleCellPress}
          onTaskPress={handleTaskPress}
        />

        <View style={{ height: 40 }} />
          </>
        )}
      </ScrollView>

      {/* Add task modal */}
      <Modal visible={showAddTask} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: t.card }]}>
            <Text style={[styles.modalTitle, { color: t.text }]}>Nouvelle tâche</Text>
            <TextInput
              style={[styles.modalInput, { borderColor: t.inputBorder, backgroundColor: t.inputBg, color: t.text }]}
              placeholder="Nom de la tâche"
              placeholderTextColor={t.textMuted}
              value={newTaskName}
              onChangeText={setNewTaskName}
              autoFocus
            />

            <Pressable
              style={styles.checkRow}
              onPress={() => setShowInGrid(!showInGrid)}
            >
              <Ionicons
                name={showInGrid ? "checkbox" : "square-outline"}
                size={22}
                color={showInGrid ? t.accent : t.textMuted}
              />
              <Text style={[styles.checkLabel, { color: t.text }]}>Afficher dans le tableau</Text>
            </Pressable>

            <Pressable
              style={styles.checkRow}
              onPress={() => setIsRecurrent(!isRecurrent)}
            >
              <Ionicons
                name={isRecurrent ? "checkbox" : "square-outline"}
                size={22}
                color={isRecurrent ? t.accent : t.textMuted}
              />
              <Text style={[styles.checkLabel, { color: t.text }]}>Tâche récurrente (rappel)</Text>
            </Pressable>

            {isRecurrent && (
              <View style={styles.daysRow}>
                {DAYS.map((day) => (
                  <Pressable
                    key={day}
                    style={[styles.dayChip, { backgroundColor: t.separator, borderColor: t.cardBorder }, selectedDays.includes(day) && { backgroundColor: t.accent, borderColor: t.accent }]}
                    onPress={() => toggleDay(day)}
                  >
                    <Text style={[styles.dayChipText, { color: t.textSecondary }, selectedDays.includes(day) && styles.dayChipTextActive]}>
                      {day.slice(0, 3)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            <View style={styles.modalBtnRow}>
              <Pressable style={[styles.modalCancelBtn, { backgroundColor: t.separator, borderColor: t.cardBorder }]} onPress={() => { setShowAddTask(false); setNewTaskName(""); setIsRecurrent(false); setSelectedDays([]); setShowInGrid(true); }}>
                <Text style={[styles.modalCancelText, { color: t.textSecondary }]}>Annuler</Text>
              </Pressable>
              <Pressable
                style={[styles.modalSubmitBtn, { backgroundColor: t.accent }, !newTaskName.trim() && { opacity: 0.5 }]}
                onPress={() => void handleAddTask()}
                disabled={!newTaskName.trim()}
              >
                <Text style={styles.modalSubmitText}>Ajouter</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Task action modal */}
      <Modal visible={!!actionTask} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setActionTask(null)}>
          <Pressable style={[styles.modalContent, { backgroundColor: t.card }]} onPress={() => {}}>
            <Text style={[styles.modalTitle, { color: t.text }]}>{actionTask?.name}</Text>

            {showEditInput ? (
              <>
                <TextInput
                  style={[styles.modalInput, { borderColor: t.inputBorder, backgroundColor: t.inputBg, color: t.text }]}
                  value={editingName}
                  onChangeText={setEditingName}
                  autoFocus
                />
                <View style={styles.modalBtnRow}>
                  <Pressable style={[styles.modalCancelBtn, { backgroundColor: t.separator, borderColor: t.cardBorder }]} onPress={() => setShowEditInput(false)}>
                    <Text style={[styles.modalCancelText, { color: t.textSecondary }]}>Annuler</Text>
                  </Pressable>
                  <Pressable style={[styles.modalSubmitBtn, { backgroundColor: t.accent }]} onPress={() => void handleSaveEdit()}>
                    <Text style={styles.modalSubmitText}>Enregistrer</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <View style={styles.actionList}>
                <Pressable style={[styles.actionItem, { borderBottomColor: t.separator }]} onPress={() => setShowEditInput(true)}>
                  <Ionicons name="pencil-outline" size={20} color={t.accent} />
                  <Text style={[styles.actionText, { color: t.accent }]}>Renommer</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionItem, { borderBottomColor: t.separator }]}
                  onPress={() => {
                    if (!actionTask) return;
                    const task = tasks.find((tk) => tk.id === actionTask.id);
                    if (task) {
                      void toggleTaskVisibility(task.id, !task.show_in_grid);
                      setActionTask(null);
                    }
                  }}
                >
                  <Ionicons
                    name={tasks.find((tk) => tk.id === actionTask?.id)?.show_in_grid ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={t.accent}
                  />
                  <Text style={[styles.actionText, { color: t.accent }]}>
                    {tasks.find((tk) => tk.id === actionTask?.id)?.show_in_grid
                      ? "Masquer du tableau"
                      : "Afficher dans le tableau"}
                  </Text>
                </Pressable>
                <Pressable style={[styles.actionItem, { borderBottomColor: t.separator }]} onPress={handleDeleteTask}>
                  <Ionicons name="trash-outline" size={20} color={t.danger} />
                  <Text style={[styles.actionText, { color: t.danger }]}>Supprimer</Text>
                </Pressable>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {loading && (
        <View style={[styles.loadingOverlay, { backgroundColor: t.card }]}>
          <ActivityIndicator size="small" color={t.accent} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  suggestionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  suggestionText: { fontSize: 13, fontWeight: "600", flex: 1 },
  header: {
    borderBottomWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  headerBtn: { padding: 4 },
  content: { padding: 16 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  emptyText: { fontSize: 15, textAlign: "center" },

  filterRow: { flexDirection: "row", marginBottom: 12, gap: 8 },
  filterBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, alignItems: "center",
  },
  filterBtnText: { fontSize: 13, fontWeight: "600" },
  filterBtnTextActive: { color: "#FFFFFF" },

  // Modals
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF", borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 32,
  },
  modalTitle: { fontSize: 17, fontWeight: "700", color: "#111827", marginBottom: 16 },
  modalInput: {
    borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: "#111827",
    marginBottom: 12,
  },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  checkLabel: { fontSize: 14, color: "#374151" },
  daysRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 16 },
  dayChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB",
  },
  dayChipActive: { backgroundColor: "#1D4ED8", borderColor: "#1D4ED8" },
  dayChipText: { fontSize: 13, fontWeight: "500", color: "#374151" },
  dayChipTextActive: { color: "#FFFFFF" },
  modalBtnRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  modalCancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center",
    backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB",
  },
  modalCancelText: { fontWeight: "600", color: "#6B7280", fontSize: 15 },
  modalSubmitBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center",
    backgroundColor: "#1D4ED8",
  },
  modalSubmitText: { fontWeight: "600", color: "#FFFFFF", fontSize: 15 },

  actionList: { gap: 4 },
  actionItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
  },
  actionText: { fontSize: 15, fontWeight: "500", color: "#1D4ED8" },
  loadingOverlay: {
    position: "absolute",
    top: 70,
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 20,
    padding: 10,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
});
