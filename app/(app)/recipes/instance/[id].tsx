import React, { useCallback, useEffect, useState } from "react";
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
  Easing,
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

const DOT_SIZE = 22;
const LINE_WIDTH = 2;
const STEP_W = 100;

type StepperProps = {
  steps: RecipeStep[];
  currentStep: number;
  isCompleted: boolean;
  isPlannedOnly: boolean;
  userColor: string;
  mutedColor: string;
  bgColor: string;
  stepDateFn: (idx: number) => string;
};

// Label height (28) + marginBottom (4) = 32. Line sits at center of dot row: 32 + DOT_SIZE/2
const LABEL_AREA = 32;

function StepperAnimated({ steps, currentStep, isCompleted, isPlannedOnly, userColor, mutedColor, bgColor, stepDateFn }: StepperProps) {
  const progressAnim = useSharedValue(0);
  const targetStep = isCompleted ? steps.length - 1 : isPlannedOnly ? -1 : currentStep;

  useEffect(() => {
    const target = targetStep >= 0 && steps.length > 1 ? targetStep * STEP_W : 0;
    progressAnim.value = withTiming(target, { duration: 400, easing: Easing.out(Easing.cubic) });
  }, [targetStep, steps.length]);

  const coloredLineStyle = useAnimatedStyle(() => ({
    width: progressAnim.value,
  }));

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={stepperStyles.container}>
      <View style={stepperStyles.inner}>
        {/* Single grey baseline from first dot center to last dot center */}
        {steps.length > 1 && (
          <View style={[stepperStyles.baseline, {
            left: STEP_W / 2,
            width: (steps.length - 1) * STEP_W,
            top: LABEL_AREA + DOT_SIZE / 2 - LINE_WIDTH / 2,
            backgroundColor: mutedColor,
            opacity: 0.3,
          }]} />
        )}
        {/* Animated colored line overlay */}
        {steps.length > 1 && (
          <Animated.View style={[stepperStyles.baseline, {
            left: STEP_W / 2,
            top: LABEL_AREA + DOT_SIZE / 2 - LINE_WIDTH / 2,
            backgroundColor: userColor,
          }, coloredLineStyle]} />
        )}
        {/* Steps (dots + labels) */}
        <View style={stepperStyles.layer}>
          {steps.map((step, idx) => {
            const isDone = isCompleted || idx < currentStep;
            const isCurrent = idx === currentStep && !isCompleted && !isPlannedOnly;
            const isUpcoming = !isDone && !isCurrent;
            const dotColor = isDone || isCurrent ? userColor : mutedColor;
            const date = stepDateFn(idx);

            return (
              <View key={idx} style={stepperStyles.step}>
                <Text
                  style={[stepperStyles.label, { color: isUpcoming ? mutedColor : dotColor }]}
                  numberOfLines={2}
                >
                  {step.title}
                </Text>
                <View style={stepperStyles.dotRow}>
                  <View style={[
                    stepperStyles.dot,
                    { borderColor: dotColor, backgroundColor: bgColor },
                    isDone && { backgroundColor: userColor },
                    isCurrent && { borderWidth: 3 },
                    isUpcoming && { opacity: 0.4, borderColor: mutedColor },
                  ]} />
                </View>
                <Text style={[stepperStyles.date, { color: mutedColor }]}>{date}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const stepperStyles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 8, paddingVertical: 12, marginBottom: 12 },
  inner: { position: "relative" },
  layer: { flexDirection: "row" },
  baseline: { position: "absolute", height: LINE_WIDTH, zIndex: 0 },
  step: { alignItems: "center", width: STEP_W, zIndex: 1 },
  label: { fontSize: 10, fontWeight: "600", textAlign: "center", height: 28, marginBottom: 4 },
  dotRow: { alignItems: "center", justifyContent: "center", height: DOT_SIZE },
  dot: { width: DOT_SIZE, height: DOT_SIZE, borderRadius: DOT_SIZE / 2, borderWidth: 2 },
  date: { fontSize: 9, marginTop: 4, height: 14 },
});

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

  useEffect(() => {
    if (!notesChanged && inst) setEditingNotes(inst.notes ?? "");
  }, [inst?.notes]);

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
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Horizontal stepper */}
        <View>
          <StepperAnimated
            steps={steps}
            currentStep={currentStep}
            isCompleted={isCompleted}
            isPlannedOnly={isPlannedOnly}
            userColor={userColor}
            mutedColor={t.textMuted}
            bgColor={t.background}
            stepDateFn={stepDate}
          />
        </View>

        {/* Actions bar */}
        {!isCompleted && (
          <View style={styles.actionsRow}>
            {isPlannedOnly ? (
              <Pressable
                style={[styles.actionBtn, { backgroundColor: t.accent, flex: 1 }]}
                onPress={() => {
                  void haptic.medium();
                  void activatePlannedInstance(inst.id);
                }}
              >
                <Ionicons name="play" size={16} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>Démarrer</Text>
              </Pressable>
            ) : (
              <>
                {currentStep > 0 && (
                  <Pressable
                    style={[styles.actionBtnSecondary, { borderColor: t.cardBorder, backgroundColor: t.card }]}
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

        {isCompleted && (
          <View style={[styles.completedBanner, { backgroundColor: t.successLight }]}>
            <Ionicons name="checkmark-circle" size={20} color={t.success} />
            <Text style={[styles.completedText, { color: t.success }]}>Recette terminée !</Text>
          </View>
        )}

        {/* Vertical timeline */}
        <View style={styles.timeline}>
          {steps.map((step, idx) => {
            const color = stepColor(idx);
            const isDone = isCompleted || idx < currentStep;
            const isCurrent = idx === currentStep && !isCompleted && !isPlannedOnly;
            const isUpcoming = !isDone && !isCurrent;
            const date = stepDate(idx);

            return (
              <View key={idx} style={styles.timelineStep}>
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
                <View style={[
                  styles.timelineCard,
                  { backgroundColor: t.card, borderColor: t.cardBorder },
                  isCurrent && { borderColor: userColor, borderWidth: 2 },
                ]}>
                  <LiquidProgress
                    progress={isDone ? 1 : isCurrent ? stepProgress(step, inst.step_started_at) : 0}
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  headerTitle: { fontSize: 18, fontWeight: "700", flex: 1 },
  content: { padding: 16 },
  emptyContainer: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15 },

  // Actions
  completedBanner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 10, marginBottom: 16 },
  completedText: { fontSize: 15, fontWeight: "700" },
  actionsRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
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

  // Notes
  notesSection: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 12 },
  notesTitle: { fontSize: 15, fontWeight: "700", marginBottom: 8 },
  notesInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, minHeight: 80 },
  saveNotesBtn: { marginTop: 8, paddingVertical: 10, borderRadius: 8, alignItems: "center" },
  saveNotesBtnText: { color: "#FFFFFF", fontWeight: "600", fontSize: 14 },
  notesSavedRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, marginTop: 6 },
  notesSavedText: { fontSize: 12, fontWeight: "600" },
});
