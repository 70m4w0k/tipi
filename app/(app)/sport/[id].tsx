import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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
import { ExerciseLog } from "../../../lib/types";

const BAR_WIDTH = 36;
const BAR_GAP = 10;
const BAR_MAX_HEIGHT = 180;
const CHART_LABEL_HEIGHT = 24;

function formatDayLabel(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const { members } = useHousehold(profile);
  const { exercises, logs, logExercise, updateLog, fetchAll } = useSport(profile?.household_id);
  const t = useTheme();
  const router = useRouter();

  const exercise = exercises.find((e) => e.id === id);
  const today = todayISO();

  // Auto-scroll chart to today
  const chartScrollRef = useRef<ScrollView>(null);
  const todayBarRef = useRef<View>(null);
  const [chartReady, setChartReady] = useState(false);

  // Filter logs for this exercise
  const exerciseLogs = useMemo(
    () => logs
      .filter((l) => l.exercise_id === id)
      .sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime()),
    [logs, id]
  );

  // Today's series (logs for today, sorted by time)
  const todaySeries = useMemo(
    () => exerciseLogs
      .filter((l) => l.logged_at.slice(0, 10) === today)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [exerciseLogs, today]
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
    const result: string[] = [];
    const cursor = new Date(first);
    const end = new Date(today);
    while (cursor <= end) {
      const d = cursor.toISOString().slice(0, 10);
      if (set.has(d)) result.push(d);
      cursor.setDate(cursor.getDate() + 1);
    }
    return result;
  }, [dailyTotals, exerciseLogs, today]);

  const maxCount = useMemo(() => {
    let max = 0;
    for (const v of Object.values(dailyTotals)) {
      if (v > max) max = v;
    }
    return max || 1;
  }, [dailyTotals]);

  // Auto-scroll to today's bar when chart data is ready
  const todayIndex = days.indexOf(today);
  useEffect(() => {
    if (todayIndex >= 0 && chartReady) {
      const x = todayIndex * (BAR_WIDTH + BAR_GAP) - 60;
      chartScrollRef.current?.scrollTo({ x: Math.max(0, x), animated: true });
    }
  }, [todayIndex, chartReady]);

  const userColor = (userId: string) => members.find((m) => m.id === userId)?.color ?? t.accent;

  const handleIncrement = (log: ExerciseLog) => {
    void haptic.light();
    void updateLog(log.id, log.count + 1);
  };

  const handleDecrement = (log: ExerciseLog) => {
    void haptic.light();
    void updateLog(log.id, log.count - 1);
  };

  const handleAddSeries = async () => {
    if (!profile?.id || !exercise) return;
    void haptic.light();
    await logExercise(exercise.id, profile.id, 1);
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
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {/* Bar chart */}
          {days.length > 0 && (
            <>
              <ScrollView
                ref={chartScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chartScroll}
                onLayout={() => setChartReady(true)}
              >
                <View style={styles.chartContainer}>
                  {days.map((day) => {
                    const total = dailyTotals[day] ?? 0;
                    const barHeight = total > 0 ? Math.max((total / maxCount) * BAR_MAX_HEIGHT, 4) : 0;
                    const byUser = dailyByUser[day] ?? {};

                    const segments = Object.entries(byUser)
                      .sort(([, a], [, b]) => b - a)
                      .map(([userId, count]) => ({
                        color: userColor(userId),
                        height: Math.max((count / maxCount) * BAR_MAX_HEIGHT, 0),
                      }));

                    return (
                      <View
                        key={day}
                        ref={day === today ? todayBarRef : undefined}
                        style={styles.barColumn}
                      >
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
                              style={[styles.barSingle, { backgroundColor: segments[0]?.color ?? t.accent, height: barHeight }]}
                            />
                          ) : null}
                        </View>
                        <Text style={[styles.barLabel, { color: t.textMuted }]}>{formatDayLabel(day)}</Text>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>

              {/* Total recap */}
              <View style={[styles.totalBanner, { backgroundColor: t.accentLight }]}>
                <Text style={[styles.totalLabel, { color: t.textSecondary }]}>Total</Text>
                <Text style={[styles.totalValue, { color: t.accent }]}>
                  {totalAll} {exercise.unit}
                </Text>
              </View>
            </>
          )}

          {/* Today section label */}
          <Text style={[styles.sectionTitle, { color: t.text }]}>
            Aujourd'hui
          </Text>

          {/* Today's series */}
          {todaySeries.map((log, i) => (
            <View
              key={log.id}
              style={[styles.seriesCard, { backgroundColor: t.card, borderColor: t.cardBorder }]}
            >
              <Text style={[styles.seriesLabel, { color: t.textSecondary }]}>Série {i + 1}</Text>
              <View style={styles.seriesControls}>
                <Pressable
                  style={[styles.seriesBtn, { backgroundColor: t.dangerLight }]}
                  onPress={() => handleDecrement(log)}
                >
                  <Ionicons name="remove" size={18} color={t.danger} />
                </Pressable>
                <Text style={[styles.seriesCount, { color: t.text }]}>{log.count}</Text>
                <Pressable
                  style={[styles.seriesBtn, { backgroundColor: t.accentLight }]}
                  onPress={() => handleIncrement(log)}
                >
                  <Ionicons name="add" size={18} color={t.accent} />
                </Pressable>
              </View>
              <Text style={[styles.seriesUnit, { color: t.textMuted }]}>{exercise.unit}</Text>
            </View>
          ))}

          {/* Ghost card to add a new series */}
          <Pressable
            style={[styles.ghostCard, { borderColor: t.cardBorder }]}
            onPress={() => void handleAddSeries()}
          >
            <Ionicons name="add-circle-outline" size={22} color={t.textMuted} />
            <Text style={[styles.ghostText, { color: t.textMuted }]}>Ajouter une série</Text>
          </Pressable>

          {/* Previous days log (collapsed list) */}
          {exerciseLogs.filter((l) => l.logged_at.slice(0, 10) !== today).length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: t.text, marginTop: 16 }]}>
                Historique récent
              </Text>
              {exerciseLogs
                .filter((l) => l.logged_at.slice(0, 10) !== today)
                .slice()
                .reverse()
                .slice(0, 20)
                .map((log) => {
                  const member = members.find((m) => m.id === log.user_id);
                  return (
                    <View key={log.id} style={[styles.logRow, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
                      <View style={[styles.logDot, { backgroundColor: userColor(log.user_id) }]} />
                      <Text style={[styles.logUser, { color: t.textSecondary }]}>
                        {member?.display_name ?? "?"}
                      </Text>
                      <Text style={[styles.logCount, { color: t.text }]}>
                        {log.count} {exercise.unit}
                      </Text>
                      <Text style={[styles.logDate, { color: t.textMuted }]}>
                        {new Date(log.logged_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                      </Text>
                    </View>
                  );
                })}
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
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

  content: { paddingBottom: 40 },

  // Bar chart
  chartScroll: { paddingHorizontal: 12, paddingBottom: 8, paddingTop: 12 },
  chartContainer: { flexDirection: "row", alignItems: "flex-end", gap: BAR_GAP },
  barColumn: { alignItems: "center", width: BAR_WIDTH },
  barBody: { width: BAR_WIDTH, justifyContent: "flex-end", alignItems: "center" },
  barStack: { width: BAR_WIDTH, borderRadius: 4, overflow: "hidden", justifyContent: "flex-end" },
  barSegment: { width: BAR_WIDTH },
  barSingle: { width: BAR_WIDTH, borderRadius: 4 },
  barLabel: { fontSize: 10, marginTop: 4, height: CHART_LABEL_HEIGHT, textAlign: "center" },

  // Total banner
  totalBanner: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginHorizontal: 16, marginBottom: 16,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
  },
  totalLabel: { fontSize: 13, fontWeight: "600" },
  totalValue: { fontSize: 22, fontWeight: "800" },

  // Section
  sectionTitle: { fontSize: 15, fontWeight: "700", paddingHorizontal: 16, marginBottom: 10 },

  // Series cards
  seriesCard: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 16, marginBottom: 8,
    borderWidth: 1, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14,
  },
  seriesLabel: { fontSize: 12, fontWeight: "600", width: 50 },
  seriesControls: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 14 },
  seriesBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
  },
  seriesCount: { fontSize: 20, fontWeight: "800", minWidth: 40, textAlign: "center" },
  seriesUnit: { fontSize: 12, width: 70, textAlign: "right" },

  // Ghost card
  ghostCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    marginHorizontal: 16, marginBottom: 8,
    borderWidth: 1.5, borderRadius: 14, borderStyle: "dashed",
    paddingVertical: 14,
  },
  ghostText: { fontSize: 14, fontWeight: "600" },

  // History log rows
  logRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 16,
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    marginBottom: 6,
  },
  logDot: { width: 8, height: 8, borderRadius: 4 },
  logUser: { fontSize: 13, flex: 1 },
  logCount: { fontSize: 14, fontWeight: "700", marginRight: 8 },
  logDate: { fontSize: 11 },
});