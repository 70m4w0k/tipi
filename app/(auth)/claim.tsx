import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "../../lib/hooks/useAuth";
import { useHousehold } from "../../lib/hooks/useHousehold";
import { useTheme } from "../../lib/theme";
import { COLOR_PRESETS } from "../../lib/household-logic";
import { supabase } from "../../lib/supabase";

export default function ClaimScreen() {
  const { profile, refreshProfile } = useAuth();
  const { pendingMembers, members, claimPendingMember } = useHousehold(profile);
  const router = useRouter();
  const t = useTheme();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const takenColors = new Set(members.map((m) => m.color));
  const availableColors = COLOR_PRESETS.filter((c) => !takenColors.has(c));

  const handleConfirm = async () => {
    if (!profile) return;
    setErrorMsg("");
    setLoading(true);

    if (selectedId) {
      const { error } = await claimPendingMember(selectedId);
      if (error) {
        setErrorMsg(String(error.message ?? error));
        setLoading(false);
        return;
      }
    }

    if (selectedColor) {
      await supabase
        .from("profiles")
        .update({ color: selectedColor })
        .eq("id", profile.id);
    }

    await refreshProfile();
    setLoading(false);
    router.replace("/(app)/home");
  };

  const skipClaim = async () => {
    if (!profile) return;
    if (selectedColor) {
      await supabase
        .from("profiles")
        .update({ color: selectedColor })
        .eq("id", profile.id);
    }
    await refreshProfile();
    router.replace("/(app)/home");
  };

  const unclaimed = pendingMembers.filter((m) => !m.claimed_by);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.iconCircle, { backgroundColor: t.accentLight }]}>
          <Ionicons name="people-outline" size={48} color={t.accent} />
        </View>

        <Text style={[styles.title, { color: t.text }]}>Qui es-tu ?</Text>
        <Text style={[styles.subtitle, { color: t.textSecondary }]}>
          Ton admin a pré-ajouté des membres. Choisis ton nom ou continue en tant que nouveau.
        </Text>

        {!!errorMsg && (
          <View style={[styles.errorBanner, { backgroundColor: t.dangerLight, borderColor: t.danger }]}>
            <Ionicons name="alert-circle" size={18} color={t.danger} />
            <Text style={[styles.errorText, { color: t.danger }]}>{errorMsg}</Text>
          </View>
        )}

        {unclaimed.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: t.text }]}>Membres en attente</Text>
            {unclaimed.map((pm) => (
              <Pressable
                key={pm.id}
                style={[
                  styles.memberCard,
                  { backgroundColor: t.card, borderColor: selectedId === pm.id ? t.accent : t.cardBorder },
                  selectedId === pm.id && { borderWidth: 2 },
                ]}
                onPress={() => setSelectedId(selectedId === pm.id ? null : pm.id)}
              >
                <Ionicons
                  name={selectedId === pm.id ? "checkmark-circle" : "person-outline"}
                  size={24}
                  color={selectedId === pm.id ? t.accent : t.textMuted}
                />
                <Text style={[styles.memberName, { color: t.text }]}>{pm.display_name}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: t.text }]}>Choisis ta couleur</Text>
          <View style={styles.colorGrid}>
            {COLOR_PRESETS.map((color) => {
              const taken = takenColors.has(color);
              const selected = selectedColor === color;
              return (
                <Pressable
                  key={color}
                  style={[
                    styles.colorDot,
                    { backgroundColor: color, opacity: taken ? 0.25 : 1 },
                    selected && styles.colorDotSelected,
                  ]}
                  onPress={() => !taken && setSelectedColor(selected ? null : color)}
                  disabled={taken}
                >
                  {selected && <Ionicons name="checkmark" size={20} color="#FFF" />}
                  {taken && <Ionicons name="close" size={16} color="#FFF" />}
                </Pressable>
              );
            })}
          </View>
        </View>

        <Pressable
          style={[styles.confirmBtn, { backgroundColor: t.accent }, loading && { opacity: 0.6 }]}
          onPress={handleConfirm}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.confirmBtnText}>
              {selectedId ? "C'est moi !" : "Continuer"}
            </Text>
          )}
        </Pressable>

        {unclaimed.length > 0 && (
          <Pressable style={styles.skipBtn} onPress={skipClaim}>
            <Text style={[styles.skipText, { color: t.textMuted }]}>
              Je ne suis pas dans la liste
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, padding: 24, alignItems: "center" },
  iconCircle: {
    width: 96, height: 96, borderRadius: 48,
    alignItems: "center", justifyContent: "center",
    marginTop: 32, marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: "800", marginBottom: 8, textAlign: "center" },
  subtitle: { fontSize: 15, textAlign: "center", marginBottom: 24, lineHeight: 22 },
  errorBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8, width: "100%",
  },
  errorText: { flex: 1, fontSize: 14, fontWeight: "500" },
  section: { width: "100%", marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10 },
  memberCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8,
  },
  memberName: { fontSize: 16, fontWeight: "600" },
  colorGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  colorDot: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
  },
  colorDotSelected: {
    borderWidth: 3, borderColor: "#FFF",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },
  confirmBtn: {
    width: "100%", paddingVertical: 16, borderRadius: 14,
    alignItems: "center", marginTop: 8,
  },
  confirmBtnText: { color: "#FFF", fontSize: 17, fontWeight: "700" },
  skipBtn: { marginTop: 16, paddingVertical: 8 },
  skipText: { fontSize: 14, fontWeight: "600" },
});
