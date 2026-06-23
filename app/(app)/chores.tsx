import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useAuth } from "../../lib/hooks/useAuth";
import { useHousehold } from "../../lib/hooks/useHousehold";
import { useChores } from "../../lib/hooks/useChores";
import ChoreGrid from "../../components/ChoreGrid";
import ChoreReminderCard from "../../components/ChoreReminder";

export default function ChoresScreen() {
  const { profile } = useAuth();
  const { household, members } = useHousehold(profile);
  const {
    chores,
    tasks,
    reminders,
    loading,
    setCellIntensity,
    addTask,
    editTask,
    removeTask,
    toggleReminderDone,
    updateReminder,
  } = useChores(profile?.household_id);

  const [newTaskName, setNewTaskName] = useState("");
  const [filterMode, setFilterMode] = useState<"me" | "all">("all");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskName, setEditingTaskName] = useState("");

  if (!profile || !household) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>
          Rejoignez un foyer pour acceder au menage.
        </Text>
      </View>
    );
  }

  const handleAddTask = async () => {
    if (!newTaskName.trim()) return;
    await addTask(newTaskName);
    setNewTaskName("");
  };

  const handleCellPress = (taskName: string, week: number, year: number) => {
    setCellIntensity(taskName, week, year, profile.id);
  };

  const handleStartEdit = (taskId: string, currentName: string) => {
    setEditingTaskId(taskId);
    setEditingTaskName(currentName);
  };

  const handleSaveEdit = async (taskId: string, oldName: string) => {
    if (!editingTaskName.trim()) return;
    await editTask(taskId, oldName, editingTaskName);
    setEditingTaskId(null);
    setEditingTaskName("");
  };

  const handleDeleteTask = (taskId: string, taskName: string) => {
    Alert.alert(
      "Supprimer la tache",
      `Supprimer "${taskName}" et toutes ses contributions ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () => removeTask(taskId, taskName),
        },
      ]
    );
  };

  const firstReminder = reminders.length > 0 ? reminders[0] : null;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Menage</Text>

      {loading && (
        <ActivityIndicator
          size="small"
          color="#1D4ED8"
          style={{ marginBottom: 12 }}
        />
      )}

      {/* Reminder card */}
      <ChoreReminderCard
        reminder={firstReminder}
        onToggleDone={toggleReminderDone}
        onUpdateReminder={updateReminder}
      />

      {/* Add task */}
      <View style={styles.addRow}>
        <TextInput
          style={styles.addInput}
          value={newTaskName}
          onChangeText={setNewTaskName}
          placeholder="Nouvelle tache menage"
          placeholderTextColor="#9CA3AF"
          onSubmitEditing={handleAddTask}
          returnKeyType="done"
        />
        <TouchableOpacity
          style={[
            styles.addBtn,
            !newTaskName.trim() && styles.addBtnDisabled,
          ]}
          onPress={handleAddTask}
          activeOpacity={0.7}
          disabled={!newTaskName.trim()}
        >
          <Text style={styles.addBtnText}>Ajouter tache</Text>
        </TouchableOpacity>
      </View>

      {/* Filter toggle */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[
            styles.filterBtn,
            filterMode === "me" && styles.filterBtnActive,
          ]}
          onPress={() => setFilterMode("me")}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.filterBtnText,
              filterMode === "me" && styles.filterBtnTextActive,
            ]}
          >
            Moi
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterBtn,
            filterMode === "all" && styles.filterBtnActive,
          ]}
          onPress={() => setFilterMode("all")}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.filterBtnText,
              filterMode === "all" && styles.filterBtnTextActive,
            ]}
          >
            Tous
          </Text>
        </TouchableOpacity>
      </View>

      {/* Chore grid */}
      <ChoreGrid
        chores={chores}
        tasks={tasks}
        currentUserId={profile.id}
        members={members}
        filterMode={filterMode}
        onCellPress={handleCellPress}
      />

      {/* Task list (edit/delete) */}
      {tasks.length > 0 && (
        <View style={styles.taskListSection}>
          <Text style={styles.sectionTitle}>Gerer les taches</Text>
          {tasks.map((task) => (
            <View key={task.id} style={styles.taskListRow}>
              {editingTaskId === task.id ? (
                <View style={styles.taskEditRow}>
                  <TextInput
                    style={styles.taskEditInput}
                    value={editingTaskName}
                    onChangeText={setEditingTaskName}
                    autoFocus
                    onSubmitEditing={() => handleSaveEdit(task.id, task.name)}
                    returnKeyType="done"
                  />
                  <TouchableOpacity
                    style={styles.taskEditSaveBtn}
                    onPress={() => handleSaveEdit(task.id, task.name)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.taskEditSaveBtnText}>OK</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setEditingTaskId(null)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.taskCancelText}>Annuler</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={styles.taskListName} numberOfLines={1}>
                    {task.name}
                  </Text>
                  <View style={styles.taskActions}>
                    <TouchableOpacity
                      onPress={() => handleStartEdit(task.id, task.name)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.taskEditText}>Modifier</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteTask(task.id, task.name)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.taskDeleteText}>Supprimer</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Legend */}
      <View style={styles.legendSection}>
        <Text style={styles.sectionTitle}>Legende</Text>

        {/* User colors */}
        <View style={styles.legendRow}>
          {members.map((m) => (
            <View key={m.id} style={styles.legendItem}>
              <View
                style={[styles.legendSwatch, { backgroundColor: m.color }]}
              />
              <Text style={styles.legendLabel} numberOfLines={1}>
                {m.display_name}
              </Text>
            </View>
          ))}
        </View>

        {/* Intensity levels */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendSwatch,
                { backgroundColor: "#1D4ED8", opacity: 0.35 },
              ]}
            />
            <Text style={styles.legendLabel}>Leger</Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendSwatch,
                { backgroundColor: "#1D4ED8", opacity: 0.65 },
              ]}
            />
            <Text style={styles.legendLabel}>Moyen</Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendSwatch,
                { backgroundColor: "#1D4ED8", opacity: 1.0 },
              ]}
            />
            <Text style={styles.legendLabel}>Intense</Text>
          </View>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F4F6FA",
  },
  content: {
    padding: 16,
    paddingTop: 60,
  },
  centered: {
    flex: 1,
    backgroundColor: "#F4F6FA",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
  },

  // Add task
  addRow: {
    flexDirection: "row",
    marginBottom: 14,
    gap: 8,
  },
  addInput: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1F2937",
  },
  addBtn: {
    backgroundColor: "#1D4ED8",
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  addBtnDisabled: {
    opacity: 0.5,
  },
  addBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },

  // Filter
  filterRow: {
    flexDirection: "row",
    marginBottom: 14,
    gap: 8,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  filterBtnActive: {
    backgroundColor: "#1D4ED8",
    borderColor: "#1D4ED8",
  },
  filterBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  filterBtnTextActive: {
    color: "#FFFFFF",
  },

  // Task list management
  taskListSection: {
    marginTop: 20,
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 10,
  },
  taskListRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  taskListName: {
    flex: 1,
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "500",
  },
  taskActions: {
    flexDirection: "row",
    gap: 14,
  },
  taskEditText: {
    fontSize: 13,
    color: "#1D4ED8",
    fontWeight: "500",
  },
  taskDeleteText: {
    fontSize: 13,
    color: "#DC2626",
    fontWeight: "500",
  },
  taskEditRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  taskEditInput: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: "#1F2937",
  },
  taskEditSaveBtn: {
    backgroundColor: "#1D4ED8",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  taskEditSaveBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  taskCancelText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },

  // Legend
  legendSection: {
    marginTop: 20,
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 10,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendSwatch: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
});
