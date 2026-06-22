import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Chore, ChoreReminder, ChoreTask } from "./types";

type FilterMode = "me" | "all";

type WeekRef = {
  week: number;
  year: number;
  mondayDate: string;
  label: string;
};

const DEFAULT_TASK_NAMES = [
  "Plan de travail",
  "Sol cuisine",
  "Plaques + evier",
  "Frigo",
  "Poubelles",
  "Salle de bain",
  "Toilettes",
];

const TASK_COL_WIDTH = 190;
const WEEK_COL_WIDTH = 66;
const USER_COLOR_PALETTE = ["#2563EB", "#F97316", "#16A34A", "#9333EA", "#EF4444", "#0D9488"];

export function ChoresScreen({
  chores,
  setChores,
  choreTasks,
  setChoreTasks,
  choreReminder,
  setChoreReminder,
  currentUser,
  roommates,
}: {
  chores: Chore[];
  setChores: React.Dispatch<React.SetStateAction<Chore[]>>;
  choreTasks: ChoreTask[];
  setChoreTasks: React.Dispatch<React.SetStateAction<ChoreTask[]>>;
  choreReminder: ChoreReminder;
  setChoreReminder: React.Dispatch<React.SetStateAction<ChoreReminder>>;
  currentUser: string;
  roommates: string[];
}) {
  const [filterMode, setFilterMode] = useState<FilterMode>("me");
  const [newTaskName, setNewTaskName] = useState("");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskName, setEditingTaskName] = useState("");
  const [editingReminder, setEditingReminder] = useState(false);
  const [reminderTitleDraft, setReminderTitleDraft] = useState(choreReminder.title);
  const [reminderRecurrenceDraft, setReminderRecurrenceDraft] = useState(choreReminder.recurrence);

  const gridScrollRef = useRef<ScrollView | null>(null);
  const didAutoScrollRef = useRef(false);

  const normalizedChores = useMemo(() => normalizeLegacyChores(chores), [chores]);

  const tasks = useMemo(() => {
    if (choreTasks.length > 0) {
      return choreTasks;
    }

    const fromExisting = Array.from(new Set(normalizedChores.map((item) => item.taskName)));
    const seed = fromExisting.length > 0 ? fromExisting : DEFAULT_TASK_NAMES;
    return seed.map((name, index) => ({
      id: `seed-${index}-${name}`,
      name,
      createdAt: new Date().toISOString(),
    }));
  }, [choreTasks, normalizedChores]);

  const weeks = useMemo(() => buildWeeksFromFirstEntry(normalizedChores), [normalizedChores]);

  const currentWeekIndex = useMemo(() => {
    const nowWeek = getISOWeekYear(new Date());
    return weeks.findIndex((w) => w.week === nowWeek.week && w.year === nowWeek.year);
  }, [weeks]);

  useEffect(() => {
    if (didAutoScrollRef.current) {
      return;
    }
    if (currentWeekIndex < 0) {
      return;
    }

    const x = TASK_COL_WIDTH + Math.max(0, currentWeekIndex - 1) * WEEK_COL_WIDTH;
    const timer = setTimeout(() => {
      gridScrollRef.current?.scrollTo({ x, y: 0, animated: false });
      didAutoScrollRef.current = true;
    }, 40);

    return () => clearTimeout(timer);
  }, [currentWeekIndex]);

  const visibleChores = useMemo(() => {
    if (filterMode === "all") {
      return normalizedChores;
    }
    return normalizedChores.filter((item) => item.user === currentUser);
  }, [normalizedChores, filterMode, currentUser]);

  const dueToday = recurrenceMatchesToday(choreReminder.recurrence);
  const doneToday = choreReminder.lastDoneDate === todayKey();

  const usersForSegments = filterMode === "all" ? roommates : [currentUser];

  const toggleReminderDone = () => {
    setChoreReminder((prev) => ({
      ...prev,
      lastDoneDate: prev.lastDoneDate === todayKey() ? "" : todayKey(),
    }));
  };

  const saveReminder = () => {
    const title = reminderTitleDraft.trim();
    const recurrence = reminderRecurrenceDraft.trim();
    if (!title || !recurrence) {
      Alert.alert("Rappel invalide", "Le texte et la recurrence sont obligatoires.");
      return;
    }
    setChoreReminder({
      ...choreReminder,
      title,
      recurrence,
    });
    setEditingReminder(false);
  };

  const addTask = () => {
    const name = newTaskName.trim();
    if (!name) {
      return;
    }
    const alreadyExists = tasks.some((task) => task.name.toLowerCase() === name.toLowerCase());
    if (alreadyExists) {
      Alert.alert("Tache existante", "Cette tache existe deja.");
      return;
    }

    const item: ChoreTask = {
      id: `${Date.now()}-${Math.random()}`,
      name,
      createdAt: new Date().toISOString(),
    };
    setChoreTasks((prev) => [...prev, item]);
    setNewTaskName("");
  };

  const startEditTask = (task: ChoreTask) => {
    setEditingTaskId(task.id);
    setEditingTaskName(task.name);
  };

  const saveEditTask = () => {
    if (!editingTaskId) return;

    const newName = editingTaskName.trim();
    if (!newName) {
      Alert.alert("Nom invalide", "Le nom de la tache ne peut pas etre vide.");
      return;
    }

    const oldTask = tasks.find((t) => t.id === editingTaskId);
    if (!oldTask) {
      setEditingTaskId(null);
      return;
    }

    setChoreTasks((prev) =>
      prev.map((task) => (task.id === editingTaskId ? { ...task, name: newName } : task)),
    );

    setChores((prev) => {
      const mapped = normalizeLegacyChores(prev);
      return mapped.map((entry) =>
        entry.taskName === oldTask.name ? { ...entry, taskName: newName } : entry,
      );
    });

    setEditingTaskId(null);
    setEditingTaskName("");
  };

  const removeTask = (task: ChoreTask) => {
    Alert.alert(
      "Supprimer la tache",
      `Supprimer \"${task.name}\" et tout son historique ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () => {
            setChoreTasks((prev) => prev.filter((t) => t.id !== task.id));
            setChores((prev) => normalizeLegacyChores(prev).filter((entry) => entry.taskName !== task.name));
          },
        },
      ],
    );
  };

  const setCellIntensity = (taskName: string, targetWeek: WeekRef) => {
    setChores((prev) => {
      const mapped = normalizeLegacyChores(prev);
      const index = mapped.findIndex(
        (item) =>
          item.user === currentUser &&
          item.taskName === taskName &&
          item.week === targetWeek.week &&
          item.year === targetWeek.year,
      );

      if (index === -1) {
        return [
          ...mapped,
          {
            id: `${Date.now()}-${Math.random()}`,
            taskName,
            week: targetWeek.week,
            year: targetWeek.year,
            user: currentUser,
            intensity: 1,
            performedAt: targetWeek.mondayDate,
          },
        ];
      }

      const current = mapped[index];
      const nextIntensity = ((current.intensity + 1) % 4) as 0 | 1 | 2 | 3;
      if (nextIntensity === 0) {
        return mapped.filter((_, i) => i !== index);
      }

      return mapped.map((item, i) =>
        i === index
          ? { ...item, intensity: nextIntensity, performedAt: targetWeek.mondayDate }
          : item,
      );
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.todoCard}>
        <Text style={styles.todoTitle}>A faire aujourd'hui</Text>
        {dueToday ? (
          <>
            <Text style={styles.todoTask}>{choreReminder.title}</Text>
            <Text style={styles.todoMeta}>Recurrence: {choreReminder.recurrence}</Text>
            <Pressable style={[styles.todoButton, doneToday && styles.todoButtonDone]} onPress={toggleReminderDone}>
              <Text style={styles.todoButtonText}>{doneToday ? "Fait" : "Marquer fait"}</Text>
            </Pressable>
          </>
        ) : (
          <Text style={styles.todoMeta}>Rien a faire</Text>
        )}

        <Pressable
          style={[styles.todoButton, styles.todoButtonSecondary]}
          onPress={() => {
            setReminderTitleDraft(choreReminder.title);
            setReminderRecurrenceDraft(choreReminder.recurrence);
            setEditingReminder((prev) => !prev);
          }}
        >
          <Text style={styles.todoButtonText}>Modifier rappel</Text>
        </Pressable>

        {editingReminder && (
          <View style={styles.reminderEditor}>
            <TextInput
              style={styles.input}
              value={reminderTitleDraft}
              onChangeText={setReminderTitleDraft}
              placeholder="Texte du rappel"
            />
            <TextInput
              style={styles.input}
              value={reminderRecurrenceDraft}
              onChangeText={setReminderRecurrenceDraft}
              placeholder="Recurrence (ex: tous les mardis)"
            />
            <View style={styles.inlineActions}>
              <Pressable style={styles.smallBtn} onPress={saveReminder}>
                <Text style={styles.smallBtnText}>Enregistrer</Text>
              </Pressable>
              <Pressable style={[styles.smallBtn, styles.smallBtnMuted]} onPress={() => setEditingReminder(false)}>
                <Text style={styles.smallBtnText}>Annuler</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      <View style={styles.addTaskRow}>
        <TextInput
          style={[styles.input, styles.flex]}
          value={newTaskName}
          onChangeText={setNewTaskName}
          placeholder="Nouvelle tache menage"
        />
        <Pressable style={styles.addBtn} onPress={addTask}>
          <Text style={styles.addBtnText}>Ajouter tache</Text>
        </Pressable>
      </View>

      <View style={styles.filterRow}>
        <FilterButton label="Moi" active={filterMode === "me"} onPress={() => setFilterMode("me")} />
        <FilterButton label="Tous" active={filterMode === "all"} onPress={() => setFilterMode("all")} />
      </View>

      <ScrollView ref={gridScrollRef} horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={styles.headerRow}>
            <Cell style={[styles.taskHeader, styles.headerCell]}>
              <Text style={styles.headerText}>Tache / Semaine</Text>
            </Cell>
            {weeks.map((weekRef) => (
              <Cell key={weekRef.mondayDate} style={styles.headerCell}>
                <Text style={styles.headerText}>{weekRef.label}</Text>
              </Cell>
            ))}
          </View>

          {tasks.map((task) => (
            <View key={task.id} style={styles.gridRow}>
              <Cell style={styles.taskHeader}>
                {editingTaskId === task.id ? (
                  <View style={styles.taskEditRow}>
                    <TextInput style={styles.taskEditInput} value={editingTaskName} onChangeText={setEditingTaskName} />
                    <Pressable onPress={saveEditTask}>
                      <Text style={styles.iconBtn}>Save</Text>
                    </Pressable>
                    <Pressable onPress={() => setEditingTaskId(null)}>
                      <Text style={styles.iconBtn}>Cancel</Text>
                    </Pressable>
                  </View>
                ) : (
                  <>
                    <View style={styles.taskTitleRow}>
                      <Text style={styles.taskText}>{task.name}</Text>
                      <View style={styles.taskActionsInline}>
                        <Pressable onPress={() => startEditTask(task)}>
                          <Text style={styles.iconBtn}>Edit</Text>
                        </Pressable>
                        <Pressable onPress={() => removeTask(task)}>
                          <Text style={styles.iconBtn}>Del</Text>
                        </Pressable>
                      </View>
                    </View>
                    <Text style={styles.taskHint}>{lastForTaskLabel(task.name, normalizedChores, currentUser)}</Text>
                  </>
                )}
              </Cell>
              {weeks.map((weekRef) => {
                return (
                  <Pressable
                    key={`${task.id}-${weekRef.mondayDate}`}
                    style={styles.gridCell}
                    onPress={() => setCellIntensity(task.name, weekRef)}
                  >
                    <View style={styles.segmentRow}>
                      {(() => {
                        const contributors = usersForSegments
                          .map((user) => ({
                            user,
                            intensity: getUserIntensity(visibleChores, task.name, weekRef.week, weekRef.year, user),
                          }))
                          .filter((item) => item.intensity > 0);

                        if (contributors.length === 0) {
                          return <View style={[styles.segment, styles.segmentLast, styles.segmentEmpty]} />;
                        }

                        return contributors.map((item, index) => (
                          <View
                            key={`${task.id}-${weekRef.mondayDate}-${item.user}`}
                            style={[
                              styles.segment,
                              {
                                backgroundColor: getUserColor(item.user, roommates),
                                opacity: intensityToOpacity(item.intensity),
                              },
                              index === contributors.length - 1 ? styles.segmentLast : null,
                            ]}
                          />
                        ));
                      })()}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.legendRow}>
        {roommates.map((user) => (
          <LegendDot key={user} color={getUserColor(user, roommates)} label={user} />
        ))}
      </View>

      <View style={styles.legendRow}>
        <LegendDot color="#D1D5DB" label="rien" />
        <LegendDot color="#6B7280" label="rapide" />
        <LegendDot color="#374151" label="partiel" />
        <LegendDot color="#111827" label="complet" />
      </View>
    </View>
  );
}

function FilterButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.filterBtn, active && styles.filterBtnActive]} onPress={onPress}>
      <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
    </Pressable>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

function Cell({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.gridCell, style]}>{children}</View>;
}

function buildWeeksFromFirstEntry(chores: Chore[]): WeekRef[] {
  const now = new Date();
  const end = mondayOf(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 35));

  const firstDate = chores.length
    ? new Date(Math.min(...chores.map((item) => +new Date(item.performedAt))))
    : now;
  let cursor = mondayOf(firstDate);

  const weeks: WeekRef[] = [];
  while (+cursor <= +end) {
    const { week, year } = getISOWeekYear(cursor);
    weeks.push({
      week,
      year,
      mondayDate: cursor.toISOString(),
      label: formatDayMonth(cursor),
    });
    cursor = new Date(cursor);
    cursor.setDate(cursor.getDate() + 7);
  }

  return weeks;
}

function mondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + diff);
  return d;
}

function formatDayMonth(date: Date): string {
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

function getISOWeekYear(date: Date): { week: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((+d - +yearStart) / 86400000) + 1) / 7);
  return { week, year: d.getUTCFullYear() };
}

function getUserIntensity(
  items: Chore[],
  taskName: string,
  week: number,
  year: number,
  user: string,
): 0 | 1 | 2 | 3 {
  const max = items
    .filter(
      (item) =>
        item.taskName === taskName &&
        item.week === week &&
        item.year === year &&
        item.user === user,
    )
    .reduce((acc, item) => Math.max(acc, item.intensity), 0);
  return max as 0 | 1 | 2 | 3;
}

function intensityToOpacity(level: 0 | 1 | 2 | 3) {
  if (level === 0) return 0.08;
  if (level === 1) return 0.35;
  if (level === 2) return 0.65;
  return 1;
}

function getUserColor(user: string, roommates: string[]) {
  const index = roommates.indexOf(user);
  if (index < 0) return USER_COLOR_PALETTE[0];
  return USER_COLOR_PALETTE[index % USER_COLOR_PALETTE.length];
}

function relativeFromDate(iso: string): string {
  const diffMs = Date.now() - +new Date(iso);
  const days = Math.floor(diffMs / 86400000);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return "hier";
  if (days < 7) return `il y a ${days} jours`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? "il y a 1 semaine" : `il y a ${weeks} semaines`;
}

function lastForTaskLabel(taskName: string, chores: Chore[], currentUser: string): string {
  const mine = chores
    .filter((item) => item.user === currentUser && item.taskName === taskName && item.intensity > 0)
    .sort((a, b) => +new Date(b.performedAt) - +new Date(a.performedAt));
  if (!mine[0]) return "jamais";
  return relativeFromDate(mine[0].performedAt);
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function recurrenceMatchesToday(recurrence: string): boolean {
  const normalized = recurrence.toLowerCase();

  if (normalized.includes("tous les jours") || normalized.includes("quotidien")) {
    return true;
  }

  const todayNames = getTodayFrenchNames();
  return todayNames.some((name) => normalized.includes(name));
}

function getTodayFrenchNames(): string[] {
  const day = new Date().getDay();
  const names = [
    ["dimanche", "dim"],
    ["lundi", "lun"],
    ["mardi", "mar"],
    ["mercredi", "mer"],
    ["jeudi", "jeu"],
    ["vendredi", "ven"],
    ["samedi", "sam"],
  ];
  return names[day];
}

function normalizeLegacyChores(raw: any[]): Chore[] {
  return raw
    .map((item) => {
      if (item && typeof item.taskName === "string") {
        return item as Chore;
      }

      if (item && typeof item.title === "string") {
        const now = new Date();
        const weekRef = getISOWeekYear(now);
        return {
          id: item.id ?? `${Date.now()}-${Math.random()}`,
          taskName: item.title,
          week: weekRef.week,
          year: weekRef.year,
          user: item.assignee ?? "Inconnu",
          intensity: item.done ? 2 : 1,
          performedAt: item.dueAt ? new Date(item.dueAt).toISOString() : now.toISOString(),
        } as Chore;
      }

      return null;
    })
    .filter((item): item is Chore => item !== null);
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  todoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 6,
  },
  todoTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  todoTask: { fontSize: 15, fontWeight: "700", color: "#1D4ED8" },
  todoMeta: { color: "#4B5563" },
  todoButton: {
    backgroundColor: "#1D4ED8",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  todoButtonDone: { backgroundColor: "#16A34A" },
  todoButtonSecondary: { backgroundColor: "#6B7280", marginTop: 4 },
  todoButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 12 },
  reminderEditor: { gap: 6, marginTop: 8 },
  addTaskRow: { flexDirection: "row", gap: 8 },
  flex: { flex: 1 },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
  },
  addBtn: {
    backgroundColor: "#1D4ED8",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: "center",
  },
  addBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 12 },
  taskEditRow: { flexDirection: "row", alignItems: "center", gap: 6, width: "100%" },
  taskEditInput: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: "#9CA3AF",
    paddingVertical: 2,
  },
  taskTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%" },
  taskActionsInline: { flexDirection: "row", gap: 6 },
  iconBtn: { fontSize: 11, color: "#1D4ED8", fontWeight: "700" },
  inlineActions: { flexDirection: "row", gap: 8 },
  smallBtn: {
    backgroundColor: "#1D4ED8",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  smallBtnMuted: { backgroundColor: "#6B7280" },
  smallBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 12 },
  filterRow: { flexDirection: "row", gap: 8 },
  filterBtn: {
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  filterBtnActive: { backgroundColor: "#111827" },
  filterText: { color: "#374151", fontWeight: "600" },
  filterTextActive: { color: "#FFFFFF" },
  headerRow: { flexDirection: "row" },
  gridRow: { flexDirection: "row" },
  gridCell: {
    width: WEEK_COL_WIDTH,
    height: 62,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  headerCell: { backgroundColor: "#F3F4F6", height: 36 },
  headerText: { fontSize: 11, color: "#374151", fontWeight: "700" },
  taskHeader: {
    width: TASK_COL_WIDTH,
    height: 62,
    alignItems: "flex-start",
    justifyContent: "center",
    paddingHorizontal: 8,
    backgroundColor: "#FFFFFF",
  },
  taskText: { fontSize: 12, fontWeight: "700", color: "#111827" },
  taskHint: { fontSize: 11, color: "#6B7280" },
  segmentRow: {
    flexDirection: "row",
    width: "100%",
    height: "100%",
  },
  segment: {
    flex: 1,
    marginRight: 1,
  },
  segmentLast: { marginRight: 0 },
  segmentEmpty: { backgroundColor: "#F3F4F6", opacity: 1 },
  legendRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 12, height: 12, borderRadius: 3, borderWidth: 1, borderColor: "#D1D5DB" },
  legendLabel: { fontSize: 12, color: "#4B5563" },
});


