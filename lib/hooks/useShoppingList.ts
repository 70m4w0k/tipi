import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabase";
import { ShoppingItem } from "../types";

export function useShoppingList(householdId: string | null | undefined) {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    if (!householdId) return;
    const channel = supabase
      .channel(`shopping:${householdId}`)
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
    async (title: string, category = "") => {
      if (!householdId || !title.trim()) return;
      await supabase.from("shopping_items").insert({
        household_id: householdId,
        title: title.trim(),
        category: category.trim(),
      });
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

  return { items, loading, addItem, toggleItem, deleteItem, clearChecked };
}
