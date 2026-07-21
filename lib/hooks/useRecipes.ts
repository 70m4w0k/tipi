import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../supabase";
import { Recipe, RecipeInstance, RecipeStep, Ingredient } from "../types";

let channelCounter = 0;

export function useRecipes(householdId: string | null | undefined) {
  const channelId = useRef(++channelCounter);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [instances, setInstances] = useState<RecipeInstance[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!householdId) {
      setRecipes([]);
      setInstances([]);
      return;
    }
    setLoading(true);
    const [recipeRes, instanceRes] = await Promise.all([
      supabase
        .from("recipes")
        .select("*")
        .eq("household_id", householdId)
        .order("created_at", { ascending: false }),
      supabase
        .from("recipe_instances")
        .select("*")
        .eq("household_id", householdId)
        .order("started_at", { ascending: false }),
    ]);
    setRecipes(recipeRes.data ?? []);
    setInstances(instanceRes.data ?? []);
    setLoading(false);
  }, [householdId]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const fetchRef = useRef(fetchAll);
  fetchRef.current = fetchAll;

  useEffect(() => {
    if (!householdId) return;
    const handler = () => void fetchRef.current();
    const channel = supabase
      .channel(`recipes:${householdId}:${channelId.current}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "recipes", filter: `household_id=eq.${householdId}` }, handler)
      .on("postgres_changes", { event: "*", schema: "public", table: "recipe_instances", filter: `household_id=eq.${householdId}` }, handler)
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [householdId]);

  const addRecipe = useCallback(
    async (title: string, description: string, ingredients: Ingredient[], steps: RecipeStep[], servings: number, icon?: string) => {
      if (!householdId || !title.trim()) return;
      await supabase.from("recipes").insert({
        household_id: householdId,
        title: title.trim(),
        description: description.trim(),
        icon: icon ?? null,
        servings,
        ingredients,
        steps,
      });
      void fetchAll();
    },
    [householdId, fetchAll]
  );

  const updateRecipe = useCallback(
    async (id: string, title: string, description: string, ingredients: Ingredient[], steps: RecipeStep[], servings: number, icon?: string) => {
      await supabase
        .from("recipes")
        .update({ title: title.trim(), description: description.trim(), icon: icon ?? null, servings, ingredients, steps })
        .eq("id", id);
      void fetchAll();
    },
    [fetchAll]
  );

  const deleteRecipe = useCallback(
    async (id: string) => {
      await supabase.from("recipes").delete().eq("id", id);
      void fetchAll();
    },
    [fetchAll]
  );

  const startInstance = useCallback(
    async (recipeId: string, label: string, notes = "", targetDate?: string, startingStep = 0): Promise<string | null> => {
      if (!householdId) return "Aucun foyer sélectionné";
      const now = new Date().toISOString();
      const completions: string[] = [];
      for (let i = 0; i < startingStep; i++) completions.push(now);
      const { error } = await supabase.from("recipe_instances").insert({
        household_id: householdId,
        recipe_id: recipeId,
        label: label.trim(),
        notes: notes.trim(),
        target_date: targetDate ?? null,
        current_step: startingStep,
        step_completions: completions,
        started_at: now,
        step_started_at: now,
      });
      if (error) return error.message;
      await fetchAll();
      return null;
    },
    [householdId, fetchAll]
  );

  const advanceStep = useCallback(
    async (instanceId: string) => {
      const inst = instances.find((i) => i.id === instanceId);
      if (!inst) return;
      const recipe = recipes.find((r) => r.id === inst.recipe_id);
      if (!recipe) return;
      const nextStep = inst.current_step + 1;
      if (nextStep >= recipe.steps.length) return;
      const now = new Date().toISOString();
      const completions = [...(inst.step_completions ?? [])];
      completions[inst.current_step] = now;
      await supabase
        .from("recipe_instances")
        .update({ current_step: nextStep, step_started_at: now, step_completions: completions })
        .eq("id", instanceId);
      void fetchAll();
    },
    [instances, recipes, fetchAll]
  );

  const goBackStep = useCallback(
    async (instanceId: string) => {
      const inst = instances.find((i) => i.id === instanceId);
      if (!inst || inst.current_step <= 0) return;
      await supabase
        .from("recipe_instances")
        .update({ current_step: inst.current_step - 1, step_started_at: new Date().toISOString() })
        .eq("id", instanceId);
      void fetchAll();
    },
    [instances, fetchAll]
  );

  const updateInstanceNotes = useCallback(
    async (instanceId: string, notes: string) => {
      await supabase
        .from("recipe_instances")
        .update({ notes })
        .eq("id", instanceId);
      void fetchAll();
    },
    [fetchAll]
  );

  const activatePlannedInstance = useCallback(
    async (instanceId: string) => {
      const now = new Date().toISOString();
      const dateLabel = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
      const entry = `[${dateLabel}] Recette démarrée`;
      const { data } = await supabase
        .from("recipe_instances")
        .select("notes")
        .eq("id", instanceId)
        .single();
      const prevNotes = data?.notes ? data.notes + "\n" : "";
      await supabase
        .from("recipe_instances")
        .update({
          started_at: now,
          step_started_at: now,
          notes: prevNotes + entry,
        })
        .eq("id", instanceId);
      await fetchAll();
    },
    [fetchAll]
  );

  const deleteInstance = useCallback(
    async (instanceId: string) => {
      await supabase.from("recipe_instances").delete().eq("id", instanceId);
      void fetchAll();
    },
    [fetchAll]
  );

  const completeInstance = useCallback(
    async (instanceId: string) => {
      const inst = instances.find((i) => i.id === instanceId);
      const now = new Date().toISOString();
      const completions = [...(inst?.step_completions ?? [])];
      if (inst) completions[inst.current_step] = now;
      await supabase
        .from("recipe_instances")
        .update({ completed_at: now, step_completions: completions })
        .eq("id", instanceId);
      void fetchAll();
    },
    [instances, fetchAll]
  );

  return {
    recipes,
    instances,
    loading,
    addRecipe,
    updateRecipe,
    deleteRecipe,
    startInstance,
    advanceStep,
    goBackStep,
    activatePlannedInstance,
    updateInstanceNotes,
    deleteInstance,
    completeInstance,
    fetchAll,
  };
}
