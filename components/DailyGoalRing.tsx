import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "../lib/theme";

const RADIUS = 11;
const STROKE = 3;
const CENTER = RADIUS + STROKE;
const SIZE = CENTER * 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type DailyGoalRingProps = {
  current: number;
  goal: number;
  accent: string;
};

/** Anneau d'objectif quotidien (spec §5.4) — rempli sans animation au mount */
export function DailyGoalRing({ current, goal, accent }: DailyGoalRingProps) {
  const t = useTheme();
  const progress = Math.min(1, goal > 0 ? current / goal : 0);
  const done = current >= goal;

  return (
    <View style={styles.container} testID="daily-goal-ring">
      <Svg width={SIZE} height={SIZE}>
        <Circle cx={CENTER} cy={CENTER} r={RADIUS} stroke={t.cardBorder} strokeWidth={STROKE} fill="transparent" />
        <Circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          stroke={done ? t.success : accent}
          strokeWidth={STROKE}
          fill="transparent"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
          strokeLinecap="round"
          rotation="-90"
          origin={`${CENTER}, ${CENTER}`}
        />
      </Svg>
      <Text style={[styles.label, { color: done ? t.success : t.textMuted }]}>
        {current}/{goal}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", gap: 1 },
  label: { fontSize: 9, fontWeight: "700" },
});
