import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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
import { Calendar, DateData, LocaleConfig } from "react-native-calendars";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "../../lib/hooks/useAuth";
import { useHousehold } from "../../lib/hooks/useHousehold";
import { useEvents } from "../../lib/hooks/useEvents";
import { useRecipes } from "../../lib/hooks/useRecipes";
import { useTheme } from "../../lib/theme";
import { haptic } from "../../lib/haptics";
import {
  CalendarItem,
  CalendarItemType,
  CalendarStepInfo,
  FILTER_COLORS,
  computePlannedStepDates,
  computeTotalDays,
  formatDateISO,
  getBirthdayThisYear,
  getAge,
  getDelayDays,
  formatDuration,
  stepDurationInDays,
} from "../../lib/calendar-logic";

LocaleConfig.locales["fr"] = {
  monthNames: [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
  ],
  monthNamesShort: [
    "Janv.", "Févr.", "Mars", "Avr.", "Mai", "Juin",
    "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc.",
  ],
  dayNames: ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"],
  dayNamesShort: ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"],
  today: "Aujourd'hui",
};
LocaleConfig.defaultLocale = "fr";

type AddMode = "event" | "plan_recipe" | null;

export default function CalendarScreen() {
  const { profile } = useAuth();
  const { members } = useHousehold(profile);
  const { events, addEvent, deleteEvent, fetchEvents } = useEvents(profile?.household_id);
  const { recipes, instances, startInstance, fetchAll: fetchRecipes } = useRecipes(profile?.household_id);
  const t = useTheme();
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState(formatDateISO(new Date()));
  const [filters, setFilters] = useState<Record<CalendarItemType, boolean>>({
    event: true,
    birthday: true,
    recipe_planned: true,
    recipe_active: true,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [addMode, setAddMode] = useState<AddMode>(null);
  const [showFabMenu, setShowFabMenu] = useState(false);

  // Event form
  const [eventTitle, setEventTitle] = useState("");
  const [eventNote, setEventNote] = useState("");
  const [eventDate, setEventDate] = useState("");

  // Plan recipe form
  const [planRecipeId, setPlanRecipeId] = useState<string | null>(null);
  const [planTargetDate, setPlanTargetDate] = useState("");
  const [planLabel, setPlanLabel] = useState("");
  const [planError, setPlanError] = useState("");

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchEvents(), fetchRecipes()]);
    setRefreshing(false);
  }, [fetchEvents, fetchRecipes]);

  const calendarItems = useMemo(() => {
    const items: CalendarItem[] = [];

    if (filters.event) {
      for (const ev of events) {
        items.push({
          id: `ev-${ev.id}`,
          type: "event",
          title: ev.title,
          subtitle: ev.note || undefined,
          date: ev.date.split("T")[0],
          color: FILTER_COLORS.event,
        });
      }
    }

    if (filters.birthday) {
      for (const m of members) {
        if (m.birthday) {
          const bdDate = getBirthdayThisYear(m.birthday);
          const age = getAge(m.birthday) + (new Date() > new Date(bdDate) ? 1 : 0);
          items.push({
            id: `bd-${m.id}`,
            type: "birthday",
            title: `Anniversaire de ${m.display_name}`,
            subtitle: `${age} ans`,
            date: bdDate,
            color: FILTER_COLORS.birthday,
          });
        }
      }
    }

    for (const inst of instances) {
      const recipe = recipes.find((r) => r.id === inst.recipe_id);
      if (!recipe) continue;

      if (inst.target_date && filters.recipe_planned) {
        const stepDates = computePlannedStepDates(
          recipe.steps,
          inst.target_date,
          inst.step_completions ?? [],
          inst.current_step,
          inst.step_started_at,
        );
        const delay = getDelayDays(
          inst.target_date,
          recipe.steps,
          inst.step_completions ?? [],
          inst.current_step,
          inst.step_started_at,
        );

        const allSteps: CalendarStepInfo[] = recipe.steps.map((step, i) => ({
          index: i,
          title: step.title,
          status: i < inst.current_step ? "completed" as const : i === inst.current_step ? "current" as const : "upcoming" as const,
          date: stepDates[i],
          duration: formatDuration(step),
        }));

        const uniqueDates = [...new Set(stepDates)];
        for (const date of uniqueDates) {
          const stepsOnDay = allSteps.filter((s) => s.date === date);
          const stepNames = stepsOnDay.map((s) => s.title).join(", ");
          items.push({
            id: `rp-${inst.id}-${date}`,
            type: "recipe_planned",
            title: inst.label,
            subtitle: stepNames,
            date,
            color: stepsOnDay.every((s) => s.status === "completed") ? "#9CA3AF" : FILTER_COLORS.recipe_planned,
            instanceId: inst.id,
            recipeSteps: allSteps,
            delay: delay > 0 ? delay : undefined,
          });
        }

        const lastStep = recipe.steps[recipe.steps.length - 1];
        const lastStepDate = stepDates[stepDates.length - 1];
        if (lastStep && lastStepDate) {
          const lastDays = stepDurationInDays(lastStep);
          const readyDate = new Date(lastStepDate);
          readyDate.setDate(readyDate.getDate() + Math.max(lastDays, 1));
          const readyDateStr = formatDateISO(readyDate);
          if (!uniqueDates.includes(readyDateStr)) {
            items.push({
              id: `rp-ready-${inst.id}`,
              type: "recipe_planned",
              title: `${inst.label} — Prêt`,
              subtitle: "Recette terminée",
              date: readyDateStr,
              color: "#22C55E",
              instanceId: inst.id,
              recipeSteps: allSteps,
            });
          }
        }
      } else if (!inst.target_date && filters.recipe_active) {
        const allSteps: CalendarStepInfo[] = recipe.steps.map((step, i) => ({
          index: i,
          title: step.title,
          status: i < inst.current_step ? "completed" as const : i === inst.current_step ? "current" as const : "upcoming" as const,
          date: inst.started_at.split("T")[0],
          duration: formatDuration(step),
        }));
        items.push({
          id: `ra-${inst.id}`,
          type: "recipe_active",
          title: inst.label,
          subtitle: `Lancée le ${new Date(inst.started_at).toLocaleDateString("fr-FR")} — Étape ${inst.current_step + 1}/${recipe.steps.length}`,
          date: inst.started_at.split("T")[0],
          color: FILTER_COLORS.recipe_active,
          instanceId: inst.id,
          recipeSteps: allSteps,
        });
      }
    }

    return items;
  }, [events, members, instances, recipes, filters]);

  const markedDates = useMemo(() => {
    const marks: Record<string, { dots: { key: string; color: string }[] }> = {};
    for (const item of calendarItems) {
      if (!marks[item.date]) marks[item.date] = { dots: [] };
      const dots = marks[item.date].dots;
      if (!dots.some((d) => d.color === item.color)) {
        dots.push({ key: item.type, color: item.color });
      }
    }
    return marks;
  }, [calendarItems]);

  const dayItems = useMemo(
    () => calendarItems.filter((i) => i.date === selectedDate).sort((a, b) => a.title.localeCompare(b.title)),
    [calendarItems, selectedDate],
  );

  const toggleFilter = (key: CalendarItemType) => {
    void haptic.light();
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAddEvent = async () => {
    if (!eventTitle.trim()) return;
    const date = eventDate || selectedDate;
    await addEvent(eventTitle.trim(), date, eventNote.trim());
    void haptic.success();
    setEventTitle("");
    setEventNote("");
    setEventDate("");
    setAddMode(null);
  };

  const handlePlanRecipe = async () => {
    if (!planRecipeId || !planTargetDate) return;
    const recipe = recipes.find((r) => r.id === planRecipeId);
    if (!recipe) return;
    const label = planLabel.trim() || recipe.title;
    setPlanError("");
    const err = await startInstance(planRecipeId, label, "", planTargetDate);
    if (err) {
      setPlanError(err);
      return;
    }
    void haptic.success();
    setPlanRecipeId(null);
    setPlanTargetDate("");
    setPlanLabel("");
    setAddMode(null);
  };

  const selectedRecipe = planRecipeId ? recipes.find((r) => r.id === planRecipeId) : null;
  const totalDays = selectedRecipe ? computeTotalDays(selectedRecipe.steps) : 0;
  const daysUntilTarget = planTargetDate
    ? Math.floor((new Date(planTargetDate + "T23:59:59").getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const isFeasible = daysUntilTarget === null || totalDays <= daysUntilTarget;
  const previewDates = selectedRecipe && planTargetDate
    ? computePlannedStepDates(selectedRecipe.steps, planTargetDate, [], 0, "")
    : null;

  const handleDeleteItem = async (item: CalendarItem) => {
    if (item.type === "event") {
      const eventId = item.id.replace("ev-", "");
      await deleteEvent(eventId);
      void haptic.light();
    }
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: t.background }]} edges={["top"]}>
      <View style={[styles.header, { backgroundColor: t.card, borderBottomColor: t.cardBorder }]}>
        <Text style={[styles.headerTitle, { color: t.text }]}>Calendrier</Text>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.accent} colors={[t.accent]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Filters */}
        <View style={styles.filterRow}>
          {(["event", "birthday", "recipe_planned"] as CalendarItemType[]).map((key) => (
            <Pressable
              key={key}
              style={[
                styles.filterChip,
                {
                  backgroundColor: filters[key] ? FILTER_COLORS[key] : t.inputBg,
                  borderColor: filters[key] ? FILTER_COLORS[key] : t.inputBorder,
                },
              ]}
              onPress={() => toggleFilter(key)}
            >
              <Text style={[styles.filterText, { color: filters[key] ? "#FFFFFF" : t.textSecondary }]}>
                {key === "event" ? "Événements" : key === "birthday" ? "Anniversaires" : "Recettes"}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Calendar */}
        <Calendar
          current={selectedDate}
          onDayPress={(day: DateData) => {
            setSelectedDate(day.dateString);
            void haptic.light();
          }}
          markingType="multi-dot"
          markedDates={{
            ...markedDates,
            [selectedDate]: {
              ...(markedDates[selectedDate] || {}),
              selected: true,
              selectedColor: t.accent,
              dots: markedDates[selectedDate]?.dots || [],
            },
          }}
          theme={{
            backgroundColor: t.background,
            calendarBackground: t.background,
            textSectionTitleColor: t.textSecondary,
            selectedDayBackgroundColor: t.accent,
            selectedDayTextColor: "#FFFFFF",
            todayTextColor: t.accent,
            dayTextColor: t.text,
            textDisabledColor: t.textMuted,
            arrowColor: t.accent,
            monthTextColor: t.text,
            textMonthFontWeight: "700" as const,
            textDayFontSize: 14,
            textMonthFontSize: 16,
          }}
          firstDay={1}
          enableSwipeMonths
        />

        {/* Day items */}
        <View style={styles.daySection}>
          <Text style={[styles.daySectionTitle, { color: t.text }]}>
            {new Date(selectedDate + "T12:00:00").toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </Text>

          {dayItems.length === 0 ? (
            <Text style={[styles.emptyText, { color: t.textMuted }]}>Rien de prévu</Text>
          ) : (
            dayItems.map((item) => {
              const isRecipe = item.type === "recipe_planned" || item.type === "recipe_active";

              return (
                <Pressable
                  key={item.id}
                  style={[
                    styles.itemCard,
                    { backgroundColor: t.card, borderColor: isRecipe ? item.color : t.cardBorder },
                    isRecipe && styles.itemCardRecipe,
                  ]}
                  onPress={isRecipe && item.instanceId ? () => {
                    router.push({ pathname: "/(app)/recipes", params: { tab: "active", cook: item.instanceId } });
                  } : undefined}
                  disabled={!isRecipe}
                >
                  {!isRecipe && <View style={[styles.itemDot, { backgroundColor: item.color }]} />}
                  <View style={styles.itemContent}>
                    <View style={styles.itemTitleRow}>
                      <Text style={[styles.itemTitle, { color: t.text }]}>{item.title}</Text>
                      {item.delay && item.delay > 0 ? (
                        <Text style={[styles.delayBadge, { color: t.danger }]}>+{item.delay}j</Text>
                      ) : null}
                    </View>

                    {item.recipeSteps ? (
                      <View style={styles.stepsGroup}>
                        {item.recipeSteps
                          .filter((s) => s.date === item.date)
                          .map((step) => (
                            <View key={step.index} style={styles.stepRow}>
                              <Ionicons
                                name={step.status === "completed" ? "checkmark-circle" : step.status === "current" ? "ellipse" : "ellipse-outline"}
                                size={14}
                                color={step.status === "completed" ? t.success : step.status === "current" ? FILTER_COLORS.recipe_planned : t.textMuted}
                              />
                              <Text style={[styles.stepText, { color: step.status === "completed" ? t.textMuted : t.text }]}>
                                {step.title}
                              </Text>
                              {step.duration ? (
                                <Text style={[styles.stepDuration, { color: t.textMuted }]}>{step.duration}</Text>
                              ) : null}
                            </View>
                          ))}
                      </View>
                    ) : item.subtitle ? (
                      <Text style={[styles.itemSubtitle, { color: t.textSecondary }]}>{item.subtitle}</Text>
                    ) : null}

                    {isRecipe && item.instanceId ? (
                      <View style={styles.recipeLink}>
                        <Ionicons name="flame-outline" size={14} color={t.accent} />
                        <Text style={[styles.recipeLinkText, { color: t.accent }]}>Ouvrir en mode Cuisine</Text>
                        <Ionicons name="chevron-forward" size={14} color={t.accent} />
                      </View>
                    ) : null}
                  </View>
                  {item.type === "event" && (
                    <Pressable onPress={() => void handleDeleteItem(item)} hitSlop={8}>
                      <Ionicons name="trash-outline" size={18} color={t.danger} />
                    </Pressable>
                  )}
                </Pressable>
              );
            })
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB overlay to close on outside click */}
      {showFabMenu && (
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowFabMenu(false)} />
      )}

      {/* FAB */}
      <View style={styles.fabContainer}>
        {showFabMenu && (
          <View style={[styles.fabMenu, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
            <Pressable
              style={styles.fabMenuItem}
              onPress={() => {
                setShowFabMenu(false);
                setEventDate(selectedDate);
                setAddMode("event");
              }}
            >
              <Ionicons name="calendar-outline" size={20} color={FILTER_COLORS.event} />
              <Text style={[styles.fabMenuText, { color: t.text }]}>Événement</Text>
            </Pressable>
            <Pressable
              style={styles.fabMenuItem}
              onPress={() => {
                setShowFabMenu(false);
                setPlanTargetDate(selectedDate);
                setAddMode("plan_recipe");
              }}
            >
              <Ionicons name="restaurant-outline" size={20} color={FILTER_COLORS.recipe_planned} />
              <Text style={[styles.fabMenuText, { color: t.text }]}>Planifier une recette</Text>
            </Pressable>
          </View>
        )}
        <Pressable
          style={[styles.fab, { backgroundColor: t.accent }]}
          onPress={() => {
            void haptic.light();
            setShowFabMenu((prev) => !prev);
          }}
        >
          <Ionicons name={showFabMenu ? "close" : "add"} size={28} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Add Event Modal */}
      <Modal visible={addMode === "event"} animationType="slide" transparent>
        <Pressable style={styles.modalOverlay} onPress={() => setAddMode(null)}>
          <Pressable style={[styles.modalContent, { backgroundColor: t.card }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: t.text }]}>Nouvel événement</Text>
            <TextInput
              style={[styles.input, { borderColor: t.inputBorder, backgroundColor: t.inputBg, color: t.text }]}
              placeholder="Titre"
              placeholderTextColor={t.textMuted}
              value={eventTitle}
              onChangeText={setEventTitle}
            />
            <TextInput
              style={[styles.input, { borderColor: t.inputBorder, backgroundColor: t.inputBg, color: t.text }]}
              placeholder="Date (AAAA-MM-JJ)"
              placeholderTextColor={t.textMuted}
              value={eventDate}
              onChangeText={setEventDate}
            />
            <TextInput
              style={[styles.input, { borderColor: t.inputBorder, backgroundColor: t.inputBg, color: t.text }]}
              placeholder="Note (optionnel)"
              placeholderTextColor={t.textMuted}
              value={eventNote}
              onChangeText={setEventNote}
            />
            <View style={styles.modalButtons}>
              <Pressable style={[styles.modalBtn, { backgroundColor: t.inputBg }]} onPress={() => setAddMode(null)}>
                <Text style={[styles.modalBtnText, { color: t.textSecondary }]}>Annuler</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, { backgroundColor: t.accent }]} onPress={() => void handleAddEvent()}>
                <Text style={[styles.modalBtnText, { color: "#FFFFFF" }]}>Ajouter</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Plan Recipe Modal */}
      <Modal visible={addMode === "plan_recipe"} animationType="slide" transparent>
        <Pressable style={styles.modalOverlay} onPress={() => setAddMode(null)}>
          <Pressable style={[styles.modalContent, { backgroundColor: t.card }]} onPress={(e) => e.stopPropagation()}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { color: t.text }]}>Planifier une recette</Text>

              {!planRecipeId ? (
                <>
                  <Text style={[styles.label, { color: t.textSecondary }]}>Choisir une recette</Text>
                  {recipes.length === 0 ? (
                    <Text style={[styles.emptyText, { color: t.textMuted }]}>Aucune recette disponible</Text>
                  ) : (
                    recipes.map((r) => (
                      <Pressable
                        key={r.id}
                        style={[styles.recipeOption, { backgroundColor: t.inputBg, borderColor: t.inputBorder }]}
                        onPress={() => {
                          setPlanRecipeId(r.id);
                          setPlanLabel(r.title);
                          void haptic.light();
                        }}
                      >
                        <Text style={[styles.recipeOptionTitle, { color: t.text }]}>{r.title}</Text>
                        <Text style={[styles.recipeOptionSub, { color: t.textSecondary }]}>
                          {r.steps.length} étape{r.steps.length > 1 ? "s" : ""}
                          {computeTotalDays(r.steps) > 0 ? ` — ${computeTotalDays(r.steps)}j de préparation` : ""}
                        </Text>
                      </Pressable>
                    ))
                  )}
                </>
              ) : (
                <>
                  <Pressable onPress={() => setPlanRecipeId(null)} style={styles.backLink}>
                    <Ionicons name="chevron-back" size={16} color={t.accent} />
                    <Text style={[styles.backLinkText, { color: t.accent }]}>Changer de recette</Text>
                  </Pressable>

                  <TextInput
                    style={[styles.input, { borderColor: t.inputBorder, backgroundColor: t.inputBg, color: t.text }]}
                    placeholder="Nom (ex: Magret de Noël)"
                    placeholderTextColor={t.textMuted}
                    value={planLabel}
                    onChangeText={setPlanLabel}
                  />
                  <TextInput
                    style={[styles.input, { borderColor: t.inputBorder, backgroundColor: t.inputBg, color: t.text }]}
                    placeholder="Prêt pour le... (AAAA-MM-JJ)"
                    placeholderTextColor={t.textMuted}
                    value={planTargetDate}
                    onChangeText={setPlanTargetDate}
                  />

                  {planTargetDate && !isFeasible && (
                    <View style={[styles.errorBanner, { backgroundColor: t.dangerLight }]}>
                      <Ionicons name="alert-circle" size={18} color={t.danger} />
                      <Text style={[styles.errorText, { color: t.danger }]}>
                        Cette recette nécessite {totalDays} jours, mais il ne reste que {daysUntilTarget} jour{(daysUntilTarget ?? 0) > 1 ? "s" : ""} avant la date choisie.
                      </Text>
                    </View>
                  )}

                  {previewDates && selectedRecipe && isFeasible && (
                    <View style={[styles.previewCard, { backgroundColor: t.inputBg, borderColor: t.inputBorder }]}>
                      <Text style={[styles.previewTitle, { color: t.text }]}>Récapitulatif</Text>
                      {selectedRecipe.steps.map((step, i) => (
                        <View key={i} style={styles.previewRow}>
                          <View style={[styles.previewDot, { backgroundColor: FILTER_COLORS.recipe_planned }]} />
                          <Text style={[styles.previewDate, { color: t.accent }]}>
                            {new Date(previewDates[i] + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                          </Text>
                          <Text style={[styles.previewStep, { color: t.text }]} numberOfLines={1}>
                            {step.title}
                          </Text>
                          {formatDuration(step) ? (
                            <Text style={[styles.previewRest, { color: t.textMuted }]}>
                              {formatDuration(step)}
                            </Text>
                          ) : null}
                        </View>
                      ))}
                      <View style={styles.previewRow}>
                        <View style={[styles.previewDot, { backgroundColor: FILTER_COLORS.recipe_planned }]} />
                        <Text style={[styles.previewDate, { color: t.accent }]}>
                          {new Date(planTargetDate + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                        </Text>
                        <Text style={[styles.previewStep, { color: t.text, fontWeight: "700" }]}>
                          Prêt !
                        </Text>
                      </View>
                    </View>
                  )}

                  {planError ? (
                    <View style={[styles.errorBanner, { backgroundColor: t.dangerLight }]}>
                      <Ionicons name="alert-circle" size={18} color={t.danger} />
                      <Text style={[styles.errorText, { color: t.danger }]}>{planError}</Text>
                    </View>
                  ) : null}

                  <View style={styles.modalButtons}>
                    <Pressable style={[styles.modalBtn, { backgroundColor: t.inputBg }]} onPress={() => { setAddMode(null); setPlanError(""); }}>
                      <Text style={[styles.modalBtnText, { color: t.textSecondary }]}>Annuler</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.modalBtn, { backgroundColor: t.accent, opacity: planRecipeId && planTargetDate && isFeasible ? 1 : 0.5 }]}
                      onPress={() => void handlePlanRecipe()}
                      disabled={!planRecipeId || !planTargetDate || !isFeasible}
                    >
                      <Text style={[styles.modalBtnText, { color: "#FFFFFF" }]}>Planifier</Text>
                    </Pressable>
                  </View>
                </>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    borderBottomWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterText: { fontSize: 13, fontWeight: "600" },
  daySection: { paddingHorizontal: 16, paddingTop: 16 },
  daySectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12, textTransform: "capitalize" },
  emptyText: { fontSize: 14, textAlign: "center", paddingVertical: 20 },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  itemCardRecipe: { borderLeftWidth: 3 },
  itemDot: { width: 10, height: 10, borderRadius: 5 },
  itemContent: { flex: 1 },
  itemTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  itemTitle: { fontSize: 15, fontWeight: "600", flex: 1 },
  itemSubtitle: { fontSize: 13, marginTop: 2 },
  delayBadge: { fontSize: 12, fontWeight: "700" },
  stepsGroup: { marginTop: 6, gap: 4 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  stepText: { fontSize: 13, flex: 1 },
  stepDuration: { fontSize: 11 },
  recipeLink: { flexDirection: "row", alignItems: "center", gap: 2, marginTop: 8 },
  recipeLinkText: { fontSize: 12, fontWeight: "600" },
  fabContainer: { position: "absolute", right: 20, bottom: 24, alignItems: "flex-end" },
  fabMenu: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  fabMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  fabMenuText: { fontSize: 15, fontWeight: "600" },
  fab: {
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  modalButtons: { flexDirection: "row", gap: 12, marginTop: 8 },
  modalBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalBtnText: { fontWeight: "700", fontSize: 16 },
  recipeOption: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  recipeOptionTitle: { fontSize: 15, fontWeight: "600" },
  recipeOptionSub: { fontSize: 13, marginTop: 2 },
  backLink: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 12 },
  backLinkText: { fontSize: 14, fontWeight: "600" },
  previewCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    gap: 8,
  },
  previewTitle: { fontSize: 14, fontWeight: "700", marginBottom: 4 },
  previewRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  previewDot: { width: 8, height: 8, borderRadius: 4 },
  previewDate: { fontSize: 13, fontWeight: "600", width: 60 },
  previewStep: { flex: 1, fontSize: 14 },
  previewRest: { fontSize: 12 },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  errorText: { fontSize: 13, flex: 1, fontWeight: "500" },
});
