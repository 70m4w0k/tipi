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

import { BadgeRow, BadgeItem } from "../../../components/BadgeRow";
import { computeBadgeVisibility, computePersonalRecords, medallionMotif, badgeTier, MedallionMotif } from "../../../lib/sport-logic";
import { BadgeUnlockOverlay } from "../../../components/BadgeUnlockOverlay";
import { RepStepper } from "../../../components/RepStepper";

const BAR_WIDTH = 40;
const BAR_GAP = 12;
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
  const { exercises, logs, loading, logExercise, updateLog, fetchAll, exerciseBadges, temporalBadges, userBadges, unlockedBadges, temporalTitles, collectiveTitle, memberLevel, levelInfo } = useSport(profile?.household_id, profile?.id);
  const t = useTheme();
  const router = useRouter();

  const exercise = exercises.find((e) => e.id === id);
  const today = todayISO();
  const [selectedDay, setSelectedDay] = useState(today);
  const [newBadge, setNewBadge] = useState<{ title: string; motif: MedallionMotif; tier: number } | null>(null);
  // null = baseline pas encore établie (avant le premier fetch terminé)
  const prevUserBadgeIds = useRef<Set<string> | null>(null);

  // Detect newly unlocked badges — la baseline est TOUJOURS mise à jour avant la
  // détection, sinon chaque refetch (toute modification de série) re-déclenche l'overlay.
  useEffect(() => {
    if (loading) return;
    const current = new Set(userBadges.map((ub) => ub.badge_id));
    const prev = prevUserBadgeIds.current;
    prevUserBadgeIds.current = current;
    if (prev == null) return; // premier snapshot après fetch : pas de célébration rétroactive

    for (const badgeId of current) {
      if (!prev.has(badgeId)) {
        const badge = exerciseBadges.find((b) => b.id === badgeId && b.exercise_id === exercise?.id);
        if (badge && exercise) {
          setNewBadge({ title: badge.title, motif: medallionMotif(exercise.name), tier: badgeTier(badge.threshold) });
          const timer = setTimeout(() => setNewBadge(null), 3000);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [userBadges, exerciseBadges, exercise?.id, loading]);

  // Auto-scroll chart to today
  const chartScrollRef = useRef<ScrollView>(null);
  const [chartReady, setChartReady] = useState(false);

  // Filter logs for this exercise
  const exerciseLogs = useMemo(
    () => logs
      .filter((l) => l.exercise_id === id)
      .sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime()),
    [logs, id]
  );

  // Live counts from RepStepper (during hold / typing), before the DB commit
  const [liveCounts, setLiveCounts] = useState<Record<string, number>>({});
  const handleLiveChange = useCallback((logId: string, n: number) => {
    setLiveCounts((prev) => (prev[logId] === n ? prev : { ...prev, [logId]: n }));
  }, []);
  // Prune entries once the server has caught up (or the log was deleted)
  useEffect(() => {
    setLiveCounts((prev) => {
      const next: Record<string, number> = {};
      let changed = false;
      for (const [logId, n] of Object.entries(prev)) {
        const server = logs.find((l) => l.id === logId);
        if (server && server.count !== n) next[logId] = n;
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [logs]);

  // Logs with in-flight stepper values applied — drives chart, totals and badge progress
  const liveExerciseLogs = useMemo(
    () => exerciseLogs.map((l) => (liveCounts[l.id] != null ? { ...l, count: liveCounts[l.id] } : l)),
    [exerciseLogs, liveCounts]
  );

  // Records personnels (gate niveau 3, spec §5.2)
  const records = useMemo(
    () => (profile?.id && id ? computePersonalRecords(logs, profile.id, id) : { bestDay: null, bestSeries: null }),
    [logs, profile?.id, id]
  );

  // Series for selected day
  const selectedSeries = useMemo(
    () => exerciseLogs
      .filter((l) => l.logged_at.slice(0, 10) === selectedDay)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [exerciseLogs, selectedDay]
  );

  // Aggregate by day
  const dailyTotals = useMemo(() => {
    const map: Record<string, number> = {};
    for (const log of liveExerciseLogs) {
      const day = log.logged_at.slice(0, 10);
      map[day] = (map[day] ?? 0) + log.count;
    }
    return map;
  }, [liveExerciseLogs]);

  // Per-user per-day
  const dailyByUser = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    for (const log of liveExerciseLogs) {
      const day = log.logged_at.slice(0, 10);
      if (!map[day]) map[day] = {};
      map[day][log.user_id] = (map[day][log.user_id] ?? 0) + log.count;
    }
    return map;
  }, [exerciseLogs]);

  // Sorted days from 7 days before first log to today (or last 7 days if no logs)
  const days = useMemo(() => {
    const firstDate = new Date(today);
    if (exerciseLogs.length > 0) {
      firstDate.setTime(new Date(exerciseLogs[0].logged_at.slice(0, 10)).getTime());
    }
    firstDate.setDate(firstDate.getDate() - 7);
    const first = firstDate.toISOString().slice(0, 10);
    const result: string[] = [];
    const cursor = new Date(first);
    const end = new Date(today);
    while (cursor <= end) {
      result.push(cursor.toISOString().slice(0, 10));
      cursor.setDate(cursor.getDate() + 1);
    }
    return result;
  }, [exerciseLogs, today]);

  const maxCount = useMemo(() => {
    let max = 1;
    for (const d of days) {
      const v = dailyTotals[d] ?? 0;
      if (v > max) max = v;
    }
    return max;
  }, [dailyTotals, days]);

  // Auto-scroll to today's bar
  const todayIndex = days.indexOf(today);
  useEffect(() => {
    if (todayIndex >= 0 && chartReady) {
      const x = todayIndex * (BAR_WIDTH + BAR_GAP) - 60;
      chartScrollRef.current?.scrollTo({ x: Math.max(0, x), animated: true });
    }
  }, [todayIndex, chartReady]);

  const userColor = (userId: string) => members.find((m) => m.id === userId)?.color ?? t.accent;

  const handleAddSeries = async () => {
    if (!profile?.id || !exercise) return;
    void haptic.light();
    const loggedAt = selectedDay === today ? undefined : `${selectedDay}T12:00:00`;
    await logExercise(exercise.id, profile.id, 1, loggedAt);
  };

  // Scroll to selected day when user taps a bar
  const handleSelectDay = (day: string, index: number) => {
    void haptic.light();
    setSelectedDay(day);
    const x = index * (BAR_WIDTH + BAR_GAP) - 60;
    chartScrollRef.current?.scrollTo({ x: Math.max(0, x), animated: true });
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

  const selectedTotal = dailyTotals[selectedDay] ?? 0;
  const selectedByUser = dailyByUser[selectedDay] ?? {};

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.background }]} edges={["top"]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: t.card, borderBottomColor: t.cardBorder }]}>
        <Pressable onPress={() => router.replace("/(app)/sport")} hitSlop={8}>
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
          <ScrollView
            ref={chartScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chartScroll}
            onLayout={() => setChartReady(true)}
          >
            <View style={styles.chartContainer}>
              {days.map((day, idx) => {
                  const total = dailyTotals[day] ?? 0;
                  const barHeight = total > 0 ? Math.max((total / maxCount) * BAR_MAX_HEIGHT, 4) : 0;
                  const byUser = dailyByUser[day] ?? {};
                  const isSelected = day === selectedDay;

                  const segments = Object.entries(byUser)
                    .sort(([, a], [, b]) => b - a)
                    .map(([userId, count]) => ({
                      color: userColor(userId),
                      height: Math.max((count / maxCount) * BAR_MAX_HEIGHT, 0),
                    }));

                  return (
                    <Pressable
                      key={day}
                      onPress={() => handleSelectDay(day, idx)}
                      style={styles.barColumn}
                    >
                      <View style={[styles.barBody, { height: BAR_MAX_HEIGHT }]}>
                        <View style={[
                          styles.barHitArea,
                          isSelected && { backgroundColor: t.accentLight },
                        ]}>
                          {segments.length > 1 ? (
                            <View style={[styles.barStack, { height: barHeight, opacity: isSelected ? 1 : 0.85 }]}>
                              {segments.map((seg, i) => (
                                <View
                                  key={i}
                                  style={[styles.barSegment, { backgroundColor: seg.color, height: seg.height }]}
                                />
                              ))}
                            </View>
                          ) : barHeight > 0 ? (
                            <View
                              style={[styles.barSingle, { backgroundColor: segments[0]?.color ?? t.accent, height: barHeight, opacity: isSelected ? 1 : 0.85 }]}
                            />
                          ) : null}
                        </View>
                      </View>
                      <Text style={[
                        styles.barLabel,
                        { color: isSelected ? t.accent : t.textMuted },
                        isSelected && styles.barLabelSelected,
                      ]}>
                        {formatDayLabel(day)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

          {/* Selected day recap */}
          <View style={[styles.totalBanner, { backgroundColor: t.accentLight }]}>
            <View>
              <Text style={[styles.totalLabel, { color: t.textSecondary }]}>
                {selectedDay === today ? "Aujourd'hui" : formatDayLabelFull(selectedDay)}
              </Text>
              {Object.keys(selectedByUser).length > 0 && (
                <View style={styles.totalUsers}>
                  {Object.entries(selectedByUser).map(([userId, count]) => {
                    const member = members.find((m) => m.id === userId);
                    const showLevel = member ? (member.show_sport_level ?? true) : false;
                    return (
                      <View key={userId} style={styles.totalUserRow}>
                        <View style={[styles.totalUserDot, { backgroundColor: userColor(userId) }]} />
                        <Text style={[styles.totalUserName, { color: t.textSecondary }]}>
                          {member?.display_name ?? "?"}
                        </Text>
                        {showLevel && (
                          <Text style={[styles.totalUserLevel, { color: t.accent }]}>
                            {member?.sport_title ?? `Niv. ${memberLevel(userId)}`}
                          </Text>
                        )}
                        <Text style={[styles.totalUserCount, { color: t.textSecondary }]}>
                          {count} {exercise.unit}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
            <Text style={[styles.totalValue, { color: t.accent }]}>
              {selectedTotal} {exercise.unit}
            </Text>
          </View>

          {/* Badges */}
          {exercise && (
            <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
              {(() => {
                const exBadges = exerciseBadges.filter((b) => b.exercise_id === id);
                const exUnlocked = userBadges.map((ub) => ub.badge_id);
                // Compute per-badge progress
                const badgeItems: BadgeItem[] = computeBadgeVisibility(exBadges.map((b) => {
                  const unlocked = exUnlocked.includes(b.id);
                  // Total for this user + exercise
                  const userTotal = liveExerciseLogs
                    .filter((l) => l.user_id === profile?.id)
                    .reduce((s, l) => s + l.count, 0);
                  const prevThreshold = exBadges
                    .filter((x) => x.threshold < b.threshold)
                    .sort((a, b) => b.threshold - a.threshold)[0]?.threshold ?? 0;
                  const range = b.threshold - prevThreshold;
                  const progress = unlocked ? 1 : range > 0 ? Math.min(1, (userTotal - prevThreshold) / range) : 0;
                  return { title: b.title, icon: b.icon, threshold: b.threshold, unlocked, progress, motif: medallionMotif(exercise.name) };
                }));
                const exTemporal = temporalBadges
                  .filter((b) => b.exercise_id === id)
                  .filter((b) => temporalTitles.some((t) => t.badge.id === b.id));

                // Next badge to unlock for this exercise
                const userTotal = liveExerciseLogs
                  .filter((l) => l.user_id === profile?.id)
                  .reduce((s, l) => s + l.count, 0);
                const nextBadge = exBadges
                  .filter((b) => !exUnlocked.includes(b.id))
                  .sort((a, b) => a.threshold - b.threshold)[0];
                const prevThreshold = nextBadge
                  ? (exBadges
                      .filter((x) => x.threshold < nextBadge.threshold)
                      .sort((a, b) => b.threshold - a.threshold)[0]?.threshold ?? 0)
                  : 0;
                const nextProgress = nextBadge && (nextBadge.threshold - prevThreshold) > 0
                  ? (userTotal - prevThreshold) / (nextBadge.threshold - prevThreshold)
                  : 0;

                return (
                  <>
                    {badgeItems.length > 0 && (
                      <BadgeRow badges={badgeItems} accent={profile?.color ?? t.accent} />
                    )}
                    {nextBadge && (
                      <View style={{ marginTop: 12, paddingHorizontal: 4 }}>
                        <Text style={{ fontSize: 11, fontWeight: "600", color: t.textSecondary, marginBottom: 4 }}>
                          Prochain badge : {nextBadge.title} — encore {nextBadge.threshold - userTotal} {exercise.unit}
                        </Text>
                        <View style={{ height: 4, borderRadius: 2, backgroundColor: t.cardBorder, overflow: "hidden" }}>
                          <View style={{ height: 4, borderRadius: 2, backgroundColor: t.accent, width: `${Math.round(nextProgress * 100)}%` as any }} />
                        </View>
                      </View>
                    )}
                    {exTemporal.length > 0 && (
                      <View style={{ marginTop: 12 }}>
                        <Text style={{ fontSize: 12, fontWeight: "700", textTransform: "uppercase", color: t.textSecondary, marginBottom: 6 }}>
                          Titres actifs
                        </Text>
                        {exTemporal.map((b) => (
                          <View key={b.id} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4 }}>
                            <Ionicons name={b.icon as any} size={16} color={t.accent} />
                            <Text style={{ fontSize: 13, fontWeight: "600", color: t.text }}>{b.title}</Text>
                            <Text style={{ fontSize: 11, color: t.success }}>✓ actif</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    {collectiveTitle && (
                      <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: t.accentLight, borderRadius: 10 }}>
                        <Ionicons name={collectiveTitle.icon as any} size={18} color={t.accent} />
                        <Text style={{ fontSize: 13, fontWeight: "700", color: t.accent }}>{collectiveTitle.title}</Text>
                      </View>
                    )}
                  </>
                );
              })()}
            </View>
          )}

          {/* Records personnels — débloqués au niveau 3 (spec §5.2) */}
          {levelInfo.level >= 3 && records.bestSeries != null && records.bestDay != null && (
            <View testID="personal-records" style={[styles.recordsRow, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
              <Ionicons name="trophy-outline" size={16} color={t.accent} />
              <Text style={[styles.recordsText, { color: t.textSecondary }]} numberOfLines={2}>
                Meilleure journée : <Text style={{ color: t.text, fontWeight: "700" }}>{records.bestDay.total}</Text>
                {" "}({formatDayLabel(records.bestDay.day)}) · Meilleure série :{" "}
                <Text style={{ color: t.text, fontWeight: "700" }}>{records.bestSeries}</Text>
              </Text>
            </View>
          )}

          {/* Series for selected day */}
          {selectedSeries.map((log, i) => (
            <View
              key={log.id}
              style={[styles.seriesCard, { backgroundColor: t.card, borderColor: t.cardBorder }]}
            >
              <Text style={[styles.seriesLabel, { color: t.textSecondary }]}>Série {i + 1}</Text>
              <RepStepper
                count={log.count}
                onCommit={(n) => void updateLog(log.id, n)}
                onChange={(n) => handleLiveChange(log.id, n)}
              />
              <Text style={[styles.seriesUnit, { color: t.textMuted }]}>{exercise.unit}</Text>
            </View>
          ))}

          {/* Ghost card */}
          <Pressable
            testID="add-series"
            style={[styles.ghostCard, { borderColor: t.cardBorder }]}
            onPress={() => void handleAddSeries()}
          >
            <Ionicons name="add-circle-outline" size={22} color={t.textMuted} />
            <Text style={[styles.ghostText, { color: t.textMuted }]}>Ajouter une série</Text>
          </Pressable>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
      <BadgeUnlockOverlay
        visible={!!newBadge}
        badgeTitle={newBadge?.title ?? ""}
        badgeIcon="ribbon-outline"
        medallion={newBadge ? { motif: newBadge.motif, tier: newBadge.tier } : undefined}
        onDismiss={() => setNewBadge(null)}
      />
    </SafeAreaView>
  );
}

function formatDayLabelFull(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
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
  barHitArea: { width: BAR_WIDTH + 8, alignItems: "center", justifyContent: "flex-end", borderRadius: 6, paddingBottom: 2 },
  barStack: { width: BAR_WIDTH - 4, borderRadius: 4, overflow: "hidden", justifyContent: "flex-end" },
  barSegment: { width: BAR_WIDTH - 4 },
  barSingle: { width: BAR_WIDTH - 4, borderRadius: 4 },
  barLabel: { fontSize: 10, marginTop: 4, height: CHART_LABEL_HEIGHT, textAlign: "center" },
  barLabelSelected: { fontWeight: "700" },

  // Total banner
  totalBanner: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    marginHorizontal: 16, marginBottom: 16,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
  },
  totalLabel: { fontSize: 14, fontWeight: "700", marginBottom: 4 },
  totalValue: { fontSize: 22, fontWeight: "800" },
  totalUsers: { gap: 2 },
  totalUserRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  totalUserDot: { width: 7, height: 7, borderRadius: 4 },
  totalUserName: { fontSize: 12 },
  totalUserLevel: { fontSize: 10, fontWeight: "800" },
  totalUserCount: { fontSize: 12, fontWeight: "600" },

  // Records personnels
  recordsRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 16, marginBottom: 12,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
  },
  recordsText: { flex: 1, fontSize: 12 },

  // Series cards
  seriesCard: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 16, marginBottom: 8,
    borderWidth: 1, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14,
  },
  seriesLabel: { fontSize: 12, fontWeight: "600", width: 50 },
  seriesUnit: { fontSize: 12, width: 70, textAlign: "right" },

  // Ghost card
  ghostCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    marginHorizontal: 16, marginBottom: 8,
    borderWidth: 1.5, borderRadius: 14, borderStyle: "dashed",
    paddingVertical: 14,
  },
  ghostText: { fontSize: 14, fontWeight: "600" },
});