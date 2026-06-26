import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../supabase";
import { Chore, ChoreTask, ChoreReminder } from "../types";
import { DEFAULT_CHORE_TASKS } from "../chores-logic";

let channelCounter = 0;

export function useChores(householdId: string | null | undefined) {
  const channelId = useRef(++channelCounter);
  const [chores, setChores] = useState<Chore[]>([]);
  const [tasks, setTasks] = useState<ChoreTask[]>([]);
  const [reminders, setReminders] = useState<ChoreReminder[]>([]);
  const [loading, setLoading] = useState(false);
  const hasFetched = useRef(false);
  const seededRef = useRef(false);

  const fetchAll = useCallback(async () => {
    if (!householdId) {
      setChores([]);
      setTasks([]);
      setReminders([]);
      return;
    }
    setLoading(true);

    const [choreRes, taskRes, reminderRes] = await Promise.all([
      supabase
        .from("chores")
        .select("*")
        .eq("household_id", householdId)
        .order("year", { ascending: true })
        .order("week", { ascending: true }),
      supabase
        .from("chore_tasks")
        .select("*")
        .eq("household_id", householdId)
        .order("created_at", { ascending: true }),
      supabase
        .from("chore_reminders")
        .select("*")
        .eq("household_id", householdId),
    ]);

    setChores(choreRes.data ?? []);
    setTasks(taskRes.data ?? []);
    setReminders(reminderRes.data ?? []);
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
      .channel(`chores:${householdId}:${channelId.current}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chores", filter: `household_id=eq.${householdId}` }, handler)
      .on("postgres_changes", { event: "*", schema: "public", table: "chore_tasks", filter: `household_id=eq.${householdId}` }, handler)
      .on("postgres_changes", { event: "*", schema: "public", table: "chore_reminders", filter: `household_id=eq.${householdId}` }, handler)
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [householdId]);

  const setCellIntensity = useCallback(
    async (taskName: string, week: number, year: number, userId: string) => {
      if (!householdId) return;

      // Find existing entry for this user/task/week/year
      const existing = chores.find(
        (c) =>
          c.task_name === taskName &&
          c.week === week &&
          c.year === year &&
          c.user_id === userId
      );

      if (!existing) {
        // Create with intensity 1
        await supabase.from("chores").insert({
          household_id: householdId,
          user_id: userId,
          task_name: taskName,
          week,
          year,
          intensity: 1,
          performed_at: new Date().toISOString(),
        });
      } else if (existing.intensity >= 3) {
        // Cycle back to 0 = delete
        await supabase.from("chores").delete().eq("id", existing.id);
      } else {
        // Increment intensity
        await supabase
          .from("chores")
          .update({
            intensity: (existing.intensity + 1) as 1 | 2 | 3,
            performed_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      }

      void fetchAll();
    },
    [householdId, chores, fetchAll]
  );

  const addTask = useCallback(
    async (name: string, showInGrid = true) => {
      if (!householdId || !name.trim()) return;
      await supabase.from("chore_tasks").insert({
        household_id: householdId,
        name: name.trim(),
        show_in_grid: showInGrid,
      });
      void fetchAll();
    },
    [householdId, fetchAll]
  );

  const toggleTaskVisibility = useCallback(
    async (id: string, showInGrid: boolean) => {
      await supabase
        .from("chore_tasks")
        .update({ show_in_grid: showInGrid })
        .eq("id", id);
      void fetchAll();
    },
    [fetchAll]
  );

  const editTask = useCallback(
    async (id: string, oldName: string, newName: string) => {
      if (!householdId || !newName.trim()) return;
      const trimmed = newName.trim();

      // Update the task record
      await supabase
        .from("chore_tasks")
        .update({ name: trimmed })
        .eq("id", id);

      // Update all chore entries that reference the old task name
      await supabase
        .from("chores")
        .update({ task_name: trimmed })
        .eq("household_id", householdId)
        .eq("task_name", oldName);

      void fetchAll();
    },
    [householdId, fetchAll]
  );

  const removeTask = useCallback(
    async (id: string, name: string) => {
      if (!householdId) return;

      // Delete associated chore entries first
      await supabase
        .from("chores")
        .delete()
        .eq("household_id", householdId)
        .eq("task_name", name);

      // Delete the task itself
      await supabase.from("chore_tasks").delete().eq("id", id);

      void fetchAll();
    },
    [householdId, fetchAll]
  );

  const toggleReminderDone = useCallback(
    async (reminderId: string) => {
      const reminder = reminders.find((r) => r.id === reminderId);
      if (!reminder) return;

      const today = new Date().toISOString().slice(0, 10);
      const newDate = reminder.last_done_date === today ? null : today;

      await supabase
        .from("chore_reminders")
        .update({ last_done_date: newDate })
        .eq("id", reminderId);

      void fetchAll();
    },
    [reminders, fetchAll]
  );

  const updateReminder = useCallback(
    async (id: string, title: string, recurrence: string) => {
      await supabase
        .from("chore_reminders")
        .update({ title, recurrence })
        .eq("id", id);

      void fetchAll();
    },
    [fetchAll]
  );

  const addReminder = useCallback(
    async (title: string, recurrence: string) => {
      if (!householdId) return;
      await supabase
        .from("chore_reminders")
        .insert({ household_id: householdId, title, recurrence });
      void fetchAll();
    },
    [householdId, fetchAll]
  );

  const seedDefaultTasks = useCallback(
    async () => {
      if (!householdId) return;
      const rows = DEFAULT_CHORE_TASKS.map((name) => ({
        household_id: householdId,
        name,
        show_in_grid: true,
      }));
      await supabase.from("chore_tasks").insert(rows);
      void fetchAll();
    },
    [householdId, fetchAll]
  );

  useEffect(() => {
    if (householdId && hasFetched.current && !loading && tasks.length === 0 && !seededRef.current) {
      seededRef.current = true;
      void seedDefaultTasks();
    }
  }, [householdId, loading, tasks.length]);

  return {
    chores,
    tasks,
    reminders,
    loading,
    setCellIntensity,
    addTask,
    editTask,
    removeTask,
    toggleReminderDone,
    updateReminder,
    addReminder,
    toggleTaskVisibility,
    fetchAll,
    seedDefaultTasks,
  };
}
