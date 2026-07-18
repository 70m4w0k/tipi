import { useCallback, useMemo, useState } from "react";
import {
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
import { useAuth } from "../../lib/hooks/useAuth";
import { useHousehold } from "../../lib/hooks/useHousehold";
import { useSport } from "../../lib/hooks/useSport";
import { useTheme } from "../../lib/theme";
import { haptic } from "../../lib/haptics";
import { Exercise } from "../../lib/types";
import { ConfirmDialog } from "../../components/ConfirmDialog";

const EXERCISE_ICONS = [
  "barbell-outline", "fitness-outline", "timer-outline",
  "walk-outline", "bicycle-outline", "heart-outline",
  "flame-outline", "pulse-outline", "body-outline",
];

const UNIT_OPTIONS = ["répétitions", "secondes", "minutes"];

export default function SportScreen() {
  const { profile } = useAuth();
  const { members } = useHousehold(profile);
  const {
    exercises, logs, loading,
    addExercise, updateExercise, deleteExercise,
    fetchAll,
  } = useSport(profile?.household_id);
  const t = useTheme();
  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);
  const [editModal, setEditModal] = useState<Exercise | undefined>(undefined);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState("barbell-outline");
  const [editUnit, setEditUnit] = useState("répétitions");
  const [confirm, setConfirm] = useState<
    { title: string; message: string; confirmLabel: string; onConfirm: () => void } | null
  >(null);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  // Totals per exercise per user (all time)
  const exerciseStats = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    for (const log of logs) {
      if (!map[log.exercise_id]) map[log.exercise_id] = {};
      map[log.exercise_id][log.user_id] = (map[log.exercise_id][log.user_id] ?? 0) + log.count;
    }
    return map;
  }, [logs]);

  const handleSaveExercise = async () => {
    if (!editName.trim()) return;
    void haptic.light();
    if (editModal?.id) {
      await updateExercise(editModal.id, editName, editIcon, editUnit);
    } else {
      await addExercise(editName, editIcon, editUnit);
    }
    setEditModal(undefined);
    setEditName("");
  };

  const handleDeleteExercise = (ex: Exercise) => {
    void haptic.warning();
    setConfirm({
      title: "Supprimer l'exercice",
      message: `Supprimer "${ex.name}" et tous ses logs ?`,
      confirmLabel: "Supprimer",
      onConfirm: () => { void deleteExercise(ex.id); },
    });
  };

  const openEditModal = (ex?: Exercise) => {
    if (ex) {
      setEditModal(ex);
      setEditName(ex.name);
      setEditIcon(ex.icon);
      setEditUnit(ex.unit);
    } else {
      setEditModal(null!);
      setEditName("");
      setEditIcon("barbell-outline");
      setEditUnit("répétitions");
    }
  };

  const userColor = (userId: string) => members.find((m) => m.id === userId)?.color ?? t.accent;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.background }]} edges={["top"]}>
      <View style={[styles.header, { backgroundColor: t.card, borderBottomColor: t.cardBorder }]}>
        <Text style={[styles.headerTitle, { color: t.text }]}>Sport</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.accent} colors={[t.accent]} />}
        keyboardShouldPersistTaps="handled"
      >
        {exercises.length === 0 && !loading && (
          <View style={styles.emptyContainer}>
            <Ionicons name="barbell-outline" size={48} color={t.emptyIcon} />
            <Text style={[styles.emptyText, { color: t.textMuted }]}>Aucun exercice</Text>
            <Text style={[styles.emptySub, { color: t.textMuted }]}>Appuie sur + pour en ajouter</Text>
          </View>
        )}

        <View style={styles.grid}>
          {exercises.map((ex) => {
            const stats = exerciseStats[ex.id] ?? {};
            const total = Object.values(stats).reduce((s, c) => s + c, 0);
            const userEntries = Object.entries(stats);

            return (
              <Pressable
                key={ex.id}
                style={[styles.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}
                onPress={() => { void haptic.light(); router.push(`/(app)/sport/${ex.id}` as any); }}
              >
                <View style={styles.cardTop}>
                  <Ionicons name={ex.icon as any} size={24} color={t.accent} />
                  <Pressable
                    hitSlop={8}
                    onPress={(e) => { e.stopPropagation?.(); openEditModal(ex); }}
                  >
                    <Ionicons name="pencil-outline" size={13} color={t.textMuted} />
                  </Pressable>
                </View>
                <Text style={[styles.cardName, { color: t.text }]} numberOfLines={1}>{ex.name}</Text>
                <Text style={[styles.cardTotal, { color: t.accent }]}>
                  {total} {ex.unit}
                </Text>
                {userEntries.length > 0 && (
                  <View style={styles.cardUsers}>
                    {userEntries.map(([userId]) => (
                      <View
                        key={userId}
                        style={[styles.userDot, { backgroundColor: userColor(userId) }]}
                      />
                    ))}
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
      </KeyboardAvoidingView>

      {/* FAB */}
      <View style={styles.fabContainer}>
        <Pressable
          style={[styles.fab, { backgroundColor: t.accent }]}
          onPress={() => { void haptic.light(); openEditModal(); }}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Edit exercise modal */}
      <Modal visible={editModal !== undefined} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setEditModal(undefined)}>
          <Pressable style={[styles.modalContent, { backgroundColor: t.card }]} onPress={() => {}}>
            <Text style={[styles.editTitle, { color: t.text }]}>
              {editModal?.id ? "Modifier l'exercice" : "Nouvel exercice"}
            </Text>
            <TextInput
              style={[styles.modalInput, { borderColor: t.inputBorder, backgroundColor: t.inputBg, color: t.text }]}
              value={editName}
              onChangeText={setEditName}
              placeholder="Nom de l'exercice"
              placeholderTextColor={t.textMuted}
              autoFocus
            />
            <Text style={[styles.editLabel, { color: t.textSecondary }]}>Icône</Text>
            <View style={styles.iconGrid}>
              {EXERCISE_ICONS.map((icon) => (
                <Pressable
                  key={icon}
                  style={[styles.iconBtn, { borderColor: editIcon === icon ? t.accent : t.cardBorder }]}
                  onPress={() => setEditIcon(icon)}
                >
                  <Ionicons name={icon as any} size={22} color={editIcon === icon ? t.accent : t.textMuted} />
                </Pressable>
              ))}
            </View>
            <Text style={[styles.editLabel, { color: t.textSecondary }]}>Unité</Text>
            <View style={styles.unitRow}>
              {UNIT_OPTIONS.map((u) => (
                <Pressable
                  key={u}
                  style={[styles.unitBtn, { borderColor: editUnit === u ? t.accent : t.cardBorder }, editUnit === u && { backgroundColor: t.accentLight }]}
                  onPress={() => setEditUnit(u)}
                >
                  <Text style={[styles.unitBtnText, { color: editUnit === u ? t.accent : t.textSecondary }]}>{u}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.modalActions}>
              {editModal?.id && (
                <Pressable
                  style={[styles.modalDelete, { backgroundColor: t.dangerLight }]}
                  onPress={() => { setEditModal(undefined); handleDeleteExercise(editModal); }}
                >
                  <Ionicons name="trash-outline" size={16} color={t.danger} />
                </Pressable>
              )}
              <Pressable style={[styles.modalCancel, { borderColor: t.cardBorder, flex: 1 }]} onPress={() => setEditModal(undefined)}>
                <Text style={[styles.modalCancelText, { color: t.textSecondary }]}>Annuler</Text>
              </Pressable>
              <Pressable style={[styles.modalConfirm, { backgroundColor: t.accent, flex: 1 }]} onPress={() => void handleSaveExercise()}>
                <Text style={styles.modalConfirmText}>Enregistrer</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <ConfirmDialog
        visible={!!confirm}
        title={confirm?.title ?? ""}
        message={confirm?.message ?? ""}
        confirmLabel={confirm?.confirmLabel ?? ""}
        onConfirm={() => { confirm?.onConfirm(); setConfirm(null); }}
        onCancel={() => setConfirm(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 18, fontWeight: "700", flex: 1, textAlign: "center" },

  content: { padding: 12, paddingBottom: 100 },

  emptyContainer: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: "600" },
  emptySub: { fontSize: 13 },

  // Grid
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: {
    width: "48%" as any, flexGrow: 1, minWidth: 150,
    borderWidth: 1, borderRadius: 14, padding: 14,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  cardName: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  cardTotal: { fontSize: 22, fontWeight: "800", marginBottom: 8 },
  cardUsers: { flexDirection: "row", gap: 4 },
  userDot: { width: 10, height: 10, borderRadius: 5 },

  // FAB
  fabContainer: { position: "absolute", bottom: 24, right: 16 },
  fab: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: "center", justifyContent: "center",
    elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 4,
  },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
  modalContent: { width: "100%", maxWidth: 360, borderRadius: 16, padding: 20 },
  modalInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16, marginBottom: 12 },
  modalActions: { flexDirection: "row", gap: 8, marginTop: 4 },
  modalCancel: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  modalCancelText: { fontWeight: "600", fontSize: 14 },
  modalConfirm: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  modalConfirmText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  modalDelete: { width: 44, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  editTitle: { fontSize: 17, fontWeight: "700", marginBottom: 14 },
  editLabel: { fontSize: 13, fontWeight: "600", marginTop: 10, marginBottom: 6 },
  iconGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 6 },
  iconBtn: { width: 44, height: 44, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  unitRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  unitBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  unitBtnText: { fontSize: 14, fontWeight: "600" },
});