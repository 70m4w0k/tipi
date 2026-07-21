import { useEffect } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import { haptic } from "../lib/haptics";
import { useTheme } from "../lib/theme";
import { MedallionMotif } from "../lib/sport-logic";
import { BadgeMedallion } from "./BadgeMedallion";

type BadgeUnlockOverlayProps = {
  visible: boolean;
  badgeTitle: string;
  badgeIcon: string;
  onDismiss: () => void;
  /** Ligne au-dessus du titre (défaut : "Badge débloqué") */
  subtitle?: string;
  /** Ligne optionnelle sous le titre (ex. fonctionnalité débloquée par un niveau) */
  detail?: string;
  /** Médaillon RPG affiché à la place de l'icône Ionicons */
  medallion?: { motif: MedallionMotif; tier: number };
};

const RING_DURATION = 600;
const SPRING_CONFIG = { damping: 12, stiffness: 120 };

export function BadgeUnlockOverlay({ visible, badgeTitle, badgeIcon, onDismiss, subtitle, detail, medallion }: BadgeUnlockOverlayProps) {
  const t = useTheme();

  const overlayOpacity = useSharedValue(0);
  const badgeScale = useSharedValue(0.5);
  const ringScale = useSharedValue(0);
  const ringOpacity = useSharedValue(1);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(20);

  const triggerAnimation = () => {
    // Fade in overlay
    overlayOpacity.value = withTiming(1, { duration: 200 });
    // Badge spring
    badgeScale.value = withSequence(
      withTiming(0.5, { duration: 0 }),
      withSpring(1, SPRING_CONFIG)
    );
    // Ring
    ringScale.value = withTiming(2.5, { duration: RING_DURATION, easing: Easing.out(Easing.ease) });
    ringOpacity.value = withTiming(0, { duration: RING_DURATION, easing: Easing.out(Easing.ease) });
    // Title slide up
    titleOpacity.value = withTiming(1, { duration: 250 });
    titleTranslateY.value = withSpring(0, SPRING_CONFIG);
  };

  useEffect(() => {
    if (visible) {
      void haptic.success();
      triggerAnimation();
    } else {
      overlayOpacity.value = 0;
      badgeScale.value = 0.5;
      ringScale.value = 0;
      ringOpacity.value = 1;
      titleOpacity.value = 0;
      titleTranslateY.value = 20;
    }
  }, [visible]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible}>
      <Animated.View style={[styles.overlay, overlayStyle]}>
        <Pressable style={styles.tapArea} onPress={onDismiss}>
          <View style={styles.center}>
            {/* Glowing ring behind badge */}
            <Animated.View
              style={[
                styles.ring,
                ringStyle,
                { borderColor: t.accent },
              ]}
            />
            {/* Badge icon */}
            <Animated.View
              style={[
                styles.badgeCircle,
                badgeStyle,
                { backgroundColor: t.accent },
              ]}
            >
              {medallion ? (
                <BadgeMedallion motif={medallion.motif} tier={medallion.tier} size={68} color="#FFFFFF" />
              ) : (
                <Ionicons name={badgeIcon as any} size={48} color="#FFFFFF" />
              )}
            </Animated.View>
            {/* Title */}
            <Animated.View style={[titleStyle, { marginTop: 32 }]}>
              <Text style={[styles.subtitle, { color: t.textSecondary }]}>
                {subtitle ?? "Badge débloqué"}
              </Text>
              <Text style={[styles.title, { color: t.text }]}>
                {badgeTitle}
              </Text>
              {detail != null && (
                <Text style={[styles.detail, { color: t.textSecondary }]}>
                  {detail}
                </Text>
              )}
            </Animated.View>
          </View>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  tapArea: { flex: 1, justifyContent: "center", alignItems: "center", width: "100%" },
  center: { alignItems: "center" },
  ring: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
  },
  badgeCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  subtitle: { fontSize: 14, fontWeight: "600", textAlign: "center" },
  title: { fontSize: 22, fontWeight: "800", textAlign: "center", marginTop: 4 },
  detail: { fontSize: 13, fontWeight: "600", textAlign: "center", marginTop: 8 },
});