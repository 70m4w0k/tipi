import { useCallback, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../lib/hooks/useAuth";
import { useHousehold } from "../../lib/hooks/useHousehold";
import { useSport } from "../../lib/hooks/useSport";
import { useTheme } from "../../lib/theme";
import { haptic } from "../../lib/haptics";
import { Exercise, ExerciseLog } from "../../lib/types";
import { ConfirmDialog } from "../../components/ConfirmDialog";

type Period = "day" | "week" | "month";

const PERIOD_LABELS: Record<Period, string> = { day: "Jour", week: "Semaine", month: "Mois" };

const EXERCISE_ICONS = [
  "barbell-outline", "fitness-outline", "timer-outline",
  "walk-outline", "bicycle-outline", "heart-outline",
  "flame-outline", "pulse-outline", "body-outline",
];

const UNIT_OPTIONS = ["répétitions", "secondes", "minutes"];

function periodStart(period: Period): Date {
  const now = new Date();
  switch (period) {
    case "day":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case "week": {
      const d = new Date(now);
      d.setDate(d.getDate() - d.getDay() + 1); // Monday
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "month":
      return new Date(now.getFullYear(), now.getMonth(), 1);
  }
}

export default function SportScreen() {
  const { profile } = useAuth();
  const { members } = useHousehold(profile);
  const {
    exercises, logs, loading,
    addExercise, updateExercise, deleteExercise,
    logExercise, deleteLog, fetchAll,
  } = useSport(profile?.household_id);
  const t = useTheme();

  const [period, setPeriod] = useState<Period>("day");
  const [refreshing, setRefreshing] = useState(false);
  const [editModal, setEditModal] = useState<Exercise | undefined>(undefined); // undefined=closed, null=new
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState("barbell-outline");
  const [editUnit, setEditUnit] = useState("répétitions");
  const [logModal, setLogModal] = useState<{ exercise: Exercise } | null>(null);
  const [logCount, setLogCount] = useState("");
  const [confirm, setConfirm] = useState<
    { title: string; message: string; confirmLabel: string; onConfirm: () => void } | null
  >(null);

  const start = periodStart(period);
  const startMs = start.getTime();

  const periodLogs = useMemo(
    () => logs.filter((l) => new Date(l.logged_at).getTime() >= startMs),
    [logs, startMs]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  // Group by exercise, then by user
  const exerciseStats = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    for (const log of periodLogs) {
      if (!map[log.exercise_id]) map[log.exercise_id] = {};
      map[log.exercise_id][log.user_id] = (map[log.exercise_id][log.user_id] ?? 0) + log.count;
    }
    return map;
  }, [periodLogs]);

  const handleLog = async () => {
    const count = parseInt(logCount, 10);
    if (!count || count <= 0 || !logModal || !profile?.id) return;
    void haptic.light();
    await logExercise(logModal.exercise.id, profile.id, count);
    setLogModal(null);
    setLogCount("");
  };

  const handleSaveExercise = async () => {
    if (!editName.trim()) return;
    void haptic.light();
    if (editModal?.id) {
      await updateExercise(editModal.id, editName, editIcon, editUnit);
    } else {
      await addExercise(editName, editIcon, editUnit);
    }
    setEditModal(undefined);
    setEditName("");
  };

  const handleDeleteExercise = (ex: Exercise) => {
    void haptic.warning();
    setConfirm({
      title: "Supprimer l'exercice",
      message: `Supprimer "${ex.name}" et tous ses logs ?`,
      confirmLabel: "Supprimer",
      onConfirm: () => { void deleteExercise(ex.id); },
    });
  };

  const openEditModal = (ex?: Exercise) => {
    if (ex) {
      setEditModal(ex);
      setEditName(ex.name);
      setEditIcon(ex.icon);
      setEditUnit(ex.unit);
    } else {
      setEditModal(null!); // null = new exercise, distinct from undefined
      setEditName("");
      setEditIcon("barbell-outline");
      setEditUnit("répétitions");
    }
  };

  const userColor = (userId: string) => members.find((m) => m.id === userId)?.color ?? t.accent;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.background }]} edges={["top"]}>
      <View style={[styles.header, { backgroundColor: t.card, borderBottomColor: t.cardBorder }]}>
        <Text style={[styles.headerTitle, { color: t.text }]}>Sport</Text>
      </View>

      {/* Period toggle */}
      <View style={[styles.periodBar, { backgroundColor: t.tabBg }]}>
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
          <Pressable
            key={p}
            style={[
              styles.periodBtn,
              period === p && { backgroundColor: t.accent },
            ]}
            onPress={() => { void haptic.light(); setPeriod(p); }}
          >
            <Text
              style={[
                styles.periodBtnText,
                { color: period === p ? "#FFFFFF" : t.textSecondary },
              ]}
            >
              {PERIOD_LABELS[p]}
            </Text>
          </Pressable>
        ))}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.accent} colors={[t.accent]} />}
          keyboardShouldPersistTaps="handled"
        >
          {exercises.length === 0 && !loading && (
            <View style={styles.emptyContainer}>
              <Ionicons name="barbell-outline" size={48} color={t.emptyIcon} />
              <Text style={[styles.emptyText, { color: t.textMuted }]}>Aucun exercice</Text>
              <Text style={[styles.emptySub, { color: t.textMuted }]}>Appuie sur + pour en ajouter</Text>
            </View>
          )}

          {exercises.map((ex) => {
            const stats = exerciseStats[ex.id] ?? {};
            const total = Object.values(stats).reduce((s, c) => s + c, 0);

            return (
              <Pressable
                key={ex.id}
                style={[styles.exerciseCard, { backgroundColor: t.card, borderColor: t.cardBorder }]}
                onPress={() => { setLogModal({ exercise: ex }); setLogCount(""); }}
              >
                <View style={styles.exerciseHeader}>
                  <View style={styles.exerciseNameRow}>
                    <Ionicons name={ex.icon as any} size={20} color={t.accent} />
                    <Text style={[styles.exerciseName, { color: t.text }]}>{ex.name}</Text>
                    <Pressable
                      hitSlop={8}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        openEditModal(ex);
                      }}
                    >
                      <Ionicons name="pencil-outline" size={14} color={t.textMuted} />
                    </Pressable>
                  </View>
                  <View style={[styles.exerciseTotal, { backgroundColor: t.accentLight }]}>
                    <Text style={[styles.exerciseTotalText, { color: t.accent }]}>
                      {total} {ex.unit}
                    </Text>
                  </View>
                </View>

                {Object.keys(stats).length > 0 && (
                  <View style={styles.userStats}>
                    {Object.entries(stats).map(([userId, count]) => {
                      const color = userColor(userId);
                      const member = members.find((m) => m.id === userId);
                      return (
                        <View key={userId} style={styles.userStat}>
                          <View style={[styles.userDot, { backgroundColor: color }]} />
                          <Text style={[styles.userName, { color: t.textSecondary }]}>
                            {member?.display_name ?? "?"}
                          </Text>
                          <Text style={[styles.userCount, { color: t.text }]}>
                            {count} {ex.unit}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}

                <View style={styles.logHint}>
                  <Ionicons name="add-circle-outline" size={14} color={t.textMuted} />
                  <Text style={[styles.logHintText, { color: t.textMuted }]}>Logger</Text>
                </View>
              </Pressable>
            );
          })}

          <View style={{ height: 120 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* FAB */}
      <View style={styles.fabContainer}>
        <Pressable
          style={[styles.fab, { backgroundColor: t.accent }]}
          onPress={() => { void haptic.light(); openEditModal(); }}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Log modal */}
      <Modal visible={!!logModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setLogModal(null)}>
          <Pressable style={[styles.modalContent, { backgroundColor: t.card }]} onPress={() => {}}>
            {logModal && (
              <>
                <View style={styles.modalHeader}>
                  <Ionicons name={logModal.exercise.icon as any} size={24} color={t.accent} />
                  <Text style={[styles.modalTitle, { color: t.text }]}>{logModal.exercise.name}</Text>
                </View>
                <TextInput
                  style={[styles.modalInput, { borderColor: t.inputBorder, backgroundColor: t.inputBg, color: t.text }]}
                  value={logCount}
                  onChangeText={setLogCount}
                  keyboardType="numeric"
                  placeholder={`${logModal.exercise.unit}...`}
                  placeholderTextColor={t.textMuted}
                  autoFocus
                  onSubmitEditing={() => void handleLog()}
                />
                <View style={styles.quickCounts}>
                  {[5, 10, 15, 20, 30, 50].map((n) => (
                    <Pressable
                      key={n}
                      style={[styles.quickBtn, { backgroundColor: t.separator }]}
                      onPress={() => { setLogCount(String(n)); }}
                    >
                      <Text style={[styles.quickBtnText, { color: t.textSecondary }]}>{n}</Text>
                    </Pressable>
                  ))}
                </View>
                <View style={styles.modalActions}>
                  <Pressable style={[styles.modalCancel, { borderColor: t.cardBorder }]} onPress={() => setLogModal(null)}>
                    <Text style={[styles.modalCancelText, { color: t.textSecondary }]}>Annuler</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.modalConfirm, { backgroundColor: t.accent, opacity: logCount ? 1 : 0.5 }]}
                    onPress={() => void handleLog()}
                    disabled={!logCount}
                  >
                    <Text style={styles.modalConfirmText}>Valider</Text>
                  </Pressable>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Edit exercise modal */}
      <Modal visible={editModal !== undefined} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setEditModal(undefined)}>
          <Pressable style={[styles.modalContent, { backgroundColor: t.card }]} onPress={() => {}}>
            <Text style={[styles.editTitle, { color: t.text }]}>
              {editModal?.id ? "Modifier l'exercice" : "Nouvel exercice"}
            </Text>

            <TextInput
              style={[styles.modalInput, { borderColor: t.inputBorder, backgroundColor: t.inputBg, color: t.text }]}
              value={editName}
              onChangeText={setEditName}
              placeholder="Nom de l'exercice"
              placeholderTextColor={t.textMuted}
              autoFocus
            />

            <Text style={[styles.editLabel, { color: t.textSecondary }]}>Icône</Text>
            <View style={styles.iconGrid}>
              {EXERCISE_ICONS.map((icon) => (
                <Pressable
                  key={icon}
                  style={[
                    styles.iconBtn,
                    { borderColor: editIcon === icon ? t.accent : t.cardBorder },
                  ]}
                  onPress={() => setEditIcon(icon)}
                >
                  <Ionicons name={icon as any} size={22} color={editIcon === icon ? t.accent : t.textMuted} />
                </Pressable>
              ))}
            </View>

            <Text style={[styles.editLabel, { color: t.textSecondary }]}>Unité</Text>
            <View style={styles.unitRow}>
              {UNIT_OPTIONS.map((u) => (
                <Pressable
                  key={u}
                  style={[
                    styles.unitBtn,
                    { borderColor: editUnit === u ? t.accent : t.cardBorder },
                    editUnit === u && { backgroundColor: t.accentLight },
                  ]}
                  onPress={() => setEditUnit(u)}
                >
                  <Text style={[styles.unitBtnText, { color: editUnit === u ? t.accent : t.textSecondary }]}>
                    {u}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.modalActions}>
              {editModal?.id && (
                <Pressable
                  style={[styles.modalDelete, { backgroundColor: t.dangerLight }]}
                  onPress={() => { setEditModal(undefined); handleDeleteExercise(editModal); }}
                >
                  <Ionicons name="trash-outline" size={16} color={t.danger} />
                </Pressable>
              )}
              <Pressable style={[styles.modalCancel, { borderColor: t.cardBorder, flex: 1 }]} onPress={() => setEditModal(undefined)}>
                <Text style={[styles.modalCancelText, { color: t.textSecondary }]}>Annuler</Text>
              </Pressable>
              <Pressable
                style={[styles.modalConfirm, { backgroundColor: t.accent, flex: 1 }]}
                onPress={() => void handleSaveExercise()}
              >
                <Text style={styles.modalConfirmText}>Enregistrer</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <ConfirmDialog
        visible={!!confirm}
        title={confirm?.title ?? ""}
        message={confirm?.message ?? ""}
        confirmLabel={confirm?.confirmLabel ?? ""}
        onConfirm={() => { confirm?.onConfirm(); setConfirm(null); }}
        onCancel={() => setConfirm(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 18, fontWeight: "700", flex: 1, textAlign: "center" },

  // Period toggle
  periodBar: {
    flexDirection: "row", marginHorizontal: 16, marginVertical: 10,
    borderRadius: 10, padding: 3,
  },
  periodBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center" },
  periodBtnText: { fontSize: 14, fontWeight: "600" },

  content: { padding: 16, paddingBottom: 120 },

  // Empty
  emptyContainer: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: "600" },
  emptySub: { fontSize: 13 },

  // Exercise cards
  exerciseCard: {
    borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10,
  },
  exerciseHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  exerciseNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  exerciseName: { fontSize: 16, fontWeight: "700" },
  exerciseTotal: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  exerciseTotalText: { fontSize: 13, fontWeight: "600" },

  // User stats
  userStats: { gap: 6 },
  userStat: { flexDirection: "row", alignItems: "center", gap: 6 },
  userDot: { width: 8, height: 8, borderRadius: 4 },
  userName: { fontSize: 13, flex: 1 },
  userCount: { fontSize: 13, fontWeight: "600" },

  // Log hint
  logHint: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, marginTop: 8, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#E5E7EB" },
  logHintText: { fontSize: 12 },

  // FAB
  fabContainer: { position: "absolute", bottom: 24, right: 16, alignItems: "flex-end" },
  fab: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: "center", justifyContent: "center",
    elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 4,
  },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
  modalContent: { width: "100%", maxWidth: 360, borderRadius: 16, padding: 20 },
  modalHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  modalInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16, marginBottom: 12 },
  quickCounts: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 14 },
  quickBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  quickBtnText: { fontSize: 14, fontWeight: "600" },
  modalActions: { flexDirection: "row", gap: 8 },
  modalCancel: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  modalCancelText: { fontWeight: "600", fontSize: 14 },
  modalConfirm: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  modalConfirmText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  modalDelete: { width: 44, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center" },

  // Edit modal
  editTitle: { fontSize: 17, fontWeight: "700", marginBottom: 14 },
  editLabel: { fontSize: 13, fontWeight: "600", marginTop: 10, marginBottom: 6 },
  iconGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 6 },
  iconBtn: { width: 44, height: 44, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  unitRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  unitBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  unitBtnText: { fontSize: 14, fontWeight: "600" },
});