import React, { useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Chore, ChoreTask, Profile } from "../lib/types";

// ── Constants ──

const TASK_COL_WIDTH = 190;
const WEEK_COL_WIDTH = 66;
const CELL_HEIGHT = 62;

// ── ISO week helpers ──

export function getISOWeekYear(date: Date): { week: number; year: number } {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  // Set to nearest Thursday (ISO week algorithm)
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return { week, year: d.getUTCFullYear() };
}

export function mondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function buildWeeksFromFirstEntry(
  chores: Chore[]
): Array<{ week: number; year: number; label: string }> {
  const now = new Date();
  const current = getISOWeekYear(now);

  // Find earliest entry
  let earliest = { ...current };
  for (const c of chores) {
    if (
      c.year < earliest.year ||
      (c.year === earliest.year && c.week < earliest.week)
    ) {
      earliest = { week: c.week, year: c.year };
    }
  }

  // If no chores, start 4 weeks ago
  if (chores.length === 0) {
    const fourWeeksAgo = new Date(now);
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    earliest = getISOWeekYear(fourWeeksAgo);
  }

  // Build from earliest to current + 5 weeks
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

function mondayOfWeek(week: number, year: number): Date {
  // Jan 4 is always in ISO week 1
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7;
  const mondayWeek1 = new Date(jan4);
  mondayWeek1.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1);
  const result = new Date(mondayWeek1);
  result.setUTCDate(mondayWeek1.getUTCDate() + (week - 1) * 7);
  return result;
}

// ── Intensity to opacity ──

function intensityOpacity(intensity: number): number {
  switch (intensity) {
    case 1:
      return 0.35;
    case 2:
      return 0.65;
    case 3:
      return 1.0;
    default:
      return 0;
  }
}

// ── Component ──

type Props = {
  chores: Chore[];
  tasks: ChoreTask[];
  currentUserId: string;
  members: Profile[];
  filterMode: "me" | "all";
  onCellPress: (taskName: string, week: number, year: number) => void;
};

export default function ChoreGrid({
  chores,
  tasks,
  currentUserId,
  members,
  filterMode,
  onCellPress,
}: Props) {
  const scrollRef = useRef<ScrollView>(null);

  const weeks = useMemo(() => buildWeeksFromFirstEntry(chores), [chores]);

  const currentWeek = useMemo(() => getISOWeekYear(new Date()), []);

  // Build lookup: key = "taskName|week|year" -> array of { userId, intensity, color }
  const cellMap = useMemo(() => {
    const map: Record<
      string,
      Array<{ userId: string; intensity: number; color: string }>
    > = {};

    const memberColors: Record<string, string> = {};
    for (const m of members) {
      memberColors[m.id] = m.color || "#6B7280";
    }

    for (const c of chores) {
      if (c.intensity === 0) continue;
      if (filterMode === "me" && c.user_id !== currentUserId) continue;

      const key = `${c.task_name}|${c.week}|${c.year}`;
      if (!map[key]) map[key] = [];
      map[key].push({
        userId: c.user_id,
        intensity: c.intensity,
        color: memberColors[c.user_id] || "#6B7280",
      });
    }

    return map;
  }, [chores, members, filterMode, currentUserId]);

  // Auto-scroll to current week on mount
  useEffect(() => {
    const currentIdx = weeks.findIndex(
      (w) => w.week === currentWeek.week && w.year === currentWeek.year
    );
    if (currentIdx >= 0 && scrollRef.current) {
      const offset = Math.max(0, currentIdx * WEEK_COL_WIDTH - WEEK_COL_WIDTH);
      setTimeout(() => {
        scrollRef.current?.scrollTo({ x: offset, animated: false });
      }, 100);
    }
  }, [weeks, currentWeek]);

  const renderCell = (taskName: string, w: { week: number; year: number }) => {
    const key = `${taskName}|${w.week}|${w.year}`;
    const entries = cellMap[key] || [];
    const isCurrent =
      w.week === currentWeek.week && w.year === currentWeek.year;

    return (
      <TouchableOpacity
        key={key}
        style={[styles.cell, isCurrent && styles.cellCurrent]}
        onPress={() => onCellPress(taskName, w.week, w.year)}
        activeOpacity={0.6}
      >
        {entries.length > 0 && (
          <View style={styles.segmentRow}>
            {entries.map((entry, idx) => (
              <View
                key={entry.userId}
                style={[
                  styles.segment,
                  {
                    backgroundColor: entry.color,
                    opacity: intensityOpacity(entry.intensity),
                    flex: 1,
                    marginLeft: idx > 0 ? 1 : 0,
                  },
                ]}
              />
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        bounces={false}
      >
        <View>
          {/* Header row */}
          <View style={styles.row}>
            <View style={styles.taskHeader}>
              <Text style={styles.taskHeaderText} numberOfLines={1}>
                Tache / Semaine
              </Text>
            </View>
            {weeks.map((w) => {
              const isCurrent =
                w.week === currentWeek.week && w.year === currentWeek.year;
              return (
                <View
                  key={`h-${w.week}-${w.year}`}
                  style={[
                    styles.weekHeader,
                    isCurrent && styles.weekHeaderCurrent,
                  ]}
                >
                  <Text
                    style={[
                      styles.weekHeaderText,
                      isCurrent && styles.weekHeaderTextCurrent,
                    ]}
                  >
                    {w.label}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Task rows */}
          {tasks.map((task) => (
            <View key={task.id} style={styles.row}>
              <View style={styles.taskCell}>
                <Text style={styles.taskCellText} numberOfLines={2}>
                  {task.name}
                </Text>
              </View>
              {weeks.map((w) => renderCell(task.name, w))}
            </View>
          ))}

          {tasks.length === 0 && (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>
                Aucune tache. Ajoutez-en une ci-dessus.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
    borderWidth: 1,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
  },
  taskHeader: {
    width: TASK_COL_WIDTH,
    height: 40,
    justifyContent: "center",
    paddingHorizontal: 10,
    backgroundColor: "#F4F6FA",
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  taskHeaderText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
  },
  weekHeader: {
    width: WEEK_COL_WIDTH,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F4F6FA",
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  weekHeaderCurrent: {
    backgroundColor: "#DBEAFE",
  },
  weekHeaderText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
  },
  weekHeaderTextCurrent: {
    color: "#1D4ED8",
    fontWeight: "700",
  },
  taskCell: {
    width: TASK_COL_WIDTH,
    height: CELL_HEIGHT,
    justifyContent: "center",
    paddingHorizontal: 10,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  taskCellText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#1F2937",
  },
  cell: {
    width: WEEK_COL_WIDTH,
    height: CELL_HEIGHT,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    padding: 3,
  },
  cellCurrent: {
    backgroundColor: "#F0F5FF",
  },
  segmentRow: {
    flex: 1,
    flexDirection: "row",
    borderRadius: 4,
    overflow: "hidden",
  },
  segment: {
    borderRadius: 3,
  },
  emptyRow: {
    padding: 24,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
    color: "#9CA3AF",
    fontStyle: "italic",
  },
});
