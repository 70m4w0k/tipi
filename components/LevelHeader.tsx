import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "../lib/theme";
import { LevelInfo } from "../lib/sport-logic";

const RING = 64;
const R = 27;
const STROKE = 5;
const C = 2 * Math.PI * R;

type CollectiveTitle = { title: string; icon: string } | null;

type LevelHeaderProps = {
  levelInfo: LevelInfo;
  xp: number;
  sportTitle?: string | null;
  collectiveTitle?: CollectiveTitle;
  onPress?: () => void;
};

/** Héros du tableau de bord : anneau de niveau + XP restante + titre collectif */
export function LevelHeader({ levelInfo, xp, sportTitle, collectiveTitle, onPress }: LevelHeaderProps) {
  const t = useTheme();
  const remaining = levelInfo.xpForNext - xp;

  return (
    <Pressable
      testID="level-header"
      style={[styles.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.ringWrap}>
        <Svg width={RING} height={RING}>
          <Circle cx={RING / 2} cy={RING / 2} r={R} stroke={t.cardBorder} strokeWidth={STROKE} fill="none" />
          <Circle
            cx={RING / 2}
            cy={RING / 2}
            r={R}
            stroke={t.accent}
            strokeWidth={STROKE}
            fill="none"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - levelInfo.progress)}
            strokeLinecap="round"
            rotation="-90"
            origin={`${RING / 2}, ${RING / 2}`}
          />
        </Svg>
        <View style={styles.ringCenter}>
          <Text style={[styles.ringLevel, { color: t.accent }]}>{levelInfo.level}</Text>
        </View>
      </View>

      <View style={styles.meta}>
        <View style={[styles.chip, { backgroundColor: t.accentLight }]} testID="level-chip">
          <Text style={[styles.chipText, { color: t.accent }]} numberOfLines={1}>
            {sportTitle ? sportTitle : `Niv. ${levelInfo.level}`}
          </Text>
        </View>
        <Text style={[styles.xpLine, { color: t.textMuted }]}>
          {remaining} XP → Niv. {levelInfo.level + 1}
        </Text>
        {collectiveTitle && (
          <View style={styles.collective}>
            <Ionicons name={collectiveTitle.icon as any} size={12} color={t.textSecondary} />
            <Text style={[styles.collectiveText, { color: t.textSecondary }]} numberOfLines={1}>
              {collectiveTitle.title}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row", alignItems: "center", gap: 14,
    borderWidth: 1, borderRadius: 16,
    paddingHorizontal: 16, paddingVertical: 14, marginBottom: 12,
  },
  ringWrap: { width: RING, height: RING, alignItems: "center", justifyContent: "center" },
  ringCenter: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  ringLevel: { fontSize: 22, fontWeight: "800", fontVariant: ["tabular-nums"] },
  meta: { flex: 1, gap: 5 },
  chip: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, maxWidth: "100%" },
  chipText: { fontSize: 13, fontWeight: "800" },
  xpLine: { fontSize: 11, fontWeight: "600", fontVariant: ["tabular-nums"] },
  collective: { flexDirection: "row", alignItems: "center", gap: 4 },
  collectiveText: { fontSize: 11, fontWeight: "600" },
});
