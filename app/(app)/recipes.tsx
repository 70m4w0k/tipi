import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useKeepAwake } from "expo-keep-awake";
import { useAuth } from "../../lib/hooks/useAuth";
import { useRecipes } from "../../lib/hooks/useRecipes";
import { useTheme } from "../../lib/theme";
import { useTimer } from "../../lib/timer-context";
import { Recipe, RecipeInstance, RecipeStep } from "../../lib/types";
import { haptic } from "../../lib/haptics";

type Tab = "recipes" | "active";

function formatDuration(startDate: string): string {
  const start = new Date(startDate).getTime();
  const now = Date.now();
  const diffMs = now - start;
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  if (days > 0) return `${days}j ${remainingHours}h`;
  if (hours > 0) return `${hours}h`;
  const minutes = Math.floor(diffMs / 60000);
  return `${minutes}min`;
}

export default function RecipesScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const searchParams = useLocalSearchParams<{ tab?: string; instanceId?: string }>();
  const {
    recipes, instances, loading,
    addRecipe, updateRecipe, deleteRecipe,
    startInstance, advanceStep, goBackStep, updateInstanceNotes, deleteInstance, completeInstance,
    fetchAll,
  } = useRecipes(profile?.household_id);
  const t = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  const [tab, setTab] = useState<Tab>(searchParams.tab === "active" ? "active" : "recipes");
  const [deepLinkHandled, setDeepLinkHandled] = useState(false);

  useEffect(() => {
    if (deepLinkHandled || !searchParams.instanceId || instances.length === 0) return;
    const inst = instances.find((i) => i.id === searchParams.instanceId);
    if (inst) {
      setSelectedInstance(inst.id);
      setEditingNotes(inst.notes);
      setDeepLinkHandled(true);
    }
  }, [searchParams.instanceId, instances, deepLinkHandled]);

  // Recipe form
  const [showForm, setShowForm] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formIngredients, setFormIngredients] = useState("");
  const [formSteps, setFormSteps] = useState<RecipeStep[]>([]);
  const [newStepTitle, setNewStepTitle] = useState("");
  const [newStepDesc, setNewStepDesc] = useState("");
  const [newStepDuration, setNewStepDuration] = useState("");

  // Start instance
  const [showStartModal, setShowStartModal] = useState(false);
  const [startRecipeId, setStartRecipeId] = useState<string | null>(null);
  const [instanceLabel, setInstanceLabel] = useState("");
  const [instanceNotes, setInstanceNotes] = useState("");

  // Instance detail
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState("");

  // Cooking mode (state persisted in TimerContext across navigation)
  const {
    timers, cookingInstanceId,
    startTimer, stopTimer, pauseResumeTimer,
    openCookingMode, closeCookingMode, formatTimer,
  } = useTimer();
  const [timerInput, setTimerInput] = useState("");

  useKeepAwake(cookingInstanceId ? "cooking-mode" : undefined);

  const resetForm = () => {
    setFormTitle("");
    setFormDesc("");
    setFormIngredients("");
    setFormSteps([]);
    setNewStepTitle("");
    setNewStepDesc("");
    setNewStepDuration("");
    setEditingRecipe(null);
    setShowForm(false);
  };

  const openEditRecipe = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setFormTitle(recipe.title);
    setFormDesc(recipe.description);
    setFormIngredients(recipe.ingredients.join("\n"));
    setFormSteps(recipe.steps);
    setShowForm(true);
  };

  const handleSaveRecipe = async () => {
    if (!formTitle.trim()) return;
    void haptic.medium();
    const ingredients = formIngredients
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (editingRecipe) {
      await updateRecipe(editingRecipe.id, formTitle, formDesc, ingredients, formSteps);
    } else {
      await addRecipe(formTitle, formDesc, ingredients, formSteps);
    }
    resetForm();
  };

  const handleAddStep = () => {
    if (!newStepTitle.trim()) return;
    setFormSteps([...formSteps, {
      title: newStepTitle.trim(),
      description: newStepDesc.trim(),
      duration_hint: newStepDuration.trim(),
    }]);
    setNewStepTitle("");
    setNewStepDesc("");
    setNewStepDuration("");
  };

  const handleDeleteRecipe = (id: string, title: string) => {
    void haptic.warning();
    Alert.alert("Supprimer", `Supprimer "${title}" et toutes ses instances ?`, [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: () => void deleteRecipe(id) },
    ]);
  };

  const handleStartInstance = async () => {
    if (!startRecipeId || !instanceLabel.trim()) return;
    void haptic.medium();
    await startInstance(startRecipeId, instanceLabel, instanceNotes);
    setShowStartModal(false);
    setStartRecipeId(null);
    setInstanceLabel("");
    setInstanceNotes("");
    setTab("active");
  };

  const handleDeleteInstance = (id: string, label: string) => {
    void haptic.warning();
    Alert.alert("Supprimer", `Arrêter "${label}" ?`, [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: () => void deleteInstance(id) },
    ]);
  };

  const renderRecipe = ({ item }: { item: Recipe }) => {
    const activeCount = instances.filter((i) => i.recipe_id === item.id).length;
    return (
      <View style={[styles.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
        <View style={styles.cardRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: t.text }]}>{item.title}</Text>
            {item.description ? (
              <Text style={[styles.cardDesc, { color: t.textSecondary }]} numberOfLines={2}>{item.description}</Text>
            ) : null}
            <Text style={[styles.cardMeta, { color: t.textMuted }]}>
              {item.steps.length} étape{item.steps.length > 1 ? "s" : ""}
              {item.ingredients.length > 0 ? ` · ${item.ingredients.length} ingrédient${item.ingredients.length > 1 ? "s" : ""}` : ""}
              {activeCount > 0 ? ` · ${activeCount} en cours` : ""}
            </Text>
          </View>
          <View style={styles.cardActions}>
            <Pressable
              style={styles.cardActionBtn}
              onPress={() => {
                setStartRecipeId(item.id);
                setShowStartModal(true);
              }}
            >
              <Ionicons name="play-circle-outline" size={24} color={t.accent} />
            </Pressable>
            <Pressable style={styles.cardActionBtn} onPress={() => openEditRecipe(item)}>
              <Ionicons name="create-outline" size={20} color={t.textSecondary} />
            </Pressable>
            <Pressable style={styles.cardActionBtn} onPress={() => handleDeleteRecipe(item.id, item.title)}>
              <Ionicons name="trash-outline" size={20} color={t.danger} />
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  const renderInstance = ({ item }: { item: RecipeInstance }) => {
    const recipe = recipes.find((r) => r.id === item.recipe_id);
    if (!recipe) return null;
    const currentStep = recipe.steps[item.current_step];
    const isLastStep = item.current_step >= recipe.steps.length - 1;
    const progress = recipe.steps.length > 0
      ? ((item.current_step + 1) / recipe.steps.length) * 100
      : 100;
    const instanceTimer = timers[item.id];

    return (
      <Pressable
        style={[styles.instanceCard, { backgroundColor: t.card, borderColor: t.cardBorder }]}
        onPress={() => {
          setSelectedInstance(item.id);
          setEditingNotes(item.notes);
        }}
      >
        <View style={styles.instanceHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.instanceLabel, { color: t.text }]}>{item.label}</Text>
            <Text style={[styles.instanceRecipe, { color: t.textSecondary }]}>{recipe.title}</Text>
          </View>
          <View style={[styles.instanceBadge, { backgroundColor: t.accentLight }]}>
            <Text style={[styles.instanceBadgeText, { color: t.accent }]}>
              {item.current_step + 1}/{recipe.steps.length}
            </Text>
          </View>
        </View>

        <View style={[styles.progressBar, { backgroundColor: t.cardBorder }]}>
          <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: t.accent }]} />
        </View>

        {/* Timer badge on instance card */}
        {instanceTimer && (
          <Pressable
            style={[styles.cardTimerBadge, { backgroundColor: instanceTimer.seconds <= 10 ? t.dangerLight : t.warningLight, borderColor: instanceTimer.seconds <= 10 ? t.danger : t.warning }]}
            onPress={() => openCookingMode(item.id)}
          >
            <Ionicons name="timer-outline" size={16} color={instanceTimer.seconds <= 10 ? t.danger : t.warning} />
            <Text style={[styles.cardTimerText, { color: instanceTimer.seconds <= 10 ? t.danger : t.warning }]}>
              {formatTimer(instanceTimer.seconds)}
            </Text>
            {!instanceTimer.running && (
              <View style={[styles.cardTimerPaused, { backgroundColor: t.warning }]}>
                <Text style={styles.cardTimerPausedText}>pause</Text>
              </View>
            )}
          </Pressable>
        )}

        {currentStep && (
          <View style={[styles.stepInfo, { backgroundColor: t.separator }]}>
            <Text style={[styles.stepTitle, { color: t.text }]}>
              Étape {item.current_step + 1} : {currentStep.title}
            </Text>
            {currentStep.description ? (
              <Text style={[styles.stepDesc, { color: t.textSecondary }]} numberOfLines={2}>{currentStep.description}</Text>
            ) : null}
            <View style={styles.timerRow}>
              <Ionicons name="time-outline" size={14} color={t.textSecondary} />
              <Text style={[styles.timerText, { color: t.textSecondary }]}>
                Depuis {formatDuration(item.step_started_at)}
              </Text>
              {currentStep.duration_hint ? (
                <Text style={[styles.timerHint, { color: t.textMuted }]}> · prévu : {currentStep.duration_hint}</Text>
              ) : null}
            </View>
          </View>
        )}

        <View style={styles.instanceActions}>
          {!isLastStep ? (
            <Pressable
              style={[styles.nextStepBtn, { backgroundColor: t.accent }]}
              onPress={() => { void haptic.success(); stopTimer(item.id); void advanceStep(item.id); }}
            >
              <Text style={styles.nextStepText}>Étape suivante</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </Pressable>
          ) : (
            <Pressable
              style={[styles.nextStepBtn, { backgroundColor: t.success }]}
              onPress={() => { stopTimer(item.id); void completeInstance(item.id); }}
            >
              <Text style={styles.nextStepText}>Terminer</Text>
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            </Pressable>
          )}
          <Pressable
            style={[styles.deleteInstanceBtn, { borderColor: t.danger }]}
            onPress={() => handleDeleteInstance(item.id, item.label)}
          >
            <Ionicons name="close" size={18} color={t.danger} />
          </Pressable>
        </View>

        <View style={styles.instanceFooter}>
          <Text style={[styles.startedAt, { color: t.textMuted }]}>
            Début : {new Date(item.started_at).toLocaleDateString("fr-FR")} · Total : {formatDuration(item.started_at)}
          </Text>
          <Pressable
            style={[styles.cookingModeBtn, { backgroundColor: t.warningLight, borderColor: t.warning }]}
            onPress={() => openCookingMode(item.id)}
          >
            <Ionicons name="flame-outline" size={14} color={t.warning} />
            <Text style={[styles.cookingModeBtnText, { color: t.warning }]}>Cuisine</Text>
          </Pressable>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.background }]} edges={["top"]}>
      <View style={[styles.header, { backgroundColor: t.card, borderBottomColor: t.cardBorder }]}>
        <Text style={[styles.headerTitle, { color: t.text }]}>Recettes</Text>
      </View>

      <View style={[styles.tabRow, { backgroundColor: t.tabBg }]}>
        <Pressable
          style={[styles.tabButton, tab === "recipes" && [styles.tabButtonActive, { backgroundColor: t.accent }]]}
          onPress={() => setTab("recipes")}
        >
          <Text style={[styles.tabText, { color: t.textSecondary }, tab === "recipes" && styles.tabTextActive]}>Mes recettes</Text>
        </Pressable>
        <Pressable
          style={[styles.tabButton, tab === "active" && [styles.tabButtonActive, { backgroundColor: t.accent }]]}
          onPress={() => setTab("active")}
        >
          <Text style={[styles.tabText, { color: t.textSecondary }, tab === "active" && styles.tabTextActive]}>
            En cours{instances.length > 0 ? ` (${instances.length})` : ""}
          </Text>
        </Pressable>
      </View>

      {tab === "recipes" ? (
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
              </View>
            )
          }
        />
      ) : (
        <FlatList
          data={instances}
          keyExtractor={(item) => item.id}
          renderItem={renderInstance}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.accent} colors={[t.accent]} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="flask-outline" size={48} color={t.emptyIcon} />
              <Text style={[styles.emptyText, { color: t.textMuted }]}>Aucune recette en cours</Text>
            </View>
          }
        />
      )}

      {/* Recipe form modal */}
      <Modal visible={showForm} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: t.card }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { color: t.text }]}>
                {editingRecipe ? "Modifier la recette" : "Nouvelle recette"}
              </Text>

              <TextInput
                style={[styles.modalInput, { borderColor: t.inputBorder, backgroundColor: t.inputBg, color: t.text }]}
                placeholder="Titre"
                placeholderTextColor={t.textMuted}
                value={formTitle}
                onChangeText={setFormTitle}
                autoFocus
              />

              <TextInput
                style={[styles.modalInput, { borderColor: t.inputBorder, backgroundColor: t.inputBg, color: t.text }]}
                placeholder="Description (optionnel)"
                placeholderTextColor={t.textMuted}
                value={formDesc}
                onChangeText={setFormDesc}
              />

              <Text style={[styles.sectionLabel, { color: t.textSecondary }]}>Ingrédients (un par ligne)</Text>
              <TextInput
                style={[styles.modalInput, { minHeight: 80, borderColor: t.inputBorder, backgroundColor: t.inputBg, color: t.text }]}
                placeholder={"200g de sel\n1kg de magret\nPoivre noir"}
                placeholderTextColor={t.textMuted}
                value={formIngredients}
                onChangeText={setFormIngredients}
                multiline
              />

              <Text style={[styles.sectionLabel, { color: t.textSecondary }]}>Étapes</Text>
              {formSteps.map((step, idx) => (
                <View key={idx} style={[styles.stepCard, { backgroundColor: t.separator, borderColor: t.cardBorder }]}>
                  <View style={styles.stepCardHeader}>
                    <Text style={[styles.stepCardTitle, { color: t.text }]}>{idx + 1}. {step.title}</Text>
                    <Pressable
                      onPress={() =>
                        setFormSteps(formSteps.filter((_, i) => i !== idx))
                      }
                    >
                      <Ionicons name="close-circle" size={20} color={t.danger} />
                    </Pressable>
                  </View>
                  {step.description ? <Text style={[styles.stepCardDesc, { color: t.textSecondary }]}>{step.description}</Text> : null}
                  {step.duration_hint ? (
                    <Text style={[styles.stepCardDuration, { color: t.textMuted }]}>Durée : {step.duration_hint}</Text>
                  ) : null}
                </View>
              ))}

              <View style={styles.addStepSection}>
                <TextInput
                  style={[styles.modalInput, { borderColor: t.inputBorder, backgroundColor: t.inputBg, color: t.text }]}
                  placeholder="Titre de l'étape"
                  placeholderTextColor={t.textMuted}
                  value={newStepTitle}
                  onChangeText={setNewStepTitle}
                />
                <TextInput
                  style={[styles.modalInput, { borderColor: t.inputBorder, backgroundColor: t.inputBg, color: t.text }]}
                  placeholder="Description (optionnel)"
                  placeholderTextColor={t.textMuted}
                  value={newStepDesc}
                  onChangeText={setNewStepDesc}
                />
                <TextInput
                  style={[styles.modalInput, { borderColor: t.inputBorder, backgroundColor: t.inputBg, color: t.text }]}
                  placeholder="Durée estimée (ex: 48h, 3 jours)"
                  placeholderTextColor={t.textMuted}
                  value={newStepDuration}
                  onChangeText={setNewStepDuration}
                />
                <Pressable
                  style={[styles.addStepBtn, !newStepTitle.trim() && { opacity: 0.5 }]}
                  onPress={handleAddStep}
                  disabled={!newStepTitle.trim()}
                >
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
                  onPress={() => void handleSaveRecipe()}
                  disabled={!formTitle.trim()}
                >
                  <Text style={styles.modalSubmitText}>Enregistrer</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Start instance modal */}
      <Modal visible={showStartModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: t.card }]}>
            <Text style={[styles.modalTitle, { color: t.text }]}>Lancer une préparation</Text>
            <Text style={[styles.modalHint, { color: t.textSecondary }]}>
              {recipes.find((r) => r.id === startRecipeId)?.title}
            </Text>
            <TextInput
              style={[styles.modalInput, { borderColor: t.inputBorder, backgroundColor: t.inputBg, color: t.text }]}
              placeholder="Nom (ex: Magret séché #1)"
              placeholderTextColor={t.textMuted}
              value={instanceLabel}
              onChangeText={setInstanceLabel}
              autoFocus
            />
            <TextInput
              style={[styles.modalInput, { minHeight: 60, borderColor: t.inputBorder, backgroundColor: t.inputBg, color: t.text }]}
              placeholder="Notes (épices, poids, etc.)"
              placeholderTextColor={t.textMuted}
              value={instanceNotes}
              onChangeText={setInstanceNotes}
              multiline
            />
            <View style={styles.modalBtnRow}>
              <Pressable
                style={[styles.modalCancelBtn, { backgroundColor: t.separator, borderColor: t.cardBorder }]}
                onPress={() => { setShowStartModal(false); setInstanceLabel(""); setInstanceNotes(""); }}
              >
                <Text style={[styles.modalCancelText, { color: t.textSecondary }]}>Annuler</Text>
              </Pressable>
              <Pressable
                style={[styles.modalSubmitBtn, { backgroundColor: t.accent }, !instanceLabel.trim() && { opacity: 0.5 }]}
                onPress={() => void handleStartInstance()}
                disabled={!instanceLabel.trim()}
              >
                <Text style={styles.modalSubmitText}>Lancer</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Instance detail modal */}
      <Modal visible={!!selectedInstance} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedInstance(null)}>
          <Pressable style={[styles.modalContent, { backgroundColor: t.card }]} onPress={() => {}}>
            {(() => {
              const inst = instances.find((i) => i.id === selectedInstance);
              if (!inst) return null;
              const recipe = recipes.find((r) => r.id === inst.recipe_id);
              if (!recipe) return null;
              return (
                <>
                  <Text style={[styles.modalTitle, { color: t.text }]}>{inst.label}</Text>
                  <Text style={[styles.modalHint, { color: t.textSecondary }]}>{recipe.title}</Text>

                  <Text style={[styles.sectionLabel, { color: t.textSecondary }]}>Notes</Text>
                  <TextInput
                    style={[styles.modalInput, { minHeight: 80, borderColor: t.inputBorder, backgroundColor: t.inputBg, color: t.text }]}
                    value={editingNotes}
                    onChangeText={setEditingNotes}
                    multiline
                    placeholder="Ajouter des notes..."
                    placeholderTextColor={t.textMuted}
                  />
                  <Pressable
                    style={[styles.addStepBtn, { marginBottom: 12 }]}
                    onPress={() => {
                      void updateInstanceNotes(inst.id, editingNotes);
                      setSelectedInstance(null);
                    }}
                  >
                    <Text style={[styles.addStepText, { color: t.accent }]}>Enregistrer les notes</Text>
                  </Pressable>

                  <Text style={[styles.sectionLabel, { color: t.textSecondary }]}>Étapes</Text>
                  {recipe.steps.map((step, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.stepCard,
                        { backgroundColor: t.separator, borderColor: t.cardBorder },
                        idx < inst.current_step && { backgroundColor: t.successLight, borderColor: t.success },
                        idx === inst.current_step && { backgroundColor: t.accentLight, borderColor: t.accent },
                      ]}
                    >
                      <View style={styles.stepCardHeader}>
                        <Text style={[styles.stepCardTitle, { color: t.text }]}>
                          {idx < inst.current_step ? "✓ " : ""}{idx + 1}. {step.title}
                        </Text>
                      </View>
                      {step.description ? <Text style={[styles.stepCardDesc, { color: t.textSecondary }]}>{step.description}</Text> : null}
                      {step.duration_hint ? <Text style={[styles.stepCardDuration, { color: t.textMuted }]}>Durée : {step.duration_hint}</Text> : null}
                    </View>
                  ))}

                  <Text style={[styles.startedAt, { marginTop: 12, color: t.textMuted }]}>
                    Début : {new Date(inst.started_at).toLocaleDateString("fr-FR")} · Total : {formatDuration(inst.started_at)}
                  </Text>
                </>
              );
            })()}
          </Pressable>
        </Pressable>
      </Modal>
      {/* FAB — Ajouter une recette */}
      {tab === "recipes" && !showForm && (
        <Pressable
          style={[styles.fab, { backgroundColor: t.accent }]}
          onPress={() => setShowForm(true)}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </Pressable>
      )}

      {/* Cooking mode modal */}
      <Modal visible={!!cookingInstanceId} animationType="slide" statusBarTranslucent>
        {(() => {
          const inst = instances.find((i) => i.id === cookingInstanceId);
          if (!inst) return null;
          const recipe = recipes.find((r) => r.id === inst.recipe_id);
          if (!recipe) return null;
          const currentStep = recipe.steps[inst.current_step];
          const isLast = inst.current_step >= recipe.steps.length - 1;
          const isFirst = inst.current_step === 0;
          const ct = timers[inst.id];
          return (
            <SafeAreaView style={[styles.cookingContainer, { backgroundColor: t.background }]}>
              <StatusBar barStyle="light-content" />
              <View style={styles.cookingHeader}>
                <Pressable onPress={() => closeCookingMode()}>
                  <Ionicons name="close" size={28} color={t.text} />
                </Pressable>
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text style={[styles.cookingTitle, { color: t.text }]}>{inst.label}</Text>
                  <Text style={[styles.cookingSubtitle, { color: t.textSecondary }]}>
                    Étape {inst.current_step + 1} / {recipe.steps.length}
                  </Text>
                </View>
                <View style={{ width: 28 }} />
              </View>

              <View style={[styles.cookingProgressBar, { backgroundColor: t.cardBorder }]}>
                <View style={[styles.cookingProgressFill, { width: `${((inst.current_step + 1) / recipe.steps.length) * 100}%`, backgroundColor: t.accent }]} />
              </View>

              <ScrollView contentContainerStyle={styles.cookingContent}>
                {currentStep && (
                  <>
                    <Text style={[styles.cookingStepTitle, { color: t.text }]}>
                      {currentStep.title}
                    </Text>
                    {currentStep.description ? (
                      <Text style={[styles.cookingStepDesc, { color: t.textSecondary }]}>
                        {currentStep.description}
                      </Text>
                    ) : null}
                    {currentStep.duration_hint ? (
                      <View style={[styles.cookingHint, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
                        <Ionicons name="time-outline" size={16} color={t.textSecondary} />
                        <Text style={[styles.cookingHintText, { color: t.textSecondary }]}>
                          Durée estimée : {currentStep.duration_hint}
                        </Text>
                      </View>
                    ) : null}
                  </>
                )}

                {/* Timer */}
                <View style={[styles.timerContainer, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
                  <Text style={[styles.timerLabel, { color: t.textSecondary }]}>Minuteur</Text>
                  {ct ? (
                    <>
                      <Text style={[styles.timerDisplay, { color: ct.seconds <= 10 ? t.danger : t.text }]}>
                        {formatTimer(ct.seconds)}
                      </Text>
                      <View style={styles.timerButtons}>
                        <Pressable
                          style={[styles.timerBtn, { backgroundColor: ct.running ? t.warningLight : t.accentLight }]}
                          onPress={() => pauseResumeTimer(inst.id)}
                        >
                          <Ionicons name={ct.running ? "pause" : "play"} size={20} color={ct.running ? t.warning : t.accent} />
                        </Pressable>
                        <Pressable
                          style={[styles.timerBtn, { backgroundColor: t.dangerLight }]}
                          onPress={() => stopTimer(inst.id)}
                        >
                          <Ionicons name="stop" size={20} color={t.danger} />
                        </Pressable>
                      </View>
                    </>
                  ) : (
                    <View style={styles.timerSetup}>
                      <TextInput
                        style={[styles.timerInput, { borderColor: t.inputBorder, backgroundColor: t.inputBg, color: t.text }]}
                        placeholder="min"
                        placeholderTextColor={t.textMuted}
                        keyboardType="number-pad"
                        value={timerInput}
                        onChangeText={setTimerInput}
                      />
                      <Pressable
                        style={[styles.timerStartBtn, { backgroundColor: t.accent }, !timerInput.trim() && { opacity: 0.5 }]}
                        onPress={() => {
                          const mins = parseInt(timerInput, 10);
                          if (mins > 0) { startTimer(inst.id, mins); setTimerInput(""); }
                        }}
                        disabled={!timerInput.trim()}
                      >
                        <Ionicons name="play" size={18} color="#FFFFFF" />
                        <Text style={styles.timerStartText}>Démarrer</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              </ScrollView>

              <View style={[styles.cookingActions, { paddingBottom: Math.max(insets.bottom, 20) + 16 }]}>
                <View style={styles.cookingActionsRow}>
                  {!isFirst && (
                    <Pressable
                      style={[styles.cookingBackBtn, { borderColor: t.cardBorder, backgroundColor: t.card }]}
                      onPress={() => { void haptic.light(); stopTimer(inst.id); void goBackStep(inst.id); }}
                    >
                      <Ionicons name="arrow-back" size={20} color={t.textSecondary} />
                    </Pressable>
                  )}
                  {!isLast ? (
                    <Pressable
                      style={[styles.cookingNextBtn, { backgroundColor: t.accent, flex: 1 }]}
                      onPress={() => { void haptic.success(); stopTimer(inst.id); void advanceStep(inst.id); }}
                    >
                      <Text style={styles.cookingNextText}>Étape suivante</Text>
                      <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                    </Pressable>
                  ) : (
                    <Pressable
                      style={[styles.cookingNextBtn, { backgroundColor: t.success, flex: 1 }]}
                      onPress={() => { void haptic.success(); stopTimer(inst.id); void completeInstance(inst.id); closeCookingMode(); }}
                    >
                      <Text style={styles.cookingNextText}>Terminer la recette</Text>
                      <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                    </Pressable>
                  )}
                </View>
              </View>
            </SafeAreaView>
          );
        })()}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F6FA" },
  header: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  tabRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: "#E5E7EB",
    borderRadius: 10,
    padding: 3,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  tabButtonActive: { backgroundColor: "#1D4ED8" },
  tabText: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  tabTextActive: { color: "#FFFFFF" },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  emptyContainer: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: "#9CA3AF" },

  // Recipe cards
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  cardRow: { flexDirection: "row", alignItems: "flex-start" },
  cardTitle: { fontSize: 16, fontWeight: "600", color: "#111827" },
  cardDesc: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  cardMeta: { fontSize: 12, color: "#9CA3AF", marginTop: 4 },
  cardActions: { flexDirection: "row", gap: 6, marginLeft: 8 },
  cardActionBtn: { padding: 4 },

  // Instance cards
  instanceCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  instanceHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  instanceLabel: { fontSize: 16, fontWeight: "700", color: "#111827" },
  instanceRecipe: { fontSize: 13, color: "#6B7280", marginTop: 1 },
  instanceBadge: {
    backgroundColor: "#DBEAFE",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  instanceBadgeText: { fontSize: 12, fontWeight: "700", color: "#1D4ED8" },
  progressBar: {
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    marginBottom: 10,
  },
  progressFill: {
    height: 4,
    backgroundColor: "#1D4ED8",
    borderRadius: 2,
  },
  stepInfo: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  stepTitle: { fontSize: 14, fontWeight: "600", color: "#1F2937" },
  stepDesc: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  timerRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  timerText: { fontSize: 12, color: "#6B7280" },
  timerHint: { fontSize: 12, color: "#9CA3AF" },
  instanceActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  nextStepBtn: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#1D4ED8",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  nextStepText: { color: "#FFFFFF", fontWeight: "600", fontSize: 14 },
  deleteInstanceBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    alignItems: "center",
    justifyContent: "center",
  },
  startedAt: { fontSize: 11, color: "#9CA3AF", marginTop: 8 },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
    maxHeight: "85%",
  },
  modalTitle: { fontSize: 17, fontWeight: "700", color: "#111827", marginBottom: 4 },
  modalHint: { fontSize: 13, color: "#6B7280", marginBottom: 16 },
  modalInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
    marginBottom: 10,
  },
  sectionLabel: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 8, marginTop: 4 },
  stepCard: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
  },
  stepCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stepCardTitle: { fontSize: 14, fontWeight: "600", color: "#1F2937", flex: 1 },
  stepCardDesc: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  stepCardDuration: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },
  addStepSection: { marginTop: 8 },
  addStepBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
  },
  addStepText: { fontSize: 14, fontWeight: "600", color: "#1D4ED8" },
  modalBtnRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  modalCancelText: { fontWeight: "600", color: "#6B7280", fontSize: 15 },
  modalSubmitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#1D4ED8",
  },
  modalSubmitText: { fontWeight: "600", color: "#FFFFFF", fontSize: 15 },

  // Instance footer
  instanceFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },

  // Card timer badge
  cardTimerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  cardTimerText: { fontSize: 20, fontWeight: "800", fontVariant: ["tabular-nums"] },
  cardTimerPaused: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: "auto",
  },
  cardTimerPausedText: { color: "#FFFFFF", fontSize: 10, fontWeight: "700", textTransform: "uppercase" },

  // Cooking mode button
  cookingModeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  cookingModeBtnText: { fontSize: 12, fontWeight: "600" },

  // Cooking mode modal
  cookingContainer: { flex: 1 },
  cookingHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cookingTitle: { fontSize: 18, fontWeight: "700" },
  cookingSubtitle: { fontSize: 13, marginTop: 2 },
  cookingProgressBar: { height: 6, marginHorizontal: 16, borderRadius: 3 },
  cookingProgressFill: { height: 6, borderRadius: 3 },
  cookingContent: { padding: 24, paddingBottom: 120 },
  cookingStepTitle: { fontSize: 28, fontWeight: "800", marginBottom: 16 },
  cookingStepDesc: { fontSize: 20, lineHeight: 30, marginBottom: 20 },
  cookingHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  cookingHintText: { fontSize: 15 },
  cookingActions: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  cookingActionsRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  cookingBackBtn: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cookingNextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  cookingNextText: { color: "#FFFFFF", fontWeight: "700", fontSize: 18 },

  // Timer
  timerContainer: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    marginTop: 8,
  },
  timerLabel: { fontSize: 14, fontWeight: "600", marginBottom: 12 },
  timerDisplay: { fontSize: 56, fontWeight: "800", fontVariant: ["tabular-nums"] },
  timerButtons: { flexDirection: "row", gap: 12, marginTop: 16 },
  timerBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  timerSetup: { flexDirection: "row", gap: 10, alignItems: "center" },
  timerInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    width: 80,
    fontSize: 16,
    textAlign: "center",
  },
  timerStartBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  timerStartText: { color: "#FFFFFF", fontWeight: "600", fontSize: 15 },
});
