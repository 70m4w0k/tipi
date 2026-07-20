import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../lib/theme";
import { LevelInfo } from "../lib/sport-logic";

type LevelHeaderProps = {
  levelInfo: LevelInfo;
  xp: number;
  /** Titre choisi (gate niveau 5) affiché à la place de "Niv. X" */
  sportTitle?: string | null;
  onPress?: () => void;
};

/** Carte de progression : chip de niveau + barre d'XP vers le niveau suivant */
export function LevelHeader({ levelInfo, xp, sportTitle, onPress }: LevelHeaderProps) {
  const t = useTheme();
  const remaining = levelInfo.xpForNext - xp;

  return (
    <Pressable
      testID="level-header"
      style={[styles.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.chip, { backgroundColor: t.accentLight }]} testID="level-chip">
        <Text style={[styles.chipText, { color: t.accent }]}>
          {sportTitle ? sportTitle : `Niv. ${levelInfo.level}`}
        </Text>
      </View>
      <View style={styles.barArea}>
        <View style={[styles.barTrack, { backgroundColor: t.cardBorder }]}>
          <View
            style={[
              styles.barFill,
              { backgroundColor: t.accent, width: `${Math.round(levelInfo.progress * 100)}%` as any },
            ]}
          />
        </View>
        <Text style={[styles.barLabel, { color: t.textMuted }]}>
          {remaining} XP → Niv. {levelInfo.level + 1}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderWidth: 1, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12,
  },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  chipText: { fontSize: 13, fontWeight: "800" },
  barArea: { flex: 1, gap: 4 },
  barTrack: { height: 5, borderRadius: 3, overflow: "hidden" },
  barFill: { height: 5, borderRadius: 3 },
  barLabel: { fontSize: 11, fontWeight: "600" },
});
