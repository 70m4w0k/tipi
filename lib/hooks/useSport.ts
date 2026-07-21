import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../supabase";
import { Exercise, ExerciseLog, ExerciseBadge, TemporalBadge, UserBadge } from "../types";
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
} from "../sport-logic";

let channelCounter = 0;

export function useSport(householdId: string | null | undefined, userId?: string | null) {
  const channelId = useRef(++channelCounter);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [exerciseBadges, setExerciseBadges] = useState<ExerciseBadge[]>([]);
  const [temporalBadges, setTemporalBadges] = useState<TemporalBadge[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
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
      return;
    }
    setLoading(true);

    const [exRes, logRes, badgeRes, tmpRes, ubRes] = await Promise.all([
      supabase.from("exercises").select("*").eq("household_id", householdId).order("name"),
      supabase.from("exercise_logs").select("*").eq("household_id", householdId).order("logged_at", { ascending: false }),
      supabase.from("exercise_badges").select("*").eq("household_id", householdId),
      supabase.from("temporal_badges").select("*").eq("household_id", householdId),
      supabase.from("user_badges").select("*"),
    ]);

    setExercises(exRes.data ?? []);
    setLogs(logRes.data ?? []);
    setExerciseBadges(badgeRes.data ?? []);
    setTemporalBadges(tmpRes.data ?? []);
    setUserBadges(ubRes.data ?? []);
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

  const logExercise = useCallback(async (exerciseId: string, uid: string, count: number, loggedAt?: string) => {
    if (!householdId || count <= 0) return;
    await supabase.from("exercise_logs").insert({ household_id: householdId, exercise_id: exerciseId, user_id: uid, count, ...(loggedAt ? { logged_at: loggedAt } : {}) });
    void fetchAll();
  }, [householdId, fetchAll]);

  const deleteLog = useCallback(async (id: string) => {
    await supabase.from("exercise_logs").delete().eq("id", id);
    void fetchAll();
  }, [fetchAll]);

  const updateLog = useCallback(async (id: string, count: number) => {
    if (count <= 0) { await supabase.from("exercise_logs").delete().eq("id", id); }
    else { await supabase.from("exercise_logs").update({ count }).eq("id", id); }
    void fetchAll();
  }, [fetchAll]);

  const seedDefaultExercises = useCallback(async () => {
    if (!householdId) return;
    const { data } = await supabase
      .from("exercises")
      .insert(DEFAULT_EXERCISES.map((e) => ({ household_id: householdId, ...e })))
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
    exercises, logs, exerciseBadges, temporalBadges, userBadges, loading,
    addExercise, updateExercise, deleteExercise,
    logExercise, deleteLog, updateLog,
    fetchAll, unlockBadge,
    unlockedBadges, temporalTitles, collectiveTitle,
    xp, levelInfo, memberLevel, dailyGoals, threatenedTitles,
  };
}