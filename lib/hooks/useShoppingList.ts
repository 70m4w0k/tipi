import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../supabase";
import { ShoppingItem } from "../types";
import { guessAisle } from "../shopping-categories";

let channelCounter = 0;

export function useShoppingList(householdId: string | null | undefined) {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const channelId = useRef(++channelCounter);

  const fetchItems = useCallback(async () => {
    if (!householdId) {
      setItems([]);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("shopping_items")
      .select("*")
      .eq("household_id", householdId)
      .order("checked", { ascending: true })
      .order("created_at", { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  }, [householdId]);

  const fetchSuggestions = useCallback(async () => {
    if (!householdId) return;
    const { data } = await supabase
      .from("shopping_items")
      .select("title")
      .eq("household_id", householdId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (!data) return;
    const counts = new Map<string, number>();
    for (const row of data) {
      const key = row.title.toLowerCase().trim();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const sorted = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([title]) => title);
    setSuggestions(sorted.slice(0, 10));
  }, [householdId]);

  useEffect(() => {
    void fetchItems();
    void fetchSuggestions();
  }, [fetchItems, fetchSuggestions]);

  useEffect(() => {
    if (!householdId) return;
    const channel = supabase
      .channel(`shopping:${householdId}:${channelId.current}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shopping_items",
          filter: `household_id=eq.${householdId}`,
        },
        () => void fetchItems()
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [householdId, fetchItems]);

  const addItem = useCallback(
    async (title: string, category?: string, quantity?: string, ownerId?: string | null) => {
      if (!householdId || !title.trim()) return;
      const resolvedCategory = category?.trim() || guessAisle(title);
      await supabase.from("shopping_items").insert({
        household_id: householdId,
        title: title.trim(),
        quantity: quantity?.trim() || "",
        category: resolvedCategory,
        owner_id: ownerId ?? null,
      });
      void fetchItems();
    },
    [householdId, fetchItems]
  );

  /** Ajout groupé (ex. ingrédients d'une recette) en une seule requête */
  const addItems = useCallback(
    async (rows: { title: string; quantity?: string; category?: string; ownerId?: string | null }[]) => {
      if (!householdId || rows.length === 0) return;
      const payload = rows
        .filter((r) => r.title.trim().length > 0)
        .map((r) => ({
          household_id: householdId,
          title: r.title.trim(),
          quantity: r.quantity?.trim() || "",
          category: r.category?.trim() || guessAisle(r.title),
          owner_id: r.ownerId ?? null,
        }));
      if (payload.length > 0) await supabase.from("shopping_items").insert(payload);
      void fetchItems();
    },
    [householdId, fetchItems]
  );

  const toggleItem = useCallback(
    async (id: string) => {
      const item = items.find((i) => i.id === id);
      if (!item) return;
      await supabase
        .from("shopping_items")
        .update({ checked: !item.checked })
        .eq("id", id);
      void fetchItems();
    },
    [items, fetchItems]
  );

  const deleteItem = useCallback(
    async (id: string) => {
      await supabase.from("shopping_items").delete().eq("id", id);
      void fetchItems();
    },
    [fetchItems]
  );

  const clearChecked = useCallback(async () => {
    if (!householdId) return;
    await supabase
      .from("shopping_items")
      .delete()
      .eq("household_id", householdId)
      .eq("checked", true);
    void fetchItems();
  }, [householdId, fetchItems]);

  return { items, suggestions, loading, addItem, addItems, toggleItem, deleteItem, clearChecked, fetchItems };
}
