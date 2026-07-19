import React, { useEffect, useRef } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from "react-native-reanimated";
import { useTheme } from "../lib/theme";

export type BadgeItem = {
  title: string;
  icon: string;
  threshold: number;
  unlocked?: boolean;
};

function BadgeIcon({ badge, accent, isNew }: { badge: BadgeItem; accent: string; isNew: boolean }) {
  const t = useTheme();
  const scale = useSharedValue(isNew ? 0 : 1);
  const opacity = useSharedValue(isNew ? 0 : 1);

  useEffect(() => {
    if (isNew) {
      opacity.value = withTiming(1, { duration: 300 });
      scale.value = withSpring(1, { damping: 8, stiffness: 150 });
    }
  }, [isNew]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const unlocked = badge.unlocked ?? false;

  return (
    <Animated.View style={[styles.badgeContainer, animStyle]}>
      <View
        style={[
          styles.badgeCircle,
          { backgroundColor: unlocked ? accent : t.cardBorder },
        ]}
      >
        <Ionicons name={badge.icon as any} size={16} color={unlocked ? "#FFFFFF" : t.textMuted} />
      </View>
      <Text
        style={[styles.badgeTitle, { color: unlocked ? t.text : t.textMuted }]}
        numberOfLines={2}
      >
        {badge.title}
      </Text>
      {!unlocked && (
        <Text style={[styles.badgeThreshold, { color: t.textMuted }]}>
          {badge.threshold}
        </Text>
      )}
    </Animated.View>
  );
}

export function BadgeRow({ badges, accent }: { badges: BadgeItem[]; accent: string }) {
  const t = useTheme();
  const prevRef = useRef<Set<string>>(new Set());

  // Track which badges are newly unlocked since last render
  const newIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    const prev = prevRef.current;
    const current = new Set(
      badges.filter((b) => b.unlocked).map((b) => `${b.threshold}:${b.title}`)
    );
    newIds.current = new Set([...current].filter((id) => !prev.has(id)));
    prevRef.current = current;
  }, [badges]);

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
            isNew={newIds.current.has(`${b.threshold}:${b.title}`)}
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
  badgeCircle: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  badgeTitle: { fontSize: 10, fontWeight: "600", textAlign: "center", lineHeight: 13 },
  badgeThreshold: { fontSize: 9, marginTop: 2 },
});