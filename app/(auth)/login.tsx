import { useState } from "react";
import {
  ActivityIndicator,
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
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../lib/hooks/useAuth";
import { useTheme } from "../../lib/theme";
import { savePendingInviteCode } from "../invite";

export default function LoginScreen() {
  const { signUp, signIn, signInWithMagicLink } = useAuth();
  const router = useRouter();
  const { code: inviteCode } = useLocalSearchParams<{ code?: string }>();
  const t = useTheme();

  if (inviteCode) void savePendingInviteCode(inviteCode);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async () => {
    setErrorMsg("");
    if (!email.trim() || !password.trim()) {
      setErrorMsg("Email et mot de passe sont obligatoires.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "register") {
        if (!displayName.trim()) {
          setErrorMsg("Choisis un nom d'affichage.");
          setLoading(false);
          return;
        }
        const { error } = await signUp(email.trim(), password, displayName.trim());
        if (error) {
          setErrorMsg(error.message);
        } else {
          router.replace("/");
        }
      } else {
        const { error } = await signIn(email.trim(), password);
        if (error) {
          setErrorMsg(error.message);
        } else {
          router.replace("/");
        }
      }
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "Erreur inconnue");
    }
    setLoading(false);
  };

  const handleMagicLink = async () => {
    setErrorMsg("");
    if (!email.trim()) {
      setErrorMsg("Entre ton email pour recevoir le lien.");
      return;
    }
    setLoading(true);
    const { error } = await signInWithMagicLink(email.trim());
    if (error) {
      setErrorMsg(error.message);
    } else {
      setMagicLinkSent(true);
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoContainer}>
            <Ionicons name="home" size={56} color={t.accent} />
          </View>
          <Text style={[styles.title, { color: t.text }]}>Tipi</Text>
          <Text style={[styles.subtitle, { color: t.textSecondary }]}>Gérez votre coloc ensemble</Text>

          <View style={styles.form}>
            {!!errorMsg && (
              <View style={[styles.errorBanner, { backgroundColor: t.dangerLight, borderColor: t.danger }]}>
                <Ionicons name="alert-circle" size={18} color={t.danger} />
                <Text style={[styles.errorText, { color: t.danger }]}>{errorMsg}</Text>
              </View>
            )}
            {mode === "register" && (
              <TextInput
                style={[styles.input, { borderColor: t.inputBorder, backgroundColor: t.inputBg, color: t.text }]}
                placeholder="Nom d'affichage"
                placeholderTextColor={t.textMuted}
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
              />
            )}
            <TextInput
              style={[styles.input, { borderColor: t.inputBorder, backgroundColor: t.inputBg, color: t.text }]}
              placeholder="Email"
              placeholderTextColor={t.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={[styles.input, { borderColor: t.inputBorder, backgroundColor: t.inputBg, color: t.text }]}
              placeholder="Mot de passe"
              placeholderTextColor={t.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <Pressable
              style={[styles.button, { backgroundColor: t.accent }, loading && styles.buttonDisabled]}
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
              <Text style={[styles.linkText, { color: t.accent }]}>
                {mode === "login"
                  ? "Pas encore de compte ? Créer un compte"
                  : "Déjà un compte ? Se connecter"}
              </Text>
            </Pressable>

            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: t.inputBorder }]} />
              <Text style={[styles.dividerText, { color: t.textMuted }]}>ou</Text>
              <View style={[styles.dividerLine, { backgroundColor: t.inputBorder }]} />
            </View>

            {magicLinkSent ? (
              <Text style={[styles.magicLinkSent, { color: t.success }]}>
                Lien envoyé ! Vérifie ta boîte mail.
              </Text>
            ) : (
              <Pressable
                style={[styles.button, styles.buttonSecondary, { backgroundColor: t.card, borderColor: t.inputBorder }]}
                onPress={() => void handleMagicLink()}
                disabled={loading}
              >
                <Text style={[styles.buttonText, { color: t.textSecondary }]}>
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
  logoContainer: { alignItems: "center", marginBottom: 8 },
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
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
});
