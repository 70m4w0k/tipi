import React, { useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Chore, ChoreTask, Profile } from "../lib/types";
import { useTheme } from "../lib/theme";

const TASK_COL_WIDTH = 110;
const WEEK_COL_WIDTH = 46;
const HEADER_HEIGHT = 30;
const CELL_HEIGHT = 40;

export function getISOWeekYear(date: Date): { week: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { week, year: d.getUTCFullYear() };
}

function mondayOfWeek(week: number, year: number): Date {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7;
  const mondayWeek1 = new Date(jan4);
  mondayWeek1.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1);
  const result = new Date(mondayWeek1);
  result.setUTCDate(mondayWeek1.getUTCDate() + (week - 1) * 7);
  return result;
}

export function buildWeeksFromFirstEntry(
  chores: Chore[]
): Array<{ week: number; year: number; label: string }> {
  const now = new Date();
  const current = getISOWeekYear(now);
  let earliest = { ...current };
  for (const c of chores) {
    if (c.year < earliest.year || (c.year === earliest.year && c.week < earliest.week)) {
      earliest = { week: c.week, year: c.year };
    }
  }
  if (chores.length === 0) {
    const ago = new Date(now);
    ago.setDate(ago.getDate() - 28);
    earliest = getISOWeekYear(ago);
  }
  const futureDate = new Date(now);
  futureDate.setDate(futureDate.getDate() + 35);
  const future = getISOWeekYear(futureDate);
  const weeks: Array<{ week: number; year: number; label: string }> = [];
  let cursor = mondayOfWeek(earliest.week, earliest.year);
  const endMonday = mondayOfWeek(future.week, future.year);
  while (cursor <= endMonday) {
    const wy = getISOWeekYear(cursor);
    const dd = String(cursor.getDate()).padStart(2, "0");
    const mm = String(cursor.getMonth() + 1).padStart(2, "0");
    weeks.push({ week: wy.week, year: wy.year, label: `${dd}/${mm}` });
    cursor.setDate(cursor.getDate() + 7);
  }
  return weeks;
}

function intensityOpacity(intensity: number): number {
  switch (intensity) {
    case 1: return 0.35;
    case 2: return 0.65;
    case 3: return 1.0;
    default: return 0;
  }
}

type Props = {
  chores: Chore[];
  tasks: ChoreTask[];
  currentUserId: string;
  members: Profile[];
  filterMode: "me" | "all";
  showHidden?: boolean;
  onCellPress: (taskName: string, week: number, year: number) => void;
  onTaskPress: (taskId: string, taskName: string) => void;
};

export default function ChoreGrid({
  chores, tasks, currentUserId, members, filterMode, showHidden, onCellPress, onTaskPress,
}: Props) {
  const t = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const weeks = useMemo(() => buildWeeksFromFirstEntry(chores), [chores]);
  const currentWeek = useMemo(() => getISOWeekYear(new Date()), []);
  const visibleTasks = useMemo(() => showHidden ? tasks : tasks.filter((tk) => tk.show_in_grid), [tasks, showHidden]);

  const cellMap = useMemo(() => {
    const map: Record<string, Array<{ userId: string; intensity: number; color: string }>> = {};
    const colors: Record<string, string> = {};
    for (const m of members) colors[m.id] = m.color || "#6B7280";
    for (const c of chores) {
      if (c.intensity === 0) continue;
      if (filterMode === "me" && c.user_id !== currentUserId) continue;
      const key = `${c.task_name}|${c.week}|${c.year}`;
      if (!map[key]) map[key] = [];
      map[key].push({ userId: c.user_id, intensity: c.intensity, color: colors[c.user_id] || "#6B7280" });
    }
    return map;
  }, [chores, members, filterMode, currentUserId]);

  useEffect(() => {
    const idx = weeks.findIndex((w) => w.week === currentWeek.week && w.year === currentWeek.year);
    if (idx >= 0 && scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ x: Math.max(0, idx * WEEK_COL_WIDTH - WEEK_COL_WIDTH * 2), animated: false });
      }, 100);
    }
  }, [weeks, currentWeek]);

  return (
    <View style={[styles.outer, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
      {/* Fixed first column */}
      <View style={[styles.fixedCol, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
        <View style={[styles.taskHeader, { backgroundColor: t.background, borderColor: t.cardBorder }]}>
          <Text style={[styles.taskHeaderText, { color: t.textSecondary }]}>Tâche</Text>
        </View>
        {visibleTasks.map((task) => (
          <TouchableOpacity
            key={task.id}
            style={[styles.taskCell, { borderColor: t.cardBorder, backgroundColor: t.card }]}
            onPress={() => onTaskPress(task.id, task.name)}
            activeOpacity={0.7}
          >
            <Text style={[styles.taskCellText, { color: t.text }]} numberOfLines={1}>{task.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Scrollable weeks */}
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        bounces={false}
      >
        <View>
          {/* Week headers */}
          <View style={styles.row}>
            {weeks.map((w) => {
              const cur = w.week === currentWeek.week && w.year === currentWeek.year;
              return (
                <View key={`h-${w.week}-${w.year}`} style={[styles.weekHeader, { backgroundColor: t.background, borderColor: t.cardBorder }, cur && { backgroundColor: t.accentLight }]}>
                  <Text style={[styles.weekHeaderText, { color: t.textSecondary }, cur && { color: t.accent, fontWeight: "700" }]}>{w.label}</Text>
                </View>
              );
            })}
          </View>
          {/* Data rows */}
          {visibleTasks.map((task) => (
            <View key={task.id} style={styles.row}>
              {weeks.map((w) => {
                const key = `${task.name}|${w.week}|${w.year}`;
                const entries = cellMap[key] || [];
                const cur = w.week === currentWeek.week && w.year === currentWeek.year;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.cell, { borderColor: t.cardBorder, backgroundColor: t.card }, cur && { backgroundColor: t.accentLight }]}
                    onPress={() => onCellPress(task.name, w.week, w.year)}
                    activeOpacity={0.6}
                  >
                    {entries.length > 0 && (
                      <View style={styles.segmentRow}>
                        {entries.map((e, i) => (
                          <View
                            key={e.userId}
                            style={{
                              backgroundColor: e.color,
                              opacity: intensityOpacity(e.intensity),
                              flex: 1,
                              marginLeft: i > 0 ? 1 : 0,
                              borderRadius: 2,
                            }}
                          />
                        ))}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      {tasks.length === 0 && (
        <View style={styles.emptyRow}>
          <Text style={[styles.emptyText, { color: t.textMuted }]}>Aucune tâche.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flexDirection: "row",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
    borderWidth: 1,
    overflow: "hidden",
  },
  fixedCol: {
    zIndex: 1,
    backgroundColor: "#FFFFFF",
    borderRightWidth: 1,
    borderColor: "#E5E7EB",
  },
  row: { flexDirection: "row" },
  taskHeader: {
    width: TASK_COL_WIDTH,
    height: HEADER_HEIGHT,
    justifyContent: "center",
    paddingHorizontal: 8,
    backgroundColor: "#F4F6FA",
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  taskHeaderText: { fontSize: 11, fontWeight: "700", color: "#374151" },
  weekHeader: {
    width: WEEK_COL_WIDTH,
    height: HEADER_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F4F6FA",
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  weekHeaderCurrent: { backgroundColor: "#DBEAFE" },
  weekHeaderText: { fontSize: 9, fontWeight: "600", color: "#6B7280" },
  weekHeaderTextCurrent: { color: "#1D4ED8", fontWeight: "700" },
  taskCell: {
    width: TASK_COL_WIDTH,
    height: CELL_HEIGHT,
    justifyContent: "center",
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  taskCellText: { fontSize: 12, fontWeight: "500", color: "#1F2937" },
  cell: {
    width: WEEK_COL_WIDTH,
    height: CELL_HEIGHT,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    padding: 2,
  },
  cellCurrent: { backgroundColor: "#F0F5FF" },
  segmentRow: {
    flex: 1,
    flexDirection: "row",
    borderRadius: 2,
    overflow: "hidden",
  },
  emptyRow: { padding: 20, alignItems: "center" },
  emptyText: { fontSize: 13, color: "#9CA3AF" },
});
