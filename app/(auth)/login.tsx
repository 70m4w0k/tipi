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
import { useRouter } from "expo-router";
import { useAuth } from "../../lib/hooks/useAuth";

export default function LoginScreen() {
  const { signUp, signIn, signInWithMagicLink } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Champs requis", "Email et mot de passe sont obligatoires.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "register") {
        if (!displayName.trim()) {
          Alert.alert("Champ requis", "Choisis un nom d'affichage.");
          setLoading(false);
          return;
        }
        const { error } = await signUp(email.trim(), password, displayName.trim());
        if (error) {
          Alert.alert("Erreur", error.message);
        } else {
          router.replace("/");
        }
      } else {
        const { error } = await signIn(email.trim(), password);
        if (error) {
          Alert.alert("Erreur d'authentification", error.message);
        } else {
          router.replace("/");
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue";
      Alert.alert("Erreur inattendue", msg);
    }
    setLoading(false);
  };

  const handleMagicLink = async () => {
    if (!email.trim()) {
      Alert.alert("Email requis", "Entre ton email pour recevoir le lien.");
      return;
    }
    setLoading(true);
    const { error } = await signInWithMagicLink(email.trim());
    if (error) {
      Alert.alert("Erreur", error.message);
    } else {
      setMagicLinkSent(true);
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.logo}>🏠</Text>
          <Text style={styles.title}>Tipi</Text>
          <Text style={styles.subtitle}>Gérez votre coloc ensemble</Text>

          <View style={styles.form}>
            {mode === "register" && (
              <TextInput
                style={styles.input}
                placeholder="Nom d'affichage"
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
              />
            )}
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Mot de passe"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <Pressable
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={() => void handleSubmit()}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.buttonText}>
                  {mode === "login" ? "Se connecter" : "Créer un compte"}
                </Text>
              )}
            </Pressable>

            <Pressable
              style={styles.linkButton}
              onPress={() => setMode(mode === "login" ? "register" : "login")}
            >
              <Text style={styles.linkText}>
                {mode === "login"
                  ? "Pas encore de compte ? Créer un compte"
                  : "Déjà un compte ? Se connecter"}
              </Text>
            </Pressable>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou</Text>
              <View style={styles.dividerLine} />
            </View>

            {magicLinkSent ? (
              <Text style={styles.magicLinkSent}>
                Lien envoyé ! Vérifie ta boîte mail.
              </Text>
            ) : (
              <Pressable
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => void handleMagicLink()}
                disabled={loading}
              >
                <Text style={[styles.buttonText, styles.buttonTextSecondary]}>
                  Recevoir un lien de connexion
                </Text>
              </Pressable>
            )}
          </View>
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
  logo: { fontSize: 64, textAlign: "center", marginBottom: 8 },
  title: {
    fontSize: 32,
    fontWeight: "700",
    textAlign: "center",
    color: "#1F2937",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    color: "#6B7280",
    marginBottom: 32,
  },
  form: { gap: 12 },
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
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 16 },
  buttonSecondary: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  buttonTextSecondary: { color: "#374151" },
  linkButton: { alignItems: "center", paddingVertical: 8 },
  linkText: { color: "#1D4ED8", fontWeight: "600", fontSize: 14 },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#D1D5DB" },
  dividerText: { marginHorizontal: 12, color: "#9CA3AF", fontSize: 13 },
  magicLinkSent: {
    textAlign: "center",
    color: "#10B981",
    fontWeight: "600",
    paddingVertical: 12,
  },
});
