import React, { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "../lib/theme";
import { BadgeDisplayState } from "../lib/sport-logic";

export type BadgeItem = {
  title: string;
  icon: string;
  threshold: number;
  unlocked?: boolean;
  progress?: number; // 0-1, for progress ring on locked badges
  /** "hidden" = palier futur non révélé (affiché en "?") */
  state?: BadgeDisplayState;
};

const CIRCLE_RADIUS = 20;
const CIRCLE_STROKE = 3;
const CIRCLE_CENTER = CIRCLE_RADIUS + CIRCLE_STROKE;
const SVG_SIZE = CIRCLE_CENTER * 2;
const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

function BadgeIcon({ badge, accent, isNew }: { badge: BadgeItem; accent: string; isNew: boolean }) {
  const t = useTheme();
  const scale = useSharedValue(isNew ? 0.3 : 1);
  const opacity = useSharedValue(isNew ? 0 : 1);
  const progressAnim = useSharedValue(badge.progress ?? 0);

  useEffect(() => {
    if (isNew) {
      scale.value = 0.3;
      opacity.value = 0;
      const id = setTimeout(() => {
        opacity.value = withTiming(1, { duration: 250 });
        scale.value = withSpring(1, { damping: 8, stiffness: 150 });
      }, 50);
      return () => clearTimeout(id);
    }
  }, [isNew]);

  useEffect(() => {
    progressAnim.value = withTiming(badge.progress ?? 0, { duration: 400 });
  }, [badge.progress]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const unlocked = badge.unlocked ?? false;
  const state: BadgeDisplayState = badge.state ?? (unlocked ? "unlocked" : "next");
  const strokeOffset = CIRCUMFERENCE * (1 - (badge.progress ?? 0));

  if (state === "hidden") {
    return (
      <View style={styles.badgeContainer} testID={`badge-hidden-${badge.threshold}`}>
        <View style={styles.circleWrapper}>
          <View style={[styles.badgeCircle, { backgroundColor: t.cardBorder }]}>
            <Ionicons name="help-outline" size={16} color={t.textMuted} />
          </View>
        </View>
        <Text style={[styles.badgeTitle, { color: t.textMuted }]}>?</Text>
      </View>
    );
  }

  return (
    <Animated.View
      style={[styles.badgeContainer, animStyle]}
      testID={`badge-${state}-${badge.threshold}`}
    >
      <View style={styles.circleWrapper}>
        {/* SVG progress ring for locked badges */}
        {!unlocked && (badge.progress ?? 0) > 0 && (
          <Svg width={SVG_SIZE} height={SVG_SIZE} style={StyleSheet.absoluteFill}>
            <Circle
              cx={CIRCLE_CENTER}
              cy={CIRCLE_CENTER}
              r={CIRCLE_RADIUS}
              stroke={t.cardBorder}
              strokeWidth={CIRCLE_STROKE}
              fill="transparent"
            />
            <Circle
              cx={CIRCLE_CENTER}
              cy={CIRCLE_CENTER}
              r={CIRCLE_RADIUS}
              stroke={accent}
              strokeWidth={CIRCLE_STROKE}
              fill="transparent"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={strokeOffset}
              strokeLinecap="round"
              rotation="-90"
              origin={`${CIRCLE_CENTER}, ${CIRCLE_CENTER}`}
            />
          </Svg>
        )}
        {/* Badge circle */}
        <View style={[styles.badgeCircle, { backgroundColor: unlocked ? accent : t.cardBorder }]}>
          <Ionicons name={badge.icon as any} size={16} color={unlocked ? "#FFFFFF" : t.textMuted} />
        </View>
      </View>
      <Text style={[styles.badgeTitle, { color: unlocked ? t.text : t.textMuted }]} numberOfLines={2}>
        {badge.title}
      </Text>
      {!unlocked && (
        <Text style={[styles.badgeThreshold, { color: t.textMuted }]}>{badge.threshold}</Text>
      )}
    </Animated.View>
  );
}

export function BadgeRow({ badges, accent }: { badges: BadgeItem[]; accent: string }) {
  const t = useTheme();
  const prevUnlockedRef = useRef<Set<string>>(new Set());
  const [newBadgeKeys, setNewBadgeKeys] = useState<Set<string>>(new Set());

  const currentUnlocked = new Set(
    badges.filter((b) => b.unlocked).map((b) => `${b.threshold}:${b.title}`)
  );

  const prev = prevUnlockedRef.current;
  const newlyUnlocked = new Set([...currentUnlocked].filter((k) => !prev.has(k)));

  if (newlyUnlocked.size > 0 && prev.size > 0) {
    if (newBadgeKeys.size === 0 || ![...newlyUnlocked].every((k) => newBadgeKeys.has(k))) {
      setTimeout(() => setNewBadgeKeys(newlyUnlocked), 0);
    }
  }

  useEffect(() => { prevUnlockedRef.current = currentUnlocked; });

  useEffect(() => {
    if (newBadgeKeys.size > 0) {
      const id = setTimeout(() => setNewBadgeKeys(new Set()), 1500);
      return () => clearTimeout(id);
    }
  }, [newBadgeKeys]);

  if (badges.length === 0) return null;

  return (
    <View style={[styles.row, { borderTopColor: t.cardBorder }]}>
      <Text style={[styles.sectionTitle, { color: t.textSecondary }]}>Badges</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {badges.map((b, i) => (
          <BadgeIcon
            key={`${b.threshold}-${i}`}
            badge={b}
            accent={accent}
            isNew={newBadgeKeys.has(`${b.threshold}:${b.title}`)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  sectionTitle: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", marginBottom: 8, paddingHorizontal: 4 },
  scroll: { flexDirection: "row", gap: 12, paddingHorizontal: 4 },
  badgeContainer: { alignItems: "center", width: 64 },
  circleWrapper: { width: SVG_SIZE, height: SVG_SIZE, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  badgeCircle: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  badgeTitle: { fontSize: 10, fontWeight: "600", textAlign: "center", lineHeight: 13 },
  badgeThreshold: { fontSize: 9, marginTop: 2 },
});