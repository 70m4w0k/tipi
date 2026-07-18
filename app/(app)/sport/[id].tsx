import { useCallback, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "../../../lib/hooks/useAuth";
import { useHousehold } from "../../../lib/hooks/useHousehold";
import { useSport } from "../../../lib/hooks/useSport";
import { useTheme } from "../../../lib/theme";
import { haptic } from "../../../lib/haptics";

const BAR_WIDTH = 36;
const BAR_GAP = 10;
const BAR_MAX_HEIGHT = 180;
const CHART_LABEL_HEIGHT = 24;

function formatDayLabel(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const { members } = useHousehold(profile);
  const { exercises, logs, logExercise, deleteLog, fetchAll } = useSport(profile?.household_id);
  const t = useTheme();
  const router = useRouter();

  const exercise = exercises.find((e) => e.id === id);

  const [logModal, setLogModal] = useState(false);
  const [logCount, setLogCount] = useState("");

  const onRefresh = useCallback(async () => {
    await fetchAll();
  }, [fetchAll]);

  // Filter logs for this exercise
  const exerciseLogs = useMemo(
    () => logs.filter((l) => l.exercise_id === id).sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime()),
    [logs, id]
  );

  // Aggregate by day
  const dailyTotals = useMemo(() => {
    const map: Record<string, number> = {};
    for (const log of exerciseLogs) {
      const day = log.logged_at.slice(0, 10);
      map[day] = (map[day] ?? 0) + log.count;
    }
    return map;
  }, [exerciseLogs]);

  // Per-user per-day
  const dailyByUser = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    for (const log of exerciseLogs) {
      const day = log.logged_at.slice(0, 10);
      if (!map[day]) map[day] = {};
      map[day][log.user_id] = (map[day][log.user_id] ?? 0) + log.count;
    }
    return map;
  }, [exerciseLogs]);

  // Sorted days from first log to today
  const days = useMemo(() => {
    const set = new Set(Object.keys(dailyTotals));
    if (exerciseLogs.length === 0) return [];
    const first = exerciseLogs[0].logged_at.slice(0, 10);
    const last = new Date().toISOString().slice(0, 10);
    const result: string[] = [];
    const cursor = new Date(first);
    const end = new Date(last);
    while (cursor <= end) {
      const d = cursor.toISOString().slice(0, 10);
      if (set.has(d)) result.push(d);
      cursor.setDate(cursor.getDate() + 1);
    }
    return result;
  }, [dailyTotals, exerciseLogs]);

  const maxCount = useMemo(() => {
    let max = 0;
    for (const v of Object.values(dailyTotals)) {
      if (v > max) max = v;
    }
    return max || 1;
  }, [dailyTotals]);

  const userColor = (userId: string) => members.find((m) => m.id === userId)?.color ?? t.accent;

  const handleLog = async () => {
    const count = parseInt(logCount, 10);
    if (!count || count <= 0 || !profile?.id || !exercise) return;
    void haptic.light();
    await logExercise(exercise.id, profile.id, count);
    setLogModal(false);
    setLogCount("");
  };

  if (!exercise) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: t.background }]} edges={["top"]}>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: t.textMuted }]}>Exercice introuvable</Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalAll = Object.values(dailyTotals).reduce((s, v) => s + v, 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.background }]} edges={["top"]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: t.card, borderBottomColor: t.cardBorder }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={t.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Ionicons name={exercise.icon as any} size={22} color={t.accent} />
          <Text style={[styles.headerTitle, { color: t.text }]}>{exercise.name}</Text>
        </View>
        <Pressable
          hitSlop={8}
          onPress={() => { setLogModal(true); setLogCount(""); }}
        >
          <Ionicons name="add-circle-outline" size={24} color={t.accent} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
      {/* Total */}
      <View style={[styles.totalBanner, { backgroundColor: t.accentLight }]}>
        <Text style={[styles.totalLabel, { color: t.textSecondary }]}>Total</Text>
        <Text style={[styles.totalValue, { color: t.accent }]}>
          {totalAll} {exercise.unit}
        </Text>
      </View>

      {/* Bar chart */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chartScroll}
      >
        <View style={styles.chartContainer}>
          {days.map((day) => {
            const total = dailyTotals[day] ?? 0;
            const barHeight = total > 0 ? Math.max((total / maxCount) * BAR_MAX_HEIGHT, 4) : 0;
            const byUser = dailyByUser[day] ?? {};

            // Build stacked bar segments
            const segments = Object.entries(byUser)
              .sort(([, a], [, b]) => b - a)
              .map(([userId, count]) => ({
                color: userColor(userId),
                height: Math.max((count / maxCount) * BAR_MAX_HEIGHT, 0),
              }));

            return (
              <View key={day} style={styles.barColumn}>
                <View style={[styles.barBody, { height: BAR_MAX_HEIGHT }]}>
                  {segments.length > 1 ? (
                    <View style={[styles.barStack, { height: barHeight }]}>
                      {segments.map((seg, i) => (
                        <View
                          key={i}
                          style={[styles.barSegment, { backgroundColor: seg.color, height: seg.height }]}
                        />
                      ))}
                    </View>
                  ) : barHeight > 0 ? (
                    <View
                      style={[
                        styles.barSingle,
                        { backgroundColor: segments[0]?.color ?? t.accent, height: barHeight },
                      ]}
                    />
                  ) : null}
                </View>
                <Text style={[styles.barLabel, { color: t.textMuted }]}>{formatDayLabel(day)}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Recent logs list */}
      <View style={styles.logListHeader}>
        <Text style={[styles.logListTitle, { color: t.text }]}>Derniers logs</Text>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.logListContent} keyboardShouldPersistTaps="handled">
        {exerciseLogs.length === 0 && (
          <Text style={[styles.emptyLogs, { color: t.textMuted }]}>Aucun log enregistré</Text>
        )}
        {exerciseLogs.slice().reverse().slice(0, 30).map((log) => {
          const member = members.find((m) => m.id === log.user_id);
          return (
            <View key={log.id} style={[styles.logRow, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
              <View style={[styles.logDot, { backgroundColor: userColor(log.user_id) }]} />
              <Text style={[styles.logUser, { color: t.textSecondary }]}>
                {member?.display_name ?? "?"}
              </Text>
              <Text style={[styles.logCount, { color: t.text }]}>
                +{log.count} {exercise.unit}
              </Text>
              <Text style={[styles.logDate, { color: t.textMuted }]}>
                {new Date(log.logged_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </Text>
              <Pressable
                hitSlop={8}
                onPress={() => { void haptic.light(); void deleteLog(log.id); }}
              >
                <Ionicons name="trash-outline" size={14} color={t.danger} />
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Log modal */}
      <Modal visible={logModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setLogModal(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: t.card }]} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Ionicons name={exercise.icon as any} size={24} color={t.accent} />
              <Text style={[styles.modalTitle, { color: t.text }]}>{exercise.name}</Text>
            </View>
            <TextInput
              style={[styles.modalInput, { borderColor: t.inputBorder, backgroundColor: t.inputBg, color: t.text }]}
              value={logCount}
              onChangeText={setLogCount}
              keyboardType="numeric"
              placeholder={`${exercise.unit}...`}
              placeholderTextColor={t.textMuted}
              autoFocus
              onSubmitEditing={() => void handleLog()}
            />
            <View style={styles.quickCounts}>
              {[5, 10, 15, 20, 30, 50].map((n) => (
                <Pressable
                  key={n}
                  style={[styles.quickBtn, { backgroundColor: t.separator }]}
                  onPress={() => setLogCount(String(n))}
                >
                  <Text style={[styles.quickBtnText, { color: t.textSecondary }]}>{n}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.modalActions}>
              <Pressable style={[styles.modalCancel, { borderColor: t.cardBorder }]} onPress={() => setLogModal(false)}>
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
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center",
    borderBottomWidth: 1, paddingHorizontal: 12, paddingVertical: 10, gap: 8,
  },
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 17, fontWeight: "700" },

  emptyContainer: { alignItems: "center", paddingTop: 60 },
  emptyText: { fontSize: 15 },

  // Total banner
  totalBanner: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginHorizontal: 16, marginTop: 12, marginBottom: 8,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
  },
  totalLabel: { fontSize: 13, fontWeight: "600" },
  totalValue: { fontSize: 20, fontWeight: "800" },

  // Bar chart
  chartScroll: { paddingHorizontal: 12, paddingBottom: 8 },
  chartContainer: { flexDirection: "row", alignItems: "flex-end", gap: BAR_GAP, paddingTop: 8 },
  barColumn: { alignItems: "center", width: BAR_WIDTH },
  barBody: { width: BAR_WIDTH, justifyContent: "flex-end", alignItems: "center" },
  barStack: { width: BAR_WIDTH, borderRadius: 4, overflow: "hidden", justifyContent: "flex-end" },
  barSegment: { width: BAR_WIDTH },
  barSingle: { width: BAR_WIDTH, borderRadius: 4 },
  barLabel: { fontSize: 10, marginTop: 4, height: CHART_LABEL_HEIGHT, textAlign: "center" },

  // Log list
  logListHeader: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
  logListTitle: { fontSize: 15, fontWeight: "700" },
  logListContent: { paddingHorizontal: 16, paddingBottom: 20 },
  emptyLogs: { textAlign: "center", paddingVertical: 20, fontSize: 13 },
  logRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    marginBottom: 6,
  },
  logDot: { width: 8, height: 8, borderRadius: 4 },
  logUser: { fontSize: 13, flex: 1 },
  logCount: { fontSize: 14, fontWeight: "700" },
  logDate: { fontSize: 11 },

  // Modal
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
});