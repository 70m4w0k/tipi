import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../supabase";
import { Exercise, ExerciseLog, ExerciseBadge, TemporalBadge, UserBadge, ExerciseVariant, Workout, WorkoutItem, WorkoutCompletion } from "../types";
import {
  DEFAULT_EXERCISES,
  COLLECTIVE_THRESHOLDS,
  buildDefaultBadges,
  buildDefaultTemporalBadges,
  computeUnlockedBadges,
  computeTemporalTitles,
  computeCollectiveTitles,
  computeXp,
  computeLevel,
  computeDailyGoal,
  computeThreatenedTitles,
  DEFAULT_VARIANTS,
  buildVariants,
  DEFAULT_WORKOUTS,
} from "../sport-logic";

let channelCounter = 0;

export function useSport(householdId: string | null | undefined, userId?: string | null) {
  const channelId = useRef(++channelCounter);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [exerciseBadges, setExerciseBadges] = useState<ExerciseBadge[]>([]);
  const [temporalBadges, setTemporalBadges] = useState<TemporalBadge[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [completions, setCompletions] = useState<WorkoutCompletion[]>([]);
  const [loading, setLoading] = useState(false);
  const hasFetched = useRef(false);
  const seededRef = useRef(false);

  const fetchAll = useCallback(async () => {
    if (!householdId) {
      setExercises([]);
      setLogs([]);
      setExerciseBadges([]);
      setTemporalBadges([]);
      setUserBadges([]);
      setWorkouts([]);
      setCompletions([]);
      return;
    }
    setLoading(true);

    const [exRes, logRes, badgeRes, tmpRes, ubRes, wkRes, wcRes] = await Promise.all([
      supabase.from("exercises").select("*").eq("household_id", householdId).order("name"),
      supabase.from("exercise_logs").select("*").eq("household_id", householdId).order("logged_at", { ascending: false }),
      supabase.from("exercise_badges").select("*").eq("household_id", householdId),
      supabase.from("temporal_badges").select("*").eq("household_id", householdId),
      supabase.from("user_badges").select("*"),
      supabase.from("workouts").select("*").eq("household_id", householdId).order("created_at"),
      supabase.from("workout_completions").select("*").eq("household_id", householdId),
    ]);

    setExercises(exRes.data ?? []);
    setLogs(logRes.data ?? []);
    setExerciseBadges(badgeRes.data ?? []);
    setTemporalBadges(tmpRes.data ?? []);
    setUserBadges(ubRes.data ?? []);
    setWorkouts(wkRes.data ?? []);
    setCompletions(wcRes.data ?? []);
    setLoading(false);
    hasFetched.current = true;
  }, [householdId]);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  const fetchRef = useRef(fetchAll);
  fetchRef.current = fetchAll;

  useEffect(() => {
    if (!householdId) return;
    const handler = () => void fetchRef.current();
    const channel = supabase
      .channel(`sport:${householdId}:${channelId.current}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "exercises", filter: `household_id=eq.${householdId}` }, handler)
      .on("postgres_changes", { event: "*", schema: "public", table: "exercise_logs", filter: `household_id=eq.${householdId}` }, handler)
      .on("postgres_changes", { event: "*", schema: "public", table: "exercise_badges", filter: `household_id=eq.${householdId}` }, handler)
      .on("postgres_changes", { event: "*", schema: "public", table: "temporal_badges", filter: `household_id=eq.${householdId}` }, handler)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_badges" }, handler)
      .on("postgres_changes", { event: "*", schema: "public", table: "workouts", filter: `household_id=eq.${householdId}` }, handler)
      .on("postgres_changes", { event: "*", schema: "public", table: "workout_completions", filter: `household_id=eq.${householdId}` }, handler)
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [householdId]);

  const seedBadgesForExercise = useCallback(async (exerciseId: string, name: string) => {
    if (!householdId) return;
    const permanent = buildDefaultBadges(name).map((b) => ({ ...b, exercise_id: exerciseId, household_id: householdId }));
    const temporal = buildDefaultTemporalBadges(name).map((b) => ({ ...b, exercise_id: exerciseId, household_id: householdId }));
    await Promise.all([
      supabase.from("exercise_badges").upsert(permanent, { onConflict: "exercise_id,threshold,household_id", ignoreDuplicates: true }),
      supabase.from("temporal_badges").upsert(temporal, { onConflict: "exercise_id,threshold,window_days,household_id", ignoreDuplicates: true }),
    ]);
  }, [householdId]);

  const addExercise = useCallback(async (name: string, icon: string, unit: string): Promise<string | null> => {
    if (!householdId || !name.trim()) return null;
    const { data } = await supabase.from("exercises").insert({ household_id: householdId, name: name.trim(), icon, unit }).select("id").single();
    if (data?.id) await seedBadgesForExercise(data.id, name.trim());
    void fetchAll();
    return (data?.id as string | undefined) ?? null;
  }, [householdId, fetchAll, seedBadgesForExercise]);

  const updateExercise = useCallback(async (id: string, name: string, icon: string, unit: string) => {
    if (!householdId || !name.trim()) return;
    await supabase.from("exercises").update({ name: name.trim(), icon, unit }).eq("id", id);
    void fetchAll();
  }, [householdId, fetchAll]);

  const deleteExercise = useCallback(async (id: string) => {
    await supabase.from("exercises").delete().eq("id", id);
    void fetchAll();
  }, [fetchAll]);

  const logExercise = useCallback(async (exerciseId: string, uid: string, count: number, loggedAt?: string, variant?: string | null, weight?: number | null) => {
    if (!householdId || count <= 0) return;
    await supabase.from("exercise_logs").insert({
      household_id: householdId, exercise_id: exerciseId, user_id: uid, count,
      ...(loggedAt ? { logged_at: loggedAt } : {}),
      ...(variant ? { variant } : {}),
      ...(weight != null ? { weight } : {}),
    });
    void fetchAll();
  }, [householdId, fetchAll]);

  /** Enregistre en un coup les séries d'un parcours (une ligne par série). */
  const logWorkoutEntries = useCallback(async (uid: string, entries: { exercise_id: string; count: number; weight: number | null; variant?: string | null }[]) => {
    if (!householdId || entries.length === 0) return;
    const payload = entries
      .filter((e) => e.count > 0)
      .map((e) => ({
        household_id: householdId, exercise_id: e.exercise_id, user_id: uid, count: e.count,
        ...(e.weight != null ? { weight: e.weight } : {}),
        ...(e.variant ? { variant: e.variant } : {}),
      }));
    if (payload.length > 0) await supabase.from("exercise_logs").insert(payload);
    void fetchAll();
  }, [householdId, fetchAll]);

  /** Enregistre une complétion de parcours (pour les records de tonnage et les sceaux). */
  const recordWorkoutCompletion = useCallback(async (uid: string, workoutId: string, tonnage: number) => {
    if (!householdId) return;
    await supabase.from("workout_completions").insert({
      household_id: householdId, workout_id: workoutId, user_id: uid, tonnage,
    });
    void fetchAll();
  }, [householdId, fetchAll]);

  const addWorkout = useCallback(async (name: string, icon: string, items: WorkoutItem[]): Promise<string | null> => {
    if (!householdId || !name.trim()) return null;
    const { data } = await supabase.from("workouts").insert({ household_id: householdId, name: name.trim(), icon, items }).select("id").single();
    void fetchAll();
    return (data?.id as string | undefined) ?? null;
  }, [householdId, fetchAll]);

  const updateWorkout = useCallback(async (id: string, name: string, icon: string, items: WorkoutItem[]) => {
    if (!name.trim()) return;
    await supabase.from("workouts").update({ name: name.trim(), icon, items }).eq("id", id);
    void fetchAll();
  }, [fetchAll]);

  const deleteWorkout = useCallback(async (id: string) => {
    await supabase.from("workouts").delete().eq("id", id);
    void fetchAll();
  }, [fetchAll]);

  // Seed des parcours par défaut (crée au passage les exercices manquants qu'ils référencent)
  const seedDefaultWorkouts = useCallback(async () => {
    if (!householdId) return;
    // Idempotent : ne recrée pas un parcours par défaut déjà présent.
    const { data: existing } = await supabase.from("workouts").select("name").eq("household_id", householdId);
    const existingNames = new Set((existing ?? []).map((w) => w.name as string));
    const byName = new Map(exercises.map((e) => [e.name, e.id]));
    const ensure = async (name: string, unit: string): Promise<string | null> => {
      const existing = byName.get(name);
      if (existing) return existing;
      const { data } = await supabase
        .from("exercises")
        .insert({ household_id: householdId, name, icon: "barbell-outline", unit, variants: buildVariants(DEFAULT_VARIANTS[name] ?? []) })
        .select("id").single();
      if (!data?.id) return null;
      await seedBadgesForExercise(data.id, name);
      byName.set(name, data.id);
      return data.id;
    };
    for (const wk of DEFAULT_WORKOUTS) {
      if (existingNames.has(wk.name)) continue;
      const items = [];
      for (const it of wk.items) {
        const id = await ensure(it.exercise, it.unit);
        if (!id) continue;
        items.push({ exercise_id: id, sets: it.sets, reps: it.reps, weight: it.weight ?? null, per_side: it.per_side ?? false, variant: it.variant ?? null });
      }
      await supabase.from("workouts").insert({ household_id: householdId, name: wk.name, icon: wk.icon, items });
    }
    void fetchAll();
  }, [householdId, exercises, seedBadgesForExercise, fetchAll]);

  // Migre les anciens exercices "Planche" / "Planche latérale" (auto-créés par le parcours
  // Haltères avant qu'il ne pointe vers Gainage) : logs et items de parcours remappés vers
  // Gainage (variante "Latéral" pour la latérale), puis suppression des exercices orphelins.
  const migratePlancheToGainage = useCallback(async (
    gainage: Exercise,
    planche: Exercise | undefined,
    plancheLat: Exercise | undefined,
  ) => {
    if (!householdId) return;
    if (!(gainage.variants ?? []).some((v) => v.name === "Latéral")) {
      await supabase.from("exercises").update({ variants: buildVariants(["Latéral"], gainage.variants ?? []) }).eq("id", gainage.id);
    }
    const remap = [
      { from: planche, variant: null as string | null },
      { from: plancheLat, variant: "Latéral" as string | null },
    ].filter((r): r is { from: Exercise; variant: string | null } => !!r.from);

    for (const r of remap) {
      await supabase.from("exercise_logs").update({ exercise_id: gainage.id, variant: r.variant }).eq("exercise_id", r.from.id);
    }

    const variantByFrom = new Map(remap.map((r) => [r.from.id, r.variant]));
    const wkUpdates = [];
    for (const wk of workouts) {
      let changed = false;
      const items = wk.items.map((it) => {
        if (variantByFrom.has(it.exercise_id)) {
          changed = true;
          return { ...it, exercise_id: gainage.id, variant: variantByFrom.get(it.exercise_id) ?? it.variant };
        }
        return it;
      });
      if (changed) wkUpdates.push(supabase.from("workouts").update({ items }).eq("id", wk.id));
    }
    await Promise.all(wkUpdates);

    await supabase.from("exercises").delete().in("id", remap.map((r) => r.from.id));
    void fetchAll();
  }, [householdId, workouts, fetchAll]);

  // Renomme les badges dont l'exercice a désormais des titres spécifiques (noms drôles) :
  // les foyers créés avant avaient les titres génériques ("… — Centurion"). Le seed est
  // idempotent (ignoreDuplicates) et ne met pas à jour les titres → on le fait ici.
  const backfillBadgeTitles = useCallback(async () => {
    const ops: PromiseLike<unknown>[] = [];
    for (const ex of exercises) {
      const desired = buildDefaultBadges(ex.name);
      const exBadges = exerciseBadges.filter((b) => b.exercise_id === ex.id);
      for (const d of desired) {
        const existing = exBadges.find((b) => b.threshold === d.threshold);
        if (existing && existing.title !== d.title) {
          ops.push(supabase.from("exercise_badges").update({ title: d.title }).eq("id", existing.id));
        }
      }
      const desiredTmp = buildDefaultTemporalBadges(ex.name);
      const exTmp = temporalBadges.filter((b) => b.exercise_id === ex.id);
      for (const d of desiredTmp) {
        const existing = exTmp.find((b) => b.threshold === d.threshold && b.window_days === d.window_days);
        if (existing && existing.title !== d.title) {
          ops.push(supabase.from("temporal_badges").update({ title: d.title }).eq("id", existing.id));
        }
      }
    }
    if (ops.length > 0) { await Promise.all(ops); void fetchAll(); }
  }, [exercises, exerciseBadges, temporalBadges, fetchAll]);

  const deleteLog = useCallback(async (id: string) => {
    await supabase.from("exercise_logs").delete().eq("id", id);
    void fetchAll();
  }, [fetchAll]);

  const updateLog = useCallback(async (id: string, count: number) => {
    if (count <= 0) { await supabase.from("exercise_logs").delete().eq("id", id); }
    else { await supabase.from("exercise_logs").update({ count }).eq("id", id); }
    void fetchAll();
  }, [fetchAll]);

  const updateLogVariant = useCallback(async (id: string, variant: string | null) => {
    await supabase.from("exercise_logs").update({ variant }).eq("id", id);
    void fetchAll();
  }, [fetchAll]);

  const updateExerciseVariants = useCallback(async (id: string, variants: ExerciseVariant[]) => {
    await supabase.from("exercises").update({ variants }).eq("id", id);
    void fetchAll();
  }, [fetchAll]);

  const seedDefaultExercises = useCallback(async () => {
    if (!householdId) return;
    const { data } = await supabase
      .from("exercises")
      .insert(DEFAULT_EXERCISES.map((e) => ({ household_id: householdId, ...e, variants: buildVariants(DEFAULT_VARIANTS[e.name] ?? []) })))
      .select("id,name");
    if (data) await Promise.all(data.map((e) => seedBadgesForExercise(e.id, e.name)));
    void fetchAll();
  }, [householdId, fetchAll, seedBadgesForExercise]);

  useEffect(() => {
    if (householdId && hasFetched.current && !loading && exercises.length === 0 && !seededRef.current) {
      seededRef.current = true;
      void seedDefaultExercises();
    }
  }, [householdId, loading, exercises.length]);

  // Backfill: households whose exercises were created before badge seeding existed
  const badgeBackfillRef = useRef(false);
  useEffect(() => {
    if (
      householdId && hasFetched.current && !loading &&
      exercises.length > 0 && exerciseBadges.length === 0 && !badgeBackfillRef.current
    ) {
      badgeBackfillRef.current = true;
      void Promise.all(exercises.map((e) => seedBadgesForExercise(e.id, e.name))).then(() => fetchAll());
    }
  }, [householdId, loading, exercises, exerciseBadges.length, seedBadgesForExercise, fetchAll]);

  // Backfill: variantes par défaut pour les exercices créés avant cette feature
  const variantBackfillRef = useRef(false);
  useEffect(() => {
    if (!householdId || !hasFetched.current || loading || exercises.length === 0 || variantBackfillRef.current) return;
    const toSeed = exercises.filter((e) => (e.variants?.length ?? 0) === 0 && (DEFAULT_VARIANTS[e.name]?.length ?? 0) > 0);
    if (toSeed.length === 0) return;
    variantBackfillRef.current = true;
    void Promise.all(
      toSeed.map((e) => supabase.from("exercises").update({ variants: buildVariants(DEFAULT_VARIANTS[e.name]) }).eq("id", e.id))
    ).then(() => fetchAll());
  }, [householdId, loading, exercises, fetchAll]);

  // Seed des parcours par défaut : une fois par session, une fois les exercices chargés.
  // seedDefaultWorkouts est idempotent (ignore les parcours déjà présents par nom),
  // donc les défauts s'ajoutent même si le foyer a déjà des parcours à lui.
  const workoutSeedRef = useRef(false);
  useEffect(() => {
    if (householdId && hasFetched.current && !loading && exercises.length > 0 && !workoutSeedRef.current) {
      workoutSeedRef.current = true;
      void seedDefaultWorkouts();
    }
  }, [householdId, loading, exercises.length, seedDefaultWorkouts]);

  // Backfill (une fois par session) : « Planche »/« Planche latérale » → Gainage.
  // On attend que les parcours soient chargés pour remapper leurs items avant suppression.
  const plancheMigrationRef = useRef(false);
  useEffect(() => {
    if (!householdId || !hasFetched.current || loading || plancheMigrationRef.current) return;
    if (exercises.length === 0 || workouts.length === 0) return;
    const gainage = exercises.find((e) => e.name === "Gainage");
    const planche = exercises.find((e) => e.name === "Planche");
    const plancheLat = exercises.find((e) => e.name === "Planche latérale");
    if (!gainage || (!planche && !plancheLat)) { plancheMigrationRef.current = true; return; }
    plancheMigrationRef.current = true;
    void migratePlancheToGainage(gainage, planche, plancheLat);
  }, [householdId, loading, exercises, workouts, migratePlancheToGainage]);

  // Backfill (une fois par session) : titres de badges génériques → noms spécifiques.
  const badgeTitleBackfillRef = useRef(false);
  useEffect(() => {
    if (!householdId || !hasFetched.current || loading || badgeTitleBackfillRef.current) return;
    if (exercises.length === 0 || exerciseBadges.length === 0) return;
    badgeTitleBackfillRef.current = true;
    void backfillBadgeTitles();
  }, [householdId, loading, exercises, exerciseBadges, backfillBadgeTitles]);

  // Sync des badges avec les seuils : débloque ceux franchis, re-bloque ceux
  // repassés sous le seuil (ex. série ramenée à 0).
  useEffect(() => {
    if (!userId || exerciseBadges.length === 0) return;

    const ownBadgeIds = new Set(
      userBadges.filter((ub) => ub.user_id === userId).map((ub) => ub.badge_id)
    );
    const totalFor = (exerciseId: string) =>
      logs
        .filter((l) => l.user_id === userId && l.exercise_id === exerciseId)
        .reduce((s, l) => s + l.count, 0);

    const toInsert = exerciseBadges
      .filter((badge) => totalFor(badge.exercise_id) >= badge.threshold && !ownBadgeIds.has(badge.id))
      .map((badge) => ({ user_id: userId, badge_id: badge.id }));

    const toDelete = exerciseBadges
      .filter((badge) => totalFor(badge.exercise_id) < badge.threshold && ownBadgeIds.has(badge.id))
      .map((badge) => badge.id);

    if (toInsert.length === 0 && toDelete.length === 0) return;

    const ops: PromiseLike<unknown>[] = [];
    if (toInsert.length > 0) {
      ops.push(supabase.from("user_badges").upsert(toInsert, { onConflict: "user_id,badge_id", ignoreDuplicates: true }));
    }
    if (toDelete.length > 0) {
      ops.push(supabase.from("user_badges").delete().eq("user_id", userId).in("badge_id", toDelete));
    }
    void Promise.all(ops).then(() => fetchAll());
  }, [logs, exerciseBadges, userBadges, userId, fetchAll]);

  const unlockBadge = useCallback(async (badgeId: string) => {
    if (!userId) return;
    await supabase.from("user_badges").insert({ user_id: userId, badge_id: badgeId });
    void fetchAll();
  }, [userId, fetchAll]);

  // Computed values
  const unlockedBadges = useMemo(() => {
    if (!userId) return [];
    return computeUnlockedBadges(logs, userId, exerciseBadges);
  }, [logs, userId, exerciseBadges]);

  const temporalTitles = useMemo(() => {
    if (!userId) return [];
    return computeTemporalTitles(logs, userId, temporalBadges);
  }, [logs, userId, temporalBadges]);

  const collectiveTitle = useMemo(() => {
    const total = logs.reduce((s, l) => s + l.count, 0);
    return computeCollectiveTitles(total, COLLECTIVE_THRESHOLDS);
  }, [logs]);

  // Titres portés uniquement par la période de grâce (spec §5.4 — bannière)
  const threatenedTitles = useMemo(
    () => (userId ? computeThreatenedTitles(logs, userId, temporalBadges) : []),
    [logs, userId, temporalBadges]
  );

  // XP & niveau de l'utilisateur courant (spec §5.1)
  const xp = useMemo(
    () => (userId ? computeXp(logs, userId, exercises, userBadges) : 0),
    [logs, userId, exercises, userBadges]
  );
  const levelInfo = useMemo(() => computeLevel(xp), [xp]);

  /** Niveau d'un membre quelconque du foyer (les logs sont household-visibles) */
  const memberLevel = useCallback(
    (uid: string) => computeLevel(computeXp(logs, uid, exercises, userBadges)).level,
    [logs, exercises, userBadges]
  );

  // Objectif du jour par exercice pratiqué (spec §5.4) — gate niveau 2 côté UI
  const dailyGoals = useMemo(() => {
    if (!userId) return {};
    const map: Record<string, { goal: number; current: number }> = {};
    const today = new Date().toISOString().slice(0, 10);
    for (const ex of exercises) {
      const minThreshold = exerciseBadges
        .filter((b) => b.exercise_id === ex.id)
        .reduce((m, b) => Math.min(m, b.threshold), Infinity);
      const goal = computeDailyGoal(logs, userId, ex.id, Number.isFinite(minThreshold) ? minThreshold : 100);
      if (goal == null) continue;
      const current = logs
        .filter((l) => l.user_id === userId && l.exercise_id === ex.id && l.logged_at.slice(0, 10) === today)
        .reduce((s, l) => s + l.count, 0);
      map[ex.id] = { goal, current };
    }
    return map;
  }, [logs, userId, exercises, exerciseBadges]);

  return {
    exercises, logs, exerciseBadges, temporalBadges, userBadges, workouts, completions, loading,
    addExercise, updateExercise, deleteExercise,
    logExercise, deleteLog, updateLog, updateLogVariant, updateExerciseVariants,
    logWorkoutEntries, recordWorkoutCompletion, addWorkout, updateWorkout, deleteWorkout,
    fetchAll, unlockBadge,
    unlockedBadges, temporalTitles, collectiveTitle,
    xp, levelInfo, memberLevel, dailyGoals, threatenedTitles,
  };
}