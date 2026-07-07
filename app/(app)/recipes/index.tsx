import React, { useCallback, useState } from "react";
import {
  FlatList,
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
import { useRecipes } from "../../../lib/hooks/useRecipes";
import { useTheme } from "../../../lib/theme";
import { Recipe, RecipeStep, DurationUnit } from "../../../lib/types";
import { haptic } from "../../../lib/haptics";
import { formatDuration } from "../../../lib/calendar-logic";
import { getRecipePlaceholder, RECIPE_ICONS } from "../../../lib/recipe-placeholders";
import { DraggableStepList } from "../../../components/DraggableStepList";

export default function RecipesListScreen() {
  const { profile } = useAuth();
  const {
    recipes, instances, loading,
    addRecipe, updateRecipe, deleteRecipe,
    fetchAll,
  } = useRecipes(profile?.household_id);
  const t = useTheme();
  const router = useRouter();
  const userColor = profile?.color ?? t.accent;

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  // Recipe form
  const [showForm, setShowForm] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formIcon, setFormIcon] = useState<string | undefined>(undefined);
  const [formIngredients, setFormIngredients] = useState("");
  const [formSteps, setFormSteps] = useState<RecipeStep[]>([]);
  const [newStepTitle, setNewStepTitle] = useState("");
  const [newStepDesc, setNewStepDesc] = useState("");
  const [newStepDurationValue, setNewStepDurationValue] = useState("");
  const [newStepDurationUnit, setNewStepDurationUnit] = useState<DurationUnit>("minutes");

  // Confirm delete modal
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string } | null>(null);

  const resetForm = () => {
    setFormTitle(""); setFormDesc(""); setFormIcon(undefined); setFormIngredients("");
    setFormSteps([]); setNewStepTitle(""); setNewStepDesc("");
    setNewStepDurationValue(""); setNewStepDurationUnit("minutes");
    setEditingRecipe(null); setShowForm(false);
  };

  const openEditRecipe = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setFormTitle(recipe.title);
    setFormDesc(recipe.description);
    setFormIcon(recipe.icon ?? undefined);
    setFormIngredients(recipe.ingredients.join("\n"));
    setFormSteps(recipe.steps);
    setShowForm(true);
  };

  const handleSaveRecipe = async () => {
    if (!formTitle.trim()) return;
    void haptic.medium();
    const ingredients = formIngredients.split("\n").map((l) => l.trim()).filter(Boolean);
    if (editingRecipe) {
      await updateRecipe(editingRecipe.id, formTitle, formDesc, ingredients, formSteps, formIcon);
    } else {
      await addRecipe(formTitle, formDesc, ingredients, formSteps, formIcon);
    }
    resetForm();
  };

  const handleAddStep = () => {
    if (!newStepTitle.trim()) return;
    setFormSteps([...formSteps, {
      title: newStepTitle.trim(),
      description: newStepDesc.trim(),
      duration_value: parseInt(newStepDurationValue, 10) || 0,
      duration_unit: newStepDurationUnit,
    }]);
    setNewStepTitle(""); setNewStepDesc("");
    setNewStepDurationValue(""); setNewStepDurationUnit("minutes");
  };

  const handleDeleteRecipe = (id: string, title: string) => {
    void haptic.warning();
    setConfirmDelete({ id, title });
  };

  const computeTotalTime = (recipe: Recipe): string => {
    let totalMin = 0;
    for (const step of recipe.steps) {
      const v = step.duration_value ?? 0;
      switch (step.duration_unit) {
        case "days": totalMin += v * 24 * 60; break;
        case "hours": totalMin += v * 60; break;
        case "minutes": totalMin += v; break;
      }
    }
    if (totalMin === 0) return "";
    if (totalMin >= 1440) return `${Math.round(totalMin / 1440)}j`;
    if (totalMin >= 60) return `${Math.round(totalMin / 60)}h`;
    return `${totalMin}min`;
  };

  const renderRecipe = ({ item }: { item: Recipe }) => {
    const placeholder = getRecipePlaceholder(item.id, item.icon);
    const activeInstances = instances.filter((i) => i.recipe_id === item.id && !i.completed_at);
    const completedInstances = instances.filter((i) => i.recipe_id === item.id && !!i.completed_at);
    const totalTime = computeTotalTime(item);

    return (
      <Pressable
        style={[styles.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}
        onPress={() => router.push(`/(app)/recipes/${item.id}`)}
        onLongPress={() => handleDeleteRecipe(item.id, item.title)}
      >
        <View style={[styles.cardImage, { backgroundColor: placeholder.bg }]}>
          <Ionicons name={placeholder.icon as any} size={28} color={t.textSecondary} />
        </View>
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, { color: t.text }]} numberOfLines={1}>{item.title}</Text>
          <View style={styles.cardStats}>
            {activeInstances.length > 0 && (
              <View style={styles.statChip}>
                <Ionicons name="flask-outline" size={12} color={t.accent} />
                <Text style={[styles.statText, { color: t.accent }]}>{activeInstances.length} en cours</Text>
              </View>
            )}
            {completedInstances.length > 0 && (
              <View style={styles.statChip}>
                <Ionicons name="checkmark-circle-outline" size={12} color={t.success} />
                <Text style={[styles.statText, { color: t.success }]}>{completedInstances.length} terminée{completedInstances.length > 1 ? "s" : ""}</Text>
              </View>
            )}
            {totalTime ? (
              <View style={styles.statChip}>
                <Ionicons name="time-outline" size={12} color={t.textMuted} />
                <Text style={[styles.statText, { color: t.textMuted }]}>{totalTime}</Text>
              </View>
            ) : null}
          </View>
        </View>
        <Pressable style={styles.editBtn} onPress={() => openEditRecipe(item)} hitSlop={8}>
          <Ionicons name="create-outline" size={18} color={t.textMuted} />
        </Pressable>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.background }]} edges={["top"]}>
      <View style={[styles.header, { backgroundColor: t.card, borderBottomColor: t.cardBorder }]}>
        <Text style={[styles.headerTitle, { color: t.text }]}>Recettes</Text>
      </View>

      <FlatList
        data={recipes}
        keyExtractor={(item) => item.id}
        renderItem={renderRecipe}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.accent} colors={[t.accent]} />}
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.emptyContainer}>
              <Ionicons name="restaurant-outline" size={48} color={t.emptyIcon} />
              <Text style={[styles.emptyText, { color: t.textMuted }]}>Aucune recette</Text>
              <Pressable style={[styles.emptyCta, { backgroundColor: t.accent }]} onPress={() => setShowForm(true)}>
                <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
                <Text style={styles.emptyCtaText}>Créer une recette</Text>
              </Pressable>
            </View>
          )
        }
      />

      {/* Recipe form modal */}
      <Modal visible={showForm} transparent animationType="slide">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Pressable style={styles.modalOverlay} onPress={resetForm}>
          <Pressable style={[styles.modalContent, { backgroundColor: t.card }]} onPress={() => {}}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[styles.modalTitle, { color: t.text }]}>
                {editingRecipe ? "Modifier la recette" : "Nouvelle recette"}
              </Text>
              <TextInput
                style={[styles.modalInput, { borderColor: t.inputBorder, backgroundColor: t.inputBg, color: t.text }]}
                placeholder="Titre" placeholderTextColor={t.textMuted}
                value={formTitle} onChangeText={setFormTitle} autoFocus
              />
              <TextInput
                style={[styles.modalInput, { borderColor: t.inputBorder, backgroundColor: t.inputBg, color: t.text }]}
                placeholder="Description (optionnel)" placeholderTextColor={t.textMuted}
                value={formDesc} onChangeText={setFormDesc}
              />
              <Text style={[styles.sectionLabel, { color: t.textSecondary }]}>Icône</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                {RECIPE_ICONS.map((ic) => (
                  <Pressable
                    key={ic.name}
                    style={[styles.iconChip, { borderColor: formIcon === ic.name ? t.accent : t.inputBorder, backgroundColor: formIcon === ic.name ? t.accentLight : t.inputBg }]}
                    onPress={() => setFormIcon(formIcon === ic.name ? undefined : ic.name)}
                  >
                    <Ionicons name={ic.name as any} size={22} color={formIcon === ic.name ? t.accent : t.textSecondary} />
                  </Pressable>
                ))}
              </ScrollView>
              <Text style={[styles.sectionLabel, { color: t.textSecondary }]}>Ingrédients (un par ligne)</Text>
              <TextInput
                style={[styles.modalInput, { minHeight: 80, borderColor: t.inputBorder, backgroundColor: t.inputBg, color: t.text }]}
                placeholder={"200g de sel\n1kg de magret\nPoivre noir"} placeholderTextColor={t.textMuted}
                value={formIngredients} onChangeText={setFormIngredients} multiline
              />
              <Text style={[styles.sectionLabel, { color: t.textSecondary }]}>Étapes</Text>
              <DraggableStepList
                items={formSteps}
                onReorder={setFormSteps}
                handleColor={t.textMuted}
                renderItem={(step, idx) => (
                  <View style={[styles.stepCard, { backgroundColor: t.separator, borderColor: t.cardBorder }]}>
                    <View style={styles.stepCardHeader}>
                      <Text style={[styles.stepCardTitle, { color: t.text }]}>{idx + 1}. {step.title}</Text>
                      <Pressable hitSlop={6} onPress={() => setFormSteps(formSteps.filter((_, i) => i !== idx))}>
                        <Ionicons name="close-circle" size={18} color={t.danger} />
                      </Pressable>
                    </View>
                    {step.description ? <Text style={[styles.stepCardDesc, { color: t.textSecondary }]}>{step.description}</Text> : null}
                    {formatDuration(step) ? <Text style={[styles.stepCardDuration, { color: t.textMuted }]}>Durée : {formatDuration(step)}</Text> : null}
                  </View>
                )}
              />
              <View style={styles.addStepSection}>
                <TextInput
                  style={[styles.modalInput, { borderColor: t.inputBorder, backgroundColor: t.inputBg, color: t.text }]}
                  placeholder="Titre de l'étape" placeholderTextColor={t.textMuted}
                  value={newStepTitle} onChangeText={setNewStepTitle}
                />
                <TextInput
                  style={[styles.modalInput, { borderColor: t.inputBorder, backgroundColor: t.inputBg, color: t.text }]}
                  placeholder="Description (optionnel)" placeholderTextColor={t.textMuted}
                  value={newStepDesc} onChangeText={setNewStepDesc}
                />
                <View style={styles.durationRow}>
                  <TextInput
                    style={[styles.modalInput, { flex: 1, borderColor: t.inputBorder, backgroundColor: t.inputBg, color: t.text }]}
                    placeholder="Durée" placeholderTextColor={t.textMuted}
                    value={newStepDurationValue} onChangeText={setNewStepDurationValue} keyboardType="numeric"
                  />
                  {(["minutes", "hours", "days"] as DurationUnit[]).map((unit) => (
                    <Pressable
                      key={unit}
                      style={[styles.unitChip, { backgroundColor: newStepDurationUnit === unit ? t.accent : t.inputBg, borderColor: newStepDurationUnit === unit ? t.accent : t.inputBorder }]}
                      onPress={() => setNewStepDurationUnit(unit)}
                    >
                      <Text style={[styles.unitChipText, { color: newStepDurationUnit === unit ? "#FFFFFF" : t.textSecondary }]}>
                        {unit === "minutes" ? "min" : unit === "hours" ? "h" : "j"}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Pressable style={[styles.addStepBtn, !newStepTitle.trim() && { opacity: 0.5 }]} onPress={handleAddStep} disabled={!newStepTitle.trim()}>
                  <Ionicons name="add-circle-outline" size={18} color={t.accent} />
                  <Text style={[styles.addStepText, { color: t.accent }]}>Ajouter l'étape</Text>
                </Pressable>
              </View>
              <View style={styles.modalBtnRow}>
                <Pressable style={[styles.modalCancelBtn, { backgroundColor: t.separator, borderColor: t.cardBorder }]} onPress={resetForm}>
                  <Text style={[styles.modalCancelText, { color: t.textSecondary }]}>Annuler</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalSubmitBtn, { backgroundColor: t.accent }, !formTitle.trim() && { opacity: 0.5 }]}
                  onPress={() => void handleSaveRecipe()} disabled={!formTitle.trim()}
                >
                  <Text style={styles.modalSubmitText}>Enregistrer</Text>
                </Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Confirm delete modal */}
      <Modal visible={!!confirmDelete} transparent animationType="fade">
        <Pressable style={[styles.modalOverlay, { justifyContent: "center" }]} onPress={() => setConfirmDelete(null)}>
          <View style={[styles.confirmModal, { backgroundColor: t.card }]}>
            <Ionicons name="warning-outline" size={32} color={t.danger} style={{ alignSelf: "center", marginBottom: 8 }} />
            <Text style={[styles.confirmTitle, { color: t.text }]}>Supprimer la recette</Text>
            <Text style={[styles.confirmMsg, { color: t.textSecondary }]}>
              Supprimer « {confirmDelete?.title} » et toutes ses instances ?
            </Text>
            <View style={styles.modalBtnRow}>
              <Pressable style={[styles.modalCancelBtn, { backgroundColor: t.separator, borderColor: t.cardBorder }]} onPress={() => setConfirmDelete(null)}>
                <Text style={[styles.modalCancelText, { color: t.textSecondary }]}>Annuler</Text>
              </Pressable>
              <Pressable
                style={[styles.modalSubmitBtn, { backgroundColor: t.danger }]}
                onPress={() => { void deleteRecipe(confirmDelete!.id); setConfirmDelete(null); }}
              >
                <Text style={styles.modalSubmitText}>Supprimer</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* FAB */}
      {!showForm && (
        <Pressable style={[styles.fab, { backgroundColor: t.accent }]} onPress={() => setShowForm(true)}>
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { borderBottomWidth: 1, paddingHorizontal: 20, paddingVertical: 12 },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 100 },
  emptyContainer: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15 },
  emptyCta: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, marginTop: 8 },
  emptyCtaText: { color: "#FFFFFF", fontWeight: "600", fontSize: 14 },

  card: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  cardImage: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: "600" },
  cardStats: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  statChip: { flexDirection: "row", alignItems: "center", gap: 3 },
  statText: { fontSize: 11, fontWeight: "600" },
  editBtn: { padding: 6 },

  fab: {
    position: "absolute", right: 20, bottom: 24,
    width: 56, height: 56, borderRadius: 28,
    alignItems: "center", justifyContent: "center",
    elevation: 6, shadowColor: "#000", shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 6,
  },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32, maxHeight: "85%" },
  modalTitle: { fontSize: 17, fontWeight: "700", marginBottom: 4 },
  modalInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 10 },
  sectionLabel: { fontSize: 13, fontWeight: "600", marginBottom: 8, marginTop: 4 },
  stepCard: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 6 },
  stepCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  stepCardTitle: { fontSize: 14, fontWeight: "600", flex: 1 },
  stepCardDesc: { fontSize: 12, marginTop: 2 },
  stepCardDuration: { fontSize: 11, marginTop: 2 },
  addStepSection: { marginTop: 8 },
  durationRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  unitChip: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1 },
  unitChipText: { fontSize: 14, fontWeight: "600" },
  addStepBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8 },
  addStepText: { fontSize: 14, fontWeight: "600" },
  modalBtnRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  modalCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center", borderWidth: 1 },
  modalCancelText: { fontWeight: "600", fontSize: 15 },
  modalSubmitBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  modalSubmitText: { fontWeight: "600", color: "#FFFFFF", fontSize: 15 },

  // Icon selector
  iconChip: { width: 44, height: 44, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center", marginRight: 6 },

  // Confirm delete modal
  confirmModal: { borderRadius: 16, padding: 24, marginHorizontal: 32, alignSelf: "center" },
  confirmTitle: { fontSize: 17, fontWeight: "700", textAlign: "center", marginBottom: 4 },
  confirmMsg: { fontSize: 14, textAlign: "center", marginBottom: 16, lineHeight: 20 },
});
