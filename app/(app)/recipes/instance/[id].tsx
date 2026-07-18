import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { useAuth } from "../../../../lib/hooks/useAuth";
import { useRecipes } from "../../../../lib/hooks/useRecipes";
import { useTheme } from "../../../../lib/theme";
import { haptic } from "../../../../lib/haptics";
import { formatDuration } from "../../../../lib/calendar-logic";
import { LiquidProgress } from "../../../../components/LiquidProgress";
import { DurationUnit, RecipeStep } from "../../../../lib/types";

function durationToMs(value: number, unit: DurationUnit): number {
  if (value <= 0) return 0;
  switch (unit) {
    case "minutes": return value * 60_000;
    case "hours": return value * 3_600_000;
    case "days": return value * 86_400_000;
    default: return 0;
  }
}

function stepProgress(step: RecipeStep, stepStartedAt: string | null): number {
  const totalMs = durationToMs(step.duration_value ?? 0, step.duration_unit);
  if (totalMs <= 0 || !stepStartedAt) return 0;
  const elapsed = Date.now() - new Date(stepStartedAt).getTime();
  return Math.min(Math.max(elapsed / totalMs, 0.02), 1);
}

function formatCountdown(remainingMs: number): string {
  if (remainingMs <= 0) return "00:00:00";
  const totalSec = Math.floor(remainingMs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

type FlippableStepCardProps = {
  step: RecipeStep;
  stepIdx: number;
  isCurrent: boolean;
  stepProgress: number;
  userColor: string;
  t: ReturnType<typeof useTheme>;
  stepStartedAt: string | null;
  tick: number;
  onFlip: () => void;
};

function FlippableStepCard({
  step, stepIdx, isCurrent, stepProgress: prog, userColor, t,
  stepStartedAt, tick, onFlip,
}: FlippableStepCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const rotateY = useSharedValue(0);
  const isAnimating = useSharedValue(false);

  const toggleFlip = () => {
    if (isAnimating.value) return;
    isAnimating.value = true;
    const target = !isFlipped;

    // Animate to edge-on (90°)
    rotateY.value = withTiming(90, { duration: 180 }, (finished) => {
      if (finished) {
        // Swap content at midpoint via runOnJS
        runOnJS(setIsFlipped)(target);
        // Animate back from edge-on to flat (0°)
        rotateY.value = withTiming(0, { duration: 180 }, (finished2) => {
          if (finished2) {
            isAnimating.value = false;
            runOnJS(onFlip)();
          } else {
            isAnimating.value = false;
          }
        });
      } else {
        isAnimating.value = false;
      }
    });
  };

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 800 },
      { rotateY: `${rotateY.value}deg` },
    ],
  }));

  // Compute back-face dates
  const startDate = stepStartedAt ? formatDateShort(stepStartedAt) : null;
  const endDate = useMemo(() => {
    if (!stepStartedAt) return null;
    const totalMs = durationToMs(step.duration_value ?? 0, step.duration_unit);
    if (totalMs <= 0) return null;
    return formatDateShort(new Date(new Date(stepStartedAt).getTime() + totalMs).toISOString());
  }, [stepStartedAt, step.duration_value, step.duration_unit]);

  // Countdown
  const remainingMs = useMemo(() => {
    if (!stepStartedAt) return 0;
    const totalMs = durationToMs(step.duration_value ?? 0, step.duration_unit);
    if (totalMs <= 0) return 0;
    const end = new Date(stepStartedAt).getTime() + totalMs;
    return Math.max(0, end - Date.now());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tick triggers recompute
  }, [stepStartedAt, step.duration_value, step.duration_unit, tick]);

  const showCountdown = isCurrent && remainingMs > 0;

  return (
    <Animated.View style={[styles.flipContainer, animStyle]}>
      {!isFlipped ? (
        /* Front face */
        <View style={[
          styles.timelineCard,
          { backgroundColor: t.card, borderColor: t.cardBorder },
          { borderColor: userColor, borderWidth: 2 },
        ]}>
          <LiquidProgress progress={prog} color={userColor} borderRadius={10} />
          <View style={{ zIndex: 1 }}>
            <View style={styles.timelineCardHeader}>
              <Text style={[styles.timelineStepNum, { color: userColor }]}>Étape {stepIdx + 1}</Text>
              <Pressable
                hitSlop={8}
                onPress={() => { void haptic.light(); toggleFlip(); }}
              >
                <Ionicons name="information-circle-outline" size={18} color={userColor} />
              </Pressable>
            </View>
            <Text style={[styles.timelineTitle, { color: t.text }]}>{step.title}</Text>
            {step.description ? (
              <Text style={[styles.timelineDesc, { color: t.textSecondary }]}>{step.description}</Text>
            ) : null}
            {formatDuration(step) ? (
              <View style={styles.timelineDurationRow}>
                <Ionicons name="time-outline" size={12} color={t.textMuted} />
                <Text style={[styles.timelineDuration, { color: t.textMuted }]}>{formatDuration(step)}</Text>
              </View>
            ) : null}
          </View>
        </View>
      ) : (
        /* Back face */
        <View style={[
          styles.timelineCard,
          { backgroundColor: t.card, borderColor: t.cardBorder },
          { borderColor: userColor, borderWidth: 2 },
        ]}>
          <LiquidProgress progress={prog} color={userColor} borderRadius={10} />
          <View style={{ zIndex: 1, flex: 1 }}>
            <View style={styles.timelineCardHeader}>
              {startDate ? (
                <Text style={[styles.backDate, { color: t.textSecondary }]}>Début : {startDate}</Text>
              ) : (
                <View />
              )}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                {endDate ? (
                  <Text style={[styles.backDate, { color: t.textSecondary }]}>Fin : {endDate}</Text>
                ) : null}
                <Pressable
                  hitSlop={8}
                  onPress={() => { void haptic.light(); toggleFlip(); }}
                >
                  <Ionicons name="information-circle" size={18} color={userColor} />
                </Pressable>
              </View>
            </View>
            <View style={styles.countdownCenter}>
              {showCountdown ? (
                <Text style={[styles.countdownText, { color: t.text }]}>{formatCountdown(remainingMs)}</Text>
              ) : (
                <Text style={[styles.countdownPlaceholder, { color: t.textMuted }]}>—</Text>
              )}
            </View>
          </View>
        </View>
      )}
    </Animated.View>
  );
}

const DOT_SIZE = 22;
const LINE_WIDTH = 2;

export default function InstanceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const {
    recipes, instances,
    advanceStep, goBackStep, completeInstance, activatePlannedInstance,
    updateInstanceNotes, deleteInstance, fetchAll,
  } = useRecipes(profile?.household_id);
  const t = useTheme();
  const router = useRouter();
  const userColor = profile?.color ?? t.accent;

  const inst = instances.find((i) => i.id === id);
  const recipe = inst ? recipes.find((r) => r.id === inst.recipe_id) : null;

  const [editingNotes, setEditingNotes] = useState(inst?.notes ?? "");
  const [notesChanged, setNotesChanged] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [notesFocused, setNotesFocused] = useState(false);

  // Real-time tick for progress animation & countdown
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 100);
    return () => clearInterval(id);
  }, []);

  // Auto-scroll de la timeline verticale vers l'étape en cours.
  const contentScrollRef = useRef<ScrollView>(null);
  const timelineTopY = useRef(0);
  const currentStepY = useRef(0);

  useEffect(() => {
    if (!notesChanged && inst) setEditingNotes(inst.notes ?? "");
  }, [inst?.notes]);

  useEffect(() => {
    if (!inst) return;
    const tid = setTimeout(() => {
      const y = timelineTopY.current + currentStepY.current - 90;
      contentScrollRef.current?.scrollTo({ y: Math.max(0, y), animated: true });
    }, 250);
    return () => clearTimeout(tid);
  }, [inst?.current_step, inst?.id]);

  if (!inst || !recipe) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: t.background }]}>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: t.textMuted }]}>Instance introuvable</Text>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: t.accent, fontWeight: "600" }}>Retour</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const isCompleted = !!inst.completed_at;
  const isPlannedOnly = !!inst.target_date && inst.current_step === 0 && (inst.step_completions ?? []).length === 0 && !isCompleted;
  const steps = recipe.steps;
  const currentStep = inst.current_step;
  const isLast = currentStep >= steps.length - 1;

  const stepColor = (idx: number) => {
    if (isCompleted || idx < currentStep) return userColor;
    if (idx === currentStep && !isPlannedOnly) return userColor;
    return t.textMuted;
  };

  const stepDate = (idx: number) => {
    if (idx < (inst.step_completions ?? []).length) {
      return new Date(inst.step_completions[idx]).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
    }
    if (idx === currentStep && inst.step_started_at) {
      return new Date(inst.step_started_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
    }
    return "";
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.background }]} edges={["top"]}>
      <View style={[styles.header, { backgroundColor: t.card, borderBottomColor: t.cardBorder }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={t.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: t.text }]} numberOfLines={1}>{inst.label}</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
      <ScrollView
        ref={contentScrollRef}
        contentContainerStyle={[styles.content, !isCompleted && styles.contentWithBar]}
        keyboardShouldPersistTaps="handled"
      >
        {isCompleted && (
          <View style={[styles.completedBanner, { backgroundColor: t.successLight }]}>
            <Ionicons name="checkmark-circle" size={20} color={t.success} />
            <Text style={[styles.completedText, { color: t.success }]}>Recette terminée !</Text>
          </View>
        )}

        {/* Vertical timeline */}
        <View
          style={styles.timeline}
          onLayout={(e) => { timelineTopY.current = e.nativeEvent.layout.y; }}
        >
          {steps.map((step, idx) => {
            const color = stepColor(idx);
            const isDone = isCompleted || idx < currentStep;
            const isCurrent = idx === currentStep && !isCompleted && !isPlannedOnly;
            const isUpcoming = !isDone && !isCurrent;
            const date = stepDate(idx);

            return (
              <View
                key={idx}
                style={styles.timelineStep}
                onLayout={isCurrent ? (e) => { currentStepY.current = e.nativeEvent.layout.y; } : undefined}
              >
                {/* Left column: line + dot */}
                <View style={styles.timelineLeft}>
                  {idx > 0 ? (
                    <View style={[
                      styles.timelineLineSegment,
                      { flex: 1, backgroundColor: isDone ? userColor : t.textMuted, opacity: isUpcoming ? 0.3 : 1 },
                    ]} />
                  ) : (
                    <View style={{ flex: 1 }} />
                  )}
                  <View style={[
                    styles.timelineDot,
                    { borderColor: color },
                    isDone && { backgroundColor: color },
                    isCurrent && { borderWidth: 3 },
                    isUpcoming && { borderColor: t.textMuted, opacity: 0.5 },
                  ]}>
                    {isDone && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                  </View>
                  {idx < steps.length - 1 ? (
                    <View style={[
                      styles.timelineLineSegment,
                      { flex: 1, backgroundColor: isDone && !isCurrent ? userColor : t.textMuted, opacity: (isUpcoming || isCurrent) ? 0.3 : 1 },
                    ]} />
                  ) : (
                    <View style={{ flex: 1 }} />
                  )}
                </View>

                {/* Card */}
                {isCurrent ? (
                  <FlippableStepCard
                    step={step}
                    stepIdx={idx}
                    isCurrent
                    stepProgress={stepProgress(step, inst.step_started_at)}
                    userColor={userColor}
                    t={t}
                    stepStartedAt={inst.step_started_at}
                    tick={tick}
                    onFlip={() => {}}
                  />
                ) : (
                  <View style={[
                    styles.timelineCard,
                    { backgroundColor: t.card, borderColor: t.cardBorder },
                  ]}>
                    <LiquidProgress
                      progress={isDone ? 1 : 0}
                      color={userColor}
                      borderRadius={10}
                    />
                    <View style={{ zIndex: 1 }}>
                      <View style={styles.timelineCardHeader}>
                        <Text style={[styles.timelineStepNum, { color }]}>Étape {idx + 1}</Text>
                        {date ? <Text style={[styles.timelineDate, { color: t.textMuted }]}>{date}</Text> : null}
                      </View>
                      <Text style={[styles.timelineTitle, { color: t.text }]}>{step.title}</Text>
                      {step.description ? (
                        <Text style={[styles.timelineDesc, { color: t.textSecondary }]}>{step.description}</Text>
                      ) : null}
                      {formatDuration(step) ? (
                        <View style={styles.timelineDurationRow}>
                          <Ionicons name="time-outline" size={12} color={t.textMuted} />
                          <Text style={[styles.timelineDuration, { color: t.textMuted }]}>{formatDuration(step)}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Notes */}
        <View style={[styles.notesSection, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
          <Text style={[styles.notesTitle, { color: t.text }]}>Notes</Text>
          <TextInput
            style={[styles.notesInput, { borderColor: t.inputBorder, backgroundColor: t.inputBg, color: t.text }]}
            value={editingNotes}
            onChangeText={(v) => { setEditingNotes(v); setNotesChanged(true); }}
            onFocus={() => setNotesFocused(true)}
            onBlur={() => setNotesFocused(false)}
            multiline
            placeholder="Ajouter des notes..."
            placeholderTextColor={t.textMuted}
          />
          {notesChanged && (
            <Pressable
              style={[styles.saveNotesBtn, { backgroundColor: t.accent }]}
              onPress={() => {
                void updateInstanceNotes(inst.id, editingNotes);
                setNotesChanged(false);
                setNotesSaved(true);
                setTimeout(() => setNotesSaved(false), 2000);
              }}
            >
              <Text style={styles.saveNotesBtnText}>Enregistrer</Text>
            </Pressable>
          )}
          {notesSaved && (
            <View style={styles.notesSavedRow}>
              <Ionicons name="checkmark-circle" size={14} color={t.success} />
              <Text style={[styles.notesSavedText, { color: t.success }]}>Sauvegardé</Text>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Barre d'actions fixe (masquée pendant l'édition des notes / clavier ouvert) */}
      {!isCompleted && !notesFocused && (
        <View style={[styles.actionBar, { backgroundColor: t.card, borderTopColor: t.cardBorder }]}>
          {isPlannedOnly ? (
            <Pressable
              style={[styles.actionBtn, { backgroundColor: t.accent, flex: 1 }]}
              onPress={() => { void haptic.medium(); void activatePlannedInstance(inst.id); }}
            >
              <Ionicons name="play" size={16} color="#FFFFFF" />
              <Text style={styles.actionBtnText}>Démarrer</Text>
            </Pressable>
          ) : (
            <>
              {currentStep > 0 && (
                <Pressable
                  testID="recipe-step-back"
                  style={[styles.actionBtnSecondary, { borderColor: t.cardBorder, backgroundColor: t.background }]}
                  onPress={() => { void haptic.light(); void goBackStep(inst.id); }}
                >
                  <Ionicons name="arrow-back" size={16} color={t.textSecondary} />
                </Pressable>
              )}
              {!isLast ? (
                <Pressable
                  style={[styles.actionBtn, { backgroundColor: t.accent, flex: 1 }]}
                  onPress={() => { void haptic.success(); void advanceStep(inst.id); }}
                >
                  <Text style={styles.actionBtnText}>Étape suivante</Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                </Pressable>
              ) : (
                <Pressable
                  style={[styles.actionBtn, { backgroundColor: t.success, flex: 1 }]}
                  onPress={() => { void haptic.success(); void completeInstance(inst.id); }}
                >
                  <Text style={styles.actionBtnText}>Terminer</Text>
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                </Pressable>
              )}
            </>
          )}
        </View>
      )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  headerTitle: { fontSize: 18, fontWeight: "700", flex: 1 },
  content: { padding: 16 },
  contentWithBar: { paddingBottom: 96 }, // place pour la barre d'actions fixe
  emptyContainer: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15 },

  // Actions
  completedBanner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 10, marginBottom: 16 },
  completedText: { fontSize: 15, fontWeight: "700" },
  actionBar: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, borderTopWidth: 1 },
  actionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 },
  actionBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  actionBtnSecondary: { width: 44, height: 44, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },

  // Vertical timeline
  timeline: { marginLeft: 16, marginBottom: 16 },
  timelineStep: { flexDirection: "row" },
  timelineLeft: { alignItems: "center", width: DOT_SIZE, marginRight: 12 },
  timelineLineSegment: { width: LINE_WIDTH, minHeight: 8 },
  timelineDot: {
    width: DOT_SIZE, height: DOT_SIZE, borderRadius: DOT_SIZE / 2,
    borderWidth: 2,
    alignItems: "center", justifyContent: "center",
  },
  timelineCard: {
    flex: 1, borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8, overflow: "hidden",
  },
  timelineCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  timelineStepNum: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  timelineDate: { fontSize: 11 },
  timelineTitle: { fontSize: 15, fontWeight: "600" },
  timelineDesc: { fontSize: 13, marginTop: 4 },
  timelineDurationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  timelineDuration: { fontSize: 11 },

  // Flip card
  flipContainer: { flex: 1, marginBottom: 8 },
  backDate: { fontSize: 11 },
  countdownCenter: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 12 },
  countdownText: { fontSize: 26, fontWeight: "700", fontVariant: ["tabular-nums"] as const },
  countdownPlaceholder: { fontSize: 22, fontWeight: "300" },

  // Notes
  notesSection: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 12 },
  notesTitle: { fontSize: 15, fontWeight: "700", marginBottom: 8 },
  notesInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, minHeight: 80 },
  saveNotesBtn: { marginTop: 8, paddingVertical: 10, borderRadius: 8, alignItems: "center" },
  saveNotesBtnText: { color: "#FFFFFF", fontWeight: "600", fontSize: 14 },
  notesSavedRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, marginTop: 6 },
  notesSavedText: { fontSize: 12, fontWeight: "600" },
});
