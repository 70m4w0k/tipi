import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useAuth } from "../../lib/hooks/useAuth";
import { useRecipes } from "../../lib/hooks/useRecipes";
import { useTheme } from "../../lib/theme";
import { Recipe, RecipeInstance, RecipeStep } from "../../lib/types";

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
  const { profile } = useAuth();
  const searchParams = useLocalSearchParams<{ tab?: string; instanceId?: string }>();
  const {
    recipes, instances, loading,
    addRecipe, updateRecipe, deleteRecipe,
    startInstance, advanceStep, updateInstanceNotes, deleteInstance, completeInstance,
  } = useRecipes(profile?.household_id);
  const t = useTheme();

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
    Alert.alert("Supprimer", `Supprimer "${title}" et toutes ses instances ?`, [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: () => void deleteRecipe(id) },
    ]);
  };

  const handleStartInstance = async () => {
    if (!startRecipeId || !instanceLabel.trim()) return;
    await startInstance(startRecipeId, instanceLabel, instanceNotes);
    setShowStartModal(false);
    setStartRecipeId(null);
    setInstanceLabel("");
    setInstanceNotes("");
    setTab("active");
  };

  const handleDeleteInstance = (id: string, label: string) => {
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
              onPress={() => void advanceStep(item.id)}
            >
              <Text style={styles.nextStepText}>Étape suivante</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </Pressable>
          ) : (
            <Pressable
              style={[styles.nextStepBtn, { backgroundColor: t.success }]}
              onPress={() => void completeInstance(item.id)}
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

        <Text style={[styles.startedAt, { color: t.textMuted }]}>
          Début : {new Date(item.started_at).toLocaleDateString("fr-FR")} · Total : {formatDuration(item.started_at)}
        </Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.background }]} edges={["top"]}>
      <View style={[styles.header, { backgroundColor: t.card, borderBottomColor: t.cardBorder }]}>
        <Text style={[styles.headerTitle, { color: t.text }]}>Recettes</Text>
        {tab === "recipes" && (
          <Pressable onPress={() => setShowForm(true)} hitSlop={8}>
            <Ionicons name="add" size={24} color={t.accent} />
          </Pressable>
        )}
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
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
  list: { paddingHorizontal: 16, paddingBottom: 24 },
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
});
