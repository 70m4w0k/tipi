import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabase";
import { HouseEvent } from "../types";

export function useEvents(householdId: string | null | undefined) {
  const [events, setEvents] = useState<HouseEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEvents = useCallback(async () => {
    if (!householdId) {
      setEvents([]);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("events")
      .select("*")
      .eq("household_id", householdId)
      .order("date", { ascending: false });
    setEvents(data ?? []);
    setLoading(false);
  }, [householdId]);

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (!householdId) return;

    const channel = supabase
      .channel(`events:${householdId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "events",
          filter: `household_id=eq.${householdId}`,
        },
        (payload) => {
          setEvents((prev) => {
            const ev = payload.new as HouseEvent;
            if (prev.some((e) => e.id === ev.id)) return prev;
            return [ev, ...prev];
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "events",
          filter: `household_id=eq.${householdId}`,
        },
        (payload) => {
          setEvents((prev) => prev.filter((e) => e.id !== (payload.old as HouseEvent).id));
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [householdId]);

  const addEvent = async (title: string, date: string, note: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !householdId) return;

    await supabase.from("events").insert({
      household_id: householdId,
      title,
      date,
      note,
      created_by: user.id,
    });
    void fetchEvents();
  };

  const deleteEvent = async (id: string) => {
    await supabase.from("events").delete().eq("id", id);
    void fetchEvents();
  };

  return { events, loading, addEvent, deleteEvent, fetchEvents };
}
