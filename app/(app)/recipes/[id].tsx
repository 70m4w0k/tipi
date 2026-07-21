import React, { useCallback, useEffect, useState } from "react";
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
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "../../../lib/hooks/useAuth";
import { useRecipes } from "../../../lib/hooks/useRecipes";
import { useTheme } from "../../../lib/theme";
import { haptic } from "../../../lib/haptics";
import { formatDuration } from "../../../lib/calendar-logic";
import { getRecipePlaceholder, RECIPE_ICONS } from "../../../lib/recipe-placeholders";
import { DraggableStepList } from "../../../components/DraggableStepList";
import { LiquidProgress } from "../../../components/LiquidProgress";
import { IngredientsEditor } from "../../../components/IngredientsEditor";
import { AddToShoppingSheet } from "../../../components/AddToShoppingSheet";
import { RecipeInstance, RecipeStep, DurationUnit, Ingredient } from "../../../lib/types";
import { scaleAmount, formatQuantity, computeShoppingAdditions } from "../../../lib/recipes-logic";
import { useShoppingList } from "../../../lib/hooks/useShoppingList";

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const {
    recipes, instances, loading,
    startInstance, updateRecipe, activatePlannedInstance, deleteInstance, fetchAll,
  } = useRecipes(profile?.household_id);
  const { items: shoppingItems, addItems } = useShoppingList(profile?.household_id);
  const t = useTheme();
  const router = useRouter();
  const userColor = profile?.color ?? t.accent;
  const [shopSheet, setShopSheet] = useState(false);

  const recipe = recipes.find((r) => r.id === id);
  const recipeInstances = instances.filter((i) => i.recipe_id === id);
  const activeInstances = recipeInstances.filter((i) => !i.completed_at);
  const completedInstances = recipeInstances.filter((i) => !!i.completed_at);

  const [showSteps, setShowSteps] = useState(false);
  const [targetServings, setTargetServings] = useState(4);
  // Le curseur de portions démarre sur les portions de base de la recette.
  useEffect(() => { if (recipe) setTargetServings(recipe.servings); }, [recipe?.id, recipe?.servings]);
  const [refreshing, setRefreshing] = useState(false);

  // Start modal
  const [showStartModal, setShowStartModal] = useState(false);
  const [instanceLabel, setInstanceLabel] = useState("");
  const [instanceNotes, setInstanceNotes] = useState("");
  const [batchQty, setBatchQty] = useState("1");
  const [startingStep, setStartingStep] = useState(0);
  const [targetDate, setTargetDate] = useState("");

  // Edit recipe modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editIcon, setEditIcon] = useState<string | undefined>(undefined);
  const [editIngredients, setEditIngredients] = useState<Ingredient[]>([]);
  const [editServings, setEditServings] = useState(4);
  const [editSteps, setEditSteps] = useState<RecipeStep[]>([]);
  const [newStepTitle, setNewStepTitle] = useState("");
  const [newStepDesc, setNewStepDesc] = useState("");
  const [newStepDurationValue, setNewStepDurationValue] = useState("");
  const [newStepDurationUnit, setNewStepDurationUnit] = useState<DurationUnit>("minutes");

  const [confirmDeleteInst, setConfirmDeleteInst] = useState<{ id: string; label: string } | null>(null);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  const handleStart = async () => {
    if (!id || !instanceLabel.trim()) return;
    void haptic.medium();
    const qty = Math.max(1, parseInt(batchQty, 10) || 1);
    for (let i = 0; i < qty; i++) {
      const label = qty > 1 ? `${instanceLabel.trim()} ${i + 1}` : instanceLabel.trim();
      await startInstance(id, label, instanceNotes, targetDate || undefined, startingStep);
    }
    setShowStartModal(false);
    setInstanceLabel("");
    setInstanceNotes("");
    setBatchQty("1");
    setStartingStep(0);
    setTargetDate("");
  };

  const openEditModal = () => {
    if (!recipe) return;
    setEditTitle(recipe.title);
    setEditDesc(recipe.description);
    setEditIcon(recipe.icon ?? undefined);
    setEditIngredients(recipe.ingredients);
    setEditServings(recipe.servings);
    setEditSteps(recipe.steps);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!recipe || !editTitle.trim()) return;
    void haptic.medium();
    const ingredients = editIngredients.filter((i) => i.name.trim().length > 0);
    await updateRecipe(recipe.id, editTitle, editDesc, ingredients, editSteps, editServings, editIcon);
    setShowEditModal(false);
  };

  const handleAddStep = () => {
    if (!newStepTitle.trim()) return;
    setEditSteps([...editSteps, {
      title: newStepTitle.trim(),
      description: newStepDesc.trim(),
      duration_value: parseInt(newStepDurationValue, 10) || 0,
      duration_unit: newStepDurationUnit,
    }]);
    setNewStepTitle(""); setNewStepDesc("");
    setNewStepDurationValue(""); setNewStepDurationUnit("minutes");
  };

  const handleDeleteInstance = (instId: string, label: string) => {
    void haptic.warning();
    setConfirmDeleteInst({ id: instId, label });
  };

  if (!recipe) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: t.background }]}>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: t.textMuted }]}>Recette introuvable</Text>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: t.accent, fontWeight: "600" }}>Retour</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const placeholder = getRecipePlaceholder(recipe.id, recipe.icon);

  const renderInstance = (inst: RecipeInstance, isCompleted: boolean) => {
    const progress = recipe.steps.length > 0
      ? (isCompleted ? 1 : (inst.current_step / recipe.steps.length))
      : (isCompleted ? 1 : 0);
    const progressColor = isCompleted ? t.success : userColor;
    const isPlannedOnly = !!inst.target_date && inst.current_step === 0 && (inst.step_completions ?? []).length === 0 && !inst.completed_at;

    return (
      <Pressable
        key={inst.id}
        style={[styles.instanceCard, { backgroundColor: t.card, borderColor: t.cardBorder }]}
        onPress={() => router.push(`/(app)/recipes/instance/${inst.id}`)}
      >
        <LiquidProgress progress={progress} color={progressColor} borderRadius={12} />
        <View style={[styles.instanceImage, { backgroundColor: placeholder.bg }]}>
          <Ionicons
            name={isCompleted ? "checkmark-circle" : isPlannedOnly ? "calendar-outline" : "flask-outline"}
            size={22}
            color={isCompleted ? t.success : isPlannedOnly ? "#EA580C" : t.accent}
          />
        </View>
        <View style={styles.instanceContent}>
          <Text style={[styles.instanceLabel, { color: t.text }]} numberOfLines={1}>{inst.label}</Text>
          <Text style={[styles.instanceMeta, { color: t.textSecondary }]}>
            {isCompleted
              ? `Terminée le ${new Date(inst.completed_at!).toLocaleDateString("fr-FR")}`
              : isPlannedOnly
                ? `Planifiée pour le ${new Date(inst.target_date! + "T12:00:00").toLocaleDateString("fr-FR")}`
                : `Étape ${inst.current_step + 1}/${recipe.steps.length} · Depuis ${new Date(inst.started_at).toLocaleDateString("fr-FR")}`
            }
          </Text>
        </View>
        {!isCompleted && (
          <Pressable onPress={() => handleDeleteInstance(inst.id, inst.label)} hitSlop={8} style={{ padding: 4, zIndex: 2 }}>
            <Ionicons name="trash-outline" size={16} color={t.danger} />
          </Pressable>
        )}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.background }]} edges={["top"]}>
      <View style={[styles.header, { backgroundColor: t.card, borderBottomColor: t.cardBorder }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={t.text} />
        </Pressable>
        <Text testID="recipe-detail-title" style={[styles.headerTitle, { color: t.text }]} numberOfLines={1}>{recipe.title}</Text>
        <Pressable testID="recipe-edit-header" onPress={openEditModal} hitSlop={8}>
          <Ionicons name="create-outline" size={22} color={t.textMuted} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.accent} colors={[t.accent]} />}
      >
        {/* Description */}
        {!!recipe.description && (
          <Text style={[styles.descriptionText, { color: t.textSecondary }]}>{recipe.description}</Text>
        )}

        {/* Ingredients */}
        {recipe.ingredients.length > 0 && (
          <View style={[styles.section, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
            <View style={styles.ingredientsHeader}>
              <Text style={[styles.sectionTitle, { color: t.text }]}>Ingrédients</Text>
              <View style={styles.portionScaler}>
                <Pressable testID="portion-minus" hitSlop={6} onPress={() => setTargetServings((s) => Math.max(1, s - 1))}>
                  <Ionicons name="remove-circle-outline" size={22} color={t.accent} />
                </Pressable>
                <Text style={[styles.portionValue, { color: t.text }]}>{targetServings} pers.</Text>
                <Pressable testID="portion-plus" hitSlop={6} onPress={() => setTargetServings((s) => Math.min(50, s + 1))}>
                  <Ionicons name="add-circle-outline" size={22} color={t.accent} />
                </Pressable>
              </View>
            </View>
            {recipe.ingredients.map((ing, i) => {
              const amount = ing.amount != null ? scaleAmount(ing.amount, recipe.servings, targetServings) : null;
              const qty = formatQuantity(amount, ing.unit);
              return (
                <View key={i} style={styles.ingredientRow}>
                  <Ionicons name="ellipse" size={6} color={t.textMuted} />
                  <Text style={[styles.ingredientText, { color: t.textSecondary }]}>{ing.name}</Text>
                  {!!qty && <Text style={[styles.ingredientQty, { color: t.text }]}>{qty}</Text>}
                </View>
              );
            })}
            <Pressable
              testID="add-to-shopping"
              style={[styles.shopBtn, { backgroundColor: t.accent }]}
              onPress={() => { void haptic.light(); setShopSheet(true); }}
            >
              <Ionicons name="cart-outline" size={17} color="#FFFFFF" />
              <Text style={styles.shopBtnText}>Ajouter aux courses</Text>
            </Pressable>
          </View>
        )}

        {/* Steps (collapsible) */}
        {recipe.steps.length > 0 && (
          <View style={[styles.section, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
            <Pressable style={styles.sectionToggle} onPress={() => setShowSteps(!showSteps)}>
              <Text style={[styles.sectionTitle, { color: t.text }]}>
                Étapes ({recipe.steps.length})
              </Text>
              <Ionicons name={showSteps ? "chevron-up" : "chevron-down"} size={20} color={t.textMuted} />
            </Pressable>
            {showSteps && recipe.steps.map((step, idx) => (
              <View key={idx} style={[styles.stepItem, { borderColor: t.separator }]}>
                <View style={[styles.stepNumber, { backgroundColor: t.accentLight }]}>
                  <Text style={[styles.stepNumberText, { color: t.accent }]}>{idx + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.stepItemTitle, { color: t.text }]}>{step.title}</Text>
                  {step.description ? <Text style={[styles.stepItemDesc, { color: t.textSecondary }]}>{step.description}</Text> : null}
                  {formatDuration(step) ? <Text style={[styles.stepItemDuration, { color: t.textMuted }]}>{formatDuration(step)}</Text> : null}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Active instances */}
        <View style={styles.instanceSection}>
          <View style={styles.instanceSectionHeader}>
            <Text style={[styles.sectionTitle, { color: t.text }]}>
              En cours {activeInstances.length > 0 ? `(${activeInstances.length})` : ""}
            </Text>
            <Pressable
              testID="recipe-launch"
              style={[styles.startBtn, { backgroundColor: t.accent }]}
              onPress={() => setShowStartModal(true)}
            >
              <Ionicons name="play" size={14} color="#FFFFFF" />
              <Text style={styles.startBtnText}>Lancer</Text>
            </Pressable>
          </View>
          {activeInstances.length === 0 ? (
            <Text style={[styles.emptyHint, { color: t.textMuted }]}>Aucune préparation en cours</Text>
          ) : (
            activeInstances.map((inst) => renderInstance(inst, false))
          )}
        </View>

        {/* Completed instances */}
        {completedInstances.length > 0 && (
          <View style={styles.instanceSection}>
            <Text style={[styles.sectionTitle, { color: t.text, marginBottom: 8 }]}>
              Terminées ({completedInstances.length})
            </Text>
            {completedInstances.map((inst) => renderInstance(inst, true))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Start modal */}
      <Modal visible={showStartModal} transparent animationType="slide">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Pressable style={styles.modalOverlay} onPress={() => { setShowStartModal(false); setInstanceLabel(""); setInstanceNotes(""); setBatchQty("1"); setStartingStep(0); setTargetDate(""); }}>
          <Pressable style={[styles.modalContent, { backgroundColor: t.card }]} onPress={() => {}}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[styles.modalTitle, { color: t.text }]}>Lancer une préparation</Text>
              <Text style={[styles.modalHint, { color: t.textSecondary }]}>{recipe.title}</Text>
              <TextInput
                style={[styles.modalInput, { borderColor: t.inputBorder, backgroundColor: t.inputBg, color: t.text }]}
                placeholder="Nom (ex: Magret d'Elise)" placeholderTextColor={t.textMuted}
                value={instanceLabel} onChangeText={setInstanceLabel} autoFocus
              />
              <View style={styles.batchRow}>
                <Text style={[styles.batchLabel, { color: t.textSecondary }]}>Quantité</Text>
                <View style={styles.batchQtyRow}>
                  <Pressable
                    style={[styles.batchQtyBtn, { backgroundColor: t.separator }]}
                    onPress={() => setBatchQty(String(Math.max(1, (parseInt(batchQty, 10) || 1) - 1)))}
                  >
                    <Ionicons name="remove" size={16} color={t.text} />
                  </Pressable>
                  <TextInput
                    style={[styles.batchQtyInput, { borderColor: t.inputBorder, backgroundColor: t.inputBg, color: t.text }]}
                    value={batchQty} onChangeText={setBatchQty} keyboardType="number-pad" textAlign="center"
                  />
                  <Pressable
                    style={[styles.batchQtyBtn, { backgroundColor: t.separator }]}
                    onPress={() => setBatchQty(String((parseInt(batchQty, 10) || 1) + 1))}
                  >
                    <Ionicons name="add" size={16} color={t.text} />
                  </Pressable>
                </View>
              </View>
              {recipe.steps.length > 1 && (
                <View style={{ marginBottom: 10 }}>
                  <Text style={[styles.batchLabel, { color: t.textSecondary, marginBottom: 6 }]}>Étape de départ</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
                    {recipe.steps.map((step, idx) => (
                      <Pressable
                        key={idx}
                        style={[
                          styles.stepChip,
                          { borderColor: startingStep === idx ? t.accent : t.inputBorder, backgroundColor: startingStep === idx ? t.accentLight : t.inputBg },
                        ]}
                        onPress={() => setStartingStep(idx)}
                      >
                        <Text style={[styles.stepChipText, { color: startingStep === idx ? t.accent : t.textSecondary }]}>
                          {idx + 1}. {step.title}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}
              <Text style={[styles.batchLabel, { color: t.textSecondary, marginBottom: 6 }]}>Date cible (optionnel)</Text>
              <TextInput
                style={[styles.modalInput, { borderColor: t.inputBorder, backgroundColor: t.inputBg, color: t.text }]}
                placeholder="AAAA-MM-JJ" placeholderTextColor={t.textMuted}
                value={targetDate} onChangeText={setTargetDate} keyboardType="numbers-and-punctuation"
              />
              <TextInput
                style={[styles.modalInput, { minHeight: 60, borderColor: t.inputBorder, backgroundColor: t.inputBg, color: t.text }]}
                placeholder="Notes (épices, poids, etc.)" placeholderTextColor={t.textMuted}
                value={instanceNotes} onChangeText={setInstanceNotes} multiline
              />
              <View style={styles.modalBtnRow}>
                <Pressable
                  style={[styles.modalCancelBtn, { backgroundColor: t.separator, borderColor: t.cardBorder }]}
                  onPress={() => { setShowStartModal(false); setInstanceLabel(""); setInstanceNotes(""); setBatchQty("1"); setStartingStep(0); setTargetDate(""); }}
                >
                  <Text style={[styles.modalCancelText, { color: t.textSecondary }]}>Annuler</Text>
                </Pressable>
                <Pressable
                  testID="recipe-start-submit"
                  style={[styles.modalSubmitBtn, { backgroundColor: t.accent }, !instanceLabel.trim() && { opacity: 0.5 }]}
                  onPress={() => void handleStart()} disabled={!instanceLabel.trim()}
                >
                  <Text style={styles.modalSubmitText}>
                    {(parseInt(batchQty, 10) || 1) > 1 ? `Lancer ${batchQty}` : "Lancer"}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit recipe modal */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowEditModal(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: t.card }]} onPress={() => {}}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[styles.modalTitle, { color: t.text }]}>Modifier la recette</Text>
              <TextInput
                style={[styles.modalInput, { borderColor: t.inputBorder, backgroundColor: t.inputBg, color: t.text }]}
                placeholder="Titre" placeholderTextColor={t.textMuted}
                value={editTitle} onChangeText={setEditTitle} autoFocus
              />
              <TextInput
                style={[styles.modalInput, { borderColor: t.inputBorder, backgroundColor: t.inputBg, color: t.text }]}
                placeholder="Description (optionnel)" placeholderTextColor={t.textMuted}
                value={editDesc} onChangeText={setEditDesc}
              />
              <Text style={[styles.sectionLabel, { color: t.textSecondary }]}>Icône</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                {RECIPE_ICONS.map((ic) => (
                  <Pressable
                    key={ic.name}
                    style={[styles.iconChip, { borderColor: editIcon === ic.name ? t.accent : t.inputBorder, backgroundColor: editIcon === ic.name ? t.accentLight : t.inputBg }]}
                    onPress={() => setEditIcon(editIcon === ic.name ? undefined : ic.name)}
                  >
                    <Ionicons name={ic.name as any} size={22} color={editIcon === ic.name ? t.accent : t.textSecondary} />
                  </Pressable>
                ))}
              </ScrollView>
              <View style={styles.servingsRow}>
                <Text style={[styles.sectionLabel, { color: t.textSecondary, marginTop: 0 }]}>Portions</Text>
                <View style={styles.servingsControls}>
                  <Pressable testID="servings-minus" style={[styles.servingsBtn, { backgroundColor: t.inputBg, borderColor: t.inputBorder }]} onPress={() => setEditServings((s) => Math.max(1, s - 1))}>
                    <Ionicons name="remove" size={18} color={t.textSecondary} />
                  </Pressable>
                  <Text style={[styles.servingsValue, { color: t.text }]}>{editServings}</Text>
                  <Pressable testID="servings-plus" style={[styles.servingsBtn, { backgroundColor: t.inputBg, borderColor: t.inputBorder }]} onPress={() => setEditServings((s) => Math.min(50, s + 1))}>
                    <Ionicons name="add" size={18} color={t.textSecondary} />
                  </Pressable>
                </View>
              </View>
              <Text style={[styles.sectionLabel, { color: t.textSecondary }]}>Ingrédients</Text>
              <IngredientsEditor ingredients={editIngredients} onChange={setEditIngredients} />
              <Text style={[styles.sectionLabel, { color: t.textSecondary }]}>Étapes</Text>
              <DraggableStepList
                items={editSteps}
                onReorder={setEditSteps}
                handleColor={t.textMuted}
                renderItem={(step, idx) => (
                  <View style={[styles.editStepCard, { backgroundColor: t.separator, borderColor: t.cardBorder }]}>
                    <View style={styles.editStepHeader}>
                      <Text style={[styles.editStepTitle, { color: t.text }]}>{idx + 1}. {step.title}</Text>
                      <Pressable hitSlop={6} onPress={() => setEditSteps(editSteps.filter((_, i) => i !== idx))}>
                        <Ionicons name="close-circle" size={18} color={t.danger} />
                      </Pressable>
                    </View>
                    {step.description ? <Text style={{ fontSize: 12, color: t.textSecondary, marginTop: 2 }}>{step.description}</Text> : null}
                    {formatDuration(step) ? <Text style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>Durée : {formatDuration(step)}</Text> : null}
                  </View>
                )}
              />
              <View style={{ marginTop: 8 }}>
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
                      <Text style={{ fontSize: 14, fontWeight: "600", color: newStepDurationUnit === unit ? "#FFFFFF" : t.textSecondary }}>
                        {unit === "minutes" ? "min" : unit === "hours" ? "h" : "j"}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Pressable style={[styles.addStepBtn, !newStepTitle.trim() && { opacity: 0.5 }]} onPress={handleAddStep} disabled={!newStepTitle.trim()}>
                  <Ionicons name="add-circle-outline" size={18} color={t.accent} />
                  <Text style={[{ fontSize: 14, fontWeight: "600", color: t.accent }]}>Ajouter l'étape</Text>
                </Pressable>
              </View>
              <View style={styles.modalBtnRow}>
                <Pressable style={[styles.modalCancelBtn, { backgroundColor: t.separator, borderColor: t.cardBorder }]} onPress={() => setShowEditModal(false)}>
                  <Text style={[styles.modalCancelText, { color: t.textSecondary }]}>Annuler</Text>
                </Pressable>
                <Pressable
                  testID="recipe-edit-save"
                  style={[styles.modalSubmitBtn, { backgroundColor: t.accent }, !editTitle.trim() && { opacity: 0.5 }]}
                  onPress={() => void handleSaveEdit()} disabled={!editTitle.trim()}
                >
                  <Text style={styles.modalSubmitText}>Enregistrer</Text>
                </Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Confirm delete instance modal */}
      <Modal visible={!!confirmDeleteInst} transparent animationType="fade">
        <Pressable style={[styles.modalOverlay, { justifyContent: "center" }]} onPress={() => setConfirmDeleteInst(null)}>
          <View style={[styles.confirmModal, { backgroundColor: t.card }]}>
            <Ionicons name="warning-outline" size={32} color={t.danger} style={{ alignSelf: "center", marginBottom: 8 }} />
            <Text style={[styles.confirmTitle, { color: t.text }]}>Arrêter la préparation</Text>
            <Text style={[styles.confirmMsg, { color: t.textSecondary }]}>
              Supprimer « {confirmDeleteInst?.label} » ?
            </Text>
            <View style={styles.modalBtnRow}>
              <Pressable style={[styles.modalCancelBtn, { backgroundColor: t.separator, borderColor: t.cardBorder }]} onPress={() => setConfirmDeleteInst(null)}>
                <Text style={[styles.modalCancelText, { color: t.textSecondary }]}>Annuler</Text>
              </Pressable>
              <Pressable
                style={[styles.modalSubmitBtn, { backgroundColor: t.danger }]}
                onPress={() => { void deleteInstance(confirmDeleteInst!.id); setConfirmDeleteInst(null); }}
              >
                <Text style={styles.modalSubmitText}>Supprimer</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      {recipe && (
        <AddToShoppingSheet
          visible={shopSheet}
          recipeTitle={recipe.title}
          additions={computeShoppingAdditions(recipe.ingredients, recipe.servings, targetServings, shoppingItems.map((s) => s.title))}
          onClose={() => setShopSheet(false)}
          onConfirm={(names, scope) => {
            const chosen = new Set(names);
            const rows = computeShoppingAdditions(recipe.ingredients, recipe.servings, targetServings, [])
              .filter((a) => chosen.has(a.name))
              .map((a) => ({ title: a.name, quantity: a.quantity, category: "epicerie", ownerId: scope === "personal" ? profile?.id ?? null : null }));
            void addItems(rows);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  headerTitle: { fontSize: 18, fontWeight: "700", flex: 1 },
  content: { padding: 16 },
  emptyContainer: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15 },
  descriptionText: { fontSize: 14, lineHeight: 20, marginBottom: 12 },

  section: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 8 },
  sectionToggle: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },

  ingredientsHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  portionScaler: { flexDirection: "row", alignItems: "center", gap: 8 },
  portionValue: { fontSize: 13, fontWeight: "700", minWidth: 54, textAlign: "center", fontVariant: ["tabular-nums"] },
  ingredientRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 3 },
  ingredientText: { fontSize: 14, flex: 1 },
  ingredientQty: { fontSize: 13, fontWeight: "700", fontVariant: ["tabular-nums"] },
  shopBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12, borderRadius: 12, paddingVertical: 12 },
  shopBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  servingsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  servingsControls: { flexDirection: "row", alignItems: "center", gap: 12 },
  servingsBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  servingsValue: { fontSize: 16, fontWeight: "800", minWidth: 24, textAlign: "center" },

  stepItem: { flexDirection: "row", gap: 10, alignItems: "flex-start", paddingVertical: 8, borderTopWidth: 1 },
  stepNumber: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  stepNumberText: { fontSize: 12, fontWeight: "700" },
  stepItemTitle: { fontSize: 14, fontWeight: "600" },
  stepItemDesc: { fontSize: 12, marginTop: 2 },
  stepItemDuration: { fontSize: 11, marginTop: 2 },

  instanceSection: { marginBottom: 12 },
  instanceSectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  startBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  startBtnText: { color: "#FFFFFF", fontWeight: "600", fontSize: 13 },
  emptyHint: { fontSize: 13, textAlign: "center", paddingVertical: 20 },

  instanceCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 6,
    gap: 10,
    overflow: "hidden",
  },
  instanceImage: { width: 42, height: 42, borderRadius: 10, alignItems: "center", justifyContent: "center", zIndex: 1 },
  instanceContent: { flex: 1, zIndex: 1 },
  instanceLabel: { fontSize: 14, fontWeight: "600" },
  instanceMeta: { fontSize: 12, marginTop: 2 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32, maxHeight: "85%" },
  modalTitle: { fontSize: 17, fontWeight: "700", marginBottom: 4 },
  modalHint: { fontSize: 13, marginBottom: 16 },
  modalInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 10 },
  modalBtnRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  modalCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center", borderWidth: 1 },
  modalCancelText: { fontWeight: "600", fontSize: 15 },
  modalSubmitBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  modalSubmitText: { fontWeight: "600", color: "#FFFFFF", fontSize: 15 },

  // Batch launch
  batchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  batchLabel: { fontSize: 13, fontWeight: "600" },
  batchQtyRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  batchQtyBtn: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  batchQtyInput: { borderWidth: 1, borderRadius: 8, width: 44, height: 32, fontSize: 15, paddingHorizontal: 4 },
  stepChip: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginHorizontal: 4 },
  stepChipText: { fontSize: 12, fontWeight: "600" },

  // Edit recipe
  sectionLabel: { fontSize: 13, fontWeight: "600", marginBottom: 8, marginTop: 4 },
  editStepCard: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 6 },
  editStepHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  editStepTitle: { fontSize: 14, fontWeight: "600", flex: 1 },
  durationRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  unitChip: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1 },
  addStepBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8 },

  // Icon selector
  iconChip: { width: 44, height: 44, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center", marginRight: 6 },

  // Confirm delete modal
  confirmModal: { borderRadius: 16, padding: 24, marginHorizontal: 32, alignSelf: "center" },
  confirmTitle: { fontSize: 17, fontWeight: "700", textAlign: "center", marginBottom: 4 },
  confirmMsg: { fontSize: 14, textAlign: "center", marginBottom: 16, lineHeight: 20 },
});
