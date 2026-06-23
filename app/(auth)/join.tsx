import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../lib/hooks/useAuth";
import { useHousehold } from "../../lib/hooks/useHousehold";

export default function JoinScreen() {
  const { profile, signOut, refreshProfile } = useAuth();
  const { createHousehold, joinHousehold } = useHousehold(profile);
  const [houseName, setHouseName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!houseName.trim()) {
      Alert.alert("Nom requis", "Donne un nom à ta coloc.");
      return;
    }
    setLoading(true);
    const { error, household } = await createHousehold(houseName.trim());
    if (error) {
      Alert.alert("Erreur", String(error.message ?? error));
    } else if (household) {
      setCreatedCode(household.invite_code);
      await refreshProfile();
    }
    setLoading(false);
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      Alert.alert("Code requis", "Entre le code d'invitation.");
      return;
    }
    setLoading(true);
    const { error } = await joinHousehold(inviteCode.trim());
    if (error) {
      Alert.alert("Erreur", String(error.message ?? error));
    } else {
      await refreshProfile();
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>Bienvenue, {profile?.display_name} !</Text>
          <Text style={styles.subtitle}>
            Crée une coloc ou rejoins-en une avec un code d'invitation.
          </Text>

          {createdCode ? (
            <View style={styles.successCard}>
              <Text style={styles.successTitle}>Coloc créée !</Text>
              <Text style={styles.successText}>
                Partage ce code avec tes colocataires :
              </Text>
              <Text style={styles.codeDisplay}>{createdCode}</Text>
              <Text style={styles.successHint}>
                L'app va se charger automatiquement...
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Créer une coloc</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nom de la coloc (ex: Appart Belleville)"
                  value={houseName}
                  onChangeText={setHouseName}
                />
                <Pressable
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={() => void handleCreate()}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.buttonText}>Créer</Text>
                  )}
                </Pressable>
              </View>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>ou</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Rejoindre une coloc</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Code d'invitation (6 caractères)"
                  value={inviteCode}
                  onChangeText={setInviteCode}
                  autoCapitalize="characters"
                  maxLength={6}
                />
                <Pressable
                  style={[
                    styles.button,
                    styles.buttonSecondary,
                    loading && styles.buttonDisabled,
                  ]}
                  onPress={() => void handleJoin()}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#374151" />
                  ) : (
                    <Text style={[styles.buttonText, styles.buttonTextSecondary]}>
                      Rejoindre
                    </Text>
                  )}
                </Pressable>
              </View>
            </>
          )}

          <Pressable style={styles.logoutButton} onPress={() => void signOut()}>
            <Text style={styles.logoutText}>Se déconnecter</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F6FA" },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    color: "#1F2937",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    color: "#6B7280",
    marginBottom: 28,
  },
  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: "#111827" },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    fontSize: 16,
  },
  button: {
    backgroundColor: "#1D4ED8",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 16 },
  buttonSecondary: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#1D4ED8",
  },
  buttonTextSecondary: { color: "#1D4ED8" },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#D1D5DB" },
  dividerText: { marginHorizontal: 12, color: "#9CA3AF", fontSize: 13 },
  successCard: {
    backgroundColor: "#ECFDF5",
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#10B981",
  },
  successTitle: { fontSize: 20, fontWeight: "700", color: "#065F46" },
  successText: { color: "#065F46", fontSize: 15 },
  codeDisplay: {
    fontSize: 32,
    fontWeight: "700",
    color: "#065F46",
    letterSpacing: 6,
    paddingVertical: 8,
  },
  successHint: { color: "#6B7280", fontSize: 13 },
  logoutButton: { alignItems: "center", marginTop: 24, paddingVertical: 8 },
  logoutText: { color: "#EF4444", fontWeight: "600", fontSize: 14 },
});
