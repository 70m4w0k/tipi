import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  RefreshControl,
  ScrollView,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Calendar, DateData, LocaleConfig } from "react-native-calendars";
import { useAuth } from "../../lib/hooks/useAuth";
import { useHousehold } from "../../lib/hooks/useHousehold";
import { useChores } from "../../lib/hooks/useChores";
import { useTheme } from "../../lib/theme";
import ChoreGrid from "../../components/ChoreGrid";
import ChoreReminderCard from "../../components/ChoreReminder";
import { EmptyState } from "../../components/EmptyState";
import { haptic } from "../../lib/haptics";
import { getContextualSuggestions } from "../../lib/chores-logic";
import { dayNameFromDate } from "../../lib/recurrence";

LocaleConfig.locales["fr"] = LocaleConfig.locales["fr"] ?? {
  monthNames: [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
  ],
  monthNamesShort: [
    "Janv.", "Févr.", "Mars", "Avr.", "Mai", "Juin",
    "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc.",
  ],
  dayNames: ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"],
  dayNamesShort: ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"],
  today: "Aujourd'hui",
};
LocaleConfig.defaultLocale = "fr";

export default function ChoresScreen() {
  const { profile } = useAuth();
  const { household, members } = useHousehold(profile);
  const {
    chores, tasks, reminders, loading,
    setCellIntensity, addTask, editTask, removeTask,
    toggleReminderDone, updateReminder, addReminder, deleteReminder, toggleTaskVisibility,
    fetchAll,
  } = useChores(profile?.household_id);
  const t = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  const [showHidden, setShowHidden] = useState(false);

  // Task create/edit modal (editingTaskId = null -> création)
  const [showAddTask, setShowAddTask] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [newTaskName, setNewTaskName] = useState("");
  const [isRecurrent, setIsRecurrent] = useState(false);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [isBiWeekly, setIsBiWeekly] = useState(false);
  const [showInGrid, setShowInGrid] = useState(true);

  // Tâches négligées (≥ 2 semaines) → message de tooltip par nom de tâche pour la grille.
  const staleMessages = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of getContextualSuggestions(chores, tasks)) map[s.taskName] = s.message;
    return map;
  }, [chores, tasks]);

  if (!profile || !household) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: t.background }]}>
        <Text style={[styles.emptyText, { color: t.textSecondary }]}>Rejoins une coloc pour accéder au ménage.</Text>
      </SafeAreaView>
    );
  }

  const resetModal = () => {
    setShowAddTask(false);
    setEditingTaskId(null);
    setNewTaskName("");
    setIsRecurrent(false);
    setStartDate(null);
    setIsBiWeekly(false);
    setShowInGrid(true);
  };

  const openCreateTask = () => {
    setEditingTaskId(null);
    setNewTaskName("");
    setIsRecurrent(false);
    setStartDate(null);
    setIsBiWeekly(false);
    setShowInGrid(true);
    setShowAddTask(true);
  };

  const currentWeekParity = () => {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const currentWeek = Math.ceil(((now.getTime() - yearStart.getTime()) / 86400000 + yearStart.getDay() + 1) / 7);
    return currentWeek % 2;
  };

  const handleSubmitTask = async () => {
    if (!newTaskName.trim()) return;
    void haptic.medium();
    const name = newTaskName.trim();
    const dayName = startDate ? dayNameFromDate(startDate) : "";
    const weekParity = isBiWeekly ? currentWeekParity() : null;

    if (editingTaskId) {
      const task = tasks.find((tk) => tk.id === editingTaskId);
      const oldName = task?.name ?? name;
      if (name !== oldName) await editTask(editingTaskId, oldName, name);
      if (task && task.show_in_grid !== showInGrid) await toggleTaskVisibility(editingTaskId, showInGrid);
      const reminder = reminders.find((r) => r.task_id === editingTaskId);
      if (isRecurrent && startDate) {
        if (reminder) await updateReminder(reminder.id, name, dayName, weekParity, startDate);
        else await addReminder(editingTaskId, name, dayName, weekParity, startDate);
      } else if (reminder) {
        await deleteReminder(reminder.id);
      }
    } else {
      const newId = await addTask(name, showInGrid);
      if (isRecurrent && startDate && newId) await addReminder(newId, name, dayName, weekParity, startDate);
    }
    resetModal();
  };

  const handleCellPress = (taskName: string, week: number, year: number) => {
    void haptic.light();
    setCellIntensity(taskName, week, year, profile.id);
  };

  // Ouvre le formulaire en mode édition, pré-rempli depuis la tâche + son rappel.
  const handleTaskPress = (taskId: string, taskName: string) => {
    const task = tasks.find((tk) => tk.id === taskId);
    const reminder = reminders.find((r) => r.task_id === taskId);
    setEditingTaskId(taskId);
    setNewTaskName(taskName);
    setShowInGrid(task?.show_in_grid ?? true);
    setIsRecurrent(!!reminder);
    setStartDate(reminder?.start_date ?? null);
    setIsBiWeekly(reminder?.week_parity != null);
    setShowAddTask(true);
  };

  const handleDeleteTask = () => {
    if (!editingTaskId) return;
    void haptic.warning();
    const task = tasks.find((tk) => tk.id === editingTaskId);
    const name = task?.name ?? newTaskName.trim();
    // Le rappel lié est supprimé en cascade (FK task_id ON DELETE CASCADE).
    void removeTask(editingTaskId, name);
    resetModal();
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: t.background }]} edges={["top"]}>
      <View style={[styles.header, { backgroundColor: t.card, borderBottomColor: t.cardBorder }]}>
        <Text style={[styles.headerTitle, { color: t.text }]}>Ménage</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.accent} colors={[t.accent]} />}>

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
            onAction={openCreateTask}
          />
        ) : (
          <>
        <ChoreGrid
          chores={chores}
          tasks={tasks}
          currentUserId={profile.id}
          members={members}
          filterMode={"all"}
          showHidden={showHidden}
          staleMessages={staleMessages}
          onCellPress={handleCellPress}
          onTaskPress={handleTaskPress}
        />

        {tasks.some((tk) => !tk.show_in_grid) && (
          <Pressable
            style={[styles.toggleHiddenBtn, { backgroundColor: t.separator, borderColor: t.cardBorder }]}
            onPress={() => setShowHidden(!showHidden)}
          >
            <Ionicons name={showHidden ? "eye-off-outline" : "eye-outline"} size={16} color={t.textSecondary} />
            <Text style={[styles.toggleHiddenText, { color: t.textSecondary }]}>
              {showHidden ? "Masquer les tâches cachées" : `Afficher ${tasks.filter((tk) => !tk.show_in_grid).length} tâche(s) cachée(s)`}
            </Text>
          </Pressable>
        )}

        <View style={{ height: 100 }} />
          </>
        )}
      </ScrollView>

      {/* Add task modal */}
      <Modal visible={showAddTask} transparent animationType="slide">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Pressable style={styles.modalOverlay} onPress={resetModal}>
          <Pressable style={[styles.modalContent, { backgroundColor: t.card }]} onPress={() => {}}>
            <ScrollView bounces={false} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[styles.modalTitle, { color: t.text }]}>
                {editingTaskId ? "Modifier la tâche" : "Nouvelle tâche"}
              </Text>
              <TextInput
                style={[styles.modalInput, { borderColor: t.inputBorder, backgroundColor: t.inputBg, color: t.text }]}
                placeholder="Nom de la tâche"
                placeholderTextColor={t.textMuted}
                value={newTaskName}
                onChangeText={setNewTaskName}
                autoFocus={!editingTaskId}
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
                <>
                  <Text style={[styles.calendarLabel, { color: t.textSecondary }]}>
                    Choisir la date de début :
                  </Text>
                  <View style={[styles.calendarWrap, { borderColor: t.cardBorder }]}>
                    <Calendar
                      minDate={todayStr}
                      onDayPress={(day: DateData) => setStartDate(day.dateString)}
                      markedDates={startDate ? { [startDate]: { selected: true, selectedColor: t.accent } } : {}}
                      theme={{
                        backgroundColor: t.card,
                        calendarBackground: t.card,
                        textSectionTitleColor: t.textSecondary,
                        selectedDayBackgroundColor: t.accent,
                        selectedDayTextColor: "#FFFFFF",
                        todayTextColor: t.accent,
                        dayTextColor: t.text,
                        textDisabledColor: t.textMuted,
                        monthTextColor: t.text,
                        arrowColor: t.accent,
                      }}
                    />
                  </View>
                  {startDate && (
                    <Text style={[styles.selectedDateInfo, { color: t.accent }]}>
                      {isBiWeekly ? "Un " : "Chaque "}
                      {dayNameFromDate(startDate).toLowerCase()}
                      {isBiWeekly ? " sur deux" : ""} à partir du{" "}
                      {new Date(startDate + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
                    </Text>
                  )}
                  <Pressable
                    style={styles.checkRow}
                    onPress={() => setIsBiWeekly(!isBiWeekly)}
                  >
                    <Ionicons
                      name={isBiWeekly ? "checkbox" : "square-outline"}
                      size={22}
                      color={isBiWeekly ? t.accent : t.textMuted}
                    />
                    <Text style={[styles.checkLabel, { color: t.text }]}>Une semaine sur deux</Text>
                  </Pressable>
                </>
              )}

              <View style={styles.modalBtnRow}>
                <Pressable style={[styles.modalCancelBtn, { backgroundColor: t.separator, borderColor: t.cardBorder }]} onPress={resetModal}>
                  <Text style={[styles.modalCancelText, { color: t.textSecondary }]}>Annuler</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalSubmitBtn, { backgroundColor: t.accent }, (!newTaskName.trim() || (isRecurrent && !startDate)) && { opacity: 0.5 }]}
                  onPress={() => void handleSubmitTask()}
                  disabled={!newTaskName.trim() || (isRecurrent && !startDate)}
                >
                  <Text style={styles.modalSubmitText}>{editingTaskId ? "Enregistrer" : "Ajouter"}</Text>
                </Pressable>
              </View>

              {editingTaskId && (
                <Pressable style={styles.deleteTaskBtn} onPress={handleDeleteTask}>
                  <Ionicons name="trash-outline" size={18} color={t.danger} />
                  <Text style={[styles.deleteTaskText, { color: t.danger }]}>Supprimer la tâche</Text>
                </Pressable>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* FAB — Ajouter une tâche */}
      <Pressable
        testID="chores-fab"
        style={[styles.fab, { backgroundColor: t.accent }]}
        onPress={openCreateTask}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </Pressable>

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
  header: {
    borderBottomWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
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
  content: { padding: 16 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  emptyText: { fontSize: 15, textAlign: "center" },
  toggleHiddenBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, marginTop: 12, paddingVertical: 10, borderRadius: 8,
    borderWidth: 1,
  },
  toggleHiddenText: { fontSize: 13, fontWeight: "500" },

  // Modals
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 32, maxHeight: "85%",
  },
  modalTitle: { fontSize: 17, fontWeight: "700", marginBottom: 16 },
  modalInput: {
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    marginBottom: 12,
  },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  checkLabel: { fontSize: 14 },
  calendarLabel: { fontSize: 13, fontWeight: "600", marginBottom: 8 },
  calendarWrap: { borderWidth: 1, borderRadius: 10, overflow: "hidden", marginBottom: 10 },
  selectedDateInfo: { fontSize: 13, fontWeight: "600", marginBottom: 12 },
  modalBtnRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  modalCancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center",
    borderWidth: 1,
  },
  modalCancelText: { fontWeight: "600", fontSize: 15 },
  modalSubmitBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center",
  },
  modalSubmitText: { fontWeight: "600", color: "#FFFFFF", fontSize: 15 },
  deleteTaskBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, marginTop: 12, paddingVertical: 10,
  },
  deleteTaskText: { fontSize: 14, fontWeight: "600" },
  loadingOverlay: {
    position: "absolute",
    top: 70,
    alignSelf: "center",
    borderRadius: 20,
    padding: 10,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
});
