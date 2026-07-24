import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "../../../lib/hooks/useAuth";
import { supabase } from "../../../lib/supabase";
import { useHousehold } from "../../../lib/hooks/useHousehold";
import { useSport } from "../../../lib/hooks/useSport";
import { useTheme } from "../../../lib/theme";
import { haptic } from "../../../lib/haptics";
import { Exercise, ExerciseVariant } from "../../../lib/types";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LevelHeader } from "../../../components/LevelHeader";
import { DailyGoalRing } from "../../../components/DailyGoalRing";
import { MiniSparkline } from "../../../components/MiniSparkline";
import { BadgeUnlockOverlay } from "../../../components/BadgeUnlockOverlay";
import { WorkoutModal } from "../../../components/WorkoutModal";
import { WorkoutValidationSheet } from "../../../components/WorkoutValidationSheet";
import { WorkoutEditor } from "../../../components/WorkoutEditor";
import {
  LEVEL_UNLOCKS, buildVariants,
  workoutTonnage, evaluateCompletion, formatKg, WORKOUT_SEAL_ICON, SealTier,
} from "../../../lib/sport-logic";
import { Workout } from "../../../lib/types";

type Celebration =
  | { kind: "record"; tonnage: number; workoutName: string }
  | { kind: "seal"; tier: SealTier; threshold: number; workoutName: string };

const LEVEL_SEEN_KEY = "sport_last_level_seen";

const EXERCISE_ICONS = [
  "barbell-outline", "fitness-outline", "timer-outline",
  "walk-outline", "bicycle-outline", "heart-outline",
  "flame-outline", "pulse-outline", "body-outline",
];

const UNIT_OPTIONS = ["répétitions", "secondes", "minutes"];

export default function SportScreen() {
  const { profile, refreshProfile } = useAuth();
  const { members } = useHousehold(profile);
  const {
    exercises, logs, loading,
    addExercise, updateExercise, deleteExercise, updateExerciseVariants,
    fetchAll,
    userBadges, exerciseBadges, collectiveTitle,
    xp, levelInfo, dailyGoals, threatenedTitles,
    workouts, completions, addWorkout, updateWorkout, deleteWorkout, logWorkoutEntries, recordWorkoutCompletion,
  } = useSport(profile?.household_id, profile?.id);
  const t = useTheme();
  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);
  const [editModal, setEditModal] = useState<Exercise | undefined>(undefined);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState("barbell-outline");
  const [editUnit, setEditUnit] = useState("répétitions");
  const [editVariants, setEditVariants] = useState<ExerciseVariant[]>([]);
  const [newVariantName, setNewVariantName] = useState("");
  const [confirm, setConfirm] = useState<
    { title: string; message: string; confirmLabel: string; onConfirm: () => void } | null
  >(null);
  const [titleModal, setTitleModal] = useState(false);
  // Parcours : liste (modal), lancement (feuille de validation), édition
  const [workoutList, setWorkoutList] = useState(false);
  const [launchWorkout, setLaunchWorkout] = useState<Workout | null>(null);
  const [editWorkout, setEditWorkout] = useState<Workout | "new" | null>(null);
  // File de célébrations post-validation (record de tonnage, puis sceau)
  const [celebrations, setCelebrations] = useState<Celebration[]>([]);

  // Titres débloqués par l'utilisateur (choix du titre affiché, gate niveau 5)
  const ownUnlockedTitles = useMemo(() => {
    if (!profile?.id) return [];
    const ownBadgeIds = new Set(userBadges.filter((ub) => ub.user_id === profile.id).map((ub) => ub.badge_id));
    return exerciseBadges.filter((b) => ownBadgeIds.has(b.id)).sort((a, b) => a.threshold - b.threshold);
  }, [exerciseBadges, userBadges, profile?.id]);

  const saveSportTitle = async (title: string | null) => {
    if (!profile?.id) return;
    void haptic.light();
    await supabase.from("profiles").update({ sport_title: title }).eq("id", profile.id);
    await refreshProfile();
    setTitleModal(false);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  // Overlay de passage de niveau — une seule célébration par niveau (spec §5.5).
  // Premier lancement : initialisation silencieuse (pas de célébration rétroactive).
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const lastSeenLevel = useRef<number | null>(null);
  const levelSeenLoaded = useRef(false);
  useEffect(() => {
    AsyncStorage.getItem(LEVEL_SEEN_KEY).then((v) => {
      lastSeenLevel.current = v != null ? parseInt(v, 10) : null;
      levelSeenLoaded.current = true;
    });
  }, []);
  useEffect(() => {
    if (!levelSeenLoaded.current || loading || logs.length === 0) return;
    const seen = lastSeenLevel.current;
    if (seen == null) {
      lastSeenLevel.current = levelInfo.level;
      void AsyncStorage.setItem(LEVEL_SEEN_KEY, String(levelInfo.level));
    } else if (levelInfo.level > seen) {
      setLevelUp(levelInfo.level);
    }
  }, [levelInfo.level, loading, logs.length]);

  const dismissLevelUp = useCallback(() => {
    if (levelUp != null) {
      lastSeenLevel.current = levelUp;
      void AsyncStorage.setItem(LEVEL_SEEN_KEY, String(levelUp));
    }
    setLevelUp(null);
  }, [levelUp]);

  // Validation d'un parcours : log des séries + complétion, puis célébrations
  const handleWorkoutConfirm = useCallback(
    (entries: { exercise_id: string; count: number; weight: number | null; variant: string | null }[]) => {
      if (!profile?.id || !launchWorkout) return;
      const tonnage = Math.round(workoutTonnage(entries));
      const outcome = evaluateCompletion(completions, launchWorkout.id, profile.id, tonnage);
      void logWorkoutEntries(profile.id, entries);
      void recordWorkoutCompletion(profile.id, launchWorkout.id, tonnage);

      const queue: Celebration[] = [];
      if (outcome.isRecord) queue.push({ kind: "record", tonnage, workoutName: launchWorkout.name });
      if (outcome.newSeal) queue.push({ kind: "seal", tier: outcome.newSeal, threshold: outcome.newSeal.threshold, workoutName: launchWorkout.name });
      if (queue.length > 0) setCelebrations(queue);
    },
    [profile?.id, launchWorkout, completions, logWorkoutEntries, recordWorkoutCompletion]
  );

  // Totals per exercise per user (all time)
  const exerciseStats = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    for (const log of logs) {
      if (!map[log.exercise_id]) map[log.exercise_id] = {};
      map[log.exercise_id][log.user_id] = (map[log.exercise_id][log.user_id] ?? 0) + log.count;
    }
    return map;
  }, [logs]);

  const handleSaveExercise = async () => {
    if (!editName.trim()) return;
    void haptic.light();
    if (editModal?.id) {
      await updateExercise(editModal.id, editName, editIcon, editUnit);
      await updateExerciseVariants(editModal.id, editVariants);
    } else {
      const newId = await addExercise(editName, editIcon, editUnit);
      if (newId && editVariants.length > 0) await updateExerciseVariants(newId, editVariants);
    }
    setEditModal(undefined);
    setEditName("");
  };

  const addVariant = () => {
    const name = newVariantName.trim();
    if (!name) return;
    void haptic.light();
    setEditVariants((prev) => buildVariants([name], prev));
    setNewVariantName("");
  };
  const removeVariant = (name: string) => {
    void haptic.light();
    setEditVariants((prev) => prev.filter((v) => v.name !== name));
  };

  const handleDeleteExercise = (ex: Exercise) => {
    void haptic.warning();
    setConfirm({
      title: "Supprimer l'exercice",
      message: `Supprimer "${ex.name}" et tous ses logs ?`,
      confirmLabel: "Supprimer",
      onConfirm: () => { void deleteExercise(ex.id); },
    });
  };

  const openEditModal = (ex?: Exercise) => {
    if (ex) {
      setEditModal(ex);
      setEditName(ex.name);
      setEditIcon(ex.icon);
      setEditUnit(ex.unit);
      setEditVariants(ex.variants ?? []);
    } else {
      setEditModal(null!);
      setEditName("");
      setEditIcon("barbell-outline");
      setEditUnit("répétitions");
      setEditVariants([]);
    }
    setNewVariantName("");
  };

  const userColor = (userId: string) => members.find((m) => m.id === userId)?.color ?? t.accent;

  // Tendance 7 jours par exercice (totaux du foyer, du plus ancien au plus récent)
  const sparkData = useMemo(() => {
    const days: string[] = [];
    const cursor = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(cursor);
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    const dayIndex: Record<string, number> = Object.fromEntries(days.map((d, i) => [d, i]));
    const map: Record<string, number[]> = {};
    for (const ex of exercises) map[ex.id] = days.map(() => 0);
    for (const log of logs) {
      const day = log.logged_at.slice(0, 10);
      const i = dayIndex[day];
      if (i != null && map[log.exercise_id]) map[log.exercise_id][i] += log.count;
    }
    return map;
  }, [logs, exercises]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.background }]} edges={["top"]}>
      <View style={[styles.header, { backgroundColor: t.card, borderBottomColor: t.cardBorder }]}>
        <View style={{ width: 90 }} />
        <Text style={[styles.headerTitle, { color: t.text }]}>Sport</Text>
        <Pressable testID="open-workouts" style={[styles.workoutsBtn, { backgroundColor: t.accentLight }]} onPress={() => { void haptic.light(); setWorkoutList(true); }}>
          <Ionicons name="barbell-outline" size={15} color={t.accent} />
          <Text style={[styles.workoutsBtnText, { color: t.accent }]}>Parcours</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.accent} colors={[t.accent]} />}
        keyboardShouldPersistTaps="handled"
      >
        {/* Niveau + progression XP (spec R3) — tap au niveau 5+ pour choisir son titre */}
        {exercises.length > 0 && (
          <LevelHeader
            levelInfo={levelInfo}
            xp={xp}
            sportTitle={profile?.sport_title}
            collectiveTitle={collectiveTitle}
            onPress={levelInfo.level >= 5 ? () => { void haptic.light(); setTitleModal(true); } : undefined}
          />
        )}

        {/* Titres portés par la période de grâce (spec §5.4) */}
        {threatenedTitles.map(({ badge, missing }) => {
          const unit = exercises.find((e) => e.id === badge.exercise_id)?.unit ?? "répétitions";
          return (
            <View
              key={badge.id}
              testID="threatened-title"
              style={[styles.threatBanner, { backgroundColor: t.accentLight }]}
            >
              <Ionicons name="flame" size={16} color={t.accent} />
              <Text style={[styles.threatText, { color: t.accent }]} numberOfLines={2}>
                Encore {missing} {unit} pour garder « {badge.title} »
              </Text>
            </View>
          );
        })}

        {exercises.length === 0 && !loading && (
          <View style={styles.emptyContainer}>
            <Ionicons name="barbell-outline" size={48} color={t.emptyIcon} />
            <Text style={[styles.emptyText, { color: t.textMuted }]}>Aucun exercice</Text>
            <Text style={[styles.emptySub, { color: t.textMuted }]}>Appuie sur + pour en ajouter</Text>
          </View>
        )}

        <View style={styles.grid}>
          {exercises.map((ex) => {
            const stats = exerciseStats[ex.id] ?? {};
            const total = Object.values(stats).reduce((s, c) => s + c, 0);
            const userEntries = Object.entries(stats);
            const exBadges = exerciseBadges.filter((b) => b.exercise_id === ex.id);
            const unlockedIds = new Set(userBadges.map((ub) => ub.badge_id));
            const badgeCount = exBadges.filter((b) => unlockedIds.has(b.id)).length;

            return (
              <Pressable
                key={ex.id}
                testID={`sport-card-${ex.name}`}
                style={[styles.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}
                onPress={() => { void haptic.light(); router.push(`/(app)/sport/${ex.id}` as any); }}
              >
                <View style={styles.cardTop}>
                  <Ionicons name={ex.icon as any} size={24} color={t.accent} />
                  <Pressable
                    hitSlop={8}
                    onPress={(e) => { e.stopPropagation?.(); openEditModal(ex); }}
                  >
                    <Ionicons name="pencil-outline" size={13} color={t.textMuted} />
                  </Pressable>
                </View>
                <Text style={[styles.cardName, { color: t.text }]} numberOfLines={1}>{ex.name}</Text>
                <Text style={[styles.cardTotal, { color: t.accent }]}>
                  {total} {ex.unit}
                </Text>

                {/* Tendance 7 jours */}
                <MiniSparkline values={sparkData[ex.id] ?? []} color={t.accent} />

                {/* Objectif du jour — débloqué au niveau 2 (spec §5.2) */}
                {levelInfo.level >= 2 && dailyGoals[ex.id] && (
                  <View style={styles.goalRow}>
                    <DailyGoalRing
                      current={dailyGoals[ex.id].current}
                      goal={dailyGoals[ex.id].goal}
                      accent={profile?.color ?? t.accent}
                    />
                    <Text style={[styles.goalLabel, { color: t.textMuted }]} numberOfLines={1}>
                      {dailyGoals[ex.id].current >= dailyGoals[ex.id].goal ? "Objectif atteint" : "Objectif du jour"}
                    </Text>
                  </View>
                )}

                {/* Pied : membres actifs + nombre de badges */}
                <View style={styles.cardFooter}>
                  {userEntries.length > 0 && (
                    <View style={styles.cardUsers}>
                      {userEntries.map(([userId]) => (
                        <View
                          key={userId}
                          style={[styles.userDot, { backgroundColor: userColor(userId) }]}
                        />
                      ))}
                    </View>
                  )}
                  {badgeCount > 0 && (
                    <View style={styles.badgeCount}>
                      <Ionicons name="ribbon-outline" size={13} color={t.textMuted} />
                      <Text style={{ fontSize: 11, fontWeight: "600", color: t.textMuted }}>{badgeCount}</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
      </KeyboardAvoidingView>

      {/* FAB */}
      <View style={styles.fabContainer}>
        <Pressable
          testID="sport-fab"
          style={[styles.fab, { backgroundColor: t.accent }]}
          onPress={() => { void haptic.light(); openEditModal(); }}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Edit exercise modal */}
      <Modal visible={editModal !== undefined} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setEditModal(undefined)}>
          <Pressable style={[styles.modalContent, { backgroundColor: t.card }]} onPress={() => {}}>
            <Text style={[styles.editTitle, { color: t.text }]}>
              {editModal?.id ? "Modifier l'exercice" : "Nouvel exercice"}
            </Text>
            <TextInput
              style={[styles.modalInput, { borderColor: t.inputBorder, backgroundColor: t.inputBg, color: t.text }]}
              value={editName}
              onChangeText={setEditName}
              placeholder="Nom de l'exercice"
              placeholderTextColor={t.textMuted}
              autoFocus
            />
            <Text style={[styles.editLabel, { color: t.textSecondary }]}>Icône</Text>
            <View style={styles.iconGrid}>
              {EXERCISE_ICONS.map((icon) => (
                <Pressable
                  key={icon}
                  style={[styles.iconBtn, { borderColor: editIcon === icon ? t.accent : t.cardBorder }]}
                  onPress={() => setEditIcon(icon)}
                >
                  <Ionicons name={icon as any} size={22} color={editIcon === icon ? t.accent : t.textMuted} />
                </Pressable>
              ))}
            </View>
            <Text style={[styles.editLabel, { color: t.textSecondary }]}>Unité</Text>
            <View style={styles.unitRow}>
              {UNIT_OPTIONS.map((u) => (
                <Pressable
                  key={u}
                  style={[styles.unitBtn, { borderColor: editUnit === u ? t.accent : t.cardBorder }, editUnit === u && { backgroundColor: t.accentLight }]}
                  onPress={() => setEditUnit(u)}
                >
                  <Text style={[styles.unitBtnText, { color: editUnit === u ? t.accent : t.textSecondary }]}>{u}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.editLabel, { color: t.textSecondary }]}>Variantes</Text>
            <View style={styles.variantChips}>
              {editVariants.map((v) => (
                <View key={v.name} style={[styles.variantChip, { backgroundColor: t.background, borderColor: t.cardBorder }]}>
                  <View style={[styles.variantDot, { backgroundColor: v.color }]} />
                  <Text style={[styles.variantChipText, { color: t.text }]} numberOfLines={1}>{v.name}</Text>
                  <Pressable testID={`variant-remove-${v.name}`} onPress={() => removeVariant(v.name)} hitSlop={6}>
                    <Ionicons name="close" size={14} color={t.textMuted} />
                  </Pressable>
                </View>
              ))}
            </View>
            <View style={styles.variantAddRow}>
              <TextInput
                style={[styles.variantInput, { borderColor: t.inputBorder, backgroundColor: t.inputBg, color: t.text }]}
                value={newVariantName}
                onChangeText={setNewVariantName}
                placeholder="Nouvelle variante"
                placeholderTextColor={t.textMuted}
                onSubmitEditing={addVariant}
                returnKeyType="done"
              />
              <Pressable testID="variant-add" style={[styles.variantAddBtn, { backgroundColor: t.accentLight }]} onPress={addVariant}>
                <Ionicons name="add" size={20} color={t.accent} />
              </Pressable>
            </View>

            <View style={styles.modalActions}>
              {editModal?.id && (
                <Pressable
                  style={[styles.modalDelete, { backgroundColor: t.dangerLight }]}
                  onPress={() => { setEditModal(undefined); handleDeleteExercise(editModal); }}
                >
                  <Ionicons name="trash-outline" size={16} color={t.danger} />
                </Pressable>
              )}
              <Pressable style={[styles.modalCancel, { borderColor: t.cardBorder, flex: 1 }]} onPress={() => setEditModal(undefined)}>
                <Text style={[styles.modalCancelText, { color: t.textSecondary }]}>Annuler</Text>
              </Pressable>
              <Pressable style={[styles.modalConfirm, { backgroundColor: t.accent, flex: 1 }]} onPress={() => void handleSaveExercise()}>
                <Text style={styles.modalConfirmText}>Enregistrer</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <ConfirmDialog
        visible={!!confirm}
        title={confirm?.title ?? ""}
        message={confirm?.message ?? ""}
        confirmLabel={confirm?.confirmLabel ?? ""}
        onConfirm={() => { confirm?.onConfirm(); setConfirm(null); }}
        onCancel={() => setConfirm(null)}
      />

      {/* Choix du titre affiché (gate niveau 5) */}
      <Modal visible={titleModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setTitleModal(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: t.card }]} onPress={() => {}}>
            <Text style={[styles.editTitle, { color: t.text }]}>Titre affiché</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              <Pressable
                testID="title-option-none"
                style={[styles.titleRow, { borderBottomColor: t.cardBorder }]}
                onPress={() => void saveSportTitle(null)}
              >
                <Ionicons name="close-circle-outline" size={18} color={t.textMuted} />
                <Text style={[styles.titleRowText, { color: t.textSecondary }]}>Aucun titre (Niv. {levelInfo.level})</Text>
                {profile?.sport_title == null && <Ionicons name="checkmark" size={18} color={t.accent} />}
              </Pressable>
              {ownUnlockedTitles.map((b) => (
                <Pressable
                  key={b.id}
                  testID={`title-option-${b.id}`}
                  style={[styles.titleRow, { borderBottomColor: t.cardBorder }]}
                  onPress={() => void saveSportTitle(b.title)}
                >
                  <Ionicons name={b.icon as any} size={18} color={t.accent} />
                  <Text style={[styles.titleRowText, { color: t.text }]} numberOfLines={1}>{b.title}</Text>
                  {profile?.sport_title === b.title && <Ionicons name="checkmark" size={18} color={t.accent} />}
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Parcours : liste → lancement (validation) / édition */}
      <WorkoutModal
        visible={workoutList}
        workouts={workouts}
        exercises={exercises}
        completions={completions}
        userId={profile?.id}
        onClose={() => setWorkoutList(false)}
        onLaunch={(w) => { setWorkoutList(false); setLaunchWorkout(w); }}
        onEdit={(w) => { setWorkoutList(false); setEditWorkout(w); }}
        onCreate={() => { setWorkoutList(false); setEditWorkout("new"); }}
      />
      <WorkoutValidationSheet
        visible={launchWorkout != null}
        workout={launchWorkout}
        exercises={exercises}
        onClose={() => setLaunchWorkout(null)}
        onConfirm={handleWorkoutConfirm}
      />
      <WorkoutEditor
        visible={editWorkout != null}
        workout={editWorkout === "new" ? null : editWorkout}
        exercises={exercises}
        onClose={() => setEditWorkout(null)}
        onSave={(name, icon, items) => {
          if (editWorkout && editWorkout !== "new") void updateWorkout(editWorkout.id, name, icon, items);
          else void addWorkout(name, icon, items);
        }}
        onCreateExercise={(name, unit) => addExercise(name, "barbell-outline", unit)}
        onDelete={editWorkout && editWorkout !== "new" ? () => {
          const w = editWorkout;
          setConfirm({
            title: "Supprimer le parcours",
            message: `Supprimer "${w.name}" ?`,
            confirmLabel: "Supprimer",
            onConfirm: () => { void deleteWorkout(w.id); },
          });
        } : undefined}
      />

      {/* Passage de niveau — réutilise l'overlay badge (spec §5.5) */}
      <BadgeUnlockOverlay
        visible={levelUp != null}
        badgeTitle={`Niveau ${levelUp ?? ""}`}
        badgeIcon="arrow-up-circle"
        subtitle="Niveau atteint"
        detail={levelUp != null && LEVEL_UNLOCKS[levelUp] ? `Nouvelle fonctionnalité : ${LEVEL_UNLOCKS[levelUp]}` : undefined}
        onDismiss={dismissLevelUp}
      />

      {/* Récompenses de parcours : record de tonnage puis sceau (file d'attente) */}
      {celebrations.length > 0 && (
        celebrations[0].kind === "record" ? (
          <BadgeUnlockOverlay
            visible
            badgeIcon="barbell"
            subtitle="Record de tonnage"
            badgeTitle={formatKg(celebrations[0].tonnage)}
            detail={celebrations[0].workoutName}
            onDismiss={() => setCelebrations((prev) => prev.slice(1))}
          />
        ) : (
          <BadgeUnlockOverlay
            visible
            badgeIcon={WORKOUT_SEAL_ICON}
            accentColor={celebrations[0].tier.color}
            subtitle="Sceau débloqué"
            badgeTitle={`Sceau ${celebrations[0].tier.label}`}
            detail={`${celebrations[0].workoutName} · ${celebrations[0].threshold} complétions`}
            onDismiss={() => setCelebrations((prev) => prev.slice(1))}
          />
        )
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 18, fontWeight: "700", flex: 1, textAlign: "center" },
  workoutsBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999, width: 90, justifyContent: "center" },
  workoutsBtnText: { fontSize: 12, fontWeight: "800" },

  content: { padding: 12, paddingBottom: 100 },

  emptyContainer: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: "600" },
  emptySub: { fontSize: 13 },

  // Grid
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: {
    width: "48%" as any, flexGrow: 1, minWidth: 150,
    borderWidth: 1, borderRadius: 14, padding: 14,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  goalRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  goalLabel: { flex: 1, fontSize: 10, fontWeight: "600" },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  badgeCount: { flexDirection: "row", alignItems: "center", gap: 3 },

  // Bannière titre menacé
  threatBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10,
  },
  threatText: { flex: 1, fontSize: 12, fontWeight: "700" },

  // Modal choix du titre
  titleRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  titleRowText: { flex: 1, fontSize: 14, fontWeight: "600" },
  cardName: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  cardTotal: { fontSize: 22, fontWeight: "800", marginBottom: 8 },
  cardUsers: { flexDirection: "row", gap: 4 },
  userDot: { width: 10, height: 10, borderRadius: 5 },

  // FAB
  fabContainer: { position: "absolute", bottom: 24, right: 16 },
  fab: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: "center", justifyContent: "center",
    elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 4,
  },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
  modalContent: { width: "100%", maxWidth: 360, borderRadius: 16, padding: 20 },
  modalInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16, marginBottom: 12 },
  modalActions: { flexDirection: "row", gap: 8, marginTop: 4 },
  modalCancel: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  modalCancelText: { fontWeight: "600", fontSize: 14 },
  modalConfirm: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  modalConfirmText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  modalDelete: { width: 44, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  editTitle: { fontSize: 17, fontWeight: "700", marginBottom: 14 },
  editLabel: { fontSize: 13, fontWeight: "600", marginTop: 10, marginBottom: 6 },
  iconGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 6 },
  iconBtn: { width: 44, height: 44, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  unitRow: { flexDirection: "row", gap: 8, marginBottom: 6 },
  variantChips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  variantChip: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 999, paddingLeft: 9, paddingRight: 7, paddingVertical: 5 },
  variantDot: { width: 8, height: 8, borderRadius: 4 },
  variantChipText: { fontSize: 12, fontWeight: "600", maxWidth: 150 },
  variantAddRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  variantInput: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14 },
  variantAddBtn: { width: 44, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  unitBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  unitBtnText: { fontSize: 14, fontWeight: "600" },
});