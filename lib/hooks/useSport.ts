import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../supabase";
import { Exercise, ExerciseLog } from "../types";
import { DEFAULT_EXERCISES } from "../sport-logic";

let channelCounter = 0;

export function useSport(householdId: string | null | undefined) {
  const channelId = useRef(++channelCounter);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [loading, setLoading] = useState(false);
  const hasFetched = useRef(false);
  const seededRef = useRef(false);

  const fetchAll = useCallback(async () => {
    if (!householdId) {
      setExercises([]);
      setLogs([]);
      return;
    }
    setLoading(true);

    const [exRes, logRes] = await Promise.all([
      supabase
        .from("exercises")
        .select("*")
        .eq("household_id", householdId)
        .order("name", { ascending: true }),
      supabase
        .from("exercise_logs")
        .select("*")
        .eq("household_id", householdId)
        .order("logged_at", { ascending: false }),
    ]);

    setExercises(exRes.data ?? []);
    setLogs(logRes.data ?? []);
    setLoading(false);
    hasFetched.current = true;
  }, [householdId]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  // Realtime subscriptions
  const fetchRef = useRef(fetchAll);
  fetchRef.current = fetchAll;

  useEffect(() => {
    if (!householdId) return;

    const handler = () => void fetchRef.current();
    const channel = supabase
      .channel(`sport:${householdId}:${channelId.current}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "exercises", filter: `household_id=eq.${householdId}` }, handler)
      .on("postgres_changes", { event: "*", schema: "public", table: "exercise_logs", filter: `household_id=eq.${householdId}` }, handler)
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [householdId]);

  const addExercise = useCallback(
    async (name: string, icon: string, unit: string): Promise<string | null> => {
      if (!householdId || !name.trim()) return null;
      const { data } = await supabase
        .from("exercises")
        .insert({ household_id: householdId, name: name.trim(), icon, unit })
        .select("id")
        .single();
      void fetchAll();
      return (data?.id as string | undefined) ?? null;
    },
    [householdId, fetchAll]
  );

  const updateExercise = useCallback(
    async (id: string, name: string, icon: string, unit: string) => {
      if (!householdId || !name.trim()) return;
      await supabase
        .from("exercises")
        .update({ name: name.trim(), icon, unit })
        .eq("id", id);
      void fetchAll();
    },
    [householdId, fetchAll]
  );

  const deleteExercise = useCallback(
    async (id: string) => {
      await supabase.from("exercises").delete().eq("id", id);
      void fetchAll();
    },
    [fetchAll]
  );

  const logExercise = useCallback(
    async (exerciseId: string, userId: string, count: number, loggedAt?: string) => {
      if (!householdId || count <= 0) return;
      await supabase.from("exercise_logs").insert({
        household_id: householdId,
        exercise_id: exerciseId,
        user_id: userId,
        count,
        ...(loggedAt ? { logged_at: loggedAt } : {}),
      });
      void fetchAll();
    },
    [householdId, fetchAll]
  );

  const deleteLog = useCallback(
    async (id: string) => {
      await supabase.from("exercise_logs").delete().eq("id", id);
      void fetchAll();
    },
    [fetchAll]
  );

  const updateLog = useCallback(
    async (id: string, count: number) => {
      if (count <= 0) {
        await supabase.from("exercise_logs").delete().eq("id", id);
      } else {
        await supabase.from("exercise_logs").update({ count }).eq("id", id);
      }
      void fetchAll();
    },
    [fetchAll]
  );

  const seedDefaultExercises = useCallback(
    async () => {
      if (!householdId) return;
      const rows = DEFAULT_EXERCISES.map((e) => ({
        household_id: householdId,
        ...e,
      }));
      await supabase.from("exercises").insert(rows);
      void fetchAll();
    },
    [householdId, fetchAll]
  );

  useEffect(() => {
    if (householdId && hasFetched.current && !loading && exercises.length === 0 && !seededRef.current) {
      seededRef.current = true;
      void seedDefaultExercises();
    }
  }, [householdId, loading, exercises.length]);

  return {
    exercises,
    logs,
    loading,
    addExercise,
    updateExercise,
    deleteExercise,
    logExercise,
    deleteLog,
    updateLog,
    fetchAll,
  };
}