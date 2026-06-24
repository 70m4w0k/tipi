import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "../lib/supabase";
import { Profile, Household } from "../lib/types";
import { useNavPreferences, ALL_TABS, NavTab } from "../lib/hooks/useNavPreferences";

const COLOR_PRESETS = [
  "#2563EB",
  "#F97316",
  "#16A34A",
  "#9333EA",
  "#EF4444",
  "#0D9488",
  "#EC4899",
  "#D97706",
  "#4F46E5",
  "#059669",
];

export function ProfileSettings({
  profile,
  household,
  onSignOut,
  onProfileUpdated,
}: {
  profile: Profile;
  household: Household | null;
  onSignOut: () => void;
  onProfileUpdated: () => void;
}) {
  const router = useRouter();
  const { enabledTabs, setTabs } = useNavPreferences();
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [selectedColor, setSelectedColor] = useState(profile.color);
  const [saving, setSaving] = useState(false);

  const MAX_NAV_TABS = 4;
  const toggleNavTab = async (key: NavTab) => {
    if (enabledTabs.includes(key)) {
      if (enabledTabs.length <= 1) return;
      await setTabs(enabledTabs.filter((k) => k !== key));
    } else {
      if (enabledTabs.length >= MAX_NAV_TABS) {
        Alert.alert("Maximum atteint", `Tu peux afficher ${MAX_NAV_TABS} pages maximum dans la barre de navigation.`);
        return;
      }
      await setTabs([...enabledTabs, key]);
    }
  };

  const hasChanges =
    displayName !== profile.display_name || selectedColor !== profile.color;

  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert("Nom requis", "Le nom d'affichage ne peut pas être vide.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim(), color: selectedColor })
      .eq("id", profile.id);
    if (error) {
      Alert.alert("Erreur", error.message);
    } else {
      onProfileUpdated();
    }
    setSaving(false);
  };

  const handleLeaveHousehold = () => {
    Alert.alert(
      "Quitter la coloc ?",
      "Tu devras rejoindre une coloc avec un code d'invitation pour utiliser l'app.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Quitter",
          style: "destructive",
          onPress: async () => {
            await supabase
              .from("profiles")
              .update({ household_id: null })
              .eq("id", profile.id);
            onProfileUpdated();
            router.replace("/");
          },
        },
      ],
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle}>Profil</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{profile.email}</Text>

        <Text style={styles.label}>Nom d'affichage</Text>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
        />

        <Text style={styles.label}>Couleur</Text>
        <View style={styles.colorRow}>
          {COLOR_PRESETS.map((color) => (
            <Pressable
              key={color}
              style={[
                styles.colorSwatch,
                { backgroundColor: color },
                selectedColor === color && styles.colorSwatchSelected,
              ]}
              onPress={() => setSelectedColor(color)}
            />
          ))}
        </View>

        {hasChanges && (
          <Pressable
            style={[styles.button, saving && styles.buttonDisabled]}
            onPress={() => void handleSave()}
            disabled={saving}
          >
            <Text style={styles.buttonText}>Enregistrer</Text>
          </Pressable>
        )}
      </View>

      {household && (
        <>
          <Text style={styles.sectionTitle}>Coloc</Text>
          <View style={styles.card}>
            <Text style={styles.label}>Nom</Text>
            <Text style={styles.value}>{household.name}</Text>

            <Text style={styles.label}>Code d'invitation</Text>
            <Text style={styles.codeDisplay}>{household.invite_code}</Text>
            <Text style={styles.hint}>
              Partage ce code pour inviter tes colocataires
            </Text>

            <Pressable
              style={[styles.button, styles.buttonDanger]}
              onPress={handleLeaveHousehold}
            >
              <Text style={styles.buttonText}>Quitter la coloc</Text>
            </Pressable>
          </View>
        </>
      )}

      <Text style={styles.sectionTitle}>Barre de navigation</Text>
      <View style={styles.card}>
        <Text style={styles.hint}>
          Choisis jusqu'à {MAX_NAV_TABS} pages à afficher dans la barre du bas. Redémarre l'app pour appliquer.
        </Text>
        {ALL_TABS.filter((t) => t.key !== "home").map((t) => {
          const isEnabled = enabledTabs.includes(t.key);
          return (
            <Pressable
              key={t.key}
              style={styles.navConfigItem}
              onPress={() => void toggleNavTab(t.key)}
            >
              <Ionicons name={t.icon as any} size={20} color={isEnabled ? "#1D4ED8" : "#9CA3AF"} />
              <Text style={[styles.navConfigLabel, isEnabled && styles.navConfigLabelActive]}>
                {t.label}
              </Text>
              <Ionicons
                name={isEnabled ? "checkbox" : "square-outline"}
                size={22}
                color={isEnabled ? "#1D4ED8" : "#9CA3AF"}
              />
            </Pressable>
          );
        })}
      </View>

      <Pressable style={styles.logoutButton} onPress={onSignOut}>
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40, gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  label: { fontWeight: "600", color: "#374151", fontSize: 13 },
  value: { color: "#6B7280", fontSize: 15, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    fontSize: 15,
  },
  colorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingVertical: 4,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorSwatchSelected: {
    borderColor: "#111827",
    borderWidth: 3,
  },
  button: {
    backgroundColor: "#1D4ED8",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  buttonDanger: { backgroundColor: "#EF4444" },
  codeDisplay: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1D4ED8",
    letterSpacing: 4,
    textAlign: "center",
    paddingVertical: 8,
  },
  hint: { color: "#6B7280", fontSize: 12, textAlign: "center" },
  navConfigItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  navConfigLabel: { fontSize: 15, color: "#6B7280", flex: 1 },
  navConfigLabelActive: { color: "#111827", fontWeight: "600" },
  logoutButton: {
    alignItems: "center",
    paddingVertical: 16,
    marginTop: 8,
  },
  logoutText: { color: "#EF4444", fontWeight: "600", fontSize: 15 },
});
